// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./BeaconServer.sol";
import "./InPlaceMedian.sol";
import "./interfaces/IDapiServer.sol";

contract DapiServer is BeaconServer, InPlaceMedian, IDapiServer {
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeProtocol Airnode protocol contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeProtocol
    )
        BeaconServer(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager,
            _airnodeProtocol
        )
    {}

    function fulfillPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        bytes32 dapiId = updateDapi(abi.decode(data, (bytes32[])));
        require(keccak256(data) == dapiId, "Incorrect data length");
    }

    function conditionPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        require(msg.sender == address(0), "Sender not zero address");
        bytes32 dapiId = keccak256(data);
        int224 currentDapiValue = dataPoints[dapiId].value;
        require(
            dapiId == updateDapi(abi.decode(data, (bytes32[]))),
            "Incorrect data length"
        );
        int224 updatedDapiValue = dataPoints[dapiId].value;
        require(conditionParameters.length == 32, "Incorrect parameter length");
        uint256 updatePercentageThreshold = abi.decode(
            conditionParameters,
            (uint256)
        );
        return
            calculateUpdateInPercentage(currentDapiValue, updatedDapiValue) >=
            updatePercentageThreshold;
    }

    function updateDapi(bytes32[] memory beaconIds)
        public
        override
        returns (bytes32 dapiId)
    {
        dapiId = keccak256(abi.encodePacked(beaconIds));
        uint256 beaconCount = beaconIds.length;
        int256[] memory values = new int256[](beaconCount);
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            values[ind] = dataPoints[beaconIds[ind]].value;
        }
        int224 updatedDapiValue = int224(computeMedianInPlace(values));
        dataPoints[dapiId] = DataPoint({
            value: updatedDapiValue,
            timestamp: uint32(block.timestamp)
        });
    }
}
