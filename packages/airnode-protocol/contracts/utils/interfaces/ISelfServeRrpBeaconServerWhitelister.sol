// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISelfServeRrpBeaconServerWhitelister {
    event SetBeaconIdWithExpirationTimestamp(
        bytes32 indexed beaconId,
        uint64 expirationTimestamp
    );
    event SetBeaconIdWithIndefiniteWhitelistStatus(
        bytes32 indexed beaconId,
        bool indefiniteWhitelistStatus
    );
    event WhitelistedReaderWithExpiration(
        bytes32 indexed beaconId,
        address indexed reader
    );
    event WhitelistedReaderIndefinitely(
        bytes32 indexed beaconId,
        address indexed reader
    );

    function setBeaconIdWithExpirationTimestamp(
        bytes32 _beaconId,
        uint64 _expirationTimestamp
    ) external;

    function setBeaconIdWithIndefiniteWhitelistStatus(
        bytes32 _beaconId,
        bool _indefiniteWhitelistStatus
    ) external;

    function whitelistReaderWithExpiration(bytes32 _beaconId, address _reader)
        external;

    function whitelistReaderIndefinitely(bytes32 _beaconId, address _reader)
        external;
}
