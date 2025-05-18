package ethereum

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/big"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
)

// Test constants
const (
	testPrivateKey = "0bfc6e4d5af0242213b648b43bc8ff48f1817295111c2e228fc61b0aeb1a1271"
	testAddress    = "0xA65e6944Fe4Fa192A61a5454fA198a584365A28A"
	smallAmount    = "10000000000000" // 0.00001 ETH in wei
)

func init() {
	// Load environment variables for tests
	envLoaded := godotenv.Load("../../../.env") // TODO: fix ugly
	if envLoaded != nil {
		fmt.Println("Warning: No .env file found for tests. Using environment variables or defaults.")
	}
}

// TestKeyGeneration tests generating new key pairs
func TestKeyGeneration(t *testing.T) {
	// Generate a new key pair
	keyPair, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("Failed to generate key pair: %v", err)
	}

	// Verify we have both private key and address
	if keyPair.PrivateKey == nil {
		t.Fatal("Generated private key is nil")
	}

	if (keyPair.Address == common.Address{}) {
		t.Fatal("Generated address is empty")
	}

	// Print for manual verification
	privateBytes := crypto.FromECDSA(keyPair.PrivateKey)
	t.Logf("Generated private key: 0x%s", hex.EncodeToString(privateBytes))
	t.Logf("Generated address: %s", keyPair.Address.Hex())
}

// TestAddressDerivation tests deriving addresses from private keys
func TestAddressDerivation(t *testing.T) {
	// Import a known private key
	keyPair, err := ImportPrivateKey(testPrivateKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Check that the address matches expected
	derivedAddress := keyPair.Address.Hex()
	t.Logf("Derived address: %s", derivedAddress)
	t.Logf("Expected address: %s", testAddress)

	// Case insensitive comparison (addresses may have different case)
	if !strings.EqualFold(derivedAddress, testAddress) {
		t.Fatalf("Derived address %s doesn't match expected %s", derivedAddress, testAddress)
	}

	// Test direct derivation method
	directAddress, err := GetAddressFromPrivateKeyHex(testPrivateKey)
	if err != nil {
		t.Fatalf("Failed to derive address directly: %v", err)
	}

	if !strings.EqualFold(directAddress, testAddress) {
		t.Fatalf("Directly derived address %s doesn't match expected %s", directAddress, testAddress)
	}
}

// TestRPCFunctions tests basic RPC functions (mocked)
func TestRPCFunctions(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping RPC tests in short mode")
	}

	// Get RPC URL from environment
	rpcURL := GetRPCURL()
	ctx := context.Background()

	// Test chain ID retrieval
	chainID, err := GetChainID(ctx, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get chain ID: %v", err)
	}
	t.Logf("Chain ID: %s", chainID.String())

	// Expected Sepolia Chain ID
	expectedChainID := big.NewInt(11155111)
	if chainID.Cmp(expectedChainID) != 0 {
		t.Fatalf("Chain ID %s doesn't match expected Sepolia chain ID %s", chainID, expectedChainID)
	}

	// Test getting balance (we don't check the value, just that it works)
	address := common.HexToAddress(testAddress)
	balance, err := GetBalance(ctx, address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}
	t.Logf("Balance: %s wei (%s ETH)", balance.String(), WeiToEth(balance))

	// Test nonce retrieval
	nonce, err := GetNonce(ctx, address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get nonce: %v", err)
	}
	t.Logf("Nonce: %d", nonce)

	// Test gas estimation
	// Convert the small amount to a big.Int properly
	amountBig, ok := new(big.Int).SetString(smallAmount, 10)
	if !ok {
		t.Fatalf("Failed to parse amount: %s", smallAmount)
	}

	gasLimit, err := EstimateGas(
		ctx,
		address.Hex(),
		address.Hex(), // Self-transfer
		amountBig,
		rpcURL,
	)
	if err != nil {
		t.Fatalf("Failed to estimate gas: %v", err)
	}
	t.Logf("Estimated gas: %d", gasLimit)

	// Test base fee retrieval
	baseFee, err := GetBaseFee(ctx, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get base fee: %v", err)
	}
	t.Logf("Base fee: %s gwei", new(big.Float).Quo(
		new(big.Float).SetInt(baseFee),
		new(big.Float).SetFloat64(1e9),
	).String())
}

