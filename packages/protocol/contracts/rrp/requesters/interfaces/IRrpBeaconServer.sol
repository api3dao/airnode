// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../admin/interfaces/IMetaAdminnable.sol";
import "../../../admin/interfaces/IWhitelister.sol";

interface IRrpBeaconServer is IMetaAdminnable, IWhitelister {
    event SetUpdatePermissionStatus(
        address indexed sponsor,
        address indexed updateRequester,
        bool updatePermissionStatus
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

    event ErroredBeaconUpdate(
        bytes32 indexed templateId,
        bytes32 requestId,
        uint256 statusCode
    );

    function setUpdatePermissionStatus(
        address updateRequester,
        bool updatePermissionStatus
    ) external;

    function requestBeaconUpdate(
        bytes32 templateId,
        address requester,
        address designatedWallet
    ) external;

    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
    ) external;

    function readBeacon(bytes32 templateId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function sponsorToUpdateRequesterToPermissonStatus(
        address sponsor,
        address updateRequester
    ) external view returns (bool permissionStatus);
}
