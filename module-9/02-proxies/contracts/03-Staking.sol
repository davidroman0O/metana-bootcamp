// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // slither version constraint

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// Using the ERC721 receiver
/// Stake NFTs
/// Users can sed NFTs and withdraw 10 ERC20 every 24 hours as reward
/// Users can withdraw NFT at any time
/// Reset any kind of timer when staking, prevent abuse
/// Fake the time obviously
/// Do not force people to withdraw NFT to get token, just let's them get their money


contract StakingVisageToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    
    uint256 public constant TOKENS_PER_ETH = 10 * 1e18;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address deployer) public initializer {
        __ERC20_init("Visage Token", "VSG");
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(deployer);
    }

    event Received(address indexed sender, uint256 value);
    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    fallback() external payable { revert("INFO: Use direct ETH transfers or mint() to get tokens"); }

    receive() external payable {
        emit Received(msg.sender, msg.value);
        mint(msg.sender);
    }

    function mint(address buyer) public payable {
        require(msg.value > 0, "send eth to buy tokens");
        uint256 tokensToMint = (TOKENS_PER_ETH * msg.value) / 1 ether;
        emit Mint(buyer, msg.value, tokensToMint, totalSupply());
        _mint(buyer, tokensToMint);
    }

    // Used for rewards
    function mintToken(address minter, uint256 tokens) public onlyOwner {
        _mint(minter, tokens);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return super.allowance(owner, spender);
    }

    function balanceOf(address account) public view override returns (uint256) {
        return super.balanceOf(account);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

contract StakingVisageNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    uint256 private tokenSupply;
    uint256 constant private MAX_SUPPLY = 11; 

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address deployer) public initializer {
        __ERC721_init("Visage NFT", "NVSG");
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        tokenSupply = 1;
        _transferOwnership(deployer);
    }

    receive() external payable { revert("INFO: NFTs cannot be purchased with ETH directly"); }
    fallback() external payable { revert("INFO: NFTs cannot be purchased with ETH directly"); }
    
    function mint(address minter) external onlyOwner nonReentrant {
        require(tokenSupply < MAX_SUPPLY, "no more NFT to mint");
        uint256 supplyToMint = tokenSupply;
        tokenSupply++;
        _safeMint(minter, supplyToMint);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

contract VisageStaking is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721ReceiverUpgradeable, UUPSUpgradeable {

    struct Stake {
        address owner;
        uint256 whenStaked;
        uint256 lastClaim;
    }

    // stake info for each tokenID
    mapping(uint256 => Stake) public stakes;

    uint256 public constant REWARD_RATE = 10 * 1e18; // 10 tokens per 24 hours
    uint256 public constant REWARD_INTERVAL = 24 hours;
    // uint256 public constant REWARD_INTERVAL = 10 seconds;

    StakingVisageNFT public _nft;
    StakingVisageToken public _token;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address token, address nft) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _token = StakingVisageToken(payable(token));
        _nft = StakingVisageNFT(payable(nft));
        _transferOwnership(initialOwner);
    }

    event Staked(address indexed staker, uint256 tokenID);
    event Unstaked(address indexed staker, uint256 tokenID);
    event RewardClaimed(address indexed staker, uint256 tokenID, uint256 amount);

    fallback() external payable { revert("INFO: Staking requires specific function calls"); }
    receive() external payable { revert("INFO: Staking requires specific function calls"); }

    function acceptNftOwnership() external onlyOwner {
        _nft.transferOwnership(owner());
    }
    
    function acceptTokenOwnership() external onlyOwner {
        _token.transferOwnership(owner());
    }

    function getAddresses() external view returns (address tokenAddress, address nftAddress) {
        return (address(_token), address(_nft));
    }

    function onERC721Received(
        address /**/,
        address from,
        uint256 tokenID,
        bytes calldata /**/
    ) external override returns (bytes4) {
        require(msg.sender == address(_nft), "only our NFT smart contract can call back");
        require(stakes[tokenID].whenStaked == 0, "NFT already staked"); // this trigger a warning but imo false positive

        // Record the stake data for this token
        stakes[tokenID] = Stake({
            owner: from,
            whenStaked: block.timestamp,
            lastClaim: block.timestamp
        });

        emit Staked(from, tokenID);
        return this.onERC721Received.selector;
    }

    function _calculateReward(uint256 tokenID) internal view returns (uint256) {
        Stake storage stakeInfo = stakes[tokenID];
        if (stakeInfo.whenStaked == 0) {
            return 0;
        }
        uint256 timeElapsed = block.timestamp - stakeInfo.lastClaim;
        uint256 intervals = timeElapsed / REWARD_INTERVAL;
        return intervals;
    }

    function unstakeNFT(uint256 tokenID) external nonReentrant {
        Stake storage stakeInfo = stakes[tokenID];
        require(stakeInfo.owner == msg.sender, "only the owner can unstake");

        // Claim any pending reward for this NFT using complete intervals
        uint256 rewardIntervals = _calculateReward(tokenID);
        uint256 rewardTokens = rewardIntervals * REWARD_RATE;
        if (rewardIntervals > 0) {
            stakeInfo.lastClaim += (rewardIntervals * REWARD_INTERVAL);
            _token.mintToken(msg.sender, rewardTokens);
        }

        // Remove staking record before transferring NFT back to the owner
        delete stakes[tokenID];
        _nft.safeTransferFrom(address(this), msg.sender, tokenID);
        emit Unstaked(msg.sender, tokenID);
    }

    function getRewardBalanceOf(uint256 tokenID) external view returns (uint256) {
        require(stakes[tokenID].whenStaked > 0, "NFT not staked");
        uint256 intervals = _calculateReward(tokenID);
        return intervals * REWARD_RATE;
    }

    function withdrawReward(uint256 tokenID) public nonReentrant {
        Stake storage stakeInfo = stakes[tokenID];
        require(stakeInfo.owner == msg.sender, "only the owner can withdraw rewards");

        uint256 rewardIntervals = _calculateReward(tokenID);
        require(rewardIntervals > 0, "no rewards to claim");

        // Update the lastClaim time by the number of full intervals claimed
        stakes[tokenID].lastClaim += (rewardIntervals * REWARD_INTERVAL);
        uint256 rewardTokens = rewardIntervals * REWARD_RATE;
        _token.mintToken(msg.sender, rewardTokens);
        emit RewardClaimed(msg.sender, tokenID, rewardTokens);
    }

    function mintNFT() external payable {
        // if no allowance it will fail 
        require(
            _token.transferFrom(msg.sender, address(this), 10 * 1e18),
            "Token transfer failed"
        );
        // Mint the NFT to the caller.
        _nft.mint(msg.sender);
    }

    function mintToken() external payable {
        _token.mint{ value: msg.value }(msg.sender);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}