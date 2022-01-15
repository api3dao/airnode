// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IBeaconServer.sol";

interface IDapiServer is IBeaconServer {
    function fulfillPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        uint256 timestamp,
        bytes calldata data
    ) external;

    function conditionPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata conditionParameters
    ) external returns (bool);

    function updateDapi(bytes32[] memory beaconIds)
        external
        returns (bytes32 dapiId);
}
