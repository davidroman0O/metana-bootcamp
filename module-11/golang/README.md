# Ethereum Wallet Go Implementation

A robust, from-scratch implementation of an Ethereum wallet in Go. This project demonstrates all core wallet functionality required for interacting with the Ethereum blockchain without relying on existing wallet libraries.

## Features

- **Key Management**
  - Generate new Ethereum key pairs
  - Import existing private keys
  - Export keys to secure formats
  
- **Address Operations**
  - Derive Ethereum addresses from private keys
  - Verify address checksum
  
- **Account Information**
  - Query account balances
  - Retrieve and track account nonces
  
- **Transaction Management**
  - Create and sign EIP-1559 transactions
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

```bash
./ethwallet keygen 
```

Options:
- `--save`, `-s`: Save keys to .env file

Example output:
```
=== NEW ETHEREUM WALLET ===
Private Key: 0x89add374c145ef89b4720670d97fa7ca1a958aa603d79e0d69a09a0d84d22aa1
Address:     0xd6B8EDc517979A8Bcf86E546Ae251974Cd562D2A

IMPORTANT: Save your private key somewhere safe!
Your private key is your access to your funds.
Anyone with your private key can access and transfer your funds.
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

### Send Transaction

Send a transaction with explicit private key:
```bash
./ethwallet send <private-key> <to-address> <amount-in-wei>
```

Send using private key from environment:
```bash
./ethwallet send --env <to-address> <amount-in-wei>
```

Options:
- `--verbose`, `-v`: Show detailed transaction information
- `--env`, `-e`: Use private key from TEST_PRIVATE_KEY environment variable

Example:
```bash
./ethwallet send 0x89add374c145ef89b4720670d97fa7ca1a958aa603d79e0d69a09a0d84d22aa1 0xRecipientAddress 1000000000000000
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

### Complete Workflow Test

Run a comprehensive workflow test that demonstrates all wallet functionality:
```bash
go test -run TestCompleteWalletWorkflow ./internal/ethereum/... -v
```

### Transaction Tests

Run tests that send actual transactions to the testnet:
```bash
go test -run TestTransactionSending ./internal/ethereum/... -v
```

## Technical Implementation Details

This implementation is built entirely from scratch and covers:

### Transaction Handling

- **EIP-1559 Support**: Modern transaction format with dynamic fee structure
- **Custom RLP Encoding**: Manual implementation of Recursive Length Prefix encoding
- **Transaction Serialization**: Proper serialization and signing according to Ethereum specifications

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
- `golang.org/x/crypto/sha3`: For Keccak256 hashing

## License

MIT 