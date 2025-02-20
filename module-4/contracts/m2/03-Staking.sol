// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // slither version constraint

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Using the ERC721 receiver
/// Stake NFTs
/// Users can sed NFTs and withdraw 10 ERC20 every 24 hours as reward
/// Users can withdraw NFT at any time
/// Reset any kind of timer when staking, prevent abuse
/// Fake the time obviously
/// Do not force people to withdraw NFT to get token, just let's them get their money

event Received(address indexed sender, uint256 value);
event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

contract StakingVisageToken is ERC20("Visage Token", "VSG"), Ownable2Step, ReentrancyGuard {
    
    uint256 public constant TOKENS_PER_ETH = 10  * 1e18;

    constructor(address deployer) Ownable(deployer) {}

    fallback() external payable { revert(); }

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
    function mintToken(address minter, uint256 tokens) public onlyOwner  {
        _mint(minter, tokens);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }
}

contract StakingVisageNFT is ERC721("Visage NFT", "NVSG"), Ownable2Step, ReentrancyGuard {

    uint256 private tokenSupply = 1;
    uint256 constant private MAX_SUPPLY = 11; 

    constructor(address deployer) Ownable(deployer) {}

    receive() external payable { revert(); }
    fallback() external payable { revert(); }
    
    function mint(address minter) external onlyOwner {
        require(tokenSupply < MAX_SUPPLY, "no more NFT to mint");
        uint256 supplyToMint = tokenSupply;
        tokenSupply++;
        _safeMint(minter, supplyToMint);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }
}

contract VisageStaking is Ownable2Step, ReentrancyGuard, IERC721Receiver {

    struct Stake {
        address owner;
        uint256 whenStaked;
        uint256 lastClaim;
    }

    // stake info for each tokenID
    mapping(uint256 => Stake) public stakes;

    uint256 public constant REWARD_RATE = 10 * 1e18; // 10 tokens per 24 hours
    uint256 public constant REWARD_INTERVAL = 24 hours;

    StakingVisageNFT immutable _nft;
    StakingVisageToken immutable _token;

    constructor(address initialOwner, address token, address nft) Ownable(initialOwner) {
        _token = StakingVisageToken(payable(token));
        _nft = StakingVisageNFT(payable(nft));
    }

    fallback() external payable { revert(); }
    receive() external payable { revert(); }

    function acceptNftOwnership() external onlyOwner {
        _nft.acceptOwnership();
    }
    
    function acceptTokenOwnership() external onlyOwner {
        _token.acceptOwnership();
    }

    function getAddresses() external view returns (address tokenAddress, address nftAddress) {
        return (address(_token), address(_nft));
    }

    event NFTStaked(address indexed staker, uint256 tokenID);
    event RewardClaimed(address indexed owner, uint256 tokenId, uint256 amount);
    event NFTUnstaked(address indexed owner, uint256 tokenId);

    function onERC721Received(
        address /**/,
        address from,
        uint256 tokenID,
        bytes calldata /**/
    ) external returns (bytes4) {
        require(msg.sender == address(_nft), "only our NFT smart contract can call back");
        require(stakes[tokenID].whenStaked == 0, "NFT already staked"); // this trigger a warning but imo false positive

        // Record the stake data for this token
        stakes[tokenID] = Stake({
            owner: from,
            whenStaked: block.timestamp,
            lastClaim: block.timestamp
        });

        emit NFTStaked(from, tokenID);
        return this.onERC721Received.selector;
    }

    function _calculateReward(uint256 tokenID) internal view returns (uint256) {
        Stake storage stakeInfo = stakes[tokenID];
        if (stakeInfo.whenStaked == 0) {
            return 0;
        }
        uint256 timeElapsed = block.timestamp - stakeInfo.lastClaim;
        return (timeElapsed * REWARD_RATE) / REWARD_INTERVAL; // slither says it more precise that way (no loss of decimal)
    }

    function unstakeNFT(uint256 tokenID) external nonReentrant {
        Stake storage stakeInfo = stakes[tokenID];
        require(stakeInfo.owner == msg.sender, "only the owner can unstake");

        delete stakes[tokenID]; // Check-Effects-Interaction pattern
        // Claim any pending reward for this NFT
        uint256 reward = _calculateReward(tokenID);
        if (reward > 0) {
            // Reset lastClaim for this NFT to prevent double counting
            stakeInfo.lastClaim = block.timestamp;
            _token.mintToken(msg.sender, reward);
        }

        _nft.safeTransferFrom(address(this), msg.sender, tokenID);
        emit NFTUnstaked(msg.sender, tokenID);
    }

    function withdrawReward(uint256 tokenID) public nonReentrant {
        Stake storage stakeInfo = stakes[tokenID];
        require(stakeInfo.owner == msg.sender, "only the owner can withdraw rewards");
        
        uint256 reward = _calculateReward(tokenID);
        require(reward > 0, "no rewards to claim");
        uint256 timeElapsed = block.timestamp - stakes[tokenID].lastClaim;
        stakes[tokenID].lastClaim += (timeElapsed * REWARD_INTERVAL) / REWARD_INTERVAL; // slither says it more precise that way (no loss of decimal)
        _token.mintToken(msg.sender, reward);
        emit RewardClaimed(msg.sender, tokenID, reward);
    }

    function mintNFT() external payable nonReentrant {
        // if no allowance it will fail 
        require(
            _token.transferFrom(msg.sender, address(this), 10 * 1e18),
            "Token transfer failed"
        );
        // Mint the NFT to the caller.
        _nft.mint(msg.sender);
    }

    function withdraw() external onlyOwner nonReentrant {
        _token.withdraw();
    }

    function allowance() external view returns (uint256) {
        return _token.allowance(msg.sender, address(this));
    }

    function mintToken() external payable nonReentrant {
        _token.mint{ value: msg.value }(msg.sender);
    }

    function balance() external view returns (uint256) {
        return _token.balanceOf(msg.sender);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _token.balanceOf(account);
    }
}