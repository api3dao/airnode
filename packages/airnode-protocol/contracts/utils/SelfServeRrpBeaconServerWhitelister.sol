// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../rrp/requesters/RrpBeaconServer.sol";
import "./interfaces/ISelfServeRrpBeaconServerWhitelister.sol";

/// @title Contract that allows to whitlist readers on the RrpBeaconServer
/// @dev The SelfServerRrpBeaconServerWhitelister contract has the WhitelistExpirationSetterRole
/// and the IndefiniteWhitelisterRole of the RrpBeaconServer contract. The deployer of this contract
/// can specify the beaconIds for which readers can whitelist themselves. The deployer(also the owner)
/// can also add new beaconIds later for readers to self whitelist themselves.
contract SelfServeRrpBeaconServerWhitelister is
    Ownable,
    ISelfServeRrpBeaconServerWhitelister
{
    address public rrpBeaconServer;

    mapping(bytes32 => uint64) public beaconIdToExpirationTimestamp;
    mapping(bytes32 => bool) public beaconIdToIndefiniteWhitelistStatus;

    /// @param _rrpBeaconServer The RrpBeaconServer contract to whitelist readers on
    /// @param _beaconIdsExpirationTimestamp Array of beaconIds that have an associated expiration timestamp
    /// @param _expirationTimestamps Array of expiration timestamps that correspond to the beaconIds
    /// @param _beaconIdsIndefiniteWhitelistStatus Array of beaconIds that have an associated indefinite whitelist status
    /// @param _indefiniteWhitelistStatuses Array of indefinite whitelist status that correspond to the beaconIds
    constructor(
        address _rrpBeaconServer,
        bytes32[] memory _beaconIdsExpirationTimestamp,
        uint64[] memory _expirationTimestamps,
        bytes32[] memory _beaconIdsIndefiniteWhitelistStatus,
        bool[] memory _indefiniteWhitelistStatuses
    ) {
        require(_rrpBeaconServer != address(0), "RrpBeaconServer address zero");
        rrpBeaconServer = _rrpBeaconServer;
        for (
            uint256 ind = 0;
            ind < _beaconIdsExpirationTimestamp.length;
            ind++
        ) {
            beaconIdToExpirationTimestamp[
                _beaconIdsExpirationTimestamp[ind]
            ] = _expirationTimestamps[ind];
        }
        for (
            uint256 ind = 0;
            ind < _beaconIdsIndefiniteWhitelistStatus.length;
            ind++
        ) {
            beaconIdToIndefiniteWhitelistStatus[
                _beaconIdsIndefiniteWhitelistStatus[ind]
            ] = _indefiniteWhitelistStatuses[ind];
        }
    }

    /// @notice Adds a new beaconId with an expiration timestamp
    /// that can be whitelisted by readers
    /// @param _beaconId The beaconId to set an expiration timestamp for
    /// @param _expirationTimestamp The expiration timestamp for the beaconId
    function setBeaconIdWithExpirationTimestamp(
        bytes32 _beaconId,
        uint64 _expirationTimestamp
    ) external override onlyOwner {
        beaconIdToExpirationTimestamp[_beaconId] = _expirationTimestamp;
        emit SetBeaconIdWithExpirationTimestamp(
            _beaconId,
            _expirationTimestamp
        );
    }

    /// @notice Adds a new beaconId with an indefinite whitelist status
    /// that can be whitelisted by readers indefinetly
    /// @param _beaconId The beaconId to set an indefinite whitelist status for
    /// @param _indefiniteWhitelistStatus The indefinite whitelist status for the beaconId
    function setBeaconIdWithIndefiniteWhitelistStatus(
        bytes32 _beaconId,
        bool _indefiniteWhitelistStatus
    ) external override onlyOwner {
        beaconIdToIndefiniteWhitelistStatus[
            _beaconId
        ] = _indefiniteWhitelistStatus;
        emit SetBeaconIdWithIndefiniteWhitelistStatus(
            _beaconId,
            _indefiniteWhitelistStatus
        );
    }

    /// @notice Whitelists a reader on the RrpBeaconServer with an expiration timestamp
    /// @param _beaconId The beaconId to whitelist
    /// @param _reader The reader to whitelist on the beaconId
    function whitelistReaderWithExpiration(bytes32 _beaconId, address _reader)
        external
        override
    {
        uint64 expirationTimestamp = beaconIdToExpirationTimestamp[_beaconId];
        require(
            expirationTimestamp > block.timestamp,
            "Cannot whitelist for beacon"
        );
        IRrpBeaconServer(rrpBeaconServer).setWhitelistExpiration(
            _beaconId,
            _reader,
            expirationTimestamp
        );
        emit WhitelistedReaderWithExpiration(_beaconId, _reader);
    }

    /// @notice Whitelists a reader on the RrpBeaconServer with an indefinite whitelist status
    /// @param _beaconId The beaconId to whitelist
    /// @param _reader The reader to whitelist on the beaconId
    function whitelistReaderIndefinitely(bytes32 _beaconId, address _reader)
        external
        override
    {
        require(
            beaconIdToIndefiniteWhitelistStatus[_beaconId],
            "Cannot whitelist indefinitely for beacon"
        );
        IRrpBeaconServer(rrpBeaconServer).setIndefiniteWhitelistStatus(
            _beaconId,
            _reader,
            true
        );
        emit WhitelistedReaderIndefinitely(_beaconId, _reader);
    }
}
