// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IAirnodeProtocol.sol";
import "./interfaces/IBeaconServer.sol";
import "./interfaces/IPercentageDeviationCondition.sol";

/// @dev This contract should have the unlimited beacon reader role for the
/// respective beacon server contract
contract PercentageDeviationCondition is IPercentageDeviationCondition {
    address public immutable override airnodeProtocol;
    address public immutable override beaconServer;

    mapping(bytes32 => uint256)
        public
        override subscriptionIdToUpdatePercentageThreshold;

    constructor(address _airnodeProtocol, address _beaconServer) {
        require(
            _airnodeProtocol != address(0),
            "Airnode protocol address zero"
        );
        airnodeProtocol = _airnodeProtocol;
        require(_beaconServer != address(0), "Beacon server address zero");
        beaconServer = _beaconServer;
    }

    function setUpdatePercentageThreshold(
        bytes32 subscriptionId,
        uint256 updatePercentageThreshold
    ) external override {
        (, address sponsor, , , , , , ) = IAirnodeProtocol(airnodeProtocol)
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
        (
            bytes32 templateId,
            ,
            ,
            ,
            ,
            ,
            ,
            bytes memory parameters
        ) = IAirnodeProtocol(airnodeProtocol).subscriptions(subscriptionId);
        bytes32 beaconId = IBeaconServer(beaconServer).deriveBeaconId(
            templateId,
            parameters
        );
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
        uint256 absoluteBeaconValue = uint256(int256(beaconValue));
        absoluteBeaconValue = absoluteBeaconValue == 0
            ? 1
            : absoluteBeaconValue;
        return
            (10**18 * absoluteDelta) / absoluteBeaconValue >
            subscriptionIdToUpdatePercentageThreshold[subscriptionId];
    }
}
