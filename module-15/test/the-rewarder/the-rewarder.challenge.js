const { ether, time } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');

const FlashLoanerPool = contract.fromArtifact('FlashLoanerPool');
const TheRewarderPool = contract.fromArtifact('TheRewarderPool');
const DamnValuableToken = contract.fromArtifact('DamnValuableToken');
const RewardToken = contract.fromArtifact('RewardToken');
const AccountingToken = contract.fromArtifact('AccountingToken');
const TheRewarderAttacker = contract.fromArtifact('TheRewarderAttacker');

const { expect } = require('chai');

describe('[Challenge] The rewarder', function () {
    /**
     * VULNERABILITY: Flash Loan Snapshot Manipulation for Reward Gaming
     * 
     * The RewarderPool distributes rewards based on the user's token balance at the moment of
     * deposit/withdrawal. This creates a vulnerability where an attacker can use flash loans to
     * temporarily inflate their balance, claim disproportionate rewards, and return the funds.
     * 
     * HOW TO IDENTIFY THIS VULNERABILITY:
     * 1. Look for reward systems based on instantaneous balance snapshots
     * 2. Check if rewards can be claimed immediately after deposits
     * 3. Identify missing time-weighted average balance calculations
     * 4. Look for reward pools vulnerable to flash loan manipulation
     * 5. Check if there's a minimum staking period before reward eligibility
     * 
     * KEY VULNERABILITY PATTERN:
     * - Rewards are distributed based on current balance: balanceOf(msg.sender)
     * - No time component in reward calculation
     * - Snapshot taken at deposit/withdrawal time
     * - Flash loans allow massive temporary balances at zero cost
     * 
     * ATTACK SCENARIO:
     * 1. Wait for new reward round (5 days since last round)
     * 2. Take flash loan for massive amount (1M tokens)
     * 3. Deposit to trigger reward snapshot with huge balance
     * 4. Claim rewards based on inflated balance
     * 5. Withdraw immediately
     * 6. Repay flash loan
     * 7. Keep the rewards (nearly 100% of the round's rewards)
     * 
     * IMPACT:
     * - Legitimate stakers get minimal rewards (4 users get ~0% instead of 25% each)
     * - Attacker claims ~100% of rewards with zero capital at risk
     * - Breaks the fairness of the reward distribution system
     */

    const [deployer, alice, bob, charlie, david, attacker, ...otherAccounts] = accounts;
    const users = [alice, bob, charlie, david];

    const TOKENS_IN_LENDER_POOL = ether('1000000');

    before(async function () {
        /** SETUP SCENARIO */
        this.liquidityToken = await DamnValuableToken.new({ from: deployer });
        this.flashLoanPool = await FlashLoanerPool.new(this.liquidityToken.address, { from: deployer });

        // Set initial token balance of the pool offering flash loans
        await this.liquidityToken.transfer(this.flashLoanPool.address, TOKENS_IN_LENDER_POOL, { from: deployer });

        this.rewarderPool = await TheRewarderPool.new(this.liquidityToken.address, { from: deployer });
        this.rewardToken = await RewardToken.at(await this.rewarderPool.rewardToken());
        this.accountingToken = await AccountingToken.at(await this.rewarderPool.accToken());

        // Alice, Bob, Charlie and David deposit 100 tokens each
        for (let i = 0; i < users.length; i++) {
            const amount = ether('100');
            await this.liquidityToken.transfer(users[i], amount, { from: deployer });
            await this.liquidityToken.approve(this.rewarderPool.address, amount, { from: users[i] });
            await this.rewarderPool.deposit(amount, { from: users[i] });
            expect(
                await this.accountingToken.balanceOf(users[i])
            ).to.be.bignumber.eq(amount);
        }
        expect(await this.accountingToken.totalSupply()).to.be.bignumber.eq(ether('400'));
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq('0');

        // Advance time 5 days so that depositors can get rewards
        await time.increase(time.duration.days(5));
        
        // Each depositor gets 25 reward tokens
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.distributeRewards({ from: users[i] });
            expect(
                await this.rewardToken.balanceOf(users[i])
            ).to.be.bignumber.eq(ether('25'));
        }
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq(ether('100'));
        
        // Two rounds should have occurred so far
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.bignumber.eq('2');
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        
        /**
         * THE EXPLOIT MECHANISM:
         * 
         * Looking at TheRewarderPool contract:
         * - distributeRewards() is called on deposit/withdraw
         * - It checks if 5 days have passed for a new round
         * - Rewards are calculated based on current accToken balance
         * - accToken is minted 1:1 with liquidityToken deposits
         * 
         * The Attack Flow:
         * 1. Advance time 5 days to enable new reward round
         * 2. Take flash loan of 1,000,000 tokens (entire pool)
         * 3. In flash loan callback:
         *    a. Approve rewarder pool to spend tokens
         *    b. Deposit 1M tokens -> get 1M accTokens
         *    c. This triggers distributeRewards() for round 3
         *    d. Snapshot: attacker has 1M, others have 100 each
         *    e. Attacker gets: 1M / (1M + 400) ≈ 99.96% of rewards
         *    f. Withdraw 1M tokens immediately
         *    g. Repay flash loan
         * 4. Transfer reward tokens to attacker EOA
         * 
         * CRITICAL INSIGHT:
         * The reward calculation uses the balance AT THE MOMENT of the transaction.
         * Flash loans allow us to have a massive balance for just that moment,
         * gaming the snapshot mechanism.
         */
        
        // Advance time to trigger a new rewards round (5 days)
        await time.increase(time.duration.days(5));
        
        // Deploy the attacker contract
        this.attackerContract = await TheRewarderAttacker.new(
            this.flashLoanPool.address,
            this.rewarderPool.address,
            this.liquidityToken.address,
            this.rewardToken.address,
            { from: attacker }
        );
        
        // Execute the attack with the entire flash loan pool balance
        const flashLoanBalance = await this.liquidityToken.balanceOf(this.flashLoanPool.address);
        await this.attackerContract.attack(flashLoanBalance, { from: attacker });
        
        /**
         * What happened in the attack:
         * 1. Flash loan of 1,000,000 tokens taken
         * 2. Deposited to rewarder pool, triggering round 3 snapshot
         * 3. Attacker's balance at snapshot: 1,000,000 tokens
         * 4. Total pool balance: 1,000,400 tokens
         * 5. Attacker's share: 99.96% of rewards
         * 6. Withdrew and repaid flash loan
         * 7. Kept the rewards worth ~100 tokens
         * 
         * PREVENTION STRATEGIES:
         * - Use time-weighted average balances (aka track balance * time)
         * - Implement minimum staking periods before reward eligibility
         * - Add withdrawal delays or vesting periods for rewards
         * - Use commit-reveal schemes for reward distribution (eventually)
         * - Consider using Chainlink VRF for random snapshot times (or any other good oracle)
         * - Implement timelocks between deposit and first reward claim
         * - Use merkle trees for periodic reward distributions (a snapshot and tadam)
         */
    });

    after(async function () {
        // Only one round should have taken place
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.bignumber.eq('3');

        // Users should not get more rewards this round
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.distributeRewards({ from: users[i] });
            expect(
                await this.rewardToken.balanceOf(users[i])
            ).to.be.bignumber.eq(ether('25'));
        }
        
        // Rewards must have been issued to the attacker account
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.gt(ether('100'));
        expect(await this.rewardToken.balanceOf(attacker)).to.be.bignumber.gt('0');
    });
});
