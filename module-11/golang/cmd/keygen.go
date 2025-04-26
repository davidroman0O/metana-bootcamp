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

	cmd := &cobra.Command{
		Use:   "keygen",
		Short: "Generate a new Ethereum private key and address",
		Long:  `Generate a new Ethereum private key and corresponding address.`,
		Run: func(cmd *cobra.Command, args []string) {
			// Load existing environment if saving
			if saveToEnv {
				ethereum.LoadEnvVariables()
			}

			// Generate new keys
			keyPair, err := ethereum.GenerateKeyPair()
			if err != nil {
				fmt.Printf("Error generating key pair: %v\n", err)
				os.Exit(1)
			}

			// Get private key as hex string
			privateKeyHex := ethereum.ExportPrivateKey(keyPair)

			// Display the keys
			fmt.Println("\n=== NEW ETHEREUM WALLET ===")
			fmt.Printf("Private Key: %s\n", privateKeyHex)
			fmt.Printf("Address:     %s\n", keyPair.Address.Hex())

			// Save to .env file if requested
			if saveToEnv {
				err := updateEnvFile(privateKeyHex, keyPair.Address.Hex())
				if err != nil {
					fmt.Printf("Error saving to .env file: %v\n", err)
					return
				}
				fmt.Println("\nKeys saved to .env file")
			}

			fmt.Println("\nIMPORTANT: Save your private key somewhere safe!")
			fmt.Println("Your private key is your access to your funds.")
			fmt.Println("Anyone with your private key can access and transfer your funds.")
		},
	}

	cmd.Flags().BoolVarP(&saveToEnv, "save", "s", false, "Save keys to .env file")

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
