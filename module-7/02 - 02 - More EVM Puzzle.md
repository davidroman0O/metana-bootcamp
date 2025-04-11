
#### Puzzle 1

- Code: `36340A56FEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFE5B58360156FEFE5B00`
- Value: `true`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|54|CALLDATASIZE|2||
|1|52|CALLVALUE|2||
|2|10|EXP|10||
|3|86|JUMP|8||
|4|254|INVALID|0||
|5|254|INVALID|0||
|6|254|INVALID|0||
|7|254|INVALID|0||
|8|254|INVALID|0||
|9|254|INVALID|0||
|10|254|INVALID|0||
|11|254|INVALID|0||
|12|254|INVALID|0||
|13|254|INVALID|0||
|14|254|INVALID|0||
|15|254|INVALID|0||
|16|254|INVALID|0||
|17|254|INVALID|0||
|18|254|INVALID|0||
|19|254|INVALID|0||
|20|254|INVALID|0||
|21|254|INVALID|0||
|22|254|INVALID|0||
|23|254|INVALID|0||
|24|254|INVALID|0||
|25|254|INVALID|0||
|26|254|INVALID|0||
|27|254|INVALID|0||
|28|254|INVALID|0||
|29|254|INVALID|0||
|30|254|INVALID|0||
|31|254|INVALID|0||
|32|254|INVALID|0||
|33|254|INVALID|0||
|34|254|INVALID|0||
|35|254|INVALID|0||
|36|254|INVALID|0||
|37|254|INVALID|0||
|38|254|INVALID|0||
|39|254|INVALID|0||
|40|254|INVALID|0||
|41|254|INVALID|0||
|42|254|INVALID|0||
|43|254|INVALID|0||
|44|254|INVALID|0||
|45|254|INVALID|0||
|46|254|INVALID|0||
|47|254|INVALID|0||
|48|254|INVALID|0||
|49|254|INVALID|0||
|50|254|INVALID|0||
|51|254|INVALID|0||
|52|254|INVALID|0||
|53|254|INVALID|0||
|54|254|INVALID|0||
|55|254|INVALID|0||
|56|254|INVALID|0||
|57|254|INVALID|0||
|58|254|INVALID|0||
|59|254|INVALID|0||
|60|254|INVALID|0||
|61|254|INVALID|0||
|62|254|INVALID|0||
|63|254|INVALID|0||
|64|91|JUMPDEST|1||
|65|88|PC|2||
|66|54|CALLDATASIZE|2||
|67|1|ADD|3||
|68|86|JUMP|8||
|69|254|INVALID|0||
|70|254|INVALID|0||
|71|91|JUMPDEST|1||
|72|0|STOP|0||

- Solution:
	- Value: `2`
	- Data: `0x000000000000`

- At PC 0, `CALLDATASIZE` pushes the size of the calldata (6 bytes) onto the stack
- At PC 1, `CALLVALUE` pushes the transaction value (2) onto the stack
- At PC 2, `EXP` calculates CALLVALUE^CALLDATASIZE (2^6 = 64)
- At PC 3, `JUMP` uses this value (64) as the destination address
    - This is crucial because we need to jump over all the `INVALID` instructions
    - The jump lands exactly at the first `JUMPDEST` at PC 64
- At PC 64, execution continues safely at the `JUMPDEST`
- At PC 65, `PC` pushes the current program counter value (65) onto the stack
- At PC 66, `CALLDATASIZE` pushes 6 again onto the stack
- At PC 67, `ADD` combines them (65 + 6 = 71)
- At PC 68, `JUMP` uses this value to jump to PC 71
    - Another precisely calculated jump to avoid `INVALID` instructions
- At PC 71, we land at another valid `JUMPDEST`
- At PC 72, `STOP` terminates the execution successfully
- The solution requires:
    - Value = 2, as it's needed to calculate 2^6 = 64 for the first jump
    - Data = 0x000000000000 (6 bytes) to ensure CALLDATASIZE = 6
        - This creates both the correct first jump (2^6 = 64)
        - And the correct second jump destination (65 + 6 = 71)
