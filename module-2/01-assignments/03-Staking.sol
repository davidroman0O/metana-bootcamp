// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// Using the ERC721 receiver
/// Stake NFTs
/// Users can sed NFTs and withdraw 10 ERC20 every 24 hours as reward
/// Users can withdraw NFT at any time
/// Reset any kind of timer when staking, prevent abuse
/// Fake the time obviously
/// Do not force people to withdraw NFT to get token, just let's them get their money



contract VisageToken is ERC20("Visage Token", "VSG"), Ownable2Step {
    
    uint256 public constant TOKENS_PER_ETH = 10  * 1e18;

    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    constructor(address deployer) Ownable(deployer) {}

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        mint(msg.sender);
    }

    function mint(address buyer) public payable {
        require(msg.value > 0, "send eth to buy tokens");
        uint256 tokensToMint = (TOKENS_PER_ETH * msg.value) / 1 ether;
        emit Mint(buyer, msg.value, tokensToMint, totalSupply());
        super._mint(buyer, tokensToMint);
    }

    function mintToken(address minter, uint256 tokens) public onlyOwner () {
        super._mint(minter, tokens);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

}

contract VisageNFT is ERC721("Visage NFT", "NVSG"), Ownable2Step {

    constructor(address deployer) Ownable(deployer) {}

    uint256 private tokenSupply = 1;
    uint256 constant private MAX_SUPPLY = 11; 

    function mint(address minter) external onlyOwner {
        require(tokenSupply < MAX_SUPPLY, "no more NFT to mint");
        super._safeMint(minter, tokenSupply);
        tokenSupply++;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }

    function withdraw() public onlyOwner() {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    function balance() public view onlyOwner returns (uint256) {
        return this.balanceOf(address(this));
    }
}

contract VisageStaking is Ownable2Step {
    
    mapping(uint256 => address) private _originalOwners;

    struct Stake {
        uint256 whenStaked;
        uint256 lastClaim;
    }

    mapping(address => mapping(uint256 => Stake)) private _stakerNFTs;

    uint256 public constant REWARD_RATE = 10 * 1e18; // 10 tokens per 24 hours
    uint256 public constant REWARD_INTERVAL = 24 hours;
    // uint256 public constant REWARD_INTERVAL = 2 seconds;

    //  basically received if `stakeNFT` worked
    function onERC721Received(
        address /**/,
        address from,
        uint256 tokenId,
        bytes calldata /**/
    ) external returns (bytes4) {
        require(_stakerNFTs[from][tokenId].whenStaked == 0, "NFT already staked");
        _originalOwners[tokenId] = from;
        _stakerNFTs[from][tokenId] = Stake({
            whenStaked: block.timestamp,
            lastClaim: block.timestamp
        });
        return this.onERC721Received.selector;
    }

    VisageNFT _nft;
    VisageToken _token;

    constructor() Ownable(msg.sender) {
        _nft = new VisageNFT(address(this));
        _token = new VisageToken(address(this));
    }

    function getAddresses() external view returns (address tokenAddress, address nftAddress) {
        return (address(_token), address(_nft));
    }

    fallback() external {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        revert("You can't just sent money like that");
    }
    
    function stakeNFT(uint256 tokenID) external {
        require(_nft.ownerOf(tokenID) == msg.sender, "only the owner can stake");
        _nft.safeTransferFrom(msg.sender, address(this), tokenID);
    }

    function unstakeNFT(uint256 tokenID) external {
        require(_originalOwners[tokenID] == msg.sender, "only the owner can stake");
        withdrawReward();
        delete _originalOwners[tokenID];
        delete _stakerNFTs[msg.sender][tokenID];
        _nft.safeTransferFrom(address(this), msg.sender, tokenID);
    }
    
    function pendingReward(address user) external view returns (uint256) {
        uint256 totalReward = 0;

        for (uint256 tokenId = 1; tokenId <= 10; tokenId++) {
            Stake storage stakeInfo = _stakerNFTs[user][tokenId];

            if (stakeInfo.whenStaked != 0) {
                uint256 timeElapsed = block.timestamp - stakeInfo.lastClaim;
                uint256 reward = (REWARD_RATE * timeElapsed) / REWARD_INTERVAL;

                totalReward += reward;
            }
        }

        return totalReward;
    }

    function withdrawReward() public {
        uint256 totalReward = 0;

        for (uint256 tokenId = 1; tokenId <= 10; tokenId++) {
            Stake storage stakeInfo = _stakerNFTs[msg.sender][tokenId];

            if (stakeInfo.whenStaked != 0) {
                uint256 timeElapsed = block.timestamp - stakeInfo.lastClaim;
                uint256 reward = (REWARD_RATE * timeElapsed) / REWARD_INTERVAL;

                totalReward += reward;
                stakeInfo.lastClaim = block.timestamp;
            }
        }

        require(totalReward > 0, "no rewards to claim");

        _token.mintToken(msg.sender, totalReward);
    }

    function mintNFT() external payable  {
        // if no allowance it will fail 
        require(
            _token.transferFrom(msg.sender, address(this), 10 * 1e18),
            "Token transfer failed"
        );
        // Mint the NFT to the caller.
        _nft.mint(msg.sender);
    }

    function withdraw() external onlyOwner {
        _token.withdraw();
    }

    function allowance() external view returns (uint256) {
        return _token.allowance(msg.sender, address(this));
    }

    function mintToken() external payable {
        _token.mint{ value: msg.value }(msg.sender);
    }

    function balance() external view returns (uint256) {
        return _token.balanceOf(msg.sender);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _token.balanceOf(account);
    }

}
