// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IRrpBeaconServer {
    event ExtendedWhitelistExpiration(
        bytes32 indexed templateId,
        address indexed reader,
        address indexed sender,
        uint256 expiration
    );

    event SetWhitelistExpiration(
        bytes32 indexed templateId,
        address indexed reader,
        address indexed sender,
        uint256 expiration
    );

    event SetIndefiniteWhitelistStatus(
        bytes32 indexed templateId,
        address indexed reader,
        address indexed sender,
        bool status,
        uint192 indefiniteWhitelistCount
    );

    event RevokedIndefiniteWhitelistStatus(
        bytes32 indexed templateId,
        address indexed reader,
        address indexed setter,
        address sender,
        uint192 indefiniteWhitelistCount
    );

    event SetUpdatePermissionStatus(
        address indexed sponsor,
        address indexed updateRequester,
        bool status
    );

    event RequestedBeaconUpdate(
        bytes32 indexed templateId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        address sponsorWallet
    );

    event UpdatedBeacon(
        bytes32 indexed templateId,
        bytes32 requestId,
        int224 value,
        uint32 timestamp
    );

    function setUpdatePermissionStatus(address updateRequester, bool status)
        external;

    function requestBeaconUpdate(
        bytes32 templateId,
        address requester,
        address designatedWallet
    ) external;

    function fulfill(bytes32 requestId, bytes calldata data) external;

    function readBeacon(bytes32 templateId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function readerCanReadBeacon(bytes32 templateId, address reader)
        external
        view
        returns (bool);

    function templateIdToReaderToWhitelistStatus(
        bytes32 templateId,
        address reader
    )
        external
        view
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount);

    function templateIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        address setter
    ) external view returns (bool indefiniteWhitelistStatus);

    function sponsorToUpdateRequesterToPermissionStatus(
        address sponsor,
        address updateRequester
    ) external view returns (bool permissionStatus);
}
