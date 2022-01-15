// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../interfaces/IAirnodeRequester.sol";

interface IBeaconServer is IAirnodeRequester {
    event SetUpdatePermissionStatus(
        address indexed sponsor,
        address indexed updateRequester,
        bool status
    );

    event UpdatedBeaconWithoutRequest(
        bytes32 indexed beaconId,
        int256 value,
        uint256 timestamp
    );

    event RequestedBeaconUpdate(
        bytes32 indexed beaconId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        bytes32 templateId,
        bytes parameters
    );

    event RequestedBeaconUpdateRelayed(
        bytes32 indexed beaconId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        address relayer,
        bytes32 templateId,
        bytes parameters
    );

    event UpdatedBeaconWithRrp(
        bytes32 indexed beaconId,
        bytes32 requestId,
        int224 value,
        uint32 timestamp
    );

    event UpdatedBeaconWithPsp(
        bytes32 indexed beaconId,
        bytes32 subscriptionId,
        int224 value,
        uint32 timestamp
    );

    function setUpdatePermissionStatus(address updateRequester, bool status)
        external;

    function updateBeaconWithoutRequest(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external;

    function requestBeaconUpdate(
        bytes32 templateId,
        address sponsor,
        bytes calldata parameters
    ) external;

    function requestBeaconUpdate(
        bytes32 templateId,
        address relayer,
        address sponsor,
        bytes calldata parameters
    ) external;

    function fulfillRrp(
        bytes32 requestId,
        uint256 timestamp,
        bytes calldata data
    ) external;

    function fulfillPspBeaconUpdate(
        bytes32 subscriptionId,
        address relayer,
        uint256 timestamp,
        bytes calldata data
    ) external;

    function conditionPspBeaconUpdate(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata conditionParameters
    ) external returns (bool);

    function readDataPoint(bytes32 dataPointId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function readerCanReadDataPoint(bytes32 dataPointId, address reader)
        external
        view
        returns (bool);

    function dataPointIdToReaderToWhitelistStatus(
        bytes32 dataPointId,
        address reader
    )
        external
        view
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount);

    function dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 dataPointId,
        address reader,
        address setter
    ) external view returns (bool indefiniteWhitelistStatus);

    function deriveBeaconId(bytes32 templateId, bytes memory parameters)
        external
        pure
        returns (bytes32 beaconId);

    function registerSubscription(
        address _airnodeProtocol,
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 subscriptionId, bytes32 beaconId);

    // solhint-disable-next-line func-name-mixedcase
    function UNLIMITED_READER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function HUNDRED_PERCENT() external view returns (uint256);

    function unlimitedReaderRole() external view returns (bytes32);

    function sponsorToUpdateRequesterToPermissionStatus(
        address sponsor,
        address updateRequester
    ) external view returns (bool permissionStatus);
}
