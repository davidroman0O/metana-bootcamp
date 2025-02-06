// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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
/// - call `buy` on VisageExchange
/// - call `balance` which gives you `10000000000000000000`
/// - scroll down to VisageToken
/// - call `approve` with the amount to `10000000000000000000` and the spender is the address of the contract VisageExchange
/// - on VisageExchange call `allowance` to see `10000000000000000000`
/// - finally call `mint` and you have an NFT

contract VisageNFT is ERC721("Visage NFT", "NVSG"), Ownable {

    constructor(address deployer) Ownable(deployer) {}

    uint256 private tokenSupply = 0;
    uint256 constant private MAX_SUPPLY = 11; 

    function mint(address minter) external {
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

// The only way to buy some VisageNFT
// Basically it's the token sales
// - user need to use approve with the address of the exchange contract
contract VisageToken is ERC20("Visage Token", "VSG"), Ownable {
    
    // 10 VSG for 1ETH
    uint256 public constant TOKENS_PER_ETH = 10;

    constructor(address deployer) Ownable(deployer) {
        super._mint(owner(), 1_000_000 * 1e18);
    }

    fallback() external payable  {
        revert("You can't send ether with data on that contract");
    }

    receive() external payable {
        buy(msg.sender);
    }

    function buy(address buyer) public payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokensToMint = msg.value * TOKENS_PER_ETH;
        _mint(buyer, tokensToMint);
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
        token.buy{ value: msg.value }(msg.sender);
    }

    function allowance() public view returns (uint256) {
        return token.allowance(msg.sender, address(this));
    }

    function buy() public payable {
        token.buy{ value: msg.value }(msg.sender);
    }

    function balance() public view returns (uint256) {
        return token.balanceOf(msg.sender);
    }

    function balanceOf(address account) public view returns (uint256) {
        return token.balanceOf(account);
    }

    // must mint using the ERC20 token 
    function mint() public {
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

