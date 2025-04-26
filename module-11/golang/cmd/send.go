package cmd

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/metana-bootcamp/ethwallet/internal/ethereum"
)

// NewSendCmd creates a new send command
func NewSendCmd() *cobra.Command {
	var useEnvVar bool
	var verbose bool

	cmd := &cobra.Command{
		Use:   "send <privateKey> <toAddress> <amountWei>",
		Short: "Send Ethereum transaction",
		Long: `Send an Ethereum transaction with the specified parameters.
Amount must be specified in wei.`,
		Args: cobra.RangeArgs(2, 3),
		Run: func(cmd *cobra.Command, args []string) {
			var privateKeyHex string
			var toAddress string
			var amountWei *big.Int

			envLoaded := ethereum.LoadEnvVariables()

			// Get arguments
			if useEnvVar {
				// If using private key from environment variable
				privateKeyHex = os.Getenv("TEST_PRIVATE_KEY")
				if privateKeyHex == "" {
					if !envLoaded {
						fmt.Println("Error: No .env file found and TEST_PRIVATE_KEY environment variable not set")
					} else {
						fmt.Println("Error: TEST_PRIVATE_KEY not set in .env or environment variables")
					}
					os.Exit(1)
				}

				// Get destination and amount from args
				if len(args) < 2 {
					fmt.Println("Error: toAddress and amountWei are required")
					os.Exit(1)
				}
				toAddress = args[0]

				// Parse amount
				amount, success := new(big.Int).SetString(args[1], 10)
				if !success {
					fmt.Println("Error: Invalid amount format. Please provide a decimal value in wei.")
					os.Exit(1)
				}
				amountWei = amount
			} else {
				// If specifying private key directly
				if len(args) < 3 {
					fmt.Println("Error: privateKey, toAddress and amountWei are required")
					os.Exit(1)
				}
				privateKeyHex = args[0]
				toAddress = args[1]

				// Parse amount
				amount, success := new(big.Int).SetString(args[2], 10)
				if !success {
					fmt.Println("Error: Invalid amount format. Please provide a decimal value in wei.")
					os.Exit(1)
				}
				amountWei = amount
			}

			// Validate inputs
			if !isValidAddress(toAddress) {
				fmt.Println("Error: Invalid destination address. Must be in format 0x...")
				os.Exit(1)
			}

			// Import private key
			keyPair, err := ethereum.ImportPrivateKey(privateKeyHex)
			if err != nil {
				fmt.Printf("Error importing private key: %v\n", err)
				os.Exit(1)
			}

			// Display transaction info
			fmt.Println("\n=== TRANSACTION DETAILS ===")
			fmt.Printf("From:   %s\n", keyPair.Address.Hex())
			fmt.Printf("To:     %s\n", toAddress)
			fmt.Printf("Amount: %s wei (%s ETH)\n", amountWei.String(), ethereum.WeiToEth(amountWei))

			// Get RPC URL and block explorer URL
			rpcURL := ethereum.GetRPCURL()
			blockExplorer := ethereum.GetBlockExplorerURL()
			ctx := context.Background()

			// Check balance
			balance, err := ethereum.GetBalance(ctx, keyPair.Address, rpcURL)
			if err != nil {
				fmt.Printf("Error checking balance: %v\n", err)
				os.Exit(1)
			}

			fmt.Printf("Current Balance: %s ETH\n", ethereum.WeiToEth(balance))

			// Display verbose transaction info if requested
			if verbose {
				displayVerboseInfo(ctx, keyPair, toAddress, amountWei, rpcURL)
			}

			// Send transaction
			fmt.Println("\n=== SENDING TRANSACTION ===")
			fmt.Println("Sending transaction to network...")
			txHash, err := ethereum.SendTransaction(ctx, keyPair, toAddress, amountWei, rpcURL)
			if err != nil {
				fmt.Printf("Error sending transaction: %v\n", err)
				os.Exit(1)
			}

			// Display success info
			fmt.Println("\n✅ TRANSACTION SENT SUCCESSFULLY!")
			fmt.Printf("Transaction hash: %s\n", txHash)
			fmt.Printf("View on Etherscan: %s\n", ethereum.FormatTransactionURL(txHash, blockExplorer))

			// Wait for confirmation
			fmt.Println("\nWaiting for transaction confirmation (10 seconds)...")
			time.Sleep(10 * time.Second)

			// Check new balance
			newBalance, err := ethereum.GetBalance(ctx, keyPair.Address, rpcURL)
			if err != nil {
				fmt.Printf("Error getting updated balance: %v\n", err)
				return
			}

			// Calculate difference
			diff := new(big.Int).Sub(balance, newBalance)
			fmt.Println("\n=== TRANSACTION COMPLETE ===")
			fmt.Printf("New balance: %s ETH\n", ethereum.WeiToEth(newBalance))
			fmt.Printf("Amount spent: %s ETH\n", ethereum.WeiToEth(diff))
		},
	}

	// Add flags
	cmd.Flags().BoolVarP(&useEnvVar, "env", "e", false, "Use private key from TEST_PRIVATE_KEY environment variable")
	cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Display verbose transaction information")

	return cmd
}

