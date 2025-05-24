package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/metana-bootcamp/ethwallet/internal/ethereum"
)

// NewKeygenCmd creates a new command for generating Ethereum private keys
func NewKeygenCmd() *cobra.Command {
	var saveToEnv bool
	var useSimpleKey bool
	var hdPath string
	var mnemonic string

	cmd := &cobra.Command{
		Use:   "keygen",
		Short: "Generate a new Ethereum wallet",
		Long:  `Generate a new Ethereum wallet (HD wallet by default) or a simple private key wallet.`,
		Run: func(cmd *cobra.Command, args []string) {
			// Load existing environment if saving
			if saveToEnv {
				ethereum.LoadEnvVariables()
			}

			var privateKeyHex string
			var address string
			var mnemonicPhrase string
			var walletPath string

			// Import existing mnemonic if provided
			if mnemonic != "" {
				// Use provided mnemonic to import HD wallet
				hdKeyPair, err := ethereum.ImportHDWallet(mnemonic, hdPath)
				if err != nil {
					fmt.Printf("Error importing HD wallet from mnemonic: %v\n", err)
					os.Exit(1)
				}

				privateKeyHex = ethereum.ExportPrivateKey(hdKeyPair.KeyPair)
				address = hdKeyPair.KeyPair.Address.Hex()
				mnemonicPhrase = hdKeyPair.HDInfo.Mnemonic
				walletPath = hdKeyPair.HDInfo.HDPath

				// Display the imported wallet
				fmt.Println("\n=== IMPORTED HD WALLET ===")
				fmt.Printf("Address:     %s\n", address)
				fmt.Printf("Private Key: %s\n", privateKeyHex)
				fmt.Printf("Mnemonic:    %s\n", mnemonicPhrase)
				fmt.Printf("HD Path:     %s\n", walletPath)

				if saveToEnv {
					err := updateEnvFileWithHD(privateKeyHex, address, mnemonicPhrase, walletPath)
					if err != nil {
						fmt.Printf("Error saving to .env file: %v\n", err)
						return
					}
					fmt.Println("\nHD Wallet keys saved to .env file")
				}
				return
			}

			// Generate new keys
			if useSimpleKey {
				// Generate simple private key wallet
				keyPair, err := ethereum.GenerateKeyPair()
				if err != nil {
					fmt.Printf("Error generating key pair: %v\n", err)
					os.Exit(1)
				}

				// Export private key
				privateKeyHex = ethereum.ExportPrivateKey(keyPair)
				address = keyPair.Address.Hex()

				// Display the simple wallet
				fmt.Println("\n=== NEW SIMPLE ETHEREUM WALLET ===")
				fmt.Printf("Private Key: %s\n", privateKeyHex)
				fmt.Printf("Address:     %s\n", address)

				// Save to .env file if requested
				if saveToEnv {
					err := updateEnvFile(privateKeyHex, address)
					if err != nil {
						fmt.Printf("Error saving to .env file: %v\n", err)
						return
					}
					fmt.Println("\nKeys saved to .env file")
				}
			} else {
				// Generate HD wallet with mnemonic (default)
				if hdPath == "" {
					hdPath = ethereum.DefaultHDPath
				}

				hdKeyPair, err := ethereum.GenerateHDWallet(hdPath)
				if err != nil {
					fmt.Printf("Error generating HD wallet: %v\n", err)
					os.Exit(1)
				}

				// Get key details
				privateKeyHex = ethereum.ExportPrivateKey(hdKeyPair.KeyPair)
				address = hdKeyPair.KeyPair.Address.Hex()
				mnemonicPhrase = hdKeyPair.HDInfo.Mnemonic
				walletPath = hdKeyPair.HDInfo.HDPath

				// Display the HD wallet
				fmt.Println("\n=== NEW HD ETHEREUM WALLET ===")
				fmt.Printf("Mnemonic:    %s\n", mnemonicPhrase)
				fmt.Printf("HD Path:     %s\n", walletPath)
				fmt.Printf("Address:     %s\n", address)
				fmt.Printf("Private Key: %s\n", privateKeyHex)

				// Save to .env file if requested
				if saveToEnv {
					err := updateEnvFileWithHD(privateKeyHex, address, mnemonicPhrase, walletPath)
					if err != nil {
						fmt.Printf("Error saving to .env file: %v\n", err)
						return
					}
					fmt.Println("\nHD Wallet keys saved to .env file")
				}
			}

			fmt.Println("\nIMPORTANT: Save your private key and/or mnemonic somewhere safe!")
			fmt.Println("Anyone with access to these can access and transfer your funds.")
		},
	}

	// Add flags
	cmd.Flags().BoolVarP(&saveToEnv, "save", "s", false, "Save keys to .env file")
	cmd.Flags().BoolVarP(&useSimpleKey, "simple", "", false, "Generate a simple private key instead of HD wallet")
	cmd.Flags().StringVarP(&hdPath, "path", "p", ethereum.DefaultHDPath, "HD derivation path")
	cmd.Flags().StringVarP(&mnemonic, "mnemonic", "m", "", "Import existing mnemonic instead of generating")

	return cmd
}

