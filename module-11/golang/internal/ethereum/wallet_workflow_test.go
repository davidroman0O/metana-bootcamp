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

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
)

// TestCompleteWalletWorkflow tests the entire wallet workflow
// This demonstrates all required wallet functionalities for the assignment
func TestCompleteWalletWorkflow(t *testing.T) {
	// Load environment variables
	envLoaded := godotenv.Load("../../../.env") // TODO: fix ugly
	if envLoaded != nil {
		fmt.Println("Warning: No .env file found for workflow test. Using environment variables or defaults.")
	}

	// Skip if running in short mode
	if testing.Short() {
		t.Skip("Skipping complete workflow test in short mode")
	}

	fmt.Println("\n=== ETHEREUM WALLET WORKFLOW DEMONSTRATION ===")
	fmt.Println("This test demonstrates all wallet functionality required for the assignment")

	// PART 1: Key Generation and Address Derivation
	fmt.Println("\n=== KEY GENERATION AND ADDRESS DERIVATION ===")

	// Generate a new wallet
	newKeyPair, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("Failed to generate key pair: %v", err)
	}

	// Display the new wallet details
	newPrivateBytes := crypto.FromECDSA(newKeyPair.PrivateKey)
	newPrivateHex := hex.EncodeToString(newPrivateBytes)
	fmt.Printf("New wallet generated!\n")
	fmt.Printf("Private Key: 0x%s\n", newPrivateHex)
	fmt.Printf("Address: %s\n", newKeyPair.Address.Hex())

	// Verify address derivation from a known private key
	privKeyFromEnv := os.Getenv("TEST_PRIVATE_KEY")
	if privKeyFromEnv == "" {
		privKeyFromEnv = "0bfc6e4d5af0242213b648b43bc8ff48f1817295111c2e228fc61b0aeb1a1271"
	}

	expectedAddrFromEnv := os.Getenv("TEST_ADDRESS")
	if expectedAddrFromEnv == "" {
		expectedAddrFromEnv = "0xA65e6944Fe4Fa192A61a5454fA198a584365A28A"
	}

	// Import the known key
	existingKeyPair, err := ImportPrivateKey(privKeyFromEnv)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Verify address derivation
	derivedAddress := existingKeyPair.Address.Hex()
	fmt.Printf("\nDerived address from existing key: %s\n", derivedAddress)
	fmt.Printf("Expected address: %s\n", expectedAddrFromEnv)

	if !strings.EqualFold(derivedAddress, expectedAddrFromEnv) {
		t.Fatalf("Derived address %s doesn't match expected %s", derivedAddress, expectedAddrFromEnv)
	}
	fmt.Printf("✅ Address derivation verified\n")

	// PART 2: Network and Account Information
	fmt.Println("\n=== NETWORK AND ACCOUNT INFORMATION ===")

	// Get RPC URL
	rpcURL := GetRPCURL()
	fmt.Printf("Using RPC URL: %s\n", rpcURL)

	// Create context for network calls
	ctx := context.Background()

	// Get chain ID
	chainID, err := GetChainID(ctx, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get chain ID: %v", err)
	}
	fmt.Printf("Chain ID: %s\n", chainID.String())

	// Check balance
	balance, err := GetBalance(ctx, existingKeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}
	fmt.Printf("Current Balance: %s wei (%s ETH)\n", balance.String(), WeiToEth(balance))

	// Get nonce
	nonce, err := GetNonce(ctx, existingKeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get nonce: %v", err)
	}
	fmt.Printf("Account Nonce: %d\n", nonce)

	// PART 3: Gas Management
	fmt.Println("\n=== GAS MANAGEMENT ===")

	// Get base fee
	baseFee, err := GetBaseFee(ctx, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get base fee: %v", err)
	}

	// Convert to gwei for display
	baseGwei := new(big.Float).SetInt(baseFee)
	baseGwei = new(big.Float).Quo(baseGwei, new(big.Float).SetFloat64(1e9))

	fmt.Printf("Base Fee: %s gwei\n", baseGwei.Text('f', 2))

	// Set up a test transaction
	valueWei := big.NewInt(1) // Just sending 1 wei

	// Estimate gas
	gasLimit, err := EstimateGas(
		ctx,
		existingKeyPair.Address.Hex(),
		existingKeyPair.Address.Hex(), // Self-transfer
		valueWei,
		rpcURL,
	)
	if err != nil {
		t.Fatalf("Failed to estimate gas: %v", err)
	}
	fmt.Printf("Estimated Gas: %d\n", gasLimit)

	// Calculate gas cost
	priorityTip := big.NewInt(1500000000) // 1.5 gwei tip
	maxFeePerGas := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFeePerGas = new(big.Int).Add(maxFeePerGas, priorityTip)

	// Calculate gas cost in wei and ETH
	gasCost := new(big.Int).Mul(big.NewInt(int64(gasLimit)), maxFeePerGas)
	fmt.Printf("Gas Cost: %s wei (%s ETH)\n", gasCost.String(), WeiToEth(gasCost))

	// Calculate total cost
	totalCost := new(big.Int).Add(valueWei, gasCost)
	fmt.Printf("Total Cost: %s wei (%s ETH)\n", totalCost.String(), WeiToEth(totalCost))

	// PART 4: Transaction Preparation and Signing
	fmt.Println("\n=== TRANSACTION PREPARATION AND SIGNING ===")

	// Check if we have enough funds
	if balance.Cmp(totalCost) < 0 {
		fmt.Printf("⚠️ Insufficient funds for transaction. Have %s ETH, need %s ETH\n",
			WeiToEth(balance), WeiToEth(totalCost))
		t.Fatalf("Insufficient funds for transaction")
	} else {
		fmt.Printf("✅ Sufficient funds available for transaction\n")
	}

	// Convert address to bytes
	toAddress := existingKeyPair.Address
	var toBytes [20]byte
	copy(toBytes[:], toAddress.Bytes())

	// Create transaction
	tx := &TX1559{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: priorityTip,
		MaxFeePerGas:         maxFeePerGas,
		GasLimit:             gasLimit,
		To:                   &toBytes,
		Value:                valueWei,
		Data:                 []byte{}, // Empty data for a simple transfer
	}

	// Print transaction details
	fmt.Println("Raw Transaction Details:")
	fmt.Printf("  Chain ID: %s\n", tx.ChainID.String())
	fmt.Printf("  Nonce: %d\n", tx.Nonce)
	fmt.Printf("  Priority Fee: %s gwei\n", new(big.Float).Quo(
		new(big.Float).SetInt(tx.MaxPriorityFeePerGas),
		new(big.Float).SetFloat64(1e9),
	).Text('f', 2))
	fmt.Printf("  Max Fee: %s gwei\n", new(big.Float).Quo(
		new(big.Float).SetInt(tx.MaxFeePerGas),
		new(big.Float).SetFloat64(1e9),
	).Text('f', 2))
	fmt.Printf("  Gas Limit: %d\n", tx.GasLimit)
	fmt.Printf("  To: %s\n", toAddress.Hex())
	fmt.Printf("  Value: %s wei\n", tx.Value.String())
	fmt.Printf("  Data: %s\n", hex.EncodeToString(tx.Data))

	// Create the RLP encoding
	rlpPayload, err := tx.PayloadRLP()
	if err != nil {
		t.Fatalf("Failed to encode transaction: %v", err)
	}
	fmt.Printf("RLP Encoded Transaction: 0x%s\n", hex.EncodeToString(rlpPayload))

	// Sign the transaction
	signedTx, err := tx.Sign(existingKeyPair.PrivateKey)
	if err != nil {
		t.Fatalf("Failed to sign transaction: %v", err)
	}

	// Print signature details
	fmt.Println("\nTransaction Signature:")
	fmt.Printf("  V: %d\n", tx.V)
	fmt.Printf("  R: %s\n", tx.R.String())
	fmt.Printf("  S: %s\n", tx.S.String())
	fmt.Printf("Serialized Signed Transaction: 0x%s\n", hex.EncodeToString(signedTx))

	// PART 5: Transaction Broadcasting
	fmt.Println("\n=== TRANSACTION BROADCASTING ===")

	// Send the transaction
	fmt.Println("Sending transaction to network...")
	txHash, err := CallRPC(ctx, rpcURL, "eth_sendRawTransaction", []interface{}{"0x" + hex.EncodeToString(signedTx)})
	if err != nil {
		t.Fatalf("Failed to send transaction: %v", err)
	}

	// Format transaction hash
	txHashStr := strings.Trim(string(txHash), "\"")
	fmt.Printf("✅ Transaction sent successfully!\n")
	fmt.Printf("Transaction Hash: %s\n", txHashStr)

	// Format explorer URL
	blockExplorer := GetBlockExplorerURL()
	txURL := FormatTransactionURL(txHashStr, blockExplorer)
	fmt.Printf("View on Etherscan: %s\n", txURL)

	// Wait for transaction to be mined
	fmt.Println("\nWaiting for transaction to be mined...")
	time.Sleep(15 * time.Second)

	// Check new balance
	newBalance, err := GetBalance(ctx, existingKeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new balance: %v", err)
	}
	fmt.Printf("New Balance: %s wei (%s ETH)\n", newBalance.String(), WeiToEth(newBalance))
	fmt.Printf("Spent: %s wei (%s ETH)\n",
		new(big.Int).Sub(balance, newBalance).String(),
		WeiToEth(new(big.Int).Sub(balance, newBalance)))

	fmt.Println("\n=== WORKFLOW DEMONSTRATION COMPLETED SUCCESSFULLY! ===")
	fmt.Println("All required wallet functionalities have been demonstrated")
}

