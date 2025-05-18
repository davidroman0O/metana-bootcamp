# Ethereum Wallet Go Implementation

A robust, from-scratch implementation of an Ethereum wallet in Go. This project demonstrates all core wallet functionality required for interacting with the Ethereum blockchain without relying on existing wallet libraries.

## Features

- **Key Management**
  - Generate new Ethereum key pairs
  - Import existing private keys
  - Export keys to secure formats
  - **HD Wallet Support (BIP-39 & BIP-44)**
    - Generate and manage mnemonic phrases
    - Derive multiple accounts from a single seed
    - Standard derivation path support
  
- **Address Operations**
  - Derive Ethereum addresses from private keys
  - Verify address checksum
  
- **Account Information**
  - Query account balances
  - Retrieve and track account nonces
  
- **Transaction Management**
  - **EIP-1559 Transactions (Default)**
    - Dynamic fee market support with priority fees
    - Optimal gas estimation for Ethereum post-London fork
  - Legacy transaction support for backward compatibility
  - Estimate gas requirements
  - Calculate optimal gas fees
  - Broadcast transactions to the network
  
- **RPC Communication**
  - Custom JSON-RPC implementation
  - Error handling and retry logic
  
- **Security Focused**
  - Private key security best practices
  - EIP-155 replay protection
  - Secure key generation

## Getting Started

### Prerequisites

- Go 1.18 or higher
- Internet connection for blockchain interactions

### Installation

```bash
# Clone the repository
git clone github.com/metana-bootcamp/ethwallet
cd ethwallet

# Build the application
go build -o ethwallet
```

### Configuration

Create a `.env` file in the project root with the following configuration:

```
# Test account private key (throwaway key for testing purposes only!)
TEST_PRIVATE_KEY=your_private_key_here

# Derived address from this private key
TEST_ADDRESS=your_address_here

# HD Wallet Configuration
HD_MNEMONIC=your_mnemonic_phrase_here
HD_PATH=m/44'/60'/0'/0/0

# Alchemy API Key
ALCHEMY_API_KEY=your_api_key_here

# Network Configuration
CHAIN_ID=11155111
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

You can also generate this file automatically using the keygen command with the `--save` flag.

## Command-Line Interface

The wallet exposes several commands through a convenient CLI:

### Generate a New Wallet

#### Simple Private Key Wallet
```bash
./ethwallet keygen --simple
```

#### HD Wallet (Default)
```bash
./ethwallet keygen
```

Options:
- `--save`, `-s`: Save keys to .env file
- `--simple`: Generate a simple private key instead of HD wallet
- `--path`, `-p`: Specify HD derivation path (default: m/44'/60'/0'/0/0)
- `--mnemonic`, `-m`: Import existing mnemonic instead of generating new one

Example output for HD wallet:
```
=== NEW HD ETHEREUM WALLET ===
Mnemonic:    web dumb weather artwork vibrant garment tongue scale athlete soda sick leaf
HD Path:     m/44'/60'/0'/0/0
Address:     0xde9ca654aE5a3673d894eba15b63603Fa00F8504
Private Key: 0x5ef9d88adafeeb23bd7dd519f4c0882e2f0565ce8b11def604e1a60fd49881a0

HD Wallet keys saved to .env file

IMPORTANT: Save your private key and/or mnemonic somewhere safe!
Anyone with access to these can access and transfer your funds.
```

### Check Account Balance

Check balance by address:
```bash
./ethwallet balance 0xYourAddressHere
```

Check balance by private key (enters the key directly):
```bash
./ethwallet balance 0xYourPrivateKeyHere
```

Use private key from environment variables:
```bash
./ethwallet balance --env
```

Use HD wallet from environment variables:
```bash
./ethwallet balance --env --hd
```

### Send Transaction

Send a transaction with explicit private key:
```bash
./ethwallet send <private-key> <to-address> <amount-wei>
```

Send using private key from environment:
```bash
./ethwallet send --env <to-address> <amount-wei>
```

Send using HD wallet from environment:
```bash
./ethwallet send --env --hd <to-address> <amount-wei>
```

Options:
- `--verbose`, `-v`: Show detailed transaction information
- `--env`, `-e`: Use private key from TEST_PRIVATE_KEY environment variable
- `--hd`: Use HD wallet from HD_MNEMONIC environment variable
- `--legacy`, `-l`: Use legacy transaction instead of EIP-1559
- `--priority-fee`, `-f`: Set priority fee in Gwei for EIP-1559 transactions (default: 1.5)

Example:
```bash
# EIP-1559 transaction (default)
./ethwallet send --env 0xRecipientAddress 1000000000000000

