// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IBeaconUser.sol";

interface IPercentageDeviationCondition is IBeaconUser {
    function setUpdatePercentageThreshold(
        bytes32 subscriptionId,
        uint256 updatePercentageThreshold
    ) external;

    function condition(bytes32 subscriptionId, bytes calldata data)
        external
        view
        returns (bool);

    function subscriptionIdToUpdatePercentageThreshold(bytes32 subscriptionId)
        external
        view
        returns (uint256);
}
