
Resources:
- https://www.rapidtables.com/convert/number/hex-to-decimal.html?x=C
- https://www.evm.codes/playground

#### Puzzle 1

- Code: `3456FDFDFDFDFDFD5B00`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|52|CALLVALUE|2||
|1|86|JUMP|8||
|2|253|REVERT|0||
|3|253|REVERT|0||
|4|253|REVERT|0||
|5|253|REVERT|0||
|6|253|REVERT|0||
|7|253|REVERT|0||
|8|91|JUMPDEST|1||

- Solution
	- Value: `8`
	- `Data`: N/A

- The code `3456FDFDFDFDFDFD5B00` contains a series of EVM opcodes
- At PC 0, `CALLVALUE` (opcode 34) pushes the transaction's Wei value onto the stack
- At PC 1, `JUMP` (opcode 56) takes the top stack value as jump destination
- PC 2-7 contain `REVERT` opcodes that would terminate execution if reached
- PC 8 has `JUMPDEST` (opcode 5B), which is a valid jump destination
- For execution to succeed, control flow must reach PC 8 and avoid the REVERTs
- The `JUMP` at PC 1 needs a valid destination on the stack - the value 8
- Therefore, the transaction value must be 8 Wei for successful execution
- This explains why `Value: 8` is the solution
- `Data` is not relevant to this execution path, so marked as N/A

#### Puzzle 2

- Code: 34380356FDFD5B00FDFD
- Value: `true`
- Data: `false`

| PC  | Opcode | Name      | Gas | Data |
| --- | ------ | --------- | --- | ---- |
| 0   | 52     | CALLVALUE | 2   |      |
| 1   | 56     | CODESIZE  | 2   |      |
| 2   | 3      | SUB       | 3   |      |
| 3   | 86     | JUMP      | 8   |      |
| 4   | 253    | REVERT    | 0   |      |
| 5   | 253    | REVERT    | 0   |      |
| 6   | 91     | JUMPDEST  | 1   |      |
| 7   | 0      | STOP      | 0   |      |
| 8   | 253    | REVERT    | 0   |      |
| 9   | 253    | REVERT    | 0   |      |

- Solution
	- Value: `4`
	- `Data`: N/A

- At PC 0, `CALLVALUE` pushes the transaction's Wei value onto the stack
- At PC 1, `CODESIZE` pushes the size of the code (10 bytes) onto the stack
- At PC 2, `SUB` computes: CODESIZE - CALLVALUE
- At PC 3, `JUMP` uses this difference as the destination address
- The only valid jump destination is at PC 6 (JUMPDEST)
- For this to work: 10 - CALLVALUE = 6
- Therefore CALLVALUE must be 4 Wei
- After jumping to PC 6, execution reaches STOP at PC 7, ending successfully
- If the jump went elsewhere, execution would hit REVERT and fail
- Data is not used in this execution path, so it's N/A

#### Puzzle 3

- Code: `3656FDFD5B00`
- Value: `false`
- Data: `true`

| PC  | Opcode | Name         | Gas | Data |
| --- | ------ | ------------ | --- | ---- |
| 0   | 54     | CALLDATASIZE | 2   |      |
| 1   | 86     | JUMP         | 8   |      |
| 2   | 253    | REVERT       | 0   |      |
| 3   | 253    | REVERT       | 0   |      |
| 4   | 91     | JUMPDEST     | 1   |      |
| 5   | 0      | STOP         | 0   |      |

- Solution
	- Value: `0`
	- `Data`: `0xffffffff`

- At PC 0, `CALLDATASIZE` pushes the length of input data (in bytes) onto the stack
- At PC 1, `JUMP` takes this value as the destination to jump to
- The only valid jump destination is at PC 4 (JUMPDEST)
- For execution to succeed, CALLDATASIZE must equal 4
- PC 2-3 contain REVERT opcodes which would fail the transaction if reached
- After jumping to PC 4, execution reaches STOP at PC 5, completing successfully
- The solution uses data value `0xffffffff` which is exactly 4 bytes long
- This gives CALLDATASIZE = 4, allowing the jump to PC 4
- Value is set to 0 as it isn't used in this execution path
- Any data would work as long as it's exactly 4 bytes in length

