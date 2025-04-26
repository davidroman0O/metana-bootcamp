# Custom Ethereum Wallet Implementation

## Project Overview

This project implements a basic cryptocurrency wallet from scratch, without relying on existing wallet or transaction libraries like Web3.js or Ethers.js. It satisfies the following key requirements:

1. **Account Nonce**: Manually retrieves and manages the nonce of the account.
2. **Gas Estimation**: Manually estimates the gas required for transactions.
3. **Raw Transaction Creation**: Constructs raw transactions, handles signing, and sends the transaction to the blockchain.

## Allowed Tools and Libraries

As per the requirements, only cryptographic libraries are used for operations like hashing and signing:
- `ethereum-cryptography`: For cryptographic functions like keccak256 hashing and secp256k1 curve operations
- `@ethereumjs/rlp`: For RLP encoding (used in Ethereum transaction serialization)

All wallet functionality including key management, transaction preparation, and transaction signing has been implemented manually without relying on wallet abstractions.

## Environment Configuration

The project uses environment variables for sensitive data and configuration:

1. Copy `.env.example` to `.env` to set up your environment:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to add your test credentials and configuration:
   ```
   # Test account private key (throwaway key for testing purposes only!)
   TEST_PRIVATE_KEY=your_private_key_here_without_0x_prefix
   
   # Derived address from this private key
   TEST_ADDRESS=your_ethereum_address_with_0x_prefix
   
   # Alchemy API Key (optional if using default)
   ALCHEMY_API_KEY=your_alchemy_api_key
   
   # Network Configuration (default values provided)
   CHAIN_ID=11155111
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
   BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
   ```

3. **IMPORTANT**: Never commit your `.env` file to version control. The `.gitignore` file is already set up to exclude it.

## Implementation Details

### Key Components

1. **Key Management**
   - Key generation: Creates a key pair using cryptographic primitives
   - Address derivation: Derives an Ethereum address from a private key without wallet libraries
   - Key storage: Simple localStorage-based key storage

2. **Transaction Handling**
   - Nonce management: Manually tracks the nonce for accounts
   - Gas estimation: Custom implementation for gas estimation
   - Transaction preparation: Manually formats transaction data
   - RLP encoding: Properly encodes transaction data for the Ethereum network
   - Transaction signing: Implements [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md) compliant transaction signing
   - Transaction broadcasting: Uses JSON-RPC to submit transactions

3. **RPC Interactions**
   - JSON-RPC communication: Direct implementation without library abstractions
   - Network interaction: Manually constructs and submits RPC calls

## Test Suite

The project includes several test files to verify different aspects of the wallet implementation:

### Core Test Files

- `wallet.assignment.test.ts`: Comprehensive test demonstrating all required functionality
- `simple.transfer.test.ts`: A simple test to verify address derivation and transaction sending
- `wallet.encoding.test.ts`: Tests for RLP encoding and transaction signing with known values
- `wallet.rpc.test.ts`: Tests for RPC interactions with mocked network responses
- `wallet.transaction.test.ts`: Tests for transaction preparation and signing
- `wallet.smalltransfer.test.ts`: Detailed test focusing specifically on 0.00001 ETH self-transfers

### Utility Test Files

- `wallet.fundcheck.js`: Simple script to check wallet balance
- `wallet.debug.js`: Debugging script for wallet implementation issues
- `wallet.directsend.js`: Script for sending very small transactions
- `test-wallet.ts`: Address derivation and verification tests

### Running Tests

#### Setup

Before running tests, make sure you have:
1. Created the `.env` file with your test credentials (as described above)
2. Funded your test wallet on Sepolia testnet (if running network tests)

#### Running Mock Tests

By default, tests that make real network calls are skipped (using `describe.skip`). To run unit tests and mocked tests:

```bash
npm test
```

#### Running Specific Test Files

```bash
# Run specific test files or test groups
npm test -- -t "Transaction Encoding and Signing"  # For encoding tests
npm test -- -t "Wallet RPC Functions"              # For RPC mock tests
npm test -- -t "Wallet Transaction Unit Tests"     # For transaction unit tests
```

#### Running Network Tests

To run tests that make real network calls (skipped by default):

```bash
# To run the small transaction test
npm test -- -t "Small Transaction Test" --testPathPattern=wallet.smalltransfer
```

Alternatively, you can temporarily remove the `.skip` from the describe block for the test you want to run.

#### Running Individual Test Scripts

```bash
# Run the comprehensive assignment test
npx tsx src/tests/wallet.assignment.test.ts

# Run the simple transfer test
npx tsx src/tests/simple.transfer.test.ts

# Run all tests in sequence with a delay between them
npm run test:all
```

### Troubleshooting Transaction Issues

If you encounter issues with transactions:

1. Check the transaction hash on [Sepolia Etherscan](https://sepolia.etherscan.io)
2. Look for error messages in the test output
3. Verify the wallet has enough funds for both the transaction value and gas
4. Check that the nonce is correct (not reusing a previous nonce)
5. Ensure the gas price is appropriate for current network conditions
6. Validate the RLP encoding of the transaction
7. Verify the signature components (v, r, s)

The `wallet.smalltransfer.test.ts` file contains extensive console.log statements to help debug transaction issues. When running this test, you'll see all the transaction parameters, intermediate values, and results printed to the console.

## Usage

### Starting the Application

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your test credentials
# Then start the application
npm start
```

## Security Notice

- This wallet is for educational purposes only
- All tests should use Sepolia testnet addresses only
- Never use your real private keys with this implementation
- Always store private keys in the `.env` file, never in source code

## Assignment Compliance

This implementation strictly follows the assignment requirements by:
1. Not using existing wallet libraries for account management or transaction handling
2. Manually implementing nonce management, gas estimation, and transaction construction
3. Using only allowed cryptographic libraries for hashing and signing operations
4. Testing on a testnet (Sepolia) 