// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../protocol/interfaces/IAirnodeRequester.sol";

interface IDapiServer is IAirnodeRequester {
    event SetRrpBeaconUpdatePermissionStatus(
        address indexed sponsor,
        address indexed rrpBeaconUpdateRequester,
        bool status
    );

    event RequestedRrpBeaconUpdate(
        bytes32 indexed beaconId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        address airnode,
        bytes32 templateId
    );

    event RequestedRrpBeaconUpdateRelayed(
        bytes32 indexed beaconId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        address airnode,
        address relayer,
        bytes32 templateId
    );

    event UpdatedBeaconWithRrp(
        bytes32 indexed beaconId,
        bytes32 requestId,
        int256 value,
        uint256 timestamp
    );

    event RegisteredBeaconUpdateSubscription(
        bytes32 indexed subscriptionId,
        address airnode,
        bytes32 templateId,
        bytes parameters,
        bytes conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    );

    event UpdatedBeaconWithPsp(
        bytes32 indexed beaconId,
        bytes32 subscriptionId,
        int224 value,
        uint32 timestamp
    );

    event UpdatedBeaconWithSignedData(
        bytes32 indexed beaconId,
        int256 value,
        uint256 timestamp
    );

    event UpdatedDapiWithBeacons(
        bytes32 indexed dapiId,
        int224 value,
        uint32 timestamp
    );

    event UpdatedDapiWithSignedData(
        bytes32 indexed dapiId,
        int224 value,
        uint32 timestamp
    );

    event SetName(
        bytes32 indexed name,
        bytes32 dataPointId,
        address indexed sender
    );

    function setRrpBeaconUpdatePermissionStatus(
        address rrpBeaconUpdateRequester,
        bool status
    ) external;

    function requestRrpBeaconUpdate(
        address airnode,
        bytes32 templateId,
        address sponsor
    ) external returns (bytes32 requestId);

    function requestRrpBeaconUpdateRelayed(
        address airnode,
        bytes32 templateId,
        address relayer,
        address sponsor
    ) external returns (bytes32 requestId);

    function fulfillRrpBeaconUpdate(
        bytes32 requestId,
        uint256 timestamp,
        bytes calldata data
    ) external;

    function registerBeaconUpdateSubscription(
        address airnode,
        bytes32 templateId,
        bytes memory conditions,
        address relayer,
        address sponsor
    ) external returns (bytes32 subscriptionId);

    function conditionPspBeaconUpdate(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata conditionParameters
    ) external view returns (bool);

    function fulfillPspBeaconUpdate(
        bytes32 subscriptionId,
        address airnode,
        address relayer,
        address sponsor,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external;

    function updateBeaconWithSignedData(
        address airnode,
        bytes32 beaconId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external;

    function updateDapiWithBeacons(bytes32[] memory beaconIds)
        external
        returns (bytes32 dapiId);

    function conditionPspDapiUpdate(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata conditionParameters
    ) external returns (bool);

    function fulfillPspDapiUpdate(
        bytes32 subscriptionId,
        address airnode,
        address relayer,
        address sponsor,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external;

    function updateDapiWithSignedData(
        address[] memory airnodes,
        bytes32[] memory templateIds,
        uint256[] memory timestamps,
        bytes[] memory data,
        bytes[] memory signatures
    ) external returns (bytes32 dapiId);

    function setName(bytes32 name, bytes32 dataPointId) external;

    function nameToDataPointId(bytes32 name) external view returns (bytes32);

    function readWithDataPointId(bytes32 dataPointId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function readWithName(bytes32 name)
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

    function deriveBeaconId(address airnode, bytes32 templateId)
        external
        pure
        returns (bytes32 beaconId);

    function deriveDapiId(bytes32[] memory beaconIds)
        external
        pure
        returns (bytes32 dapiId);

    // solhint-disable-next-line func-name-mixedcase
    function UNLIMITED_READER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function NAME_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function HUNDRED_PERCENT() external view returns (uint256);

    function unlimitedReaderRole() external view returns (bytes32);

    function nameSetterRole() external view returns (bytes32);

    function sponsorToRrpBeaconUpdateRequesterToPermissionStatus(
        address sponsor,
        address updateRequester
    ) external view returns (bool);

    function subscriptionIdToBeaconId(bytes32 subscriptionId)
        external
        view
        returns (bytes32);
}
