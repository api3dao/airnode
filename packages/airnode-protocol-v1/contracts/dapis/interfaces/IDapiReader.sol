// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IDapiReader {
    function beaconServer() external view returns (address);
}

/// @dev We use the part of the interface that will persist between
/// BeaconServer versions here
interface IDapiServer {
    function readDataPoint(bytes32 dataPointId)
        external
        view
        returns (int224 value, uint32 timestamp);
}
