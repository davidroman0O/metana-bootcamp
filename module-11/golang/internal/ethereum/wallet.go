package ethereum

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/decred/dcrd/dcrec/secp256k1/v4"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/rlp"
	"github.com/joho/godotenv"
	"github.com/tyler-smith/go-bip32"
	"github.com/tyler-smith/go-bip39"
	"golang.org/x/crypto/sha3"
)

// RPC request structure
type rpcRequest struct {
	JsonRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      int           `json:"id"`
}

// RPC response structure
type rpcResponse struct {
	JsonRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	ID int `json:"id"`
}

// EIP-1559 transaction
type TX1559 struct {
	ChainID              *big.Int   // S
	Nonce                uint64     // S
	MaxPriorityFeePerGas *big.Int   // S
	MaxFeePerGas         *big.Int   // S
	GasLimit             uint64     // S
	To                   *[20]byte  // S  (pointer lets RLP encode nil for contract creation)
	Value                *big.Int   // S
	Data                 []byte     // S
	AccessList           []struct{} // always empty
	// after signing:
	V uint8
	R *big.Int
	S *big.Int
}

// KeyPair holds a private key and its derived address
type KeyPair struct {
	PrivateKey *ecdsa.PrivateKey
	Address    common.Address
}

// HDWalletInfo holds information about an HD wallet
type HDWalletInfo struct {
	Mnemonic     string
	Seed         string
	HDPath       string
	AccountIndex uint32
}

// HDKeyPair extends KeyPair with HD wallet information
type HDKeyPair struct {
	*KeyPair
	HDInfo *HDWalletInfo
}

// Add constants for HD paths
const (
	// DefaultHDPath is the default derivation path for Ethereum (BIP-44)
	DefaultHDPath = "m/44'/60'/0'/0/0"
)

// LoadEnvVariables loads environment variables from .env file and returns true if loaded successfully
func LoadEnvVariables() bool {
	// Try to load .env from current directory
	envLoaded := godotenv.Load() == nil

	// Try to load from parent directory if running from bin/
	if !envLoaded && filepath.Base(filepath.Dir(os.Args[0])) == "bin" {
		envLoaded = godotenv.Load(filepath.Join("..", ".env")) == nil
	}

	// Try to load from two directories up for tests
	if !envLoaded {
		envLoaded = godotenv.Load("../../../.env") == nil // For tests running from internal/ethereum/
	}

	return envLoaded
}

// GetAPIKey gets the Alchemy API key from environment variables or falls back to default
func GetAPIKey() string {
	// First ensure we've tried to load from .env
	envLoaded := LoadEnvVariables()

	// Try to get API key from environment variables
	apiKey := os.Getenv("ALCHEMY_API_KEY")
	if apiKey != "" {
		return apiKey
	}

	// Try alternate environment variable
	apiKey = os.Getenv("REACT_APP_ALCHEMY_API_KEY")
	if apiKey != "" {
		return apiKey
	}

	// Fallback to hardcoded key only if absolutely necessary for development/testing
	fallbackKey := "UlgUe5NUoeezq_0_AxTSKl0qpQQeHSKV"
	if !envLoaded {
		fmt.Fprintf(os.Stderr, "Warning: No .env file found and no API key in environment variables.\n")
	}
	fmt.Fprintf(os.Stderr, "Warning: Using fallback API key. Set ALCHEMY_API_KEY in .env or environment variables for production use.\n")
	return fallbackKey
}

// GetRPCURL gets the RPC URL from environment variables or falls back to default
func GetRPCURL() string {
	// Ensure we've tried to load from .env
	envLoaded := LoadEnvVariables()

	// Get URL from environment variable
	rpcURL := os.Getenv("SEPOLIA_RPC_URL")
	if rpcURL == "" {
		// Use default URL if not set
		apiKey := GetAPIKey()
		rpcURL = fmt.Sprintf("https://eth-sepolia.g.alchemy.com/v2/%s", apiKey)
		if !envLoaded {
			fmt.Fprintf(os.Stderr, "Warning: No .env file found and no SEPOLIA_RPC_URL in environment variables. Using default Alchemy URL.\n")
		}
	} else {
		// Expand ${ALCHEMY_API_KEY} if present in the URL
		rpcURL = strings.Replace(rpcURL, "${ALCHEMY_API_KEY}", GetAPIKey(), -1)
	}
	return rpcURL
}

