const { ether, balance } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');

const SideEntranceLenderPool = contract.fromArtifact('SideEntranceLenderPool');
const SideEntranceAttacker = contract.fromArtifact('SideEntranceAttacker');

const { expect } = require('chai');

describe('[Challenge] Side entrance', function () {
    /**
     * VULNERABILITY: Reentrancy Attack via Flash Loan Callback
     * 
     * The SideEntranceLenderPool allows users to take flash loans and tracks user balances
     * for deposits/withdrawals. The critical flaw is that during the flash loan execution,
     * the borrower can call back into the pool and deposit the borrowed funds, creating
     * a balance that can be withdrawn after the flash loan completes.
     * 
     * HOW TO IDENTIFY THIS VULNERABILITY:
     * 1. Look for flash loan implementations that allow arbitrary external calls
     * 2. Check if the contract tracks internal balances separately from ETH balance
     * 3. Identify if users can interact with the contract during flash loan execution
     * 4. Look for missing reentrancy guards on state-changing functions
     * 5. Check if flash loan validation only verifies ETH balance, not accounting
     * 
     * KEY VULNERABILITY PATTERN:
     * ```solidity
     * function flashLoan(uint256 amount) external {
     *     uint256 balanceBefore = address(this).balance;
     *     
     *     // Sends ETH and allows arbitrary execution
     *     IFlashLoanEtherReceiver(msg.sender).execute{value: amount}();
     *     
     *     // Only checks ETH balance, not internal accounting!
     *     require(address(this).balance >= balanceBefore, "Flash loan not paid back");
     * }
     * ```
     * 
     * ATTACK FLOW:
     * 1. Attacker requests flash loan for entire pool balance (1000 ETH)
     * 2. Pool sends 1000 ETH to attacker and calls execute()
     * 3. In execute(), attacker deposits the 1000 ETH back to the pool
     * 4. This credits the attacker's balance in the pool's mapping
     * 5. Flash loan check passes (ETH balance unchanged)
     * 6. Attacker withdraws their "deposited" balance, draining the pool
     * 
     * IMPACT:
     * - Complete theft of all funds in the pool (1000 ETH)
     * - Pool is left with 0 balance
     * - All user deposits are stolen
     */

    const [deployer, attacker, ...otherAccounts] = accounts;

    const ETHER_IN_POOL = ether('1000');

    before(async function () {
        /** SETUP SCENARIO */
        this.pool = await SideEntranceLenderPool.new({ from: deployer });
        
        await this.pool.deposit({ from: deployer, value: ETHER_IN_POOL });

        this.attackerInitialEthBalance = await balance.current(attacker);

        expect(
            await balance.current(this.pool.address)
        ).to.be.bignumber.equal(ETHER_IN_POOL);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        
        /**
         * THE EXPLOIT MECHANISM:
         * 
         * The SideEntranceAttacker contract implements the attack:
         * 
         * 1. attack() function:
         *    - Gets pool balance (1000 ETH)
         *    - Calls pool.flashLoan(1000 ETH)
         * 
         * 2. execute() callback (called by pool during flash loan):
         *    - Receives 1000 ETH from the pool
         *    - Immediately calls pool.deposit{value: 1000 ETH}()
         *    - This credits attacker contract with 1000 ETH balance in the pool
         * 
         * 3. Flash loan validation in pool:
         *    - Checks: address(this).balance >= balanceBefore ✓
         *    - Pool balance is unchanged (1000 ETH went out, 1000 ETH came back)
         *    - Flash loan succeeds!
         * 
         * 4. Back in attack() function:
         *    - Calls pool.withdraw() to get the 1000 ETH balance
         *    - Transfers ETH to the attacker EOA
         * 
         * CRITICAL INSIGHT:
         * The pool only validates that its ETH balance hasn't decreased during the
         * flash loan. It doesn't check that the internal accounting (balances mapping)
         * hasn't been manipulated. This allows the attacker to "convert" the flash
         * loan into a legitimate balance.
         * 
         * PREVENTION:
         * - Use reentrancy guards (OpenZeppelin's ReentrancyGuard)
         * - Implement a "flash loan in progress" flag
         * - Prevent deposits/withdrawals during flash loan execution
         * - Track borrowed amounts separately from user balances
         * - Follow check-effects-interactions pattern
         */
        
        // Deploy the attacker contract
        this.attackerContract = await SideEntranceAttacker.new(this.pool.address, { from: attacker });
        
        // Execute the attack - this single call drains the entire pool!
        await this.attackerContract.attack({ from: attacker });
        
        /**
         * What just happened:
         * 1. Flash loan of 1000 ETH was taken
         * 2. During the loan, the ETH was deposited back
         * 3. After the loan, the deposit was withdrawn
         * 4. Pool is now empty, attacker has 1000 ETH
         */
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(
            await balance.current(this.pool.address)
        ).to.be.bignumber.equal('0');
        
        // Not checking exactly how much is the final balance of the attacker,
        // because it'll depend on how much gas the attacker spends in the attack
        // If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
        expect(
            await balance.current(attacker)
        ).to.be.bignumber.gt(this.attackerInitialEthBalance);
    });
});