#### Puzzle 4

- Code: `34381856FDFDFDFDFDFD5B00`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|52|CALLVALUE|2||
|1|56|CODESIZE|2||
|2|24|XOR|3||
|3|86|JUMP|8||
|4|253|REVERT|0||
|5|253|REVERT|0||
|6|253|REVERT|0||
|7|253|REVERT|0||
|8|253|REVERT|0||
|9|253|REVERT|0||
|10|91|JUMPDEST|1||
|11|0|STOP|0||

- Solution
	- Value: `6`
	- Data: N/A

- At PC 0, `CALLVALUE` pushes the transaction's Wei value onto the stack
- At PC 1, `CODESIZE` pushes the size of the code (12 bytes) onto the stack
- At PC 2, `XOR` performs bitwise XOR between CALLVALUE and CODESIZE
- At PC 3, `JUMP` uses the XOR result as the destination address
- The only valid jump destination is at PC 10 (JUMPDEST)
- For execution to succeed: CALLVALUE XOR CODESIZE = 10
- This means: CALLVALUE XOR 12 = 10
- Working backward: CALLVALUE = 12 XOR 10 = 6
- After jumping to PC 10, execution reaches STOP at PC 11, completing successfully
- Any other jump destination would hit a REVERT and fail
- Data is not used in this execution path, so it's marked as N/A

| A   | B   | A ⊕ B |
| --- | --- | ----- |
| 0   | 0   | 0     |
| 0   | 1   | 1     |
| 1   | 0   | 1     |
| 1   | 1   | 0     |
`1100` - `c` which is `12`
`0110` - added to the stack after which is `6`
`1010` - `10`

#### Puzzle 5

- Code: `34800261010014600C57FDFD5B00FDFD`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x00|
|2|96|PUSH1|3|0x00|
|4|85|SSTORE|5000||
|5|96|PUSH1|3|0x05|
|7|96|PUSH1|3|0x01|
|9|86|JUMP|8||
|10|96|PUSH1|3|0x00|
|12|84|SLOAD|800||
|13|91|JUMPDEST|1||
|14|96|PUSH1|3|0x01|
|16|1|ADD|3||
|17|96|PUSH1|3|0x00|
|19|85|SSTORE|5000||
|20|96|PUSH1|3|0x00|
|22|84|SLOAD|800||
|23|21|ISZERO|3||
|24|96|PUSH1|3|0x06|
|26|87|JUMPI|10||
|27|1|ADD|3|

- Solution:
	- Value: `16`
	- Data: N/A

- At PC 0, `CALLVALUE` pushes the transaction's Wei value onto the stack
- At PC 1, `DUP1` duplicates the top stack value (CALLVALUE)
- At PC 2, `MUL` multiplies CALLVALUE by itself (CALLVALUE²)
- At PC 3-4, `PUSH2 0100` pushes the value 256 (0x0100) onto the stack
- At PC 6, `EQ` checks if CALLVALUE² equals 256
- At PC 7-8, `PUSH1 0C` pushes the value 12 (0x0C) onto the stack
- At PC 9, `JUMPI` conditionally jumps to position 12 if EQ returned true
- If the jump doesn't occur, execution hits REVERT opcodes and fails
- For CALLVALUE² to equal 256, CALLVALUE must be 16
- When CALLVALUE is 16, JUMPI condition is satisfied and execution jumps to PC 12
- At PC 12 is the JUMPDEST, followed by STOP at PC 13, completing successfully
- Data is not used in this execution path, making it N/A

#### Puzzle 6

