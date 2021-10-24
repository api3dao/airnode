// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RequesterAuthorizer.sol";
import "./interfaces/IDaoRequesterAuthorizer.sol";
import "../../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Authorizer contract that a DAO can use to temporarily or
/// indefinitely whitelist requesters for Airnode–endpoint pairs
/// @notice The DAO address here will most likely belong to an
/// AccessControlAgent contract that is owned by the DAO, rather than being
/// the DAO itself
contract DaoRequesterAuthorizer is
    RequesterAuthorizer,
    IDaoRequesterAuthorizer
{
    /// @notice Address of the DAO that manages the related
    /// AccessControlRegistry roles
    address public immutable override dao;

    /// @notice Admin role
    bytes32 public immutable override adminRole;

    /// @notice Whitelist expiration extender role
    bytes32 public immutable override whitelistExpirationExtenderRole;

    /// @notice Whitelist expiration setter role
    bytes32 public immutable override whitelistExpirationSetterRole;

    /// @notice Indefinite whitelister role
    bytes32 public immutable override indefiniteWhitelisterRole;

    /// @param _accessControlRegistry AccessControlRegistry address
    /// @param _adminRoleDescription Admin role description
    /// @param _dao DAO address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _dao
    ) RequesterAuthorizer(_accessControlRegistry, _adminRoleDescription) {
        require(_dao != address(0), "DAO address zero");
        dao = _dao;
        adminRole = _deriveAdminRole(_dao);
        whitelistExpirationExtenderRole = _deriveWhitelistExpirationExtenderRole(
            _dao
        );
        whitelistExpirationSetterRole = _deriveWhitelistExpirationSetterRole(
            _dao
        );
        indefiniteWhitelisterRole = _deriveIndefiniteWhitelisterRole(_dao);
    }

    /// @notice Extends the expiration of the temporary whitelist of
    /// `requester` for the `airnode`–`endpointId` pair if the sender has the
    /// whitelist expiration extender role
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function extendWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address requester,
        uint64 expirationTimestamp
    ) external override {
        require(
            IAccessControlRegistry(accessControlRegistry).hasRole(
                whitelistExpirationExtenderRole,
                msg.sender
            ),
            "Not expiration extender"
        );
        _extendWhitelistExpirationAndEmit(
            airnode,
            endpointId,
            requester,
            expirationTimestamp
        );
    }

    /// @notice Sets the expiration of the temporary whitelist of `requester`
    /// for the `airnode`–`endpointId` pair if the sender has the whitelist
    /// expiration setter role
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten expiration
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function setWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address requester,
        uint64 expirationTimestamp
    ) external override {
        require(
            IAccessControlRegistry(accessControlRegistry).hasRole(
                whitelistExpirationSetterRole,
                msg.sender
            ),
            "Not expiration setter"
        );
        _setWhitelistExpirationAndEmit(
            airnode,
            endpointId,
            requester,
            expirationTimestamp
        );
    }

    /// @notice Sets the indefinite whitelist status of `requester` for the
    /// `airnode`–`endpointId` pair if the sender has the indefinite
    /// whitelister role
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param status Indefinite whitelist status
    function setIndefiniteWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester,
        bool status
    ) external override {
        require(
            IAccessControlRegistry(accessControlRegistry).hasRole(
                indefiniteWhitelisterRole,
                msg.sender
            ),
            "Not indefinite whitelister"
        );
        _setIndefiniteWhitelistStatusAndEmit(
            airnode,
            endpointId,
            requester,
            status
        );
    }

    /// @notice Revokes the indefinite whitelist status granted by a specific
    /// account that no longer has the indefinite whitelister role
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param setter Setter of the indefinite whitelist status
    function revokeIndefiniteWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester,
        address setter
    ) external override {
        require(
            !IAccessControlRegistry(accessControlRegistry).hasRole(
                indefiniteWhitelisterRole,
                setter
            ),
            "setter is indefinite whitelister"
        );
        _revokeIndefiniteWhitelistStatusAndEmit(
            airnode,
            endpointId,
            requester,
            setter
        );
    }
}