// TestImportFromEnvironment tests importing a key from the environment
func TestImportFromEnvironment(t *testing.T) {
	// Load environment variables
	godotenv.Load("../../../.env")

	// Get private key from environment
	privKey := os.Getenv("TEST_PRIVATE_KEY")
	if privKey == "" {
		t.Skip("TEST_PRIVATE_KEY not set in environment, skipping test")
	}

	expectedAddr := os.Getenv("TEST_ADDRESS")
	if expectedAddr == "" {
		t.Skip("TEST_ADDRESS not set in environment, skipping test")
	}

	// Import the private key
	keyPair, err := ImportPrivateKey(privKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Verify the address
	if !strings.EqualFold(keyPair.Address.Hex(), expectedAddr) {
		t.Fatalf("Imported address %s doesn't match expected %s", keyPair.Address.Hex(), expectedAddr)
	}

	t.Logf("Successfully imported key from environment")
	t.Logf("Address: %s", keyPair.Address.Hex())
}

// TestFund checks if the test account has funds
func TestFund(t *testing.T) {
	// Load environment variables
	godotenv.Load("../../../.env")

	// Skip if running in short mode
	if testing.Short() {
		t.Skip("Skipping fund check in short mode")
	}

	// Get test credentials
	privKey := os.Getenv("TEST_PRIVATE_KEY")
	if privKey == "" {
		privKey = "0bfc6e4d5af0242213b648b43bc8ff48f1817295111c2e228fc61b0aeb1a1271"
	}

	// Import the private key
	keyPair, err := ImportPrivateKey(privKey)
	if err != nil {
		t.Fatalf("Failed to import private key: %v", err)
	}

	// Get RPC URL
	rpcURL := GetRPCURL()
	ctx := context.Background()

	// Check balance
	balance, err := GetBalance(ctx, keyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}

	t.Logf("Test account: %s", keyPair.Address.Hex())
	t.Logf("Balance: %s wei (%s ETH)", balance.String(), WeiToEth(balance))

	// Check if the account has funds
	minBalance := big.NewInt(1000000000000000) // 0.001 ETH
	if balance.Cmp(minBalance) < 0 {
		t.Logf("⚠️ Account has insufficient funds. Please fund the account for transaction tests.")
		t.Logf("You can get Sepolia ETH from a faucet:")
		t.Logf("- https://sepoliafaucet.com/")
		t.Logf("- https://faucet.sepolia.dev/")
	} else {
		t.Logf("✅ Account has sufficient funds for testing")
	}
}
