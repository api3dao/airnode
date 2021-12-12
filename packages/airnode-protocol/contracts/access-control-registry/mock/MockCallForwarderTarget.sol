// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract MockCallForwarderTarget {
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
        output1 = hex"12345678";
        output2 = true;
    }
}