- Every value is precisely calculated to navigate between valid jump destinations while avoiding all `INVALID` instructions

#### Puzzle 2

- Code: `3660006000373660006000F0600080808080945AF13D600a14601F57FEFEFE5B00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|54|CALLDATASIZE|2||
|1|96|PUSH1|3|0x00|
|3|96|PUSH1|3|0x00|
|5|55|CALLDATACOPY|3||
|6|54|CALLDATASIZE|2||
|7|96|PUSH1|3|0x00|
|9|96|PUSH1|3|0x00|
|11|240|CREATE|32000||
|12|96|PUSH1|3|0x00|
|14|128|DUP1|3||
|15|128|DUP1|3||
|16|128|DUP1|3||
|17|128|DUP1|3||
|18|148|SWAP5|3||
|19|90|GAS|2||
|20|241|CALL|700||
|21|61|RETURNDATASIZE|2||
|22|96|PUSH1|3|0x0a|
|24|20|EQ|3||
|25|96|PUSH1|3|0x1f|
|27|87|JUMPI|10||
|28|254|INVALID|0||
|29|254|INVALID|0||
|30|254|INVALID|0||
|31|91|JUMPDEST|1||
|32|0|STOP|0||

- Solution:
	- Value: 0
	- Data: `0x6013600C60003960136000F36901020304050607080910600052600A6016F3`

- At PC 0-5, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CALLDATACOPY` copy the calldata to memory position 0
- At PC 6-11, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CREATE` create a new contract using the calldata as initialization code
    - The `CREATE` opcode puts the new contract's address on the stack
- At PC 12-20, stack operations and `CALL` invoke the newly created contract with no parameters
- At PC 21-27, `RETURNDATASIZE`, `PUSH1 0x0a`, `EQ`, `PUSH1 0x1f`, and `JUMPI` check if the return data is exactly 10 bytes
    - If true, jump to PC 31 (success path)
    - If false, execution continues to `INVALID` opcodes (failure)
- The solution data contains two parts: contract creation code and runtime code
- Creation code breakdown: `6013600C60003960136000F3`
    - `6013`: Push value 19 (bytes to copy)
    - `600C`: Push value 12 (start position to copy from)
    - `6000`: Push value 0 (destination memory position)
    - `39`: CODECOPY (copies 19 bytes from position 12 to memory position 0)
    - `6013`: Push value 19 (bytes to return)
    - `6000`: Push value 0 (memory position to return from)
    - `F3`: RETURN (returns the runtime code to be deployed)
- Runtime code breakdown: `6901020304050607080910600052600A6016F3`
    - `6901020304050607080910`: Push a 10-byte value to the stack
    - `6000`: Push memory position 0
    - `52`: MSTORE (store the 10-byte value at memory position 0)
    - `600A`: Push value 10 (bytes to return)
    - `6000`: Push memory position 0
    - `F3`: RETURN (returns exactly 10 bytes)
- A contract solution is necessary because:
    - The main contract explicitly deploys our code with CREATE
    - The contract's success depends on a successful CALL returning exactly 10 bytes
    - Only properly crafted contract code can perform this specific task
    - The 10-byte return value must be precisely positioned in memory

| PC  | Opcode | Name     | Gas | Data |
| --- | ------ | -------- | --- | ---- |
| 0   | 96     | PUSH1    | 3   | 0x13 |
| 2   | 96     | PUSH1    | 3   | 0x0c |
| 4   | 96     | PUSH1    | 3   | 0x00 |
| 6   | 57     | CODECOPY | 3   |      |
| 7   | 96     | PUSH1    | 3   | 0x13 |
| 9   | 96     | PUSH1    | 3   | 0x00 |
| 11  | 243    | RETURN   | 0   |      |

| PC  | Opcode | Name   | Gas | Data                   |
| --- | ------ | ------ | --- | ---------------------- |
| 0   | 105    | PUSH:  | 3   | 0x01020304050607080910 |
| 11  | 96     | PUSH1  | 3   | 0x00                   |
| 13  | 82     | MSTORE | 3   |                        |
| 14  | 96     | PUSH1  | 3   | 0x0a                   |
| 16  | 96     | PUSH1  | 3   | 0x16                   |
| 18  | 243    | RETURN | 0   |                        |

#### Puzzle 3

- Code: `3660006000373660006000F06000808080935AF460055460aa14601e57fe5b00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|54|CALLDATASIZE|2||
|1|96|PUSH1|3|0x00|
|3|96|PUSH1|3|0x00|
|5|55|CALLDATACOPY|3||
|6|54|CALLDATASIZE|2||
|7|96|PUSH1|3|0x00|
|9|96|PUSH1|3|0x00|
|11|240|CREATE|32000||
|12|96|PUSH1|3|0x00|
|14|128|DUP1|3||
|15|128|DUP1|3||
|16|128|DUP1|3||
|17|147|SWAP4|3||
|18|90|GAS|2||
|19|244|DELEGATECALL|700||
|20|96|PUSH1|3|0x05|
|22|84|SLOAD|800||
|23|96|PUSH1|3|0xaa|
|25|20|EQ|3||
|26|96|PUSH1|3|0x1e|
|28|87|JUMPI|10||
|29|254|INVALID|0||
|30|91|JUMPDEST|1||
|31|0|STOP|0||

