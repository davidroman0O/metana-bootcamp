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
	var useLegacy bool
	var useMnemonic bool
	var priorityFeeGwei float64

	cmd := &cobra.Command{
		Use:   "send <privateKey> <toAddress> <amountWei>",
		Short: "Send Ethereum transaction",
		Long: `Send an Ethereum transaction with the specified parameters.
Amount must be specified in wei. Uses EIP-1559 transaction by default.`,
		Args: cobra.RangeArgs(2, 3),
		Run: func(cmd *cobra.Command, args []string) {
			var privateKeyHex string
			var toAddress string
			var amountWei *big.Int
			var fromAddress string
			var keyPair *ethereum.KeyPair
			var hdKeyPair *ethereum.HDKeyPair

			envLoaded := ethereum.LoadEnvVariables()

			// Get arguments
			if useEnvVar {
				// If using private key from environment variable
				if useMnemonic {
					// Use mnemonic from environment
					mnemonic := os.Getenv("HD_MNEMONIC")
					hdPath := os.Getenv("HD_PATH")

					if mnemonic == "" {
						fmt.Println("Error: HD_MNEMONIC not set in environment variables")
						os.Exit(1)
					}

					if hdPath == "" {
						hdPath = ethereum.DefaultHDPath
					}

					// Import HD wallet
					var err error
					hdKeyPair, err = ethereum.ImportHDWallet(mnemonic, hdPath)
					if err != nil {
						fmt.Printf("Error importing HD wallet: %v\n", err)
						os.Exit(1)
					}

					privateKeyHex = ethereum.ExportPrivateKey(hdKeyPair.KeyPair)
					keyPair = hdKeyPair.KeyPair
					fromAddress = keyPair.Address.Hex()
				} else {
					// Use private key from environment
					privateKeyHex = os.Getenv("TEST_PRIVATE_KEY")
					if privateKeyHex == "" {
						if !envLoaded {
							fmt.Println("Error: No .env file found and TEST_PRIVATE_KEY environment variable not set")
						} else {
							fmt.Println("Error: TEST_PRIVATE_KEY not set in .env or environment variables")
						}
						os.Exit(1)
					}

					// Import key
					var err error
					keyPair, err = ethereum.ImportPrivateKey(privateKeyHex)
					if err != nil {
						fmt.Printf("Error importing private key: %v\n", err)
						os.Exit(1)
					}
					fromAddress = keyPair.Address.Hex()
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

				// Import key
				var err error
				keyPair, err = ethereum.ImportPrivateKey(privateKeyHex)
				if err != nil {
					fmt.Printf("Error importing private key: %v\n", err)
					os.Exit(1)
				}
				fromAddress = keyPair.Address.Hex()
			}

			// Validate inputs
			if !isValidAddress(toAddress) {
				fmt.Println("Error: Invalid destination address. Must be in format 0x...")
				os.Exit(1)
			}

			// Display transaction info
			fmt.Println("\n=== TRANSACTION DETAILS ===")
			fmt.Printf("From:   %s\n", fromAddress)
			fmt.Printf("To:     %s\n", toAddress)
			fmt.Printf("Amount: %s wei (%s ETH)\n", amountWei.String(), ethereum.WeiToEth(amountWei))
			if useLegacy {
				fmt.Printf("Type:   Legacy\n")
			} else {
				fmt.Printf("Type:   EIP-1559\n")
			}

			if !useLegacy {
				fmt.Printf("Priority Fee: %.2f Gwei\n", priorityFeeGwei)
			}

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
				displayVerboseInfo(ctx, keyPair, toAddress, amountWei, rpcURL, useLegacy, priorityFeeGwei)
			}

			// Send transaction
			fmt.Println("\n=== SENDING TRANSACTION ===")
			fmt.Println("Sending transaction to network...")

			var txHash string

			if useLegacy {
				// Send legacy transaction
				txHash, err = ethereum.SendTransaction(ctx, keyPair, toAddress, amountWei, rpcURL)
			} else {
				// Send EIP-1559 transaction
				priorityFeeWei := big.NewInt(int64(priorityFeeGwei * 1e9))
				txHash, err = ethereum.SendEIP1559Transaction(ctx, keyPair, toAddress, amountWei, rpcURL, priorityFeeWei)
			}

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
	cmd.Flags().BoolVarP(&useLegacy, "legacy", "l", false, "Use legacy transaction instead of EIP-1559")
	cmd.Flags().BoolVarP(&useMnemonic, "hd", "", false, "Use HD wallet from HD_MNEMONIC environment variable")
	cmd.Flags().Float64VarP(&priorityFeeGwei, "priority-fee", "f", 1.5, "Priority fee in Gwei for EIP-1559 transactions")

	return cmd
}

// Display verbose transaction information
func displayVerboseInfo(ctx context.Context, keyPair *ethereum.KeyPair, toAddress string, amountWei *big.Int, rpcURL string, useLegacy bool, priorityFeeGwei float64) {
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

	if useLegacy {
		// Get gas price for legacy transaction
		gasPrice, err := ethereum.GetGasPrice(ctx, rpcURL)
		if err != nil {
			fmt.Printf("Error getting gas price: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Gas price: %s wei (%s gwei)\n", gasPrice.String(), formatGwei(gasPrice))

		// Calculate gas cost
		gasCost := new(big.Int).Mul(gasPrice, big.NewInt(int64(gasLimit)))
		totalCost := new(big.Int).Add(amountWei, gasCost)

		fmt.Printf("Gas cost (estimated): %s wei (%s ETH)\n", gasCost.String(), ethereum.WeiToEth(gasCost))
		fmt.Printf("Total cost: %s wei (%s ETH)\n", totalCost.String(), ethereum.WeiToEth(totalCost))
	} else {
		// Get base fee for EIP-1559
		baseFee, err := ethereum.GetBaseFee(ctx, rpcURL)
		if err != nil {
			fmt.Printf("Error getting base fee: %v\n", err)
			baseFee = big.NewInt(30_000_000_000) // 30 gwei default
		}

		// Priority tip
		priorityFeeWei := big.NewInt(int64(priorityFeeGwei * 1e9))

		// Calculate max fee: baseFee * 2 + tip
		maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
		maxFee = new(big.Int).Add(maxFee, priorityFeeWei)

		fmt.Printf("Base fee: %s wei (%s gwei)\n", baseFee.String(), formatGwei(baseFee))
		fmt.Printf("Priority tip: %s wei (%s gwei)\n", priorityFeeWei.String(), formatGwei(priorityFeeWei))
		fmt.Printf("Max fee: %s wei (%s gwei)\n", maxFee.String(), formatGwei(maxFee))

		// Calculate total cost
		gasCost := new(big.Int).Mul(maxFee, big.NewInt(int64(gasLimit)))
		totalCost := new(big.Int).Add(amountWei, gasCost)

		fmt.Printf("Gas cost (estimated): %s wei (%s ETH)\n", gasCost.String(), ethereum.WeiToEth(gasCost))
		fmt.Printf("Total cost: %s wei (%s ETH)\n", totalCost.String(), ethereum.WeiToEth(totalCost))
	}
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
