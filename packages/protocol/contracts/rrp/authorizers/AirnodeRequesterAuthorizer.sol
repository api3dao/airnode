// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RequesterAuthorizer.sol";
import "./interfaces/IAirnodeRequesterAuthorizer.sol";
import "../../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Authorizer contract that Airnodes can use to temporarily or
/// indefinitely whitelist requesters for Airnode–endpoint pairs
contract AirnodeRequesterAuthorizer is
    RequesterAuthorizer,
    IAirnodeRequesterAuthorizer
{
    /// @param _accessControlRegistry AccessControlRegistry address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) RequesterAuthorizer(_accessControlRegistry, _adminRoleDescription) {}

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
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveWhitelistExpirationExtenderRole(airnode),
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
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveWhitelistExpirationSetterRole(airnode),
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
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveIndefiniteWhitelisterRole(airnode),
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
            airnode != setter &&
                !IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveIndefiniteWhitelisterRole(airnode),
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

    /// @notice Derives the admin role for the specific Airnode address
    /// @param airnode Airnode address
    /// @return adminRole Admin role
    function deriveAdminRole(address airnode)
        public
        view
        override
        returns (bytes32 adminRole)
    {
        adminRole = _deriveAdminRole(airnode);
    }

    /// @notice Derives the whitelist expiration extender role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return whitelistExpirationExtenderRole Whitelist expiration extender
    /// role
    function deriveWhitelistExpirationExtenderRole(address airnode)
        public
        view
        override
        returns (bytes32 whitelistExpirationExtenderRole)
    {
        whitelistExpirationExtenderRole = _deriveWhitelistExpirationExtenderRole(
            airnode
        );
    }

    /// @notice Derives the whitelist expiration setter role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return whitelistExpirationSetterRole Whitelist expiration setter role
    function deriveWhitelistExpirationSetterRole(address airnode)
        public
        view
        override
        returns (bytes32 whitelistExpirationSetterRole)
    {
        whitelistExpirationSetterRole = _deriveWhitelistExpirationSetterRole(
            airnode
        );
    }

    /// @notice Derives the indefinite whitelister role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return indefiniteWhitelisterRole Indefinite whitelister role
    function deriveIndefiniteWhitelisterRole(address airnode)
        public
        view
        override
        returns (bytes32 indefiniteWhitelisterRole)
    {
        indefiniteWhitelisterRole = _deriveIndefiniteWhitelisterRole(airnode);
    }
}