# Legacy transaction
./ethwallet send --env --legacy 0xRecipientAddress 1000000000000000

# Custom priority fee
./ethwallet send --env --priority-fee 2.5 0xRecipientAddress 1000000000000000
```

## Test Suite

The project includes a comprehensive test suite that covers all functionality:

### Unit Tests

Run unit tests (no network interaction):
```bash
go test -short ./internal/ethereum/... -v
```

### Network Tests

Run tests that interact with the Ethereum testnet:
```bash
go test -run TestRPCFunctions ./internal/ethereum/... -v
```

### HD Wallet Tests

Run tests for HD wallet functionality using a funded wallet:
```bash
go test -run TestFundedHDWallet ./internal/ethereum/... -v
go test -run TestHDWalletChildDerivation ./internal/ethereum/... -v
```

### EIP-1559 Transaction Tests

Run tests that send actual EIP-1559 transactions:
```bash
# Set environment variable to enable transaction tests
export RUN_LIVE_TRANSACTION_TESTS=true

# Run EIP-1559 transaction test
go test -run TestEIP1559SmallTransfer ./internal/ethereum/... -v

# Run test to send funds between HD wallet accounts
go test -run TestSendToChildAccount ./internal/ethereum/... -v
```

### Complete Workflow Test

Run a comprehensive workflow test that demonstrates all wallet functionality:
```bash
go test -run TestCompleteWalletWorkflow ./internal/ethereum/... -v
```

## Technical Implementation Details

This implementation is built entirely from scratch and covers:

### Transaction Handling

- **EIP-1559 Support**: Modern transaction format with dynamic fee structure
  - Base fee calculation from recent blocks
  - Priority fee (tip) for miners
  - Max fee cap to protect against price spikes
- **Legacy Transactions**: Traditional gas price model for backward compatibility
- **Custom RLP Encoding**: Manual implementation of Recursive Length Prefix encoding
- **Transaction Serialization**: Proper serialization and signing according to Ethereum specifications

### HD Wallet Implementation

- **BIP-39 Mnemonic Generation**: Industry-standard seed phrase generation (12 words)
- **BIP-32 HD Derivation**: Hierarchical deterministic key derivation
- **BIP-44 Path Structure**: Standard m/44'/60'/0'/0/i path for Ethereum accounts
- **Multiple Account Support**: Derive unlimited accounts from the same seed

### Cryptographic Operations

- **Secp256k1 Curve**: Used for cryptographic operations
- **Keccak256 Hashing**: For address derivation and message signing
- **ECDSA Signatures**: For transaction signing with proper recovery ID

### RPC Communications

- **Custom JSON-RPC Client**: Handles communication with Ethereum nodes
- **Response Parsing**: Properly handles and parses RPC responses
- **Error Handling**: Robust error handling for network issues

## Security Notice

- **Private Keys**: Never share private keys or commit them to version control
- **Mnemonics**: Treat your mnemonic phrase with the same security as your private key
- **Test Networks**: Use only test networks (like Sepolia) for experimentation
- **Small Transactions**: Use minimal amounts for testing

## API Key Notice

The included Alchemy API key has domain/IP restrictions configured for security purposes. If you need to use your own key, please replace it in the `.env` file.

## Dependencies

This implementation uses minimal external dependencies, primarily:

- `github.com/ethereum/go-ethereum`: For cryptographic primitives only
- `github.com/joho/godotenv`: For environment variable management
- `github.com/spf13/cobra`: For the command-line interface
- `github.com/decred/dcrd/dcrec/secp256k1/v4`: For secp256k1 operations
- `github.com/tyler-smith/go-bip32`: For HD wallet derivation
- `github.com/tyler-smith/go-bip39`: For mnemonic phrase handling
- `golang.org/x/crypto/sha3`: For Keccak256 hashing

## License

MIT 