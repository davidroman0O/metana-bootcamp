// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; //slither version constraint

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Here how to use it:
/// - Deploy VisageExchange
/// - call `getAddresses`
/// - copy the value of `tokenAddress` which is the address
/// - select the contract "VisageToken"
/// - paste the address of `tokenAddress` into the input "At Address"
/// - just click on "At Address" (DO NOT click on "Deploy")
/// - VisageToken should show up
/// - change wallet 
/// - set 1 Ether
/// - call `mintToken` on VisageExchange
/// - call `balance` which gives you `10000000000000000000`
/// - scroll down to VisageToken
/// - call `approve` with the amount to `10000000000000000000` and the spender is the address of the contract VisageExchange
/// - on VisageExchange call `allowance` to see `10000000000000000000`
/// - finally call `mintNFT` and you have an NFT

contract VisageNFT is ERC721("Visage NFT", "NVSG"), Ownable, ReentrancyGuard {

    constructor(address deployer) Ownable(deployer) {}

    uint256 private tokenSupply = 1;
    uint256 constant private MAX_SUPPLY = 11; 

    function mint(address minter) external onlyOwner nonReentrant {
        require(tokenSupply < MAX_SUPPLY, "no more NFT to mint");
        super._safeMint(minter, tokenSupply);
        tokenSupply++;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }

    function withdraw() public onlyOwner nonReentrant {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }

    function balance() public view onlyOwner returns (uint256) {
        return balanceOf(address(this));
    }

}

// The only way to buy some VisageNFT
// Basically it's the token sales
// - user need to use approve with the address of the exchange contract
contract VisageToken is ERC20("Visage Token", "VSG"), Ownable, ReentrancyGuard {
    
    // 10 VSG for 1ETH but in wei
    uint256 public constant TOKENS_PER_ETH = 10 * 1e18;
    uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18; // wei

    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    constructor(address deployer) Ownable(deployer) {}

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        mint(msg.sender);
    }

    function mint(address buyer) public payable nonReentrant {
        require(msg.value > 0, "send eth to buy tokens");
        uint256 tokensToMint = (TOKENS_PER_ETH * msg.value) / 1 ether;
        require(totalSupply() + tokensToMint <= MAX_SUPPLY, "mint would exceed max token supply");
        emit Mint(buyer, msg.value, tokensToMint, totalSupply());
        super._mint(buyer, tokensToMint);
    }

    function withdraw() external onlyOwner nonReentrant {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "withdraw failed");
    }
}


// Basically an exchange
// 000000000000000000
// 10000000000000000000
// ETH => VSG 
// 10 VSG => NFT 
contract VisageExchange is Ownable(msg.sender) {

    VisageToken public immutable token;
    VisageNFT public immutable nft;

    constructor() {
        token = new VisageToken(address(this));
        nft = new VisageNFT(address(this));
    }

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        token.mint{ value: msg.value }(msg.sender);
    }

    function withdraw() external onlyOwner {
        token.withdraw();
    }

    function allowance() external view returns (uint256) {
        return token.allowance(msg.sender, address(this));
    }

    // technically we're minting token
    function mintToken() external payable {
        token.mint{ value: msg.value }(msg.sender);
    }

    function balance() external view returns (uint256) {
        return token.balanceOf(msg.sender);
    }

    function balanceOf(address account) external view returns (uint256) {
        return token.balanceOf(account);
    }

    // must mint using the ERC20 token 
    function mintNFT() external {
        // if no allowance it will fail
        require(
            token.transferFrom(msg.sender, address(this), 10 * 1e18),
            "Token transfer failed"
        );
        // Mint the NFT to the caller.
        nft.mint(msg.sender);
    }

    function getAddresses() external view returns (address tokenAddress, address nftAddress) {
        return (address(token), address(nft));
    }
}
