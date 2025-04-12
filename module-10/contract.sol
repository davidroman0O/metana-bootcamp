// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract BitWise {
    // count the number of bit set in data.  i.e. data = 7, result = 3
    function countBitSet(uint8 data) public pure returns (uint8 result) {
        for( uint i = 0; i < 8; i += 1) {
            if( ((data >> i) & 1) == 1) {
                result += 1;
            }
        }
    }

    function countBitSetAsm(uint8 data) public pure returns (uint8 result) {
        assembly {
            // I had one that worked with a loop but i tried to do it without a loop for the lulz
            // No loops, no complex operations, just direct bit testing
            result := add(
                add(
                    add(
                        and(data, 1),               // bit 0
                        and(shr(1, data), 1)        // bit 1
                    ),
                    add(
                        and(shr(2, data), 1),       // bit 2
                        and(shr(3, data), 1)        // bit 3
                    )
                ),
                add(
                    add(
                        and(shr(4, data), 1),       // bit 4
                        and(shr(5, data), 1)        // bit 5
                    ),
                    add(
                        and(shr(6, data), 1),       // bit 6
                        and(shr(7, data), 1)        // bit 7
                    )
                )
            )
        }
    }
}

// Add following test cases for String contract: 
// charAt("abcdef", 2) should return 0x6300
// charAt("", 0) should return 0x0000
// charAt("george", 10) should return 0x0000

contract String {
   function charAt(string memory input, uint index) public pure returns(bytes2) {
        uint length;
        uint dataStart;
        bytes32 byteVal;
        uint8 char;
        assembly {
            length := mload(input)
            dataStart := add(input, 0x20)
            if lt(index, length) {
                let charPos := add(dataStart, index)
                byteVal := mload(charPos)
                char := byte(0, byteVal) // load the rightmost byte only
            }
        }
        return bytes2(uint16(char) << 8);
   }
}