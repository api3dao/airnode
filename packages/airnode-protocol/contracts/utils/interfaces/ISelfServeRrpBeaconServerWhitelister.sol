// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISelfServeRrpBeaconServerWhitelister {
    event SetBeaconIdToExpirationTimestamp(
        bytes32 indexed beaconId,
        uint64 expirationTimestamp
    );
    event SetBeaconIdToIndefiniteWhitelistStatus(
        bytes32 indexed beaconId,
        bool indefiniteWhitelistStatus
    );
    event WhitelistedReader(
        bytes32 indexed beaconId,
        address indexed reader,
        uint64 expirationTimestamp,
        bool indefiniteWhitelistStatus
    );

    function setBeaconIdToExpirationTimestamp(
        bytes32 _beaconId,
        uint64 _expirationTimestamp
    ) external;

    function setBeaconIdToIndefiniteWhitelistStatus(
        bytes32 _beaconId,
        bool _indefiniteWhitelistStatus
    ) external;

    function whitelistReader(bytes32 _beaconId, address _reader) external;

    function beaconIdToExpirationTimestamp(bytes32 _beaconId)
        external
        view
        returns (uint64);

    function beaconIdToIndefiniteWhitelistStatus(bytes32 _beaconId)
        external
        view
        returns (bool);
}