- Code: `60003556FDFDFDFDFDFD5B00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x00|
|2|53|CALLDATALOAD|3||
|3|86|JUMP|8||
|4|253|REVERT|0||
|5|253|REVERT|0||
|6|253|REVERT|0||
|7|253|REVERT|0||
|8|253|REVERT|0||
|9|253|REVERT|0||
|10|91|JUMPDEST|1||
|11|0|STOP|0||

- Solution:
	- Value: `0`
	- Data: `0x000000000000000000000000000000000000000000000000000000000000000A`

- At PC 0-1, `PUSH1 0x00` pushes the value 0 onto the stack
- At PC 2, `CALLDATALOAD` loads 32 bytes from calldata starting at position 0
- At PC 3, `JUMP` jumps to the address specified by the value loaded from calldata
- PC 4-9 contain REVERT opcodes that would terminate execution if reached
- The only valid jump destination is at PC 10 (JUMPDEST)
- For execution to succeed, the first 32 bytes of calldata must equal 10 (0x0A)
- This will cause the JUMP to go to PC 10, avoiding all the REVERTs
- After jumping to PC 10, execution reaches STOP at PC 11, completing successfully
- The solution data `0x000000000000000000000000000000000000000000000000000000000000000A` represents the value 10 as a 32-byte word
- Value is set to 0 as it isn't used in this execution path

#### Puzzle 7

- Code: `36600080373660006000F03B600114601357FD5B00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|54|CALLDATASIZE|2||
|1|96|PUSH1|3|0x00|
|3|128|DUP1|3||
|4|55|CALLDATACOPY|3||
|5|54|CALLDATASIZE|2||
|6|96|PUSH1|3|0x00|
|8|96|PUSH1|3|0x00|
|10|240|CREATE|32000||
|11|59|EXTCODESIZE|700||
|12|96|PUSH1|3|0x01|
|14|20|EQ|3||
|15|96|PUSH1|3|0x13|
|17|87|JUMPI|10||
|18|253|REVERT|0||
|19|91|JUMPDEST|1||
|20|0|STOP|0||

- Solution:
	- Value: N/A
	- Data: `0x600060005360016000F3`

- At PC 0, `CALLDATASIZE` gets the length of the input data
- At PC 1-3, `PUSH1 0x00` and `DUP1` push 0 twice onto the stack
- At PC 4, `CALLDATACOPY` copies all calldata to memory starting at position 0
- At PC 5, `CALLDATASIZE` pushes the data length onto the stack again
- At PC 6-8, `PUSH1 0x00` twice pushes two zeros onto the stack
- At PC 10, `CREATE` deploys a new contract using the calldata as the contract's initialization code
- At PC 11, `EXTCODESIZE` gets the size of the deployed contract's runtime code
- At PC 12-14, `PUSH1 0x01` and `EQ` check if the deployed contract's code size equals 1
- A contract solution is needed because the puzzle uses CREATE to deploy calldata as a contract
- The solution data `0x600060005360016000F3` is the contract's initialization code:
    - `6000` - PUSH1 0x00 (Push memory offset 0)
    - `6000` - PUSH1 0x00 (Push value 0 to store)
    - `53` - MSTORE8 (Store single byte 0 at memory position 0)
    - `6001` - PUSH1 0x01 (Push size 1 - we want to return 1 byte)
    - `6000` - PUSH1 0x00 (Push memory offset 0 - start of our data)
    - `F3` - RETURN (Return 1 byte from memory position 0)
- The MSTORE8 requires two arguments: offset and value
- The RETURN requires two arguments: offset and size
- This contract returns exactly 1 byte of code (0x00), satisfying the EXTCODESIZE check
- Value is not used in this execution, so it's N/A

#### Puzzle 8

- Code: `36600080373660006000F0600080808080945AF1600014601B57FD5B00`
- Value: `false`
- Data: `true`

