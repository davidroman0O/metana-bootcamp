package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/metana-bootcamp/ethwallet/cmd"
)

func main() {
	// Create the root command
	rootCmd := &cobra.Command{
		Use:   "ethwallet",
		Short: "Ethereum Wallet CLI",
		Long: `A comprehensive Ethereum wallet CLI without relying on existing wallet libraries.
Perform various operations like key generation, balance checking, and sending transactions.`,
		Version: "1.0.0",
	}

	// Add subcommands
	rootCmd.AddCommand(cmd.NewKeygenCmd())
	rootCmd.AddCommand(cmd.NewSendCmd())
	rootCmd.AddCommand(cmd.NewBalanceCmd())

	// Execute
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %s\n", err)
		os.Exit(1)
	}
}
