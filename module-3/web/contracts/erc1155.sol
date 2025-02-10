// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin’s ERC1155 base, burnable extension and Ownable.
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyERC1155Token
 * @notice An ERC1155 token with 7 token IDs (0–6). Base tokens (0–2)
 *         can be free minted by anyone (subject to a 1‑minute cooldown),
 *         while forged tokens (3–6) may only be minted by the forging contract.
 */
contract MyERC1155Token is ERC1155, ERC1155Burnable, Ownable {
    /// @notice The address of the forging contract that is allowed to mint forged tokens.
    address public forgingContract;

    /// @notice Mapping to track the timestamp of the last free mint per address.
    mapping(address => uint256) public lastMintTime;

    /// @notice Cooldown period (in seconds) between free mints.
    uint256 public constant COOLDOWN = 60;

    /**
     * @notice Constructor sets the base URI.
     * @param uri_ The base URI for all token types.
     */
    constructor(string memory uri_) Ownable(msg.sender) ERC1155(uri_) {}

    /**
     * @notice Sets the address of the forging contract.
     * @dev Only the owner may call this.
     * @param _forgingContract The address of the forging contract.
     */
    function setForgingContract(address _forgingContract) external onlyOwner {
        forgingContract = _forgingContract;
    }
    
    /**
     * @notice Free mint function for base tokens (IDs 0, 1, 2).
     * @dev Enforces a 1‑minute cooldown per address.
     * @param id The token id to mint (must be 0, 1, or 2).
     */
    function freeMint(uint256 id) external {
        require(id < 3, "Free mint only allowed for tokens 0-2");
        require(
            block.timestamp >= lastMintTime[msg.sender] + COOLDOWN,
            "Cooldown active: wait 1 minute between mints"
        );
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, id, 1, "");
    }
    
    /**
     * @notice Special mint function that can only be called by the forging contract.
     * @dev This function is used both by the forging process (to mint tokens 3-6)
     *      and by the trading function (to mint base tokens 0-2 on trade).
     * @param to The address receiving the minted token.
     * @param id The token id to mint (must be in 0–6).
     * @param amount The amount of tokens to mint.
     */
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