- Solution:
	- Value: N/A
	- Data: `0x6005600C60003960056000F360AA6005556000F3`

- At PC 0-5, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CALLDATACOPY` copy the calldata to memory position 0
- At PC 6-11, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CREATE` create a new contract using the calldata as initialization code
    - The `CREATE` opcode puts the new contract's address on the stack
- At PC 12-19, stack operations and `DELEGATECALL` execute the newly created contract's code in the context of the current contract
    - Critically, this means storage modifications happen to the calling contract's storage
- At PC 20-28, `PUSH1 0x05`, `SLOAD`, `PUSH1 0xaa`, `EQ`, `PUSH1 0x1e`, and `JUMPI` check if storage slot 5 contains the value 0xAA
    - If true, jump to PC 30 (success path)
    - If false, execution continues to `INVALID` (failure)
- The solution data contains two parts: contract creation code and runtime code
- Creation code breakdown: `6005600C60003960056000F3`
    - `6005`: Push value 5 (bytes to copy)
    - `600C`: Push value 12 (start position to copy from)
    - `6000`: Push value 0 (destination memory position)
    - `39`: CODECOPY (copies 5 bytes from position 12 to memory position 0)
    - `6005`: Push value 5 (bytes to return)
    - `6000`: Push value 0 (memory position to return from)
    - `F3`: RETURN (returns the runtime code to be deployed)
- Runtime code breakdown: `60AA6005556000F3`
    - `60AA`: Push value 0xAA onto the stack
    - `6005`: Push value 5 (storage slot)
    - `55`: SSTORE (stores value 0xAA at storage slot 5)
    - `6000`: Push value 0 (empty return)
    - `F3`: RETURN (returns nothing, execution completed)
- A contract solution is necessary because:
    - The main contract uses DELEGATECALL, which executes code in the caller's context
    - We need to modify the calling contract's storage at slot 5
    - Only a deployed contract can execute the SSTORE operation to set storage value 0xAA
    - DELEGATECALL is specifically designed for this type of storage manipulation
    - The puzzle explicitly checks storage slot 5 after the call

Contract:

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x05|
|2|96|PUSH1|3|0x0c|
|4|96|PUSH1|3|0x00|
|6|57|CODECOPY|3||
|7|96|PUSH1|3|0x05|
|9|96|PUSH1|3|0x00|
|11|243|RETURN|0||

Runtime:

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0xaa|
|2|96|PUSH1|3|0x05|
|4|85|SSTORE|5000||
|5|96|PUSH1|3|0x00|
|7|243|RETURN|0||

#### Puzzle 4

