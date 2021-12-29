// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IBeaconServer.sol";
import "./interfaces/IBeaconUser.sol";

/// @title Contract to be inherited to interact with Beacons
contract BeaconUser is IBeaconUser {
    /// @notice BeaconServer contract address
    address public immutable override beaconServer;

    /// @param _beaconServer BeaconServer contract address
    constructor(address _beaconServer) {
        require(_beaconServer != address(0), "Beacon server address zero");
        beaconServer = _beaconServer;
    }
}
