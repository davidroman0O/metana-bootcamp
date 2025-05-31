package ethereum

import (
	"context"
	"math/big"
	"os"
	"strings"
	"testing"
	"time"
)

// Constants for the funded HD wallet
const (
	fundedMnemonic = "web dumb weather artwork vibrant garment tongue scale athlete soda sick leaf"
	fundedAddress  = "0xde9ca654aE5a3673d894eba15b63603Fa00F8504"
	testAmount     = "1000000000000" // 0.000001 ETH in wei
)

// TestFundedHDWallet tests that we can import and use the funded HD wallet
func TestFundedHDWallet(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping funded wallet test in short mode")
	}

	// Import HD wallet with the funded mnemonic
	hdKeyPair, err := ImportHDWallet(fundedMnemonic, DefaultHDPath)
	if err != nil {
		t.Fatalf("Failed to import HD wallet: %v", err)
	}

	// Check that the address matches expected
	derivedAddress := hdKeyPair.KeyPair.Address.Hex()
	if !strings.EqualFold(derivedAddress, fundedAddress) {
		t.Fatalf("Derived address %s doesn't match expected %s", derivedAddress, fundedAddress)
	}

	// Get RPC URL
	rpcURL := GetRPCURL()
	ctx := context.Background()

	// Check balance of the funded wallet
	balance, err := GetBalance(ctx, hdKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}

	// Log the balance
	t.Logf("Funded wallet balance: %s wei (%s ETH)", balance.String(), WeiToEth(balance))

	// Ensure the wallet has funds
	if balance.Cmp(big.NewInt(0)) <= 0 {
		t.Fatalf("Wallet has no funds. Please fund the address: %s", fundedAddress)
	}
}

// TestHDWalletChildDerivation tests deriving child accounts from the funded HD wallet
func TestHDWalletChildDerivation(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping HD wallet derivation test in short mode")
	}

	// Import HD wallet with the funded mnemonic
	hdKeyPair, err := ImportHDWallet(fundedMnemonic, DefaultHDPath)
	if err != nil {
		t.Fatalf("Failed to import HD wallet: %v", err)
	}

	// Get RPC URL
	rpcURL := GetRPCURL()
	ctx := context.Background()

	// Derive 3 child accounts and check their addresses and balances
	for i := 0; i < 3; i++ {
		// Derive child account
		childKeyPair, err := DeriveChildAccount(hdKeyPair, uint32(i))
		if err != nil {
			t.Fatalf("Failed to derive account %d: %v", i, err)
		}

		// Get address
		address := childKeyPair.KeyPair.Address.Hex()
		t.Logf("Account %d address: %s", i, address)

		// Get balance
		balance, err := GetBalance(ctx, childKeyPair.KeyPair.Address, rpcURL)
		if err != nil {
			t.Fatalf("Failed to get balance for account %d: %v", i, err)
		}

		// Log the balance
		t.Logf("Account %d balance: %s wei (%s ETH)", i, balance.String(), WeiToEth(balance))
	}
}

// TestEIP1559SmallTransfer tests sending a small EIP-1559 transaction from the funded wallet
func TestEIP1559SmallTransfer(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping live transaction test in short mode")
	}

	// Skip by default to prevent accidentally sending funds
	// Set RUN_LIVE_TRANSACTION_TESTS=true in environment to run this test
	if os.Getenv("RUN_LIVE_TRANSACTION_TESTS") != "true" {
		t.Skip("Skipping live transaction test. Set RUN_LIVE_TRANSACTION_TESTS=true to run")
	}

	// Import HD wallet with the funded mnemonic
	hdKeyPair, err := ImportHDWallet(fundedMnemonic, DefaultHDPath)
	if err != nil {
		t.Fatalf("Failed to import HD wallet: %v", err)
	}

	// Get RPC URL and block explorer URL
	rpcURL := GetRPCURL()
	blockExplorer := GetBlockExplorerURL()
	ctx := context.Background()

	// Check initial balance
	initialBalance, err := GetBalance(ctx, hdKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get initial balance: %v", err)
	}
	t.Logf("Initial balance: %s wei (%s ETH)", initialBalance.String(), WeiToEth(initialBalance))

	// Convert test amount to big.Int
	amount, success := new(big.Int).SetString(testAmount, 10)
	if !success {
		t.Fatalf("Failed to parse amount: %s", testAmount)
	}

	// Make sure we have enough funds
	minRequired := new(big.Int).Add(amount, big.NewInt(10000000000000)) // Amount + 0.00001 ETH for gas
	if initialBalance.Cmp(minRequired) < 0 {
		t.Fatalf("Insufficient funds. Need at least %s ETH", WeiToEth(minRequired))
	}

	// Send a transaction to self (same address)
	toAddress := hdKeyPair.KeyPair.Address.Hex()
	priorityFee := big.NewInt(1_500_000_000) // 1.5 gwei
	t.Logf("Sending %s wei to %s", amount.String(), toAddress)

	// Send the transaction (with EIP-1559)
	txHash, err := SendEIP1559Transaction(ctx, hdKeyPair.KeyPair, toAddress, amount, rpcURL, priorityFee)
	if err != nil {
		t.Fatalf("Failed to send transaction: %v", err)
	}

	// Log the transaction hash
	t.Logf("Transaction sent! Hash: %s", txHash)
	t.Logf("View on Etherscan: %s", FormatTransactionURL(txHash, blockExplorer))

	// Wait for transaction to be mined
	t.Log("Waiting for transaction to be mined...")
	time.Sleep(15 * time.Second)

	// Check new balance
	newBalance, err := GetBalance(ctx, hdKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new balance: %v", err)
	}
	t.Logf("New balance: %s wei (%s ETH)", newBalance.String(), WeiToEth(newBalance))

	// Calculate gas cost
	gasCost := new(big.Int).Sub(initialBalance, newBalance)
	t.Logf("Gas cost: %s wei (%s ETH)", gasCost.String(), WeiToEth(gasCost))

	// Verify transaction in block explorer
	t.Logf("Verify the transaction at: %s", FormatTransactionURL(txHash, blockExplorer))
}

// TestSendToChildAccount tests sending funds from the main account to a child account
func TestSendToChildAccount(t *testing.T) {
	// Skip if we're just doing unit tests (no network)
	if testing.Short() {
		t.Skip("Skipping live transaction test in short mode")
	}

	// Skip by default to prevent accidentally sending funds
	// Set RUN_LIVE_TRANSACTION_TESTS=true in environment to run this test
	if os.Getenv("RUN_LIVE_TRANSACTION_TESTS") != "true" {
		t.Skip("Skipping live transaction test. Set RUN_LIVE_TRANSACTION_TESTS=true to run")
	}

	// Import HD wallet with the funded mnemonic
	hdKeyPair, err := ImportHDWallet(fundedMnemonic, DefaultHDPath)
	if err != nil {
		t.Fatalf("Failed to import HD wallet: %v", err)
	}

	// Derive child account (account 1)
	childKeyPair, err := DeriveChildAccount(hdKeyPair, 1)
	if err != nil {
		t.Fatalf("Failed to derive child account: %v", err)
	}

	// Get child address
	childAddress := childKeyPair.KeyPair.Address.Hex()
	t.Logf("Child account address: %s", childAddress)

	// Get RPC URL and block explorer URL
	rpcURL := GetRPCURL()
	blockExplorer := GetBlockExplorerURL()
	ctx := context.Background()

	// Check initial balances
	mainBalance, err := GetBalance(ctx, hdKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get main balance: %v", err)
	}
	t.Logf("Main account balance: %s wei (%s ETH)", mainBalance.String(), WeiToEth(mainBalance))

	childBalance, err := GetBalance(ctx, childKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get child balance: %v", err)
	}
	t.Logf("Child account initial balance: %s wei (%s ETH)", childBalance.String(), WeiToEth(childBalance))

	// Convert test amount to big.Int
	amount, success := new(big.Int).SetString(testAmount, 10)
	if !success {
		t.Fatalf("Failed to parse amount: %s", testAmount)
	}

	// Make sure we have enough funds
	minRequired := new(big.Int).Add(amount, big.NewInt(10000000000000)) // Amount + 0.00001 ETH for gas
	if mainBalance.Cmp(minRequired) < 0 {
		t.Fatalf("Insufficient funds. Need at least %s ETH", WeiToEth(minRequired))
	}

	// Send a transaction from main account to child account
	t.Logf("Sending %s wei from main to child account", amount.String())

	// Send the transaction (with EIP-1559)
	priorityFee := big.NewInt(1_500_000_000) // 1.5 gwei
	txHash, err := SendEIP1559Transaction(ctx, hdKeyPair.KeyPair, childAddress, amount, rpcURL, priorityFee)
	if err != nil {
		t.Fatalf("Failed to send transaction: %v", err)
	}

	// Log the transaction hash
	t.Logf("Transaction sent! Hash: %s", txHash)
	t.Logf("View on Etherscan: %s", FormatTransactionURL(txHash, blockExplorer))

	// Wait for transaction to be mined
	t.Log("Waiting for transaction to be mined...")
	time.Sleep(15 * time.Second)

	// Check new balances
	newMainBalance, err := GetBalance(ctx, hdKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new main balance: %v", err)
	}
	t.Logf("New main account balance: %s wei (%s ETH)", newMainBalance.String(), WeiToEth(newMainBalance))

	newChildBalance, err := GetBalance(ctx, childKeyPair.KeyPair.Address, rpcURL)
	if err != nil {
		t.Fatalf("Failed to get new child balance: %v", err)
	}
	t.Logf("New child account balance: %s wei (%s ETH)", newChildBalance.String(), WeiToEth(newChildBalance))

	// Calculate gas cost
	totalCost := new(big.Int).Sub(mainBalance, newMainBalance)
	gasCost := new(big.Int).Sub(totalCost, amount)
	t.Logf("Gas cost: %s wei (%s ETH)", gasCost.String(), WeiToEth(gasCost))

	// Verify that child account received the funds
	expectedChildBalance := new(big.Int).Add(childBalance, amount)
	if newChildBalance.Cmp(expectedChildBalance) != 0 {
		t.Fatalf("Child account did not receive the correct amount. Got %s, expected %s",
			newChildBalance.String(), expectedChildBalance.String())
	}

	// Verify transaction in block explorer
	t.Logf("Verify the transaction at: %s", FormatTransactionURL(txHash, blockExplorer))
}
