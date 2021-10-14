// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IAdminnable.sol";

interface IRrpBeaconServer is IAdminnable {
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

    event ExtendedWhitelistExpiration(
        bytes32 indexed templateId,
        address indexed user,
        address indexed admin,
        uint256 expiration
    );

    event SetWhitelistExpiration(
        bytes32 indexed templateId,
        address indexed user,
        address indexed admin,
        uint256 expiration
    );

    event SetWhitelistStatusPastExpiration(
        bytes32 indexed templateId,
        address indexed user,
        address indexed admin,
        bool status
    );

    function setUpdatePermissionStatus(address updateRequester, bool status)
        external;

    function requestBeaconUpdate(
        bytes32 templateId,
        address requester,
        address designatedWallet
    ) external;

    function fulfill(bytes32 requestId, bytes calldata data) external;

    function extendWhitelistExpiration(
        bytes32 templateId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        bytes32 templateId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistStatusPastExpiration(
        bytes32 templateId,
        address user,
        bool status
    ) external;

    function readBeacon(bytes32 templateId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function userCanReadBeacon(bytes32 templateId, address user)
        external
        view
        returns (bool isWhitelisted);

    function templateIdToUserToWhitelistStatus(bytes32 templateId, address user)
        external
        view
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration);

    function sponsorToUpdateRequesterToPermissionStatus(
        address sponsor,
        address updateRequester
    ) external view returns (bool permissionStatus);
}