// GetBlockExplorerURL gets the block explorer URL from env vars or falls back to default
func GetBlockExplorerURL() string {
	// Ensure we've tried to load from .env
	envLoaded := LoadEnvVariables()

	blockExplorer := os.Getenv("BLOCK_EXPLORER_URL")
	if blockExplorer == "" {
		blockExplorer = "https://sepolia.etherscan.io"
		if !envLoaded {
			fmt.Fprintf(os.Stderr, "Warning: No .env file found and no BLOCK_EXPLORER_URL in environment variables. Using default.\n")
		}
	}
	return blockExplorer
}

// GenerateKeyPair generates a new Ethereum key pair
func GenerateKeyPair() (*KeyPair, error) {
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return nil, fmt.Errorf("error generating key: %v", err)
	}

	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	return &KeyPair{
		PrivateKey: privateKey,
		Address:    address,
	}, nil
}

// ImportPrivateKey imports a private key from a hex string
func ImportPrivateKey(privKeyHex string) (*KeyPair, error) {
	// Remove 0x prefix if present
	privKeyHex = strings.TrimPrefix(privKeyHex, "0x")

	// Decode the hex string
	privKeyBytes, err := hex.DecodeString(privKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key hex format: %v", err)
	}

	// Convert to ECDSA private key
	privateKey, err := crypto.ToECDSA(privKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %v", err)
	}

	// Derive the address
	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	return &KeyPair{
		PrivateKey: privateKey,
		Address:    address,
	}, nil
}

// ExportPrivateKey exports a private key to a hex string
func ExportPrivateKey(keyPair *KeyPair) string {
	privateKeyBytes := crypto.FromECDSA(keyPair.PrivateKey)
	return "0x" + hex.EncodeToString(privateKeyBytes)
}

// SaveToFile saves a key pair to a file
func SaveToFile(keyPair *KeyPair, filename string) error {
	// Convert private key to bytes and then to hex string
	privateKeyBytes := crypto.FromECDSA(keyPair.PrivateKey)
	privateKeyHex := hex.EncodeToString(privateKeyBytes)

	content := fmt.Sprintf("Private Key: 0x%s\nAddress: %s\n", privateKeyHex, keyPair.Address.Hex())
	return os.WriteFile(filename, []byte(content), 0600) // 0600 = only owner can read/write
}

