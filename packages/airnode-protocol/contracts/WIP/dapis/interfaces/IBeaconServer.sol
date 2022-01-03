// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../interfaces/IAirnodeUser.sol";

interface IBeaconServer is IAirnodeUser {
    event SetUpdatePermissionStatus(
        address indexed sponsor,
        address indexed updateRequester,
        bool status
    );

    event RequestedBeaconUpdate(
        bytes32 indexed beaconId,
        address indexed sponsor,
        address indexed requester,
        bytes32 requestId,
        bytes32 templateId,
        address sponsorWallet,
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

    function requestBeaconUpdate(
        bytes32 beaconId,
        address reporter,
        address sponsor,
        address sponsorWallet,
        bytes calldata parameters
    ) external;

    function fulfillRrp(bytes32 requestId, bytes calldata data) external;

    function fulfillPsp(bytes32 subscriptionId, bytes calldata data) external;

    function readBeacon(bytes32 beaconId)
        external
        view
        returns (int224 value, uint32 timestamp);

    function readerCanReadBeacon(bytes32 beaconId, address reader)
        external
        view
        returns (bool);

    function beaconIdToReaderToWhitelistStatus(bytes32 beaconId, address reader)
        external
        view
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount);

    function beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 beaconId,
        address reader,
        address setter
    ) external view returns (bool indefiniteWhitelistStatus);

    function deriveBeaconId(bytes32 templateId, bytes memory parameters)
        external
        pure
        returns (bytes32 beaconId);

    function deriveUpdateRequesterRole(address sponsor)
        external
        view
        returns (bytes32 updateRequesterRole);

    function requesterIsUpdateRequesterOrIsSponsor(
        address sponsor,
        address requester
    ) external view returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function UNLIMITED_READER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function unlimitedReaderRole() external view returns (bytes32);

    // solhint-disable-next-line func-name-mixedcase
    function UPDATE_REQUESTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);
}
