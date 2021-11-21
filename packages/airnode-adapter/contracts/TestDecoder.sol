//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

contract TestDecoder {
    function decodeSignedInt256(bytes calldata data)
        public
        pure
        returns (int256 decodedData)
    {
        decodedData = abi.decode(data, (int256));
    }

    function decodeUnsignedInt256(bytes calldata data)
        public
        pure
        returns (uint256 decodedData)
    {
        decodedData = abi.decode(data, (uint256));
    }

    function decodeBool(bytes calldata data)
        public
        pure
        returns (bool decodedData)
    {
        decodedData = abi.decode(data, (bool));
    }

    function decodeBytes32(bytes calldata data)
        public
        pure
        returns (bytes32 decodedData)
    {
        decodedData = abi.decode(data, (bytes32));
    }

    function decodeAddress(bytes calldata data)
        public
        pure
        returns (address decodedData)
    {
        decodedData = abi.decode(data, (address));
    }

    function decodeBytes(bytes calldata data)
        public
        pure
        returns (bytes memory decodedData)
    {
        decodedData = abi.decode(data, (bytes));
    }

    function decodeString(bytes calldata data)
        public
        pure
        returns (string memory decodedData)
    {
        decodedData = abi.decode(data, (string));
    }

    function decode1DArray(bytes calldata data)
        public
        pure
        returns (int256[] memory decodedData)
    {
        decodedData = abi.decode(data, (int256[]));
    }

    function decode1DFixedArray(bytes calldata data)
        public
        pure
        returns (int256[2] memory decodedData)
    {
        decodedData = abi.decode(data, (int256[2]));
    }

    function decodeNestedArray(bytes calldata data)
        public
        pure
        returns (int256[2][][3] memory decodedData)
    {
        decodedData = abi.decode(data, (int256[2][][3]));
    }

    function decodeString32(bytes calldata data)
        public
        pure
        returns (bytes32 decodedData)
    {
        decodedData = abi.decode(data, (bytes32));
    }

    function decodeMultipleParameters(bytes calldata data)
        public
        pure
        returns (string memory str, uint256 num, address addr)
    {
        (str, num, addr) = abi.decode(data, (string, uint256, address));
    }


    function decodeTimestamp(bytes calldata data)
        public
        pure
        returns (uint256 timestamp)
    {
        timestamp = abi.decode(data, (uint256));
    }
}
