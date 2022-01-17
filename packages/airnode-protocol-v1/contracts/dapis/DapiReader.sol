// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IDapiReader.sol";

/// @title Contract to be inherited to interact with Beacons
contract DapiReader is IDapiReader {
    /// @notice BeaconServer contract address
    address public override beaconServer;

    /// @param _beaconServer BeaconServer contract address
    constructor(address _beaconServer) {
        updateBeaconServer(_beaconServer);
    }

    /// @notice Called internally to update the BeaconServer contract address
    /// @dev Inheriting contracts are highly recommended to expose this
    /// functionality to be able to migrate between BeaconServer contracts.
    /// Otherwise, when the BeaconServer goes out of service for any reason,
    /// the dependent contract will go defunct.
    /// Since this is a critical action, it needs to be protected behind
    /// mechanisms such as decentralized governance, timelocks, etc.
    /// @param _beaconServer BeaconServer contract address
    function updateBeaconServer(address _beaconServer) internal {
        require(_beaconServer != address(0), "Beacon server address zero");
        beaconServer = _beaconServer;
    }
}
