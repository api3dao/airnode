// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IBeaconServer.sol";
import "./interfaces/IBeaconUser.sol";

contract BeaconUser is IBeaconUser {
    address public immutable override beaconServer;

    constructor(address _beaconServer) {
        require(_beaconServer != address(0), "Beacon server address zero");
        beaconServer = _beaconServer;
    }
}