// updateEnvFile updates or creates a .env file with the new keys
func updateEnvFile(privateKey, address string) error {
	// Create or update .env file
	envFile, err := os.OpenFile(".env", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("failed to open .env file: %w", err)
	}
	defer envFile.Close()

	// Write keys to file
	content := fmt.Sprintf("# Ethereum Wallet Test Configuration\n\n"+
		"# Test account private key (keep this secret!)\n"+
		"TEST_PRIVATE_KEY=%s\n\n"+
		"# Derived address from this private key\n"+
		"TEST_ADDRESS=%s\n\n", privateKey, address)

	// Preserve existing settings if any
	rpcURL := os.Getenv("SEPOLIA_RPC_URL")
	if rpcURL != "" {
		content += fmt.Sprintf("# Network Configuration\n"+
			"SEPOLIA_RPC_URL=%s\n", rpcURL)
	}

	chainID := os.Getenv("CHAIN_ID")
	if chainID != "" {
		content += fmt.Sprintf("CHAIN_ID=%s\n", chainID)
	}

	blockExplorer := os.Getenv("BLOCK_EXPLORER_URL")
	if blockExplorer != "" {
		content += fmt.Sprintf("BLOCK_EXPLORER_URL=%s\n", blockExplorer)
	}

	_, err = envFile.WriteString(content)
	if err != nil {
		return fmt.Errorf("failed to write to .env file: %w", err)
	}

	return nil
}

// updateEnvFileWithHD updates or creates a .env file with HD wallet info
func updateEnvFileWithHD(privateKey, address, mnemonic, hdPath string) error {
	// Create or update .env file
	envFile, err := os.OpenFile(".env", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("failed to open .env file: %w", err)
	}
	defer envFile.Close()

	// Write keys to file
	content := fmt.Sprintf("# Ethereum Wallet Test Configuration\n\n"+
		"# Test account private key (keep this secret!)\n"+
		"TEST_PRIVATE_KEY=%s\n\n"+
		"# Derived address from this private key\n"+
		"TEST_ADDRESS=%s\n\n"+
		"# HD Wallet Configuration\n"+
		"HD_MNEMONIC=%s\n"+
		"HD_PATH=%s\n\n", privateKey, address, mnemonic, hdPath)

	// Preserve existing settings if any
	rpcURL := os.Getenv("SEPOLIA_RPC_URL")
	if rpcURL != "" {
		content += fmt.Sprintf("# Network Configuration\n"+
			"SEPOLIA_RPC_URL=%s\n", rpcURL)
	}

	chainID := os.Getenv("CHAIN_ID")
	if chainID != "" {
		content += fmt.Sprintf("CHAIN_ID=%s\n", chainID)
	}

	blockExplorer := os.Getenv("BLOCK_EXPLORER_URL")
	if blockExplorer != "" {
		content += fmt.Sprintf("BLOCK_EXPLORER_URL=%s\n", blockExplorer)
	}

	_, err = envFile.WriteString(content)
	if err != nil {
		return fmt.Errorf("failed to write to .env file: %w", err)
	}

	return nil
}