- Code: `30313660006000373660003031F0319004600214601857FD5B00`
- Value: `true`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|48|ADDRESS|2||
|1|49|BALANCE|700||
|2|54|CALLDATASIZE|2||
|3|96|PUSH1|3|0x00|
|5|96|PUSH1|3|0x00|
|7|55|CALLDATACOPY|3||
|8|54|CALLDATASIZE|2||
|9|96|PUSH1|3|0x00|
|11|48|ADDRESS|2||
|12|49|BALANCE|700||
|13|240|CREATE|32000||
|14|49|BALANCE|700||
|15|144|SWAP1|3||
|16|4|DIV|5||
|17|96|PUSH1|3|0x02|
|19|20|EQ|3||
|20|96|PUSH1|3|0x18|
|22|87|JUMPI|10||
|23|253|REVERT|0||
|24|91|JUMPDEST|1||
|25|0|STOP|0||

- Solution:
	- Value: `20`
	- Data: `0x6002303104600052366000600051f03160206000f3`

- At PC 0-1, `ADDRESS` and `BALANCE` get the current contract's address and balance (20 wei)
- At PC 2-7, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CALLDATACOPY` copy the calldata to memory position 0
- At PC 8-13, `CALLDATASIZE`, `PUSH1 0x00`, `ADDRESS`, `BALANCE`, and `CREATE` create a new contract using the calldata as code and send the entire balance (20 wei)
- At PC 14-16, `BALANCE`, `SWAP1`, and `DIV` calculate the ratio of the original balance to the current balance
- At PC 17-22, `PUSH1 0x02`, `EQ`, `PUSH1 0x18`, and `JUMPI` check if this ratio equals 2 (meaning half the value returned)
    - If true, jump to PC 24 (success)
    - If false, execution continues to `REVERT`
- The solution data contains contract creation code that will return half the funds
- Contract code breakdown: `0x6002303104600052366000600051f03160206000f3`
    - Creation code:
        - `6002`: Push value 2
        - `3031`: ADDRESS and BALANCE (get contract's balance of 20 wei)
        - `04`: DIV (2/20 = 0 in integer division)
        - `600052`: Store this value in memory
        - `36`: CALLDATASIZE (0 in this context)
        - `6000`: Push value 0
        - `600051`: Push 0 and MLOAD (load the stored value)
        - `f0`: CREATE a sub-contract with no value
        - `31`: BALANCE (get current balance)
        - `6020`: Push value 32
        - `6000`: Push value 0
        - `f3`: RETURN (return 32 bytes from memory)
    - This code creates a "selfdestruct" contract that sends exactly half of the funds back to the creating contract
- A contract solution is necessary because:
    - We need complex logic to calculate and return exactly half the funds
    - The main contract specifically tests for a balance ratio of 2:1 before and after execution
    - Only contract code with precise value manipulation can achieve this balance ratio
    - The selfdestruct pattern is the most efficient way to return value in EVM

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x02|
|2|48|ADDRESS|2||
|3|49|BALANCE|700||
|4|4|DIV|5||
|5|96|PUSH1|3|0x00|
|7|82|MSTORE|3||
|8|54|CALLDATASIZE|2||
|9|96|PUSH1|3|0x00|
|11|96|PUSH1|3|0x00|
|13|81|MLOAD|3||
|14|240|CREATE|32000||
|15|49|BALANCE|700||
|16|96|PUSH1|3|0x20|
|18|96|PUSH1|3|0x00|
|20|243|RETURN|0||

#### Puzzle 5

- Code: `60203611600857FD5B366000600037365903600314601957FD5B00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x20|
|2|54|CALLDATASIZE|2||
|3|17|GT|3||
|4|96|PUSH1|3|0x08|
|6|87|JUMPI|10||
|7|253|REVERT|0||
|8|91|JUMPDEST|1||
|9|54|CALLDATASIZE|2||
|10|96|PUSH1|3|0x00|
|12|96|PUSH1|3|0x00|
|14|55|CALLDATACOPY|3||
|15|54|CALLDATASIZE|2||
|16|89|MSIZE|2||
|17|3|SUB|3||
|18|96|PUSH1|3|0x03|
|20|20|EQ|3||
|21|96|PUSH1|3|0x19|
|23|87|JUMPI|10||
|24|253|REVERT|0||
|25|91|JUMPDEST|1||
|26|0|STOP|0||

