// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../access-control-registry/WhitelistRolesWithManager.sol";
import "./RrpBeaconServer.sol";
import "./interfaces/IRrpBeaconServerWithManager.sol";

/// @title RRP beacon server contract that a manager can use to temporarily or
/// indefinitely whitelist readers for templates
contract RrpBeaconServerWithManager is
    WhitelistRolesWithManager,
    RrpBeaconServer,
    IRrpBeaconServerWithManager
{
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeRrp Airnode RRP contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeRrp
    )
        WhitelistRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        RrpBeaconServer(_airnodeRrp)
    {}

    /// @notice Extends the expiration of the temporary whitelist of `reader`
    /// to be able to read the beacon with `templateId` if the sender has the
    /// whitelist expiration extender role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function extendWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external override {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    whitelistExpirationExtenderRole,
                    msg.sender
                ),
            "Not expiration extender"
        );
        _extendWhitelistExpirationAndEmit(
            templateId,
            reader,
            expirationTimestamp
        );
    }

    /// @notice Sets the expiration of the temporary whitelist of `reader` to
    /// be able to read the beacon with `templateId` if the sender has the
    /// whitelist expiration extender role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function setWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external override {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    whitelistExpirationSetterRole,
                    msg.sender
                ),
            "Not expiration setter"
        );
        _setWhitelistExpirationAndEmit(templateId, reader, expirationTimestamp);
    }

    /// @notice Sets the indefinite whitelist status of `reader` to be able to
    /// read the beacon with `templateId` if the sender has the indefinite
    /// whitelister role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param status Indefinite whitelist status
    function setIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        bool status
    ) external override {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    indefiniteWhitelisterRole,
                    msg.sender
                ),
            "Not indefinite whitelister"
        );
        _setIndefiniteWhitelistStatusAndEmit(templateId, reader, status);
    }

    /// @notice Revokes the indefinite whitelist status granted by a specific
    /// account that no longer has the indefinite whitelister role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param setter Setter of the indefinite whitelist status
    function revokeIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        address setter
    ) external override {
        require(
            manager != setter &&
                !IAccessControlRegistry(accessControlRegistry).hasRole(
                    indefiniteWhitelisterRole,
                    setter
                ),
            "setter is indefinite whitelister"
        );
        _revokeIndefiniteWhitelistStatusAndEmit(templateId, reader, setter);
    }
}
