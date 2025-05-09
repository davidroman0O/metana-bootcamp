// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract FacesNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable {

    uint16 public constant MAX_SUPPLY = 10;
    uint16 public currentTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("Echoforms", "ECHO");
        __Ownable_init();
        __UUPSUpgradeable_init();
        currentTokenId = 0;
    }

    function mint() external {
        require(currentTokenId < MAX_SUPPLY, "Max supply reached");
        currentTokenId++;
        _safeMint(msg.sender, currentTokenId);
    }
    
    function version() external pure returns (string memory) {
        return "v1";
    }

    fallback() external payable {
        revert("INFO: NFT interactions require specific function calls");
    }

    receive() external payable {
        revert("INFO: The NFT is free, no need to send ETH");
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
 