- Solution:
	- Value: N/A
	- Data: `0x12345678901234567890123456789012345678901234567890123456789012341234567890123456789012345678901234567890123456789012345678`

- At PC 0-6, `PUSH1 0x20`, `CALLDATASIZE`, `GT`, `PUSH1 0x08`, and `JUMPI` check if calldata size > 32 bytes
    - If false, execution continues to `REVERT`
    - If true, execution jumps to PC 8
- At PC 8-14, `JUMPDEST`, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, and `CALLDATACOPY` copy the entire calldata to memory
- At PC 15-23, `CALLDATASIZE`, `MSIZE`, `SUB`, `PUSH1 0x03`, `EQ`, `PUSH1 0x19`, and `JUMPI` check if MSIZE - CALLDATASIZE = 3
    - If true, jump to PC 25 (success path)
    - If false, execution continues to `REVERT`
- The solution requires understanding a key aspect of EVM memory allocation:
    - Memory is allocated in 32-byte chunks (words)
    - After CALLDATACOPY, MSIZE returns the size of allocated memory
    - When CALLDATASIZE is not a multiple of 32, MSIZE rounds up to the next multiple of 32
    - For MSIZE - CALLDATASIZE to equal 3, CALLDATASIZE must be exactly 3 bytes less than a multiple of 32
- The solution data is 122 characters (excluding 0x), which represents 61 bytes
    - With 61 bytes of calldata, MSIZE would be 64 (next multiple of 32)
    - MSIZE - CALLDATASIZE = 64 - 61 = 3, satisfying the condition
- Larger solutions would not work because:
    - They would require excessive gas for memory expansion
    - They would cause stack management issues during execution
    - The CALLDATACOPY operation would likely fail with larger inputs
    - Often got stack underflow as a result

#### Puzzle 6

- Code: `7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03401600114602a57fd5b00`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|127|PUSHP|3|0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0|
|33|52|CALLVALUE|2||
|34|1|ADD|3||
|35|96|PUSH1|3|0x01|
|37|20|EQ|3||
|38|96|PUSH1|3|0x2a|
|40|87|JUMPI|10||
|41|253|REVERT|0||
|42|91|JUMPDEST|1||
|43|0|STOP|0||

- Solution:
	- Value: `17`
	- Data: N/A

> Previous I didn't understood why it was `4`, Dhruvin Parikh told me he wanted more notes on my thought and for that i one i had zero explanation since i just guessed by increasing the wei. After a second pass on the puzzle, i finally understand why. 

- At PC 0-32, `PUSH32` pushes a massive 32-byte hex value onto the stack: `0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0`
    - This value is almost the maximum possible 256-bit number, but ends with `f0` instead of `ff`
    - In decimal, it's 16 less than the maximum 256-bit value (2²⁵⁶-1)
- At PC 33, `CALLVALUE` pushes the transaction's Wei value onto the stack
- At PC 34, `ADD` adds the transaction value to the huge 32-byte number
- At PC 35-37, `PUSH1 0x01`, `EQ` check if the result of the addition equals 1
- At PC 38-40, `PUSH1 0x2a`, `JUMPI` jump to PC 42 if the condition is true, otherwise execution continues to `REVERT`
- The key insight involves understanding how overflow works in the EVM:
    - When adding beyond the maximum 256-bit value, the result "wraps around" starting from 0
    - The pushed value is 16 less than the maximum possible value (2²⁵⁶-1)
    - Therefore: (2²⁵⁶-1-16) + 17 = (2²⁵⁶-1) + 1 = 2²⁵⁶ = 0 + 1 = 1
    - Typical overflow wrapping around
- Solution requires a value of exactly 17 Wei to cause the precise overflow needed
- No calldata is required as the puzzle only depends on the transaction value

#### Puzzle 7

