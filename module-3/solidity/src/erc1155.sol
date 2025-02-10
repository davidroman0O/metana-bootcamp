// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin’s ERC1155 base, burnable extension and Ownable.
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract MyERC1155Token is ERC1155, ERC1155Burnable, Ownable {
    /// The address of the forging contract that is allowed to mint forged tokens.
    address public forgingContract;

    /// Mapping to track the timestamp of the last free mint per address.
    mapping(address => uint256) public lastMintTime;

    /// Cooldown period (in seconds) between free mints.
    uint256 public constant COOLDOWN = 60;
  
    constructor(string memory uri_) Ownable(msg.sender) ERC1155(uri_) {}
    
    function setForgingContract(address _forgingContract) external onlyOwner {
        forgingContract = _forgingContract;
    }
    
    function freeMint(uint256 id) external {
        require(id < 3, "Free mint only allowed for tokens 0-2");
        require(
            block.timestamp >= lastMintTime[msg.sender] + COOLDOWN,
            "Cooldown active: wait 1 minute between mints"
        );
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, id, 1, "");
    }
    
    function forgeMint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        require(msg.sender == forgingContract, "Only forging contract can mint tokens");
        require(id < 7, "Token id must be between 0 and 6");
        _mint(to, id, amount, "");
    }

    // Override supportsInterface as required by Solidity for multiple inheritance.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
