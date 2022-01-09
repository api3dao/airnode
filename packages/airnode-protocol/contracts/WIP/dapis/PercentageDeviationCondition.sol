// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../AirnodeUser.sol";
import "./BeaconUser.sol";
import "../access-control-registry/AccessControlRegistryAdminned.sol";
import "./interfaces/IPercentageDeviationCondition.sol";

/// @dev This contract should have the unlimited beacon reader role for the
/// respective beacon server contract
contract PercentageDeviationCondition is
    AirnodeUser,
    BeaconUser,
    AccessControlRegistryAdminned,
    IPercentageDeviationCondition
{
    mapping(bytes32 => uint256)
        public
        override subscriptionIdToUpdatePercentageThreshold;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _airnodeProtocol,
        address _beaconServer,
        address _accessControlRegistry,
        string memory _adminRoleDescription
    )
        AirnodeUser(_airnodeProtocol)
        BeaconUser(_beaconServer)
        AccessControlRegistryAdminned(
            _accessControlRegistry,
            _adminRoleDescription
        )
    {}

    function setUpdatePercentageThreshold(
        bytes32 subscriptionId,
        uint256 updatePercentageThreshold
    ) external override {
        (, , address sponsor, , ) = IAirnodeProtocol(airnodeProtocol)
            .subscriptions(subscriptionId);
        require(msg.sender == sponsor, "Sender not sponsor");
        subscriptionIdToUpdatePercentageThreshold[
            subscriptionId
        ] = updatePercentageThreshold;
    }

    function condition(bytes32 subscriptionId, bytes calldata data)
        external
        view
        override
        returns (bool)
    {
        require(msg.sender == address(0), "Sender address not zero");
        (bytes32 beaconId, , , , ) = IAirnodeProtocol(airnodeProtocol)
            .subscriptions(subscriptionId);
        (int256 decodedData, ) = abi.decode(data, (int256, uint256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        (int224 beaconValue, ) = IBeaconServer(beaconServer).readBeacon(
            beaconId
        );
        uint256 absoluteDelta = uint256(
            decodedData > beaconValue
                ? decodedData - beaconValue
                : beaconValue - decodedData
        );
        uint256 absoluteBeaconValue;
        if (beaconValue > 0) {
            absoluteBeaconValue = uint256(int256(beaconValue));
        } else if (beaconValue < 0) {
            absoluteBeaconValue = uint256(-int256(beaconValue));
        } else {
            // Avoid division by 0
            absoluteBeaconValue = 1;
        }
        return
            (10**18 * absoluteDelta) / absoluteBeaconValue >
            subscriptionIdToUpdatePercentageThreshold[subscriptionId];
    }
}