- Code: `5a345b60019003806000146011576002565b5a90910360a614601d57fd5b00`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|90|GAS|2||
|1|52|CALLVALUE|2||
|2|91|JUMPDEST|1||
|3|96|PUSH1|3|0x01|
|5|144|SWAP1|3||
|6|3|SUB|3||
|7|128|DUP1|3||
|8|96|PUSH1|3|0x00|
|10|20|EQ|3||
|11|96|PUSH1|3|0x11|
|13|87|JUMPI|10||
|14|96|PUSH1|3|0x02|
|16|86|JUMP|8||
|17|91|JUMPDEST|1||
|18|90|GAS|2||
|19|144|SWAP1|3||
|20|145|SWAP2|3||
|21|3|SUB|3||
|22|96|PUSH1|3|0xa6|
|24|20|EQ|3||
|25|96|PUSH1|3|0x1d|
|27|87|JUMPI|10||
|28|253|REVERT|0||
|29|91|JUMPDEST|1||
|30|0|STOP|0||

- Solution:
	- Value: `4`
	- Data: N/A 

- At PC 0, `GAS` captures the current gas level (let's call it G1)
- At PC 1, `CALLVALUE` pushes the transaction value onto the stack
- At PC 2-16, a loop begins that will execute once for each unit of value:
    - `PUSH1 0x01`, `SWAP1`, `SUB` decrements the counter (initially CALLVALUE)
    - `DUP1`, `PUSH1 0x00`, `EQ` checks if the counter reached zero
    - If counter equals zero, `JUMPI` jumps to PC 17 (exit loop)
    - Otherwise, `PUSH1 0x02`, `JUMP` jumps back to PC 2 (continue loop)
    - This creates a loop that executes exactly CALLVALUE times
- At PC 17-21, after exiting the loop:
    - `GAS` captures the new gas level (G2)
    - `SWAP1`, `SWAP2`, `SUB` calculates G1 - G2 (gas consumed in the loop)
- At PC 22-27, `PUSH1 0xa6`, `EQ`, `PUSH1 0x1d`, `JUMPI` checks if exactly 166 (0xA6) gas was consumed
    - If true, jump to success path
    - If false, `REVERT`
- The solution requires a value of 4 Wei because:
    - Each loop iteration consumes a fixed amount of gas
    - With 4 iterations, the loop consumes exactly 166 gas units
    - With any other value, the gas consumption would be different
    - This is a gas metering challenge that requires precise calculation
- No data is needed as the puzzle only depends on the transaction value and gas consumption

#### Puzzle 8

- Code: `341519600757fd5b3660006000373660006000f047600060006000600047865af1600114602857fd5b4714602f57fd5b00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|52|CALLVALUE|2||
|1|21|ISZERO|3||
|2|25|NOT|3||
|3|96|PUSH1|3|0x07|
|5|87|JUMPI|10||
|6|253|REVERT|0||
|7|91|JUMPDEST|1||
|8|54|CALLDATASIZE|2||
|9|96|PUSH1|3|0x00|
|11|96|PUSH1|3|0x00|
|13|55|CALLDATACOPY|3||
|14|54|CALLDATASIZE|2||
|15|96|PUSH1|3|0x00|
|17|96|PUSH1|3|0x00|
|19|240|CREATE|32000||
|20|71|SELFBALANCE|5||
|21|96|PUSH1|3|0x00|
|23|96|PUSH1|3|0x00|
|25|96|PUSH1|3|0x00|
|27|96|PUSH1|3|0x00|
|29|71|SELFBALANCE|5||
|30|134|DUP7|3||
|31|90|GAS|2||
|32|241|CALL|700||
|33|96|PUSH1|3|0x01|
|35|20|EQ|3||
|36|96|PUSH1|3|0x28|
|38|87|JUMPI|10||
|39|253|REVERT|0||
|40|91|JUMPDEST|1||
|41|71|SELFBALANCE|5||
|42|20|EQ|3||
|43|96|PUSH1|3|0x2f|
|45|87|JUMPI|10||
|46|253|REVERT|0||
|47|91|JUMPDEST|1||
|48|0|STOP|0||

- Solution:
	- Value: N/A
	- Data: `0x6133ff6000526002601ef3`

- At PC 0-5, `CALLVALUE`, `ISZERO`, `NOT`, `PUSH1 0x07`, `JUMPI` check if CALLVALUE is non-zero
    - This implies the value must not be zero
- At PC 7-19, `JUMPDEST`, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, `CALLDATACOPY`, `CALLDATASIZE`, `PUSH1 0x00`, `PUSH1 0x00`, `CREATE` copy the calldata to memory and create a new contract
- At PC 20-32, `SELFBALANCE`, `PUSH1 0x00`, `PUSH1 0x00`, `PUSH1 0x00`, `PUSH1 0x00`, `SELFBALANCE`, `DUP7`, `GAS`, `CALL` call the newly created contract
- At PC 33-39, `PUSH1 0x01`, `EQ`, `PUSH1 0x28`, `JUMPI` check if the call was successful
- At PC 40-46, `JUMPDEST`, `SELFBALANCE`, `EQ`, `PUSH1 0x2f`, `JUMPI` check if SELFBALANCE equals 1
- The solution data contains contract creation code: `0x6133ff6000526002601ef3`
    - Creation code breakdown:
        - `6133ff`: PUSH2 0x33ff (pushes the runtime bytecode)
        - `6000`: PUSH1 0x00 (memory position)
        - `52`: MSTORE (store the bytecode in memory)
        - `6002`: PUSH1 0x02 (bytes to return)
        - `601e`: PUSH1 0x1e (memory offset 30)
        - `f3`: RETURN (return 2 bytes from memory position 30)
    - The returned 2 bytes from position 30 are the runtime code: `33ff`
        - `33`: CALLER (get the address of the caller)
        - `ff`: SELFDESTRUCT (self-destruct and send funds to the caller)
- A contract solution is necessary because:
    - The main contract explicitly checks for a successful call
    - The final balance must equal 1 wei to pass the second check
    - Only a contract with SELFDESTRUCT can manipulate the balance this way
    - The EVM ensures the contract's balance becomes 1 during execution
    - The combination of checks requires precise contract behaviour

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|97|PUSH2|3|0x33ff|
|3|96|PUSH1|3|0x00|
|5|82|MSTORE|3||
|6|96|PUSH1|3|0x02|
|8|96|PUSH1|3|0x1e|
|10|243|RETURN|0||

#### Puzzle 9

- Code: `34600052602060002060F81C60A814601657FDFDFDFD5B00`
- Value: `true`
- Data: `false`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|52|CALLVALUE|2||
|1|96|PUSH1|3|0x00|
|3|82|MSTORE|3||
|4|96|PUSH1|3|0x20|
|6|96|PUSH1|3|0x00|
|8|32|KECCAK256|30||
|9|96|PUSH1|3|0xf8|
|11|28|SHR|3||
|12|96|PUSH1|3|0xa8|
|14|20|EQ|3||
|15|96|PUSH1|3|0x16|
|17|87|JUMPI|10||
|18|253|REVERT|0||
|19|253|REVERT|0||
|20|253|REVERT|0||
|21|253|REVERT|0||
|22|91|JUMPDEST|1||
|23|0|STOP|0||

- Solution:
	- Value: `47`
	- Data: N/A

- At PC 0-3, `CALLVALUE`, `PUSH1 0x00`, and `MSTORE` store the transaction value at memory position 0
- At PC 4-8, `PUSH1 0x20`, `PUSH1 0x00`, and `KECCAK256` compute the hash of the 32-byte word at memory position 0
    - This is hashing the CALLVALUE stored as a 32-byte word
- At PC 9-11, `PUSH1 0xf8` and `SHR` shift the hash to the right by 248 bits
    - This extracts only the most significant byte of the 32-byte hash
- At PC 12-17, `PUSH1 0xa8`, `EQ`, `PUSH1 0x16`, and `JUMPI` check if this byte equals 0xa8 (168 in decimal)
    - If true, jump to PC 22 (success path)
    - If false, execution continues to multiple `REVERT` instructions
- The solution requires a value of 47 wei because:
    - When 47 is stored in memory as a 32-byte word and hashed with Keccak256
    - The most significant byte of this hash equals exactly 0xa8
    - This is a cryptographic puzzle that relies on the specific properties of the hash function
    - No other reasonable value will produce a hash with 0xa8 as the first byte
- No data is needed for this contract as it only depends on the transaction value

#### Puzzle 10

- Code: `602060006000376000517ff0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f01660206020600037600051177fabababababababababababababababababababababababababababababababab14605d57fd5b00`
- Value: `false`
- Data: `true`

|PC|Opcode|Name|Gas|Data|
|---|---|---|---|---|
|0|96|PUSH1|3|0x20|
|2|96|PUSH1|3|0x00|
|4|96|PUSH1|3|0x00|
|6|55|CALLDATACOPY|3||
|7|96|PUSH1|3|0x00|
|9|81|MLOAD|3||
|10|127|PUSHP|3|0xf0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0|
|43|22|AND|3||
|44|96|PUSH1|3|0x20|
|46|96|PUSH1|3|0x20|
|48|96|PUSH1|3|0x00|
|50|55|CALLDATACOPY|3||
|51|96|PUSH1|3|0x00|
|53|81|MLOAD|3||
|54|23|OR|3||
|55|127|PUSHP|3|0xabababababababababababababababababababababababababababababababab|
|88|20|EQ|3||
|89|96|PUSH1|3|0x5d|
|91|87|JUMPI|10||
|92|253|REVERT|0||
|93|91|JUMPDEST|1||
|94|0|STOP|0||

- Solution:
	- Value: N/A
	- Data: `0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B`

- At PC 0-6, `PUSH1 0x20`, `PUSH1 0x00`, `PUSH1 0x00`, and `CALLDATACOPY` copy the first 32 bytes of calldata to memory position 0
- At PC 7-9, `PUSH1 0x00`, `MLOAD` load the 32-byte value from memory
- At PC 10-43, `PUSHP 0xf0f0...f0f0`, `AND` perform a bitwise AND with a 32-byte mask where each byte is 0xF0 (binary 11110000)
    - This preserves only the high 4 bits of each byte in the first 32 bytes
- At PC 44-50, `PUSH1 0x20`, `PUSH1 0x20`, `PUSH1 0x00`, `CALLDATACOPY` copy the second 32 bytes of calldata to memory position 0
- At PC 51-53, `PUSH1 0x00`, `MLOAD` load the second 32 bytes from memory
- At PC 54, `OR` combine the result of the AND operation with the second 32 bytes
- At PC 55-91, `PUSHP 0xababab...abab`, `EQ`, `PUSH1 0x5d`, `JUMPI` check if the result equals a 32-byte value where each byte is 0xAB (binary 10101011)
    - If true, jump to PC 93 (success path)
    - If false, execution continues to `REVERT`
- This puzzle is all about bit manipulation
- The contract is doing some binary math tricks with our data:
    - First it grabs the top 32 bytes and masks them with 0xF0
    - This basically keeps only the top half of each byte (the high 4 bits)
    - Then it takes the next 32 bytes and combines them with OR
    - It's like overlaying the second set of bytes on top of the first
    - The final result needs to match exactly 0xAB for every single byte
- Think of it as a two-layer puzzle:
    - Layer 1 (first 32 bytes): We need bytes where the top half is 0xA (binary 1010)
    - Layer 2 (next 32 bytes): We need bytes where the bottom half is 0xB (binary 1011)
- For the first layer, 0xAA is perfect because:
    - 0xAA looks like 1010 1010 in binary
    - After the mask keeps only the top half: 1010 0000 (which is 0xA0)
- For the second layer, 0x0B is perfect because:
    - 0x0B looks like 0000 1011 in binary
    - When combined with our first layer (0xA0), we get: 1010 1011 (which is 0xAB)
- So our solution is crafted from these two chunks:
    - First chunk: 32 bytes of 0xAA (to provide the top half of each target byte)
    - Second chunk: 32 bytes of 0x0B (to provide the bottom half of each target byte)
    - When the contract combines them through the AND and OR operations, we get exactly what we need
- Weird but it works
