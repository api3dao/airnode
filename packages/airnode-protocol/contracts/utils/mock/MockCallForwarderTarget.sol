// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract MockCallForwarderTarget {
    string public storage1;
    uint256 public storage2;

    function targetFunction(string calldata input1, uint256 input2)
        external
        payable
        returns (bytes memory output1, bool output2)
    {
        require(
            keccak256(abi.encodePacked(input1)) ==
                keccak256(abi.encodePacked("input1")),
            "Incorrect input"
        );
        require(input2 == 123, "Incorrect input");
        require(msg.value == 456, "Incorrect value");
        storage1 = input1;
        storage2 = input2;
        output1 = hex"12345678";
        output2 = true;
    }
}