// TestTransactionPreparation tests preparing and signing transactions
func TestTransactionPreparation(t *testing.T) {
	// Import a known private key
	keyPair, err := ImportPrivateKey(testPrivateKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Create a transaction
	chainID := big.NewInt(11155111) // Sepolia
	nonce := uint64(1)              // Test nonce
	gasLimit := uint64(21000)       // Standard ETH transfer

	// EIP-1559 parameters
	tip := big.NewInt(1_500_000_000)      // 1.5 gwei
	baseFee := big.NewInt(30_000_000_000) // 30 gwei
	maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFee = new(big.Int).Add(maxFee, tip) // 2*baseFee + tip

	// Value to send - properly handle SetString return values
	value, ok := new(big.Int).SetString(smallAmount, 10)
	if !ok {
		t.Fatalf("Failed to parse amount: %s", smallAmount)
	}

	// To address
	to := common.HexToAddress(testAddress) // Self-transfer
	var toBytes [20]byte
	copy(toBytes[:], to.Bytes())

	// Create transaction
	tx := &TX1559{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: tip,
		MaxFeePerGas:         maxFee,
		GasLimit:             gasLimit,
		To:                   &toBytes,
		Value:                value,
		Data:                 []byte{}, // Empty data for a simple transfer
	}

	// Test RLP payload
	payload, err := tx.PayloadRLP()
	if err != nil {
		t.Fatalf("Failed to encode payload: %v", err)
	}
	t.Logf("Payload: 0x%s", hex.EncodeToString(payload))

	// Test signing
	signedTx, err := tx.Sign(keyPair.PrivateKey)
	if err != nil {
		t.Fatalf("Failed to sign transaction: %v", err)
	}
	t.Logf("Signed transaction: 0x%s", hex.EncodeToString(signedTx))

	// Print raw values for debugging
	t.Logf("Raw values after signing:")
	t.Logf("V: %v", tx.V)
	t.Logf("R is nil: %v", tx.R == nil)
	t.Logf("S is nil: %v", tx.S == nil)

	// Verify signature values
	if tx.R == nil || tx.S == nil {
		t.Fatal("Signature values R or S are nil after signing")
	}

	t.Logf("Signature V: %d", tx.V)
	t.Logf("Signature R: %s", tx.R.String())
	t.Logf("Signature S: %s", tx.S.String())
}

// TestTransactionSending tests sending a real transaction (disabled by default)
func TestTransactionSending(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping transaction test in short mode")
	}

	// Import private key from environment if available
	privKey := os.Getenv("TEST_PRIVATE_KEY")
	if privKey == "" {
		privKey = testPrivateKey // Fall back to the test constant if env var not set
	}

	keyPair, err := ImportPrivateKey(privKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Get RPC URL
	rpcURL := GetRPCURL()
	blockExplorer := GetBlockExplorerURL()
	ctx := context.Background()

	// Check balance before sending
	balance, err := GetBalance(ctx, keyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}
	t.Logf("Initial balance: %s wei (%s ETH)", balance.String(), WeiToEth(balance))

	// Set a very small amount to send
	amount, _ := new(big.Int).SetString("1", 10) // Just 1 wei

	// Don't proceed if balance is too low
	minBalance := big.NewInt(10000000000000) // 0.00001 ETH (much smaller requirement)
	if balance.Cmp(minBalance) < 0 {
		t.Skipf("Insufficient funds to run test: %s < %s", WeiToEth(balance), WeiToEth(minBalance))
	}

	// Send a self-transaction
	txHash, err := SendTransaction(ctx, keyPair, keyPair.Address.Hex(), amount, rpcURL)
	if err != nil {
		t.Fatalf("Failed to send transaction: %v", err)
	}
	t.Logf("Transaction sent! Hash: %s", txHash)
	t.Logf("View on Etherscan: %s", FormatTransactionURL(txHash, blockExplorer))

	// Wait for transaction to be mined
	t.Log("Waiting for transaction to be mined...")
	time.Sleep(15 * time.Second)

	// Check new balance
	newBalance, err := GetBalance(ctx, keyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new balance: %v", err)
	}
	t.Logf("New balance: %s wei (%s ETH)", newBalance.String(), WeiToEth(newBalance))
	t.Logf("Spent: %s wei", new(big.Int).Sub(balance, newBalance).String())
}

// TestHexFunctions tests hex encoding/decoding functions
func TestHexFunctions(t *testing.T) {
	// Test HexToBig
	hexValue := "0xde0b6b3a7640000" // 1 ETH in wei
	bigValue, err := HexToBig(hexValue)
	if err != nil {
		t.Fatalf("Failed to convert hex to big.Int: %v", err)
	}

	expectedValue, _ := new(big.Int).SetString("1000000000000000000", 10)
	if bigValue.Cmp(expectedValue) != 0 {
		t.Fatalf("Converted value %s doesn't match expected %s", bigValue, expectedValue)
	}

	// Test HexDecode
	hexData := "0x68656c6c6f" // "hello" in hex
	bytes, err := HexDecode(hexData)
	if err != nil {
		t.Fatalf("Failed to decode hex: %v", err)
	}

	if string(bytes) != "hello" {
		t.Fatalf("Decoded data %s doesn't match expected %s", string(bytes), "hello")
	}

	// Test invalid inputs
	_, err = HexToBig("invalid")
	if err == nil {
		t.Fatal("HexToBig should fail with invalid input")
	}

	_, err = HexDecode("invalid")
	if err == nil {
		t.Fatal("HexDecode should fail with invalid input")
	}
}

// TestWeiToEth tests wei to ETH conversion
func TestWeiToEth(t *testing.T) {
	// 1 ETH = 10^18 wei
	oneEth, _ := new(big.Int).SetString("1000000000000000000", 10)
	ethStr := WeiToEth(oneEth)

	// Should be approximately 1.0 ETH (may have some floating point precision)
	if !strings.Contains(ethStr, "1.0") {
		t.Fatalf("WeiToEth gave %s, expected approximately 1.0", ethStr)
	}

	// Test small amount
	smallWei, _ := new(big.Int).SetString("1000000000", 10) // 1 gwei
	smallEthStr := WeiToEth(smallWei)

	// Should be approximately 0.000000001 ETH
	if !strings.Contains(smallEthStr, "0.000000001") {
		t.Fatalf("WeiToEth gave %s for small amount, expected approximately 0.000000001", smallEthStr)
	}
}

// TestEnvVariables tests loading environment variables
func TestEnvVariables(t *testing.T) {
	// Load environment variables
	LoadEnvVariables()

	// Test API key
	apiKey := GetAPIKey()
	if apiKey == "" {
		t.Log("API key not set in environment")
	} else {
		// Mask for security
		t.Logf("API key found: %s...", apiKey[:5])
	}

	// Test RPC URL
	rpcURL := GetRPCURL()
	if !strings.Contains(rpcURL, "http") {
		t.Fatalf("Invalid RPC URL: %s", rpcURL)
	}
	t.Logf("RPC URL: %s", rpcURL)

	// Test block explorer URL
	blockExplorer := GetBlockExplorerURL()
	if !strings.Contains(blockExplorer, "etherscan") {
		t.Logf("Block explorer URL might be invalid: %s", blockExplorer)
	}
	t.Logf("Block Explorer URL: %s", blockExplorer)
}

// TestHDWalletGeneration tests generating new HD wallets
func TestHDWalletGeneration(t *testing.T) {
	// Generate a new HD wallet
	hdKeyPair, err := GenerateHDWallet("")
	if err != nil {
		t.Fatalf("Failed to generate HD wallet: %v", err)
	}

	// Verify we have a valid mnemonic and derivation
	if hdKeyPair.HDInfo == nil {
		t.Fatal("HD wallet info is nil")
	}

	if hdKeyPair.HDInfo.Mnemonic == "" {
		t.Fatal("Generated mnemonic is empty")
	}

	if hdKeyPair.KeyPair == nil || hdKeyPair.KeyPair.PrivateKey == nil {
		t.Fatal("Generated private key is nil")
	}

	if (hdKeyPair.KeyPair.Address == common.Address{}) {
		t.Fatal("Generated address is empty")
	}

	// Print for manual verification
	t.Logf("Generated mnemonic: %s", hdKeyPair.HDInfo.Mnemonic)
	t.Logf("HD path: %s", hdKeyPair.HDInfo.HDPath)
	privateBytes := crypto.FromECDSA(hdKeyPair.KeyPair.PrivateKey)
	t.Logf("Generated private key: 0x%s", hex.EncodeToString(privateBytes))
	t.Logf("Generated address: %s", hdKeyPair.KeyPair.Address.Hex())
}

// TestHDWalletDerivation tests deriving multiple accounts from a single HD wallet
func TestHDWalletDerivation(t *testing.T) {
	// Create a wallet with a known mnemonic
	mnemonic := "test cruise situate detail affair sunny theory clean interest reform quarter leopard"
	hdPath := DefaultHDPath

	// Import the HD wallet
	hdKeyPair, err := ImportHDWallet(mnemonic, hdPath)
	if err != nil {
		t.Fatalf("Failed to import HD wallet: %v", err)
	}

	t.Logf("Primary account path: %s", hdKeyPair.HDInfo.HDPath)
	t.Logf("Primary account address: %s", hdKeyPair.KeyPair.Address.Hex())

	// Derive multiple accounts
	for i := 1; i < 5; i++ {
		childKeyPair, err := DeriveChildAccount(hdKeyPair, uint32(i))
		if err != nil {
			t.Fatalf("Failed to derive account %d: %v", i, err)
		}

		t.Logf("Account %d path: %s", i, childKeyPair.HDInfo.HDPath)
		t.Logf("Account %d address: %s", i, childKeyPair.KeyPair.Address.Hex())

		// Ensure each address is unique
		if childKeyPair.KeyPair.Address == hdKeyPair.KeyPair.Address {
			t.Fatalf("Derived address should be different from parent")
		}
	}
}

// TestEIP1559Transaction tests preparing and signing EIP-1559 transactions
func TestEIP1559Transaction(t *testing.T) {
	// Import a known private key
	keyPair, err := ImportPrivateKey(testPrivateKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Create an EIP-1559 transaction
	chainID := big.NewInt(11155111) // Sepolia
	nonce := uint64(1)              // Test nonce
	gasLimit := uint64(21000)       // Standard ETH transfer

	// EIP-1559 parameters
	tip := big.NewInt(1_500_000_000)      // 1.5 gwei
	baseFee := big.NewInt(30_000_000_000) // 30 gwei
	maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFee = new(big.Int).Add(maxFee, tip) // 2*baseFee + tip

	// Value to send - properly handle SetString return values
	value, ok := new(big.Int).SetString(smallAmount, 10)
	if !ok {
		t.Fatalf("Failed to parse amount: %s", smallAmount)
	}

	// To address
	to := common.HexToAddress(testAddress) // Self-transfer
	var toBytes [20]byte
	copy(toBytes[:], to.Bytes())

	// Create transaction
	tx := &TX1559{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: tip,
		MaxFeePerGas:         maxFee,
		GasLimit:             gasLimit,
		To:                   &toBytes,
		Value:                value,
		Data:                 []byte{}, // Empty data for a simple transfer
	}

	// Test RLP payload
	payload, err := tx.PayloadRLP()
	if err != nil {
		t.Fatalf("Failed to encode payload: %v", err)
	}
	t.Logf("EIP-1559 Payload: 0x%s", hex.EncodeToString(payload))

	// Test signing
	signedTx, err := tx.Sign(keyPair.PrivateKey)
	if err != nil {
		t.Fatalf("Failed to sign transaction: %v", err)
	}
	t.Logf("EIP-1559 Signed transaction: 0x%s", hex.EncodeToString(signedTx))

	// Verify signature values
	if tx.R == nil || tx.S == nil {
		t.Fatal("Signature values R or S are nil after signing")
	}

	t.Logf("EIP-1559 Signature V: %d", tx.V)
	t.Logf("EIP-1559 Signature R: %s", tx.R.String())
	t.Logf("EIP-1559 Signature S: %s", tx.S.String())

	// Make sure the first byte is 0x02 for EIP-1559
	if signedTx[0] != 0x02 {
		t.Fatalf("First byte of signed EIP-1559 transaction should be 0x02, got 0x%x", signedTx[0])
	}
}

// TestEIP1559TransactionSending tests sending a real EIP-1559 transaction
func TestEIP1559TransactionSending(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping EIP-1559 transaction test in short mode")
	}

	// Import private key from environment if available
	privKey := os.Getenv("TEST_PRIVATE_KEY")
	if privKey == "" {
		privKey = testPrivateKey // Fall back to the test constant if env var not set
	}

	keyPair, err := ImportPrivateKey(privKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Get RPC URL
	rpcURL := GetRPCURL()
	blockExplorer := GetBlockExplorerURL()
	ctx := context.Background()

	// Check balance before sending
	balance, err := GetBalance(ctx, keyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}
	t.Logf("Initial balance: %s wei (%s ETH)", balance.String(), WeiToEth(balance))

	// Set a very small amount to send
	amount, _ := new(big.Int).SetString("1", 10) // Just 1 wei

	// Don't proceed if balance is too low
	minBalance := big.NewInt(10000000000000) // 0.00001 ETH (much smaller requirement)
	if balance.Cmp(minBalance) < 0 {
		t.Skipf("Insufficient funds to run test: %s < %s", WeiToEth(balance), WeiToEth(minBalance))
	}

	// Send a self-transaction with EIP-1559
	priorityFee := big.NewInt(1_000_000_000) // 1 gwei priority fee
	txHash, err := SendEIP1559Transaction(ctx, keyPair, keyPair.Address.Hex(), amount, rpcURL, priorityFee)
	if err != nil {
		t.Fatalf("Failed to send EIP-1559 transaction: %v", err)
	}
	t.Logf("EIP-1559 Transaction sent! Hash: %s", txHash)
	t.Logf("View on Etherscan: %s", FormatTransactionURL(txHash, blockExplorer))

	// Wait for transaction to be mined
	t.Log("Waiting for transaction to be mined...")
	time.Sleep(15 * time.Second)

	// Check new balance
	newBalance, err := GetBalance(ctx, keyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new balance: %v", err)
	}
	t.Logf("New balance: %s wei (%s ETH)", newBalance.String(), WeiToEth(newBalance))
	t.Logf("Spent: %s wei", new(big.Int).Sub(balance, newBalance).String())
}
