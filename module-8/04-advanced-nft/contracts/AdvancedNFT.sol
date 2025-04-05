// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

contract AdvancedNFT is ERC721Enumerable, Ownable, ReentrancyGuard, Multicall {
    using Strings for uint256;
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
    uint256 private _mintCounter;
    uint256 public privateSalePrice = 0.05 ether;
    uint256 public publicSalePrice = 0.08 ether;
    
    struct Commitment {
        bool isRevealed;
        bytes32 commit;
        uint256 block;
    }
    
    bytes32 public immutable merkleRoot;
    BitMaps.BitMap private claimedBitMap;
    mapping(address => bool) private claimedMapping; 
    
    // For commit-reveal
    mapping(address => Commitment) public commitments;
    
    // For pull pattern withdrawals
    struct Contributor {
        address payable addr;
        uint256 share; // In basis points (100 = 1%)
    }
    Contributor[] public contributors;
    uint256 public totalShares;
    mapping(address => uint256) public pendingWithdrawals;
    
    string private _baseTokenURI;
    
    // Events
    event StateChanged(State prevState, State newState);
    event Committed(address indexed user, bytes32 commitment);
    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event PaymentWithdrawn(address indexed to, uint256 amount);
    event ContributorAdded(address indexed contributor, uint256 share);
    event ContributorRemoved(address indexed contributor);
    event GasUsed(string method, uint256 gasUsed);
    
    constructor(string memory name, string memory symbol, string memory baseURI, bytes32 _merkleRoot) 
        ERC721(name, symbol) 
    {
        _baseTokenURI = baseURI;
        merkleRoot = _merkleRoot;
        
        _addContributor(payable(msg.sender), 10000); // 100% share initially
    }
    
    // State machine modifier
    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }
    
    // State transitions
    function setState(State _state) external onlyOwner {
        State prevState = state;
        require(_state != prevState, "Already in this state");
        
        if (_state == State.SoldOut) {
            require(_mintCounter >= MAX_SUPPLY, "Supply not sold out");
        }
        
        state = _state;
        emit StateChanged(prevState, _state);
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    // ============ Merkle Tree Airdrop Functions ============
    
    // Option 1: Using BitMap (more gas efficient)
    function claimWithBitmap(uint256 index, bytes32[] calldata proof) external inState(State.PrivateSale) {
        uint256 startGas = gasleft();
        
        require(!claimedBitMap.get(index), "Already claimed");
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, index));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
        
        // Mark as claimed and mint
        claimedBitMap.set(index);
        uint256 tokenId = _mintCounter;
        _safeMint(msg.sender, tokenId);
        _mintCounter++;
        
        // Check if sold out
        if (_mintCounter >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
        
        // Report gas used
        uint256 gasUsed = startGas - gasleft();
        emit GasUsed("claimWithBitmap", gasUsed);
        emit TokenMinted(msg.sender, tokenId);
    }
    
    // Option 2: Using Mapping (for comparison)
    function claimWithMapping(uint256 index, bytes32[] calldata proof) external inState(State.PrivateSale) {
        uint256 startGas = gasleft();
        
        require(!claimedMapping[msg.sender], "Already claimed");
        
        // Verify
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, index));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
        
        // Mark as claimed and mint
        claimedMapping[msg.sender] = true;
        uint256 tokenId = _mintCounter;
        _safeMint(msg.sender, tokenId);
        _mintCounter++;
        
        // Check if sold out
        if (_mintCounter >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
        
        // Report gas used
        uint256 gasUsed = startGas - gasleft();
        emit GasUsed("claimWithMapping", gasUsed);
        emit TokenMinted(msg.sender, tokenId);
    }
    
    // ============ Commit-Reveal Functions ============
    
    function commit(bytes32 payload) external {
        require(commitments[msg.sender].commit == 0, "Already committed");
        
        commitments[msg.sender] = Commitment({
            isRevealed: false,
            commit: payload,
            block: block.number
        });
        
        emit Committed(msg.sender, payload);
    }
    
    function reveal(bytes32 secret) external {
        require(commitments[msg.sender].commit != 0, "Not committed");
        require(!commitments[msg.sender].isRevealed, "Already revealed");
        require(
            keccak256(abi.encodePacked(msg.sender, secret)) == commitments[msg.sender].commit,
            "Invalid secret"
        );
        require(
            block.number - commitments[msg.sender].block >= BLOCKS_FOR_REVEAL,
            "Not enough blocks passed"
        );
        require(_mintCounter < MAX_SUPPLY, "Max supply reached");
        
        commitments[msg.sender].isRevealed = true;
        
        // found that way of doing "random" on multiple forums
        uint256 tokenId = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    secret,
                    blockhash(commitments[msg.sender].block)
                )
            )
        ) % MAX_SUPPLY;
        
        // with that piece to make it there isn't collision
        while(_exists(tokenId)) {
            tokenId = (tokenId + 1) % MAX_SUPPLY;
        }
        
        _safeMint(msg.sender, tokenId);
        _mintCounter++;
        
        // Check if we need to transition to revealed state
        if (state != State.Revealed) {
            State prevState = state;
            state = State.Revealed;
            emit StateChanged(prevState, State.Revealed);
        }
        
        // Check if sold out
        if (_mintCounter >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
        
        emit TokenMinted(msg.sender, tokenId);
    }
    
    // ============ Public Sale Functions ============
    
    function publicMint(uint256 quantity) external payable inState(State.PublicSale) {
        require(quantity > 0, "Must mint at least one");
        require(_mintCounter + quantity <= MAX_SUPPLY, "Would exceed supply");
        require(msg.value >= publicSalePrice * quantity, "Insufficient payment");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _mintCounter;
            _safeMint(msg.sender, tokenId);
            _mintCounter++;
            emit TokenMinted(msg.sender, tokenId);
        }
        
        // Check if sold out
        if (_mintCounter >= MAX_SUPPLY && state != State.SoldOut) {
            State prevState = state;
            state = State.SoldOut;
            emit StateChanged(prevState, State.SoldOut);
        }
    }
    
    // ============ Helper Functions ============
    
    // multicall stuff
    function getTransferData(address to, uint256 tokenId) external view returns (bytes memory) {
        return abi.encodeWithSelector(
            IERC721.transferFrom.selector,
            msg.sender,
            to,
            tokenId
        );
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        if (state == State.Revealed) {
            return string(abi.encodePacked(_baseURI(), tokenId.toString()));
        }
        
        return string(abi.encodePacked(_baseURI(), "unrevealed"));
    }
    
    // ============ Pull Pattern Withdrawal Functions ============
    
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
    
    function addContributor(address payable contributor, uint256 share) external onlyOwner {
        _addContributor(contributor, share);
    }
    
    function removeContributor(address contributor) external onlyOwner {
        require(contributors.length > 1 || (contributor == owner() && contributors.length == 1), "Cannot remove last contributor");
        
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
    
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PaymentWithdrawn(msg.sender, amount);
    }
}