// CallRPC sends a JSON-RPC request to the given URL
func CallRPC(ctx context.Context, url, method string, params []interface{}) (json.RawMessage, error) {
	// Create request body
	reqBody, err := json.Marshal(rpcRequest{
		JsonRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request with timeout
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	// Parse response
	var rpcResp rpcResponse
	if err := json.Unmarshal(body, &rpcResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	// Check for RPC error
	if rpcResp.Error != nil {
		return nil, fmt.Errorf("RPC error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return rpcResp.Result, nil
}

// WeiToEth converts wei (as a bigint) to ETH (as a string)
func WeiToEth(wei *big.Int) string {
	eth := new(big.Float).SetInt(wei)
	eth.Quo(eth, new(big.Float).SetFloat64(1e18))
	return fmt.Sprintf("%.9f", eth)
}

// HexToBig converts a hex string to a big.Int
func HexToBig(s string) (*big.Int, error) {
	s = strings.TrimPrefix(s, "\"")
	s = strings.TrimSuffix(s, "\"")

	if !strings.HasPrefix(s, "0x") {
		return nil, errors.New("hex string must start with 0x")
	}

	n := new(big.Int)
	_, success := n.SetString(s[2:], 16)
	if !success {
		return nil, fmt.Errorf("failed to parse hex string: %s", s)
	}
	return n, nil
}

// HexDecode decodes a hex string to bytes
func HexDecode(s string) ([]byte, error) {
	if !strings.HasPrefix(s, "0x") {
		return nil, errors.New("hex string must start with 0x")
	}

	b, err := hex.DecodeString(s[2:])
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex string: %w", err)
	}
	return b, nil
}

// HexToAddress converts a hex string to a common.Address
func HexToAddress(address string) common.Address {
	return common.HexToAddress(address)
}

// Keccak256 computes the Keccak256 hash of the input
func Keccak256(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}

// GetBalance gets the balance of an address
func GetBalance(ctx context.Context, address common.Address, rpcURL string) (*big.Int, error) {
	result, err := CallRPC(ctx, rpcURL, "eth_getBalance", []interface{}{address.Hex(), "latest"})
	if err != nil {
		return nil, fmt.Errorf("error checking balance: %v", err)
	}

	return HexToBig(string(result))
}

// GetNonce gets the nonce (transaction count) of an address
func GetNonce(ctx context.Context, address common.Address, rpcURL string) (uint64, error) {
	result, err := CallRPC(ctx, rpcURL, "eth_getTransactionCount", []interface{}{address.Hex(), "pending"})
	if err != nil {
		return 0, fmt.Errorf("error getting nonce: %v", err)
	}

	nonceStr := string(result)
	nonceStr = strings.Trim(nonceStr, "\"")
	return strconv.ParseUint(nonceStr[2:], 16, 64)
}

// GetChainID gets the chain ID from the network
func GetChainID(ctx context.Context, rpcURL string) (*big.Int, error) {
	result, err := CallRPC(ctx, rpcURL, "eth_chainId", []interface{}{})
	if err != nil {
		return nil, fmt.Errorf("error getting chainID: %v", err)
	}

	return HexToBig(string(result))
}

// EstimateGas estimates the gas required for a transaction
func EstimateGas(ctx context.Context, from, to string, value *big.Int, rpcURL string) (uint64, error) {
	call := map[string]string{
		"from":  from,
		"to":    to,
		"value": fmt.Sprintf("0x%x", value),
	}

	result, err := CallRPC(ctx, rpcURL, "eth_estimateGas", []interface{}{call})
	if err != nil {
		return 0, fmt.Errorf("error estimating gas: %v", err)
	}

	gasLimitStr := string(result)
	gasLimitStr = strings.Trim(gasLimitStr, "\"")
	gasLimit, err := strconv.ParseUint(gasLimitStr[2:], 16, 64)
	if err != nil {
		return 0, fmt.Errorf("error parsing gas limit: %v", err)
	}

	// Add a buffer to the gas estimate
	return uint64(float64(gasLimit) * 1.2), nil // Add 20% buffer
}

// GetBaseFee gets the current base fee from the network
func GetBaseFee(ctx context.Context, rpcURL string) (*big.Int, error) {
	// Get latest block
	blockData, err := CallRPC(ctx, rpcURL, "eth_getBlockByNumber", []interface{}{"latest", false})
	if err != nil {
		return nil, err
	}

	// Parse the block data to get the base fee
	var block struct {
		BaseFeePerGas string `json:"baseFeePerGas"`
	}

	if err := json.Unmarshal(blockData, &block); err != nil {
		return nil, fmt.Errorf("failed to unmarshal block data: %w", err)
	}

	if block.BaseFeePerGas == "" {
		// Fallback for networks that don't support EIP-1559
		return big.NewInt(30_000_000_000), nil // 30 gwei default
	}

	return HexToBig(block.BaseFeePerGas)
}

// GetGasPrice gets the current gas price from the network (for legacy transactions)
func GetGasPrice(ctx context.Context, rpcURL string) (*big.Int, error) {
	result, err := CallRPC(ctx, rpcURL, "eth_gasPrice", []interface{}{})
	if err != nil {
		return nil, fmt.Errorf("error getting gas price: %w", err)
	}

	return HexToBig(string(result))
}

// payloadRLP returns the unsigned payload (no V,R,S) RLP-encoded
func (t *TX1559) PayloadRLP() ([]byte, error) {
	type unsigned struct {
		ChainID              *big.Int
		Nonce                uint64
		MaxPriorityFeePerGas *big.Int
		MaxFeePerGas         *big.Int
		GasLimit             uint64
		To                   *[20]byte
		Value                *big.Int
		Data                 []byte
		AccessList           []struct{}
	}
	return rlp.EncodeToBytes(unsigned{
		t.ChainID, t.Nonce, t.MaxPriorityFeePerGas, t.MaxFeePerGas,
		t.GasLimit, t.To, t.Value, t.Data, nil,
	})
}

// Sign fills in V,R,S and returns the signed raw tx bytes (0x02||RLP)
func (t *TX1559) Sign(priv *ecdsa.PrivateKey) ([]byte, error) {
	payload, err := t.PayloadRLP()
	if err != nil {
		return nil, fmt.Errorf("failed to encode payload: %w", err)
	}

	hash := Keccak256(append([]byte{0x02}, payload...))

	// Sign the hash using Ethereum's crypto package
	signature, err := crypto.Sign(hash, priv)
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Extract r, s, v from the signature
	r := new(big.Int).SetBytes(signature[0:32])
	s := new(big.Int).SetBytes(signature[32:64])
	v := uint8(signature[64]) // 0 or 1 for EIP-155

	t.V = v
	t.R = r
	t.S = s

	raw, err := rlp.EncodeToBytes(t)
	if err != nil {
		return nil, fmt.Errorf("failed to encode signed transaction: %w", err)
	}

	return append([]byte{0x02}, raw...), nil
}

// SendTransaction sends a transaction with the specified parameters
func SendTransaction(ctx context.Context, fromKeyPair *KeyPair, toAddress string, valueWei *big.Int, rpcURL string) (string, error) {
	// Get chain ID
	chainID, err := GetChainID(ctx, rpcURL)
	if err != nil {
		return "", err
	}

	// Get nonce
	nonce, err := GetNonce(ctx, fromKeyPair.Address, rpcURL)
	if err != nil {
		return "", err
	}

	// Estimate gas
	gasLimit, err := EstimateGas(ctx, fromKeyPair.Address.Hex(), toAddress, valueWei, rpcURL)
	if err != nil {
		return "", err
	}

	// Get base fee
	baseFee, err := GetBaseFee(ctx, rpcURL)
	if err != nil {
		baseFee = big.NewInt(30_000_000_000) // 30 gwei default
	}

	// Priority tip - 1.5 gwei on top of base fee
	tip := big.NewInt(1_500_000_000) // 1.5 gwei

	// Calculate max fee: baseFee * 2 + tip
	maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFee = new(big.Int).Add(maxFee, tip)

	// Decode to address
	var to [20]byte
	toBytes, err := HexDecode(toAddress)
	if err != nil {
		return "", fmt.Errorf("error decoding to address: %w", err)
	}
	copy(to[:], toBytes)

	// Create transaction
	tx := &TX1559{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: tip,
		MaxFeePerGas:         maxFee,
		GasLimit:             gasLimit,
		To:                   &to,
		Value:                valueWei,
		Data:                 []byte{}, // Empty data for a simple transfer
	}

	// Sign transaction
	rawTx, err := tx.Sign(fromKeyPair.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("error signing transaction: %w", err)
	}

	// Send transaction
	rawHex := "0x" + hex.EncodeToString(rawTx)
	txHash, err := CallRPC(ctx, rpcURL, "eth_sendRawTransaction", []interface{}{rawHex})
	if err != nil {
		return "", fmt.Errorf("error sending transaction: %w", err)
	}

	// Return transaction hash
	return strings.Trim(string(txHash), "\""), nil
}

// GetAddressFromPrivateKeyHex gets an Ethereum address from a private key hex string
func GetAddressFromPrivateKeyHex(privKeyHex string) (string, error) {
	// Remove 0x prefix if present
	privKeyHex = strings.TrimPrefix(privKeyHex, "0x")

	// Decode the private key
	privKeyBytes, err := hex.DecodeString(privKeyHex)
	if err != nil {
		return "", fmt.Errorf("error decoding private key: %w", err)
	}

	// Create secp256k1 private key for address derivation
	privateKey := secp256k1.PrivKeyFromBytes(privKeyBytes)
	pubkey := privateKey.PubKey().SerializeUncompressed()[1:]
	addr := Keccak256(pubkey)[12:] // 20 bytes
	return "0x" + hex.EncodeToString(addr), nil
}

// FormatTransactionURL formats a transaction URL for Etherscan
func FormatTransactionURL(txHash string, blockExplorer string) string {
	return fmt.Sprintf("%s/tx/%s", blockExplorer, txHash)
}

// Generate a new HD wallet with mnemonic
func GenerateHDWallet(hdPath string) (*HDKeyPair, error) {
	// Use default path if not specified
	if hdPath == "" {
		hdPath = DefaultHDPath
	}

	// Generate entropy for mnemonic
	entropy, err := bip39.NewEntropy(128) // 128 bits = 12 words
	if err != nil {
		return nil, fmt.Errorf("failed to generate entropy: %w", err)
	}

	// Generate mnemonic
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return nil, fmt.Errorf("failed to generate mnemonic: %w", err)
	}

	return ImportHDWallet(mnemonic, hdPath)
}

// Import HD wallet from mnemonic
func ImportHDWallet(mnemonic string, hdPath string) (*HDKeyPair, error) {
	// Use default path if not specified
	if hdPath == "" {
		hdPath = DefaultHDPath
	}

	// Validate mnemonic
	if !bip39.IsMnemonicValid(mnemonic) {
		return nil, errors.New("invalid mnemonic phrase")
	}

	// Generate seed from mnemonic
	seed := bip39.NewSeed(mnemonic, "")

	// Parse HD path
	pathSegments, err := parseHDPath(hdPath)
	if err != nil {
		return nil, fmt.Errorf("invalid HD path: %w", err)
	}

	// Create master key from seed
	masterKey, err := bip32.NewMasterKey(seed)
	if err != nil {
		return nil, fmt.Errorf("failed to create master key: %w", err)
	}

	// Derive child keys
	key := masterKey
	for _, segment := range pathSegments {
		hardened := false
		childIndex := segment

		// Check if this segment is hardened (has ' suffix in path notation)
		if segment >= 0x80000000 {
			hardened = true
			childIndex = segment - 0x80000000
		}

		if hardened {
			key, err = key.NewChildKey(childIndex + 0x80000000)
		} else {
			key, err = key.NewChildKey(childIndex)
		}

		if err != nil {
			return nil, fmt.Errorf("failed to derive child key: %w", err)
		}
	}

	// Get private key
	privateKey := crypto.ToECDSAUnsafe(key.Key)

	// Derive address
	address := crypto.PubkeyToAddress(privateKey.PublicKey)

	// Create key pair
	keyPair := &KeyPair{
		PrivateKey: privateKey,
		Address:    address,
	}

	// Extract account index from path
	accountIndex := uint32(0)
	if len(pathSegments) >= 5 {
		accountIndex = pathSegments[4]
	}

	// Create HD wallet info
	hdInfo := &HDWalletInfo{
		Mnemonic:     mnemonic,
		Seed:         hex.EncodeToString(seed),
		HDPath:       hdPath,
		AccountIndex: accountIndex,
	}

	return &HDKeyPair{
		KeyPair: keyPair,
		HDInfo:  hdInfo,
	}, nil
}

// DeriveChildAccount derives a new account at the specified index
func DeriveChildAccount(hdKeyPair *HDKeyPair, index uint32) (*HDKeyPair, error) {
	// Get base path without the last segment
	basePath := getBaseHDPath(hdKeyPair.HDInfo.HDPath)

	// Create new path with the specified index
	newPath := fmt.Sprintf("%s/%d", basePath, index)

	// Import HD wallet with the new path
	childKeyPair, err := ImportHDWallet(hdKeyPair.HDInfo.Mnemonic, newPath)
	if err != nil {
		return nil, err
	}

	return childKeyPair, nil
}

// Parse HD path into segments
func parseHDPath(path string) ([]uint32, error) {
	if !strings.HasPrefix(path, "m/") {
		return nil, errors.New("HD path must start with m/")
	}

	// Remove the 'm/' prefix
	path = path[2:]

	// Split by '/'
	parts := strings.Split(path, "/")

	segments := make([]uint32, len(parts))
	for i, part := range parts {
		// Check if hardened
		hardened := strings.HasSuffix(part, "'") || strings.HasSuffix(part, "h")

		// Remove hardened suffix
		if hardened {
			part = part[:len(part)-1]
		}

		// Parse index
		index, err := strconv.ParseUint(part, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("invalid path segment '%s': %w", part, err)
		}

		// Add hardened flag if needed
		if hardened {
			segments[i] = uint32(index) + 0x80000000
		} else {
			segments[i] = uint32(index)
		}
	}

	return segments, nil
}

// Get base HD path (without last segment)
func getBaseHDPath(path string) string {
	if !strings.HasPrefix(path, "m/") {
		return path
	}

	// Split by '/'
	parts := strings.Split(path, "/")

	// If there's only 'm', return the full path
	if len(parts) <= 1 {
		return path
	}

	// Return all parts except the last one
	return strings.Join(parts[:len(parts)-1], "/")
}

// SendEIP1559Transaction sends an EIP-1559 transaction with the specified parameters
func SendEIP1559Transaction(ctx context.Context, fromKeyPair *KeyPair, toAddress string, valueWei *big.Int, rpcURL string, priorityFeeWei *big.Int) (string, error) {
	// Get chain ID
	chainID, err := GetChainID(ctx, rpcURL)
	if err != nil {
		return "", err
	}

	// Get nonce
	nonce, err := GetNonce(ctx, fromKeyPair.Address, rpcURL)
	if err != nil {
		return "", err
	}

	// Estimate gas
	gasLimit, err := EstimateGas(ctx, fromKeyPair.Address.Hex(), toAddress, valueWei, rpcURL)
	if err != nil {
		return "", err
	}

	// Get base fee
	baseFee, err := GetBaseFee(ctx, rpcURL)
	if err != nil {
		baseFee = big.NewInt(30_000_000_000) // 30 gwei default
	}

	// If priority fee is not specified, use a default of 1.5 gwei
	if priorityFeeWei == nil {
		priorityFeeWei = big.NewInt(1_500_000_000) // 1.5 gwei
	}

	// Calculate max fee: baseFee * 2 + priorityFee
	maxFeePerGas := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFeePerGas = new(big.Int).Add(maxFeePerGas, priorityFeeWei)

	// Decode to address
	var to [20]byte
	toBytes, err := HexDecode(toAddress)
	if err != nil {
		return "", fmt.Errorf("error decoding to address: %w", err)
	}
	copy(to[:], toBytes)

	// Create transaction
	tx := &TX1559{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: priorityFeeWei,
		MaxFeePerGas:         maxFeePerGas,
		GasLimit:             gasLimit,
		To:                   &to,
		Value:                valueWei,
		Data:                 []byte{}, // Empty data for a simple transfer
	}

	// Sign transaction
	rawTx, err := tx.Sign(fromKeyPair.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("error signing transaction: %w", err)
	}

	// Send transaction
	rawHex := "0x" + hex.EncodeToString(rawTx)
	txHash, err := CallRPC(ctx, rpcURL, "eth_sendRawTransaction", []interface{}{rawHex})
	if err != nil {
		return "", fmt.Errorf("error sending transaction: %w", err)
	}

	// Return transaction hash
	return strings.Trim(string(txHash), "\""), nil
}