| PC  | Opcode | Name         | Gas   | Data |
| --- | ------ | ------------ | ----- | ---- |
| 0   | 54     | CALLDATASIZE | 2     |      |
| 1   | 96     | PUSH1        | 3     | 0x00 |
| 3   | 128    | DUP1         | 3     |      |
| 4   | 55     | CALLDATACOPY | 3     |      |
| 5   | 54     | CALLDATASIZE | 2     |      |
| 6   | 96     | PUSH1        | 3     | 0x00 |
| 8   | 96     | PUSH1        | 3     | 0x00 |
| 10  | 240    | CREATE       | 32000 |      |
| 11  | 96     | PUSH1        | 3     | 0x00 |
| 13  | 128    | DUP1         | 3     |      |
| 14  | 128    | DUP1         | 3     |      |
| 15  | 128    | DUP1         | 3     |      |
| 16  | 128    | DUP1         | 3     |      |
| 17  | 148    | SWAP5        | 3     |      |
| 18  | 90     | GAS          | 2     |      |
| 19  | 241    | CALL         | 700   |      |
| 20  | 96     | PUSH1        | 3     | 0x00 |
| 22  | 20     | EQ           | 3     |      |
| 23  | 96     | PUSH1        | 3     | 0x1b |
| 25  | 87     | JUMPI        | 10    |      |
| 26  | 253    | REVERT       | 0     |      |
| 27  | 91     | JUMPDEST     | 1     |      |
| 28  | 0      | STOP         | 0     |      |

- Solution:
	- Value: N/A
	- Data: `0x60FE60005360016000F3`

- At PC 0, `CALLDATASIZE` gets the length of the input data
- At PC 1-3, `PUSH1 0x00` and `DUP1` push 0 twice onto the stack
- At PC 4, `CALLDATACOPY` copies all calldata to memory starting at position 0
- At PC 5, `CALLDATASIZE` pushes the data length onto the stack again
- At PC 6-8, `PUSH1 0x00` twice pushes two zeros onto the stack
- At PC 10, `CREATE` deploys a new contract using the calldata as the contract's initialization code
- At PC 11-17, several stack operations are performed to prepare for a call to the new contract
- At PC 18-19, `GAS` and `CALL` call the newly created contract with 0 value and no parameters
- At PC 20-22, `PUSH1 0x00` and `EQ` check if the call returned 0 (failed)
- At PC 23-25, `PUSH1 0x1B` and `JUMPI` jump to PC 27 if the call failed
- A contract solution is needed because we must create a contract that fails when called
- The solution data `0x60FE60005360016000F3` is the contract's initialization code:
    - `60FE` - PUSH1 0xFE (Push value 0xFE, the INVALID opcode)
    - `6000` - PUSH1 0x00 (Push memory address 0)
    - `53` - MSTORE8 (Store the INVALID opcode at memory position 0)
    - `6001` - PUSH1 0x01 (Push size 1 byte)
    - `6000` - PUSH1 0x00 (Push memory address 0)
    - `F3` - RETURN (Return 1 byte from memory position 0)
- This creates a contract with runtime code 0xFE (INVALID opcode)
- When called, this contract immediately reverts, causing CALL to return 0
- This matches the EQ check, allowing the jump to JUMPDEST and successful completion
- Value is not used, so it's N/A

#### Puzzle 9

- Code: `36600310600957FDFD5B343602600814601457FD5B00`
- Value: `true`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|54|CALLDATASIZE|2||
|1|96|PUSH1|3|0x03|
|3|16|LT|3||
|4|96|PUSH1|3|0x09|
|6|87|JUMPI|10||
|7|253|REVERT|0||
|8|253|REVERT|0||
|9|91|JUMPDEST|1||
|10|52|CALLVALUE|2||
|11|54|CALLDATASIZE|2||
|12|2|MUL|5||
|13|96|PUSH1|3|0x08|
|15|20|EQ|3||
|16|96|PUSH1|3|0x14|
|18|87|JUMPI|10||
|19|253|REVERT|0||
|20|91|JUMPDEST|1||
|21|0|STOP|0||

