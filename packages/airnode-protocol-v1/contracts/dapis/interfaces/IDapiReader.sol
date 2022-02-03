// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IDapiReader {
    function dapiServer() external view returns (address);
}

/// @dev We use the part of the interface that will persist between
/// DapiServer versions
interface IBaseDapiServer {
    function readWithDataPointId(bytes32 dataPointId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function readWithName(bytes32 name)
        external
        view
        returns (int224 value, uint32 timestamp);
}
