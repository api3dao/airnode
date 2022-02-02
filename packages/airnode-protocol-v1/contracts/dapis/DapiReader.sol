// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IDapiReader.sol";

/// @title Contract to be inherited to read from a DapiServer contract
contract DapiReader is IDapiReader {
    /// @notice DapiServer contract address
    address public override dapiServer;

    /// @param _dapiServer DapiServer contract address
    constructor(address _dapiServer) {
        setDapiServer(_dapiServer);
    }

    /// @notice Called internally to update the DapiServer contract address
    /// @dev Inheriting contracts are highly recommended to expose this
    /// functionality to be able to migrate between DapiServer contracts.
    /// Otherwise, when the DapiServer goes out of service for any reason,
    /// the dependent contract will go defunct.
    /// Since this is a critical action, it needs to be protected behind
    /// mechanisms such as decentralized governance, timelocks, etc.
    /// @param _dapiServer DapiServer contract address
    function setDapiServer(address _dapiServer) internal {
        require(_dapiServer != address(0), "dAPI server address zero");
        dapiServer = _dapiServer;
    }
}
