// Simple test script to validate our wallet implementation
// Run with: node src/tests/test-wallet.js

// Using dynamic imports for ES modules compatibility
(async () => {
  try {
    // Need to use dynamic imports since we're dealing with TypeScript modules
    const { 
      getAddressFromPrivateKey, 
      getBalance,
      getNonce,
      getGasPrice,
      prepareTransaction,
      signTransaction,
      sendRawTransaction
    } = await import('../lib/wallet.js');
    
    const { SEPOLIA_CONFIG } = await import('../config.js');
    const { bytesToHex } = await import('ethereum-cryptography/utils');

    // Test wallet details - Use the same private key but the correct derived address
    const TEST_PRIVATE_KEY = '0bfc6e4d5af0242213b648b43bc8ff48f1817295111c2e228fc61b0aeb1a1271';

    // Main function to run the test
    async function runWalletTest() {
      try {
        console.log('\n=== WALLET TEST ===');
        
        // 1. Derive the address from the private key
        const derivedAddress = getAddressFromPrivateKey(TEST_PRIVATE_KEY);
        console.log(`Derived wallet address: ${derivedAddress}`);
        
        // 2. Check balance
        const balance = await getBalance(derivedAddress);
        console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);
        
        // Exit if no balance
        if (balance === 0n || balance < BigInt(21000)) {
          console.error('Insufficient balance to execute test. Please fund the wallet.');
          return;
        }
        
        // 3. Get transaction parameters
        const nonce = await getNonce(derivedAddress);
        const gasPrice = await getGasPrice();
        console.log(`Nonce: ${nonce}`);
        console.log(`Gas Price: ${gasPrice} wei (${Number(gasPrice) / 1e9} Gwei)`);
        
        // 4. Create a minimal transaction (self-transfer of 1 wei)
        const tx = {
          nonce: nonce,
          gasPrice: gasPrice,
          gasLimit: BigInt(21000),
          to: derivedAddress,
          value: BigInt(1),
          data: '0x',
          chainId: SEPOLIA_CONFIG.chainId
        };
        
        // 5. Calculate cost
        const gasCost = tx.gasPrice * tx.gasLimit;
        console.log(`Gas cost: ${gasCost} wei (${Number(gasCost) / 1e18} ETH)`);
        
        // 6. Prepare and sign transaction
        const preparedTx = prepareTransaction(tx);
        const signedTx = signTransaction(preparedTx, TEST_PRIVATE_KEY, SEPOLIA_CONFIG.chainId);
        
        console.log('\nSigned transaction:');
        console.log('v:', signedTx.v);
        console.log('r:', signedTx.r.toString());
        console.log('s:', signedTx.s.toString());
        console.log('serialized:', signedTx.serialized);
        
        // 7. Send transaction
        console.log('\nSending transaction...');
        const txHash = await sendRawTransaction(signedTx.serialized);
        
        console.log(`\nTransaction sent successfully!`);
        console.log(`Transaction hash: ${txHash}`);
        console.log(`View on Etherscan: ${SEPOLIA_CONFIG.blockExplorer}/tx/${txHash}`);
        
        // 8. Wait briefly then check balance again
        console.log('\nWaiting for transaction to be mined...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const newBalance = await getBalance(derivedAddress);
        console.log(`New balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
        console.log(`Spent: ${balance - newBalance} wei`);
        
        console.log('\n=== TEST COMPLETE ===');
      } catch (error) {
        console.error('\n=== TEST FAILED ===');
        console.error('Error:', error.message);
        
        if (error.message.includes('insufficient funds')) {
          console.log('\nPossible solution: Make sure this account has funds. Check on Etherscan:');
          console.log(`${SEPOLIA_CONFIG.blockExplorer}/address/${getAddressFromPrivateKey(TEST_PRIVATE_KEY)}`);
        }
      }
    }

    // Run the test
    await runWalletTest();
  } catch (err) {
    console.error('Script initialization error:', err);
  }
})(); 