// Display verbose transaction information
func displayVerboseInfo(ctx context.Context, keyPair *ethereum.KeyPair, toAddress string, amountWei *big.Int, rpcURL string) {
	fmt.Println("\n=== NETWORK INFORMATION ===")
	fmt.Printf("RPC URL: %s\n", rpcURL)

	// Get chain ID
	chainID, err := ethereum.GetChainID(ctx, rpcURL)
	if err != nil {
		fmt.Printf("Error getting chainID: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Chain ID: %s\n", chainID.String())

	// Get nonce
	nonce, err := ethereum.GetNonce(ctx, keyPair.Address, rpcURL)
	if err != nil {
		fmt.Printf("Error getting nonce: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Nonce: %d\n", nonce)

	// Estimate gas
	gasLimit, err := ethereum.EstimateGas(ctx, keyPair.Address.Hex(), toAddress, amountWei, rpcURL)
	if err != nil {
		fmt.Printf("Error estimating gas: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Gas limit: %d\n", gasLimit)

	// Get base fee
	baseFee, err := ethereum.GetBaseFee(ctx, rpcURL)
	if err != nil {
		fmt.Printf("Error getting base fee: %v\n", err)
		baseFee = big.NewInt(30_000_000_000) // 30 gwei default
	}

	// Priority tip - 1.5 gwei on top of base fee
	tip := big.NewInt(1_500_000_000) // 1.5 gwei

	// Calculate max fee: baseFee * 2 + tip
	maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFee = new(big.Int).Add(maxFee, tip)

	fmt.Printf("Base fee: %s wei (%s gwei)\n", baseFee.String(), formatGwei(baseFee))
	fmt.Printf("Priority tip: %s wei (%s gwei)\n", tip.String(), formatGwei(tip))
	fmt.Printf("Max fee: %s wei (%s gwei)\n", maxFee.String(), formatGwei(maxFee))

	// Calculate total cost
	gasCost := new(big.Int).Mul(maxFee, big.NewInt(int64(gasLimit)))
	totalCost := new(big.Int).Add(amountWei, gasCost)

	fmt.Printf("Gas cost (estimated): %s wei (%s ETH)\n", gasCost.String(), ethereum.WeiToEth(gasCost))
	fmt.Printf("Total cost: %s wei (%s ETH)\n", totalCost.String(), ethereum.WeiToEth(totalCost))
}

// Check if an address is valid
func isValidAddress(address string) bool {
	if len(address) != 42 {
		return false
	}

	if address[:2] != "0x" {
		return false
	}

	// Check if address is valid hex
	_, err := ethereum.HexDecode(address)
	return err == nil
}

// Format a wei value to gwei
func formatGwei(wei *big.Int) string {
	gwei := new(big.Float).SetInt(wei)
	gwei.Quo(gwei, new(big.Float).SetFloat64(1e9))
	return fmt.Sprintf("%.6f", gwei)
}
