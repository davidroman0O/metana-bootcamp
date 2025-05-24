package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/metana-bootcamp/ethwallet/internal/ethereum"
)

// NewBalanceCmd creates a new balance command
func NewBalanceCmd() *cobra.Command {
	var useEnvVar bool
	var useHDWallet bool

	cmd := &cobra.Command{
		Use:   "balance [address]",
		Short: "Check Ethereum balance",
		Long:  `Check the balance of an Ethereum address or a private key.`,
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			var address string
			var hasPrivateKey bool
			var isHDWallet bool
			var hdKeyPair *ethereum.HDKeyPair

			// Load environment variables
			envLoaded := ethereum.LoadEnvVariables()

			// Get the address
			if len(args) > 0 {
				// Address provided as argument
				addressArg := args[0]

				// Check if it's a private key or address
				if strings.HasPrefix(addressArg, "0x") && len(addressArg) == 42 {
					// It's an address
					address = addressArg
					hasPrivateKey = false
				} else {
					// Assume it's a private key
					keyPair, err := ethereum.ImportPrivateKey(addressArg)
					if err != nil {
						fmt.Printf("Error importing private key: %v\n", err)
						os.Exit(1)
					}
					address = keyPair.Address.Hex()
					hasPrivateKey = true
					fmt.Printf("Using address derived from private key: %s\n", address)
				}
			} else if useEnvVar {
				if useHDWallet {
					// Use HD wallet from environment
					mnemonic := os.Getenv("HD_MNEMONIC")
					if mnemonic == "" {
						fmt.Println("Error: HD_MNEMONIC not set in environment variables")
						os.Exit(1)
					}

					// Get HD path or use default
					hdPath := os.Getenv("HD_PATH")
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

					address = hdKeyPair.KeyPair.Address.Hex()
					isHDWallet = true
					hasPrivateKey = true
					fmt.Printf("Using address from HD wallet: %s\n", address)
				} else {
					// Use from environment variable
					privateKeyHex := os.Getenv("TEST_PRIVATE_KEY")
					if privateKeyHex == "" {
						if !envLoaded {
							fmt.Println("Error: No .env file found and TEST_PRIVATE_KEY environment variable not set")
						} else {
							fmt.Println("Error: TEST_PRIVATE_KEY not set in .env or environment variables")
						}
						os.Exit(1)
					}

					keyPair, err := ethereum.ImportPrivateKey(privateKeyHex)
					if err != nil {
						fmt.Printf("Error importing private key: %v\n", err)
						os.Exit(1)
					}
					address = keyPair.Address.Hex()
					hasPrivateKey = true
					fmt.Printf("Using address from TEST_PRIVATE_KEY: %s\n", address)
				}
			} else {
				// No address provided and no env var flag
				fmt.Println("Error: Please provide an address, private key, or use the --env flag")
				os.Exit(1)
			}

			// Get RPC URL
			rpcURL := ethereum.GetRPCURL()
			ctx := context.Background()

			// Display basic info
			fmt.Println("\n=== BALANCE CHECK ===")
			fmt.Printf("Checking balance for: %s\n", address)
			fmt.Printf("Network RPC: %s\n", rpcURL)

			// Check balance
			fmt.Println("\nQuerying network...")
			balance, err := ethereum.GetBalance(ctx, ethereum.HexToAddress(address), rpcURL)
			if err != nil {
				fmt.Printf("Error checking balance: %v\n", err)
				os.Exit(1)
			}

			// Display balance
			fmt.Println("\n=== BALANCE RESULT ===")
			fmt.Printf("Address: %s\n", address)
			fmt.Printf("Balance: %s wei\n", balance.String())
			fmt.Printf("Balance: %s ETH\n", ethereum.WeiToEth(balance))

			// If we have a private key, show additional info
			if hasPrivateKey {
				// Get nonce
				nonce, err := ethereum.GetNonce(ctx, ethereum.HexToAddress(address), rpcURL)
				if err != nil {
					fmt.Printf("Error getting nonce: %v\n", err)
					return
				}
				fmt.Printf("Nonce: %d\n", nonce)

				// Get additional info
				blockExplorer := ethereum.GetBlockExplorerURL()
				fmt.Printf("View on Etherscan: %s/address/%s\n", blockExplorer, address)

				// Show HD wallet info if available
				if isHDWallet && hdKeyPair != nil && hdKeyPair.HDInfo != nil {
					fmt.Println("\n=== HD WALLET INFO ===")
					fmt.Printf("Mnemonic: %s\n", hdKeyPair.HDInfo.Mnemonic)
					fmt.Printf("HD Path: %s\n", hdKeyPair.HDInfo.HDPath)
					fmt.Printf("Account Index: %d\n", hdKeyPair.HDInfo.AccountIndex)

					// Show a few derived addresses
					fmt.Println("\n=== DERIVED ADDRESSES ===")
					for i := 0; i < 3; i++ {
						// Only derive additional addresses if not the base account
						if hdKeyPair.HDInfo.AccountIndex != uint32(i) {
							childKeyPair, err := ethereum.DeriveChildAccount(hdKeyPair, uint32(i))
							if err != nil {
								fmt.Printf("Error deriving account %d: %v\n", i, err)
								continue
							}
							fmt.Printf("Account %d: %s\n", i, childKeyPair.KeyPair.Address.Hex())
						} else {
							fmt.Printf("Account %d: %s (current)\n", i, hdKeyPair.KeyPair.Address.Hex())
						}
					}
				}
			}
		},
	}

	// Add flags
	cmd.Flags().BoolVarP(&useEnvVar, "env", "e", false, "Use address from TEST_PRIVATE_KEY environment variable")
	cmd.Flags().BoolVarP(&useHDWallet, "hd", "", false, "Use HD wallet from HD_MNEMONIC environment variable")

	return cmd
}