- Solution:
	- Value: `2`
	- Data: `0x00000000`

- At PC 0, `CALLDATASIZE` pushes the size of the input data onto the stack
- At PC 1-3, `PUSH1 0x03` and `LT` check if calldata size is less than 3 bytes
- At PC 4-6, `PUSH1 0x09` and `JUMPI` jump to PC 9 if calldata size is less than 3
- If calldata size is 3 or more bytes, execution hits REVERT opcodes and fails
- At PC 10, `CALLVALUE` pushes the transaction value onto the stack
- At PC 11, `CALLDATASIZE` pushes the calldata size again
- At PC 12, `MUL` multiplies value and calldata size
- At PC 13-15, `PUSH1 0x08` and `EQ` check if this product equals 8
- At PC 16-18, `PUSH1 0x14` and `JUMPI` jump to PC 20 if product equals 8
- For execution to succeed, we need:
    - Calldata size < 3 bytes
    - Value * Calldata size = 8
- With Value = 2 and calldata size = 4, the second condition is satisfied (2 * 4 = 8)
- But the first condition (calldata size < 3) fails with 4 bytes
- `Callvalue (2) * Calldatasize (4) = 8`

#### Puzzle 10

- Code: `38349011600857FD5B3661000390061534600A0157FDFDFDFD5B00`
- Value: `true`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|56|CODESIZE|2||
|1|52|CALLVALUE|2||
|2|144|SWAP1|3||
|3|17|GT|3||
|4|96|PUSH1|3|0x08|
|6|87|JUMPI|10||
|7|253|REVERT|0||
|8|91|JUMPDEST|1||
|9|54|CALLDATASIZE|2||
|10|97|PUSH2|3|0x0003|
|13|144|SWAP1|3||
|14|6|MOD|5||
|15|21|ISZERO|3||
|16|52|CALLVALUE|2||
|17|96|PUSH1|3|0x0a|
|19|1|ADD|3||
|20|87|JUMPI|10||
|21|253|REVERT|0||
|22|253|REVERT|0||
|23|253|REVERT|0||
|24|253|REVERT|0||
|25|91|JUMPDEST|1||
|26|0|STOP|0||

- Solution:
	- Value: `15`
	- Data: `0x000000`

- At PC 0, `CODESIZE` pushes the size of the contract code (27 bytes) onto the stack
- At PC 1, `CALLVALUE` pushes the transaction's Wei value onto the stack
- At PC 2, `SWAP1` swaps the top two stack items (CALLVALUE is now below CODESIZE)
- At PC 3, `GT` checks if CODESIZE > CALLVALUE (1 if true, 0 if false)
- At PC 4-6, `PUSH1 0x08` and `JUMPI` jump to PC 8 if CODESIZE > CALLVALUE
- For execution to proceed, we need CODESIZE (27) > CALLVALUE, so CALLVALUE must be < 27
- At PC 9, `CALLDATASIZE` pushes the calldata length onto the stack
- At PC 10-13, `PUSH2 0x0003` and `SWAP1` prepare for the MOD operation
- At PC 14-15, `MOD` and `ISZERO` check if CALLDATASIZE % 3 == 0
- At PC 16-19, `CALLVALUE`, `PUSH1 0x0A`, and `ADD` calculate CALLVALUE + 10
- At PC 20, `JUMPI` jumps to CALLVALUE + 10 if CALLDATASIZE % 3 == 0
- For this to reach the JUMPDEST at PC 25, CALLVALUE must be 15 (since 15 + 10 = 25)
- Solution uses Value = 15 (satisfies both CALLVALUE < 27 and CALLVALUE + 10 = 25)
- Data = `0x000000` is 3 bytes long, and 3 % 3 = 0, satisfying the divisibility check

