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
    /// @param beaconIdsExpirationTimestamp Array of beaconIds that have an associated expiration timestamp
    /// @param expirationTimestamps Array of expiration timestamps that correspond to the beaconIds
    /// @param beaconIdsIndefiniteWhitelistStatus Array of beaconIds that have an associated indefinite whitelist status
    /// @param indefiniteWhitelistStatuses Array of indefinite whitelist status that correspond to the beaconIds
    constructor(
        address rrpBeaconServerAddress,
        bytes32[] memory beaconIdsExpirationTimestamp,
        uint64[] memory expirationTimestamps,
        bytes32[] memory beaconIdsIndefiniteWhitelistStatus,
        bool[] memory indefiniteWhitelistStatuses
    ) {
        require(
            rrpBeaconServerAddress != address(0),
            "RrpBeaconServer address zero"
        );
        rrpBeaconServer = rrpBeaconServerAddress;
        for (
            uint256 ind = 0;
            ind < beaconIdsExpirationTimestamp.length;
            ind++
        ) {
            beaconIdToExpirationTimestamp[
                beaconIdsExpirationTimestamp[ind]
            ] = expirationTimestamps[ind];
        }
        for (
            uint256 ind = 0;
            ind < beaconIdsIndefiniteWhitelistStatus.length;
            ind++
        ) {
            beaconIdToIndefiniteWhitelistStatus[
                beaconIdsIndefiniteWhitelistStatus[ind]
            ] = indefiniteWhitelistStatuses[ind];
        }
    }

    /// @notice Adds a new beaconId with an expiration timestamp
    /// that can be whitelisted by readers
    /// @param beaconId The beaconId to set an expiration timestamp for
    /// @param expirationTimestamp The expiration timestamp for the beaconId
    function setBeaconIdWithExpirationTimestamp(
        bytes32 beaconId,
        uint64 expirationTimestamp
    ) external override onlyOwner {
        beaconIdToExpirationTimestamp[beaconId] = expirationTimestamp;
        emit SetBeaconIdWithExpirationTimestamp(beaconId, expirationTimestamp);
    }

    /// @notice Adds a new beaconId with an indefinite whitelist status
    /// that can be whitelisted by readers indefinetly
    /// @param beaconId The beaconId to set an indefinite whitelist status for
    /// @param indefiniteWhitelistStatus The indefinite whitelist status for the beaconId
    function setBeaconIdWithIndefiniteWhitelistStatus(
        bytes32 beaconId,
        bool indefiniteWhitelistStatus
    ) external override onlyOwner {
        beaconIdToIndefiniteWhitelistStatus[
            beaconId
        ] = indefiniteWhitelistStatus;
        emit SetBeaconIdWithIndefiniteWhitelistStatus(
            beaconId,
            indefiniteWhitelistStatus
        );
    }

    /// @notice Whitelists a reader on the RrpBeaconServer with an expiration timestamp
    /// @param beaconId The beaconId to whitelist
    /// @param reader The reader to whitelist on the beaconId
    function whitelistReaderWithExpiration(bytes32 beaconId, address reader)
        external
        override
    {
        uint64 expirationTimestamp = beaconIdToExpirationTimestamp[beaconId];
        require(expirationTimestamp > block.timestamp, "Cannot whitelist");
        IRrpBeaconServer(rrpBeaconServer).setWhitelistExpiration(
            beaconId,
            reader,
            expirationTimestamp
        );
        emit WhitelistedReaderWithExpiration(beaconId, reader);
    }

    /// @notice Whitelists a reader on the RrpBeaconServer with an indefinite whitelist status
    /// @param beaconId The beaconId to whitelist
    /// @param reader The reader to whitelist on the beaconId
    function whitelistReaderIndefinitely(bytes32 beaconId, address reader)
        external
        override
    {
        require(
            beaconIdToIndefiniteWhitelistStatus[beaconId],
            "Cannot whitelist indefinitely"
        );
        IRrpBeaconServer(rrpBeaconServer).setIndefiniteWhitelistStatus(
            beaconId,
            reader,
            true
        );
        emit WhitelistedReaderIndefinitely(beaconId, reader);
    }
}
