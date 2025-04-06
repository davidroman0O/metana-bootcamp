// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; //slither version constraint

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// Here how to use it:
/// - Deploy VisageExchange
/// - call `getAddresses`
/// - copy the value of `tokenAddress` which is the address
/// - select the contract "ExchangeVisageToken"
/// - paste the address of `tokenAddress` into the input "At Address"
/// - just click on "At Address" (DO NOT click on "Deploy")
/// - ExchangeVisageToken should show up
/// - change wallet 
/// - set 1 Ether
/// - call `mintToken` on VisageExchange
/// - call `balance` which gives you `10000000000000000000`
/// - scroll down to ExchangeVisageToken
/// - call `approve` with the amount to `10000000000000000000` and the spender is the address of the contract VisageExchange
/// - on VisageExchange call `allowance` to see `10000000000000000000`
/// - finally call `mintNFT` and you have an NFT


// The only way to buy some ExchangeVisageNFT
// Basically it's the token sales
// - user need to use approve with the address of the exchange contract
contract ExchangeVisageToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    
    // 10 VSG for 1ETH but in wei
    uint256 public constant TOKENS_PER_ETH = 10 * 1e18;
    uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18; // wei

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC20_init("Visage Token", "VSG");
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(initialOwner);
    }

    event Received(address indexed sender, uint256 value);
    event Mint(address indexed sender, uint256 ethSent, uint256 tokensMinted, uint256 totalSupplyBefore);

    fallback() external payable  { 
        revert("INFO: Use direct ETH transfers to mint tokens or call mint() function"); 
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
        mint(msg.sender);
    }

    function mint(address buyer) public payable {
        require(msg.value > 0, "send eth to buy tokens");
        uint256 tokensToMint = (TOKENS_PER_ETH * msg.value) / 1 ether;
        require(totalSupply() + tokensToMint <= MAX_SUPPLY, "mint would exceed max token supply");
        emit Mint(buyer, msg.value, tokensToMint, totalSupply());
        _mint(buyer, tokensToMint);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "withdraw failed");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

contract ExchangeVisageNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    uint256 private tokenSupply;
    uint256 constant private MAX_SUPPLY = 11; 

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC721_init("Visage NFT", "NVSG");
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        tokenSupply = 1;
        _transferOwnership(initialOwner);
    }

    receive() external payable { revert("INFO: NFTs cannot be purchased with ETH directly"); }
    fallback() external payable { revert("INFO: NFTs cannot be purchased with ETH directly"); }

    function mint(address minter) external onlyOwner {
        require(tokenSupply < MAX_SUPPLY, "no more NFT to mint");
        _safeMint(minter, tokenSupply);
        tokenSupply++;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

// Basically an exchange
// 000000000000000000
// 10000000000000000000
// ETH => VSG 
// 10 VSG => NFT 
contract VisageExchange is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    ExchangeVisageToken public token;
    ExchangeVisageNFT public nft;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address _token, address _nft) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        token = ExchangeVisageToken(payable(_token));
        nft = ExchangeVisageNFT(payable(_nft));
        _transferOwnership(initialOwner);
    }

    event Received(address indexed sender, uint256 value);

    fallback() external payable  {
        revert("INFO: Direct ETH with data not supported, use mintToken() function");
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
        token.mint{value: msg.value}(msg.sender);
    }

    function acceptNftOwnership() external onlyOwner {
        nft.transferOwnership(owner());
    }
    
    function acceptTokenOwnership() external onlyOwner {
        token.transferOwnership(owner());
    }

    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "withdraw failed");
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

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
