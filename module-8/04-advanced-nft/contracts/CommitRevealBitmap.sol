// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CommitRevealBitmap is ERC721Enumerable, Ownable, ReentrancyGuard, Multicall {
    using Strings for uint256;
    using Counters for Counters.Counter;
    using BitMaps for BitMaps.BitMap;

    enum State {
        Inactive,
        PrivateSale,
        PublicSale,
        SoldOut,
        Revealed
    }
    State public state = State.Inactive;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant BLOCKS_FOR_REVEAL = 10;
    uint256 private _startFrom = 1;
    uint256 public privateSalePrice = 0.05 ether;
    uint256 public publicSalePrice = 0.08 ether;
    
    // For commit-reveal
    struct Commitment {
        bool isRevealed;
        bytes32 commit;
        uint256 block;
    }
    
    mapping(address => Commitment) public commitments;
    
    // For random token assignment
    mapping(uint256 => uint256) private tokenMatrix;
    Counters.Counter private _tokenCount;
    
    string private _baseTokenURI;
    
    // Merkle Tree for whitelist
    bytes32 public immutable merkleRoot;
    BitMaps.BitMap private claimedWhitelist;
    mapping(uint256 => bool) private usedIndices;
    
    // Events
    event StateChanged(State prevState, State newState);
    event Committed(address indexed user, bytes32 commitment);
    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event WhitelistClaimed(address indexed user);
    event PaymentWithdrawn(address indexed to, uint256 amount);
    event ContributorAdded(address indexed contributor, uint256 share);
    event ContributorRemoved(address indexed contributor);
    
    // For pull pattern withdrawals
    struct Contributor {
        address payable addr;
        uint256 share; // In basis points (100 = 1%)
    }
    Contributor[] public contributors;
    uint256 public totalShares;
    mapping(address => uint256) public pendingWithdrawals;
    
    constructor(string memory name, string memory symbol, string memory baseURI, bytes32 _merkleRoot) 
        ERC721(name, symbol) 
    {
        _baseTokenURI = baseURI;
        merkleRoot = _merkleRoot;
        
        // Add deployer as initial contributor with 100% share
        _addContributor(payable(msg.sender), 10000);
    }
    
    // State machine modifier
    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }
    
    
    // 1. TokenURI (called by marketplaces frequently)
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        if (state == State.Revealed) {
            return string(abi.encodePacked(_baseURI(), tokenId.toString()));
        }
        
        return string(abi.encodePacked(_baseURI(), "unrevealed"));
    }
    
    // 2. Commit (primary entry point for minting)
    function commit(
        bytes32 payload, 
        uint256 index, 
        bytes32[] calldata proof
    ) external payable inState(State.PrivateSale) {
        require(!claimedWhitelist.get(index), "Already claimed whitelist spot");
        require(commitments[msg.sender].commit == 0, "Already committed");
        require(msg.value >= privateSalePrice, "Insufficient payment");
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encode(msg.sender, index));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid merkle proof");
        
        // Store the index for later use during reveal
        commitments[msg.sender] = Commitment({
            isRevealed: false,
            commit: payload,
            block: block.number
        });
        
        emit Committed(msg.sender, payload);
    }
    
    // 3. Reveal (second part of primary minting flow)
    function reveal(bytes32 secret, uint256 index) external nonReentrant {
        require(commitments[msg.sender].commit != 0, "Not committed");
        require(!claimedWhitelist.get(index), "Already claimed whitelist spot");
        require(
            keccak256(abi.encodePacked(msg.sender, secret)) == commitments[msg.sender].commit,
            "Invalid secret"
        );
        require(
            block.number - commitments[msg.sender].block >= BLOCKS_FOR_REVEAL,
            "Not enough blocks passed"
        );
        require(tokenCount() < MAX_SUPPLY, "Max supply reached");
        
        // Mark as claimed in bitmap when reveal is done
        claimedWhitelist.set(index);
        commitments[msg.sender].isRevealed = true;
        
        uint256 tokenId = nextToken();
        _safeMint(msg.sender, tokenId);
        
        // Check if state needs to be updated
        if (state != State.Revealed && tokenCount() > MAX_SUPPLY / 2) {
            State prevState = state;
            state = State.Revealed;
            emit StateChanged(prevState, state);
        }
        
        // Check if sold out
        if (tokenCount() >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
        
        emit TokenMinted(msg.sender, tokenId);
    }
    
    // 4. Public Mint (primary purchase function)
    function publicMint(uint256 quantity) external payable inState(State.PublicSale) {
        require(quantity > 0, "Must mint at least one");
        require(tokenCount() + quantity <= MAX_SUPPLY, "Would exceed supply");
        require(msg.value >= publicSalePrice * quantity, "Insufficient payment");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = nextToken();
            _safeMint(msg.sender, tokenId);
            emit TokenMinted(msg.sender, tokenId);
        }
        
        // Check if sold out
        if (tokenCount() >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
    }
    
    // 5. Withdraw (used by contributors)
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PaymentWithdrawn(msg.sender, amount);
    }

    // 6. Multicall (important for batch operations)
    function multicall(bytes[] calldata data) external override returns (bytes[] memory results) {
        require(msg.sender == tx.origin, "Contracts cannot call multicall");
        results = new bytes[](data.length);
        
        // Define allowed function selectors
        bytes4 transferFromSelector = bytes4(keccak256("transferFrom(address,address,uint256)"));
        bytes4 safeTransferFromSelector1 = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
        bytes4 safeTransferFromSelector2 = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
        
        for (uint256 i = 0; i < data.length; i++) {
            // Require minimum length for function selector and from address
            require(data[i].length >= 36, "Invalid calldata length"); // 4 bytes selector + 32 bytes address
            
            // Extract function selector (first 4 bytes)
            bytes4 selector;
            assembly {
                // Get the function selector from the first 4 bytes
                selector := shr(224, calldataload(add(data.offset, add(mul(i, 32), 36))))
            }
            
            // Only allow transferFrom and safeTransferFrom functions
            require(
                selector == transferFromSelector || 
                selector == safeTransferFromSelector1 || 
                selector == safeTransferFromSelector2,
                "Only transferFrom and safeTransferFrom functions are allowed"
            );
            
            // Check if from address is zero
            // The from address is always the first parameter at offset 4 (after selector)
            address from;
            assembly {
                // Load the from address (first parameter after selector)
                from := calldataload(add(data.offset, add(mul(i, 32), 40)))  // 36 + 4 bytes selector
            }
            require(from != address(0), "From address cannot be zero");
            
            // Execute the call
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "Call failed");
            results[i] = result;
        }
        
        return results;
    }
    
    function isWhitelisted(uint256 index) public view returns (bool) {
        return claimedWhitelist.get(index);
    }
    
    function tokenCount() public view returns (uint256) {
        return _tokenCount.current();
    }
    
    function availableTokenCount() public view returns (uint256) {
        return MAX_SUPPLY - tokenCount();
    }
    
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    // Implementation of RandomlyAssigned logic
    function nextToken() internal returns (uint256) {
        require(availableTokenCount() > 0, "No more tokens available");
        
        uint256 maxIndex = MAX_SUPPLY - tokenCount();
        uint256 random = uint256(keccak256(
            abi.encodePacked(
                msg.sender,
                block.coinbase,
                block.prevrandao,
                block.gaslimit,
                block.timestamp
            )
        )) % maxIndex;

        uint256 value = 0;
        if (tokenMatrix[random] == 0) {
            // If this matrix position is empty, set the value to the generated random number.
            value = random;
        } else {
            // Otherwise, use the previously stored number from the matrix.
            value = tokenMatrix[random];
        }

        // If the last available tokenID is still unused...
        if (tokenMatrix[maxIndex - 1] == 0) {
            // ...store that ID in the current matrix position.
            tokenMatrix[random] = maxIndex - 1;
        } else {
            // ...otherwise copy over the stored number to the current matrix position.
            tokenMatrix[random] = tokenMatrix[maxIndex - 1];
        }

        // Check if MAX_SUPPLY is reached before incrementing
        require(_tokenCount.current() < MAX_SUPPLY, "Maximum supply reached");
        // Increment count
        _tokenCount.increment();

        return value + _startFrom;
    }
    
    function _addContributor(address payable contributor, uint256 share) private {
        require(contributor != address(0), "Invalid address");
        require(share > 0, "Share must be positive");
        
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributors[i].addr == contributor) {
                totalShares -= contributors[i].share;
                contributors[i] = contributors[contributors.length - 1];
                contributors.pop();
                break;
            }
        }
        
        contributors.push(Contributor(contributor, share));
        totalShares += share;
        emit ContributorAdded(contributor, share);
    }
    
    
    // State transitions
    function setState(State _state) external onlyOwner {
        State prevState = state;
        require(_state != prevState, "Already in this state");
        
        if (_state == State.SoldOut) {
            require(tokenCount() >= MAX_SUPPLY, "Supply not sold out");
        }
        
        state = _state;
        emit StateChanged(prevState, _state);
    }
    
    function setPrivateSalePrice(uint256 newPrice) external onlyOwner {
        privateSalePrice = newPrice;
    }
    
    function setPublicSalePrice(uint256 newPrice) external onlyOwner {
        publicSalePrice = newPrice;
    }
    
    function addContributor(address payable contributor, uint256 share) external onlyOwner {
        _addContributor(contributor, share);
    }
    
    function removeContributor(address contributor) external onlyOwner {
        bool isLastOwnerContributor = contributor == owner() && contributors.length == 1;
        require(
            contributors.length > 1 || isLastOwnerContributor,
            "Cannot remove last contributor"
        );
        
        bool found = false;
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributors[i].addr == contributor) {
                totalShares -= contributors[i].share;
                contributors[i] = contributors[contributors.length - 1];
                contributors.pop();
                found = true;
                break;
            }
        }
        
        require(found, "Contributor not found");
        emit ContributorRemoved(contributor);
    }
    
    function allocateFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to allocate");
        
        for (uint256 i = 0; i < contributors.length; i++) {
            Contributor storage contributor = contributors[i];
            uint256 amount = (balance * contributor.share) / totalShares;
            pendingWithdrawals[contributor.addr] += amount;
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
} 