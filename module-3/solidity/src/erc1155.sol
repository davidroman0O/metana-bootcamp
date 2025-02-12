// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin’s ERC1155 base, burnable extension and Ownable.
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract ERC1155Token is ERC1155, ERC1155Burnable, Ownable {
    
    /// Mapping to track the timestamp of the last free mint per address.
    mapping(address => uint256) public lastMintTime;

    /// Cooldown period (in seconds) between free mints.
    // uint256 public constant COOLDOWN = 1 minutes;
    uint256 public constant COOLDOWN = 5 seconds;
  
    constructor() Ownable(msg.sender) ERC1155("ipfs://bafybeihx2hcoh5pfuth7jw3winzc7l727zpieftswqibutaepwk6nbqsn4") {}

    function canMint() public view returns (bool) {
        return block.timestamp >= lastMintTime[msg.sender] + COOLDOWN;
    }

    function getLastMintTime() public view returns (uint256) {
        return lastMintTime[msg.sender];
    }

    function getRemainingCooldown() public view returns (uint256) {
        uint256 endTime = lastMintTime[msg.sender] + COOLDOWN;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }

    function getRemainingCooldownOf(address account) public view returns (uint256) {
        uint256 endTime = lastMintTime[account] + COOLDOWN;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }

    function getLastMintTimeOf(address account) public view returns (uint256) {
        return lastMintTime[account];
    }

    function canMintOf(address account) public view returns (bool) {
        return block.timestamp >= lastMintTime[account] + COOLDOWN;
    }
    
    function freeMint(uint256 id) external {
        require(id < 3, "Free mint only allowed for tokens 0-2");
        require(
            block.timestamp >= lastMintTime[msg.sender] + COOLDOWN,
            "Cooldown active: wait 1 minute between mints"
        );
        require(
            balanceOf(msg.sender, id) == 0,
            "was already minted"
        );
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, id, 1, "");
    }
    
    function forgeMint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyOwner {
        require(owner() == msg.sender, "Only forging contract can mint tokens");
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
