// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../rrp/requesters/RrpBeaconServer.sol";
import "./interfaces/ISelfServeRrpBeaconServerWhitelister.sol";

/// @title Contract that allows to whitlist readers on the RrpBeaconServer
/// @dev The SelfServeRrpBeaconServerWhitelister contract has the WhitelistExpirationSetterRole
/// and the IndefiniteWhitelisterRole of the RrpBeaconServer contract. The deployer of this contract
/// can specify the beaconIds for which readers can whitelist themselves. The deployer (also the owner)
/// can also add new beaconIds later for readers to self whitelist themselves.
contract SelfServeRrpBeaconServerWhitelister is
    Ownable,
    ISelfServeRrpBeaconServerWhitelister
{
    address public rrpBeaconServer;

    mapping(bytes32 => uint64) public beaconIdToExpirationTimestamp;
    mapping(bytes32 => bool) public beaconIdToIndefiniteWhitelistStatus;

    /// @param rrpBeaconServerAddress The RrpBeaconServer contract to whitelist readers
    constructor(address rrpBeaconServerAddress) {
        require(
            rrpBeaconServerAddress != address(0),
            "RrpBeaconServer address zero"
        );
        rrpBeaconServer = rrpBeaconServerAddress;
    }

    /// @notice Adds a new beaconId with an expiration timestamp
    /// that can be whitelisted by readers
    /// @param beaconId The beaconId to set an expiration timestamp for
    /// @param expirationTimestamp The expiration timestamp for the beaconId
    function setBeaconIdToExpirationTimestamp(
        bytes32 beaconId,
        uint64 expirationTimestamp
    ) external override onlyOwner {
        beaconIdToExpirationTimestamp[beaconId] = expirationTimestamp;
        emit SetBeaconIdToExpirationTimestamp(beaconId, expirationTimestamp);
    }

    /// @notice Adds a new beaconId with an indefinite whitelist status
    /// that can be whitelisted by readers indefinetly
    /// @param beaconId The beaconId to set an indefinite whitelist status for
    /// @param indefiniteWhitelistStatus The indefinite whitelist status for the beaconId
    function setBeaconIdToIndefiniteWhitelistStatus(
        bytes32 beaconId,
        bool indefiniteWhitelistStatus
    ) external override onlyOwner {
        beaconIdToIndefiniteWhitelistStatus[
            beaconId
        ] = indefiniteWhitelistStatus;
        emit SetBeaconIdToIndefiniteWhitelistStatus(
            beaconId,
            indefiniteWhitelistStatus
        );
    }

    /// @notice Whitelists a reader on the RrpBeaconServer with an expiration timestamp
    /// @param beaconId The beaconId to whitelist
    /// @param reader The reader to whitelist on the beaconId
    function whitelistReader(bytes32 beaconId, address reader)
        external
        override
    {
        uint64 expirationTimestamp = beaconIdToExpirationTimestamp[beaconId];
        bool indefiniteWhitelistStatus = beaconIdToIndefiniteWhitelistStatus[
            beaconId
        ];
        require(
            expirationTimestamp > block.timestamp || indefiniteWhitelistStatus,
            "Cannot whitelist"
        );
        IRrpBeaconServer(rrpBeaconServer).setWhitelistExpiration(
            beaconId,
            reader,
            expirationTimestamp
        );
        IRrpBeaconServer(rrpBeaconServer).setIndefiniteWhitelistStatus(
            beaconId,
            reader,
            indefiniteWhitelistStatus
        );
        emit WhitelistedReader(
            beaconId,
            reader,
            expirationTimestamp,
            indefiniteWhitelistStatus
        );
    }
}
