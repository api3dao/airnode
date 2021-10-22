// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./interfaces/IRequesterAuthorizer.sol";

/// @title Authorizer contract that can be used to temporarily or indefinitely
/// whitelist requesters for Airnode–endpoint pairs
contract RequesterAuthorizer is IRequesterAuthorizer {
    // This contract implements two kinds of whitelisting:
    // (1) Temporary, ends when the expiration timestamp is in the past
    // (2) Indefinite, ends when the indefinite whitelist count is zero
    // Multiple senders can grant and revoke indefinite whitelists
    // independently. The requester will be considered whitelisted as long as
    // there is at least one active indefinite whitelist.
    // Indefinite whitelists can be revoked if the sender that set them no
    // longer has the indefinite whitelister role.
    struct WhitelistStatus {
        uint64 expirationTimestamp;
        uint192 indefiniteWhitelistCount;
    }

    // There are four roles in this contract:
    // Root
    // └── (1) Requester authorizer admin (can grant and revoke the roles below)
    //     ├── (2) Whitelist expiration extender
    //     ├── (3) Whitelist expiration setter
    //     └── (4) Indefinite whitelister
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.
    string public override adminRoleDescription;
    string
        public constant
        override WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION =
        "Whitelist expiration extender";
    string
        public constant
        override WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION =
        "Whitelist expiration setter";
    string public constant override INDEFINITE_WHITELISTER_ROLE_DESCRIPTION =
        "Indefinite whitelister";

    /// @notice Address of the AccessControlRegistry contract that keeps the
    /// roles
    address public immutable override accessControlRegistry;

    /// @notice Whitelist status of a requester for an Airnode–endpoint pair
    mapping(address => mapping(bytes32 => mapping(address => WhitelistStatus)))
        public
        override airnodeToEndpointIdToRequesterToWhitelistStatus;

    /// @notice If a sender has whitelisted a requester for an Airnode–endpoint
    /// pair indefinitely
    mapping(address => mapping(bytes32 => mapping(address => mapping(address => bool))))
        public
        override airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus;

    /// @param _accessControlRegistry AccessControlRegistry address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) {
        accessControlRegistry = _accessControlRegistry;
        adminRoleDescription = _adminRoleDescription;
    }

    /// @notice Returns if `requester` is whitelisted for the
    /// `airnode`–`endpointId` pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @return isWhitelisted If the requester is whitelisted
    function requesterIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address requester
    ) internal view returns (bool isWhitelisted) {
        WhitelistStatus
            storage whitelistStatus = airnodeToEndpointIdToRequesterToWhitelistStatus[
                airnode
            ][endpointId][requester];
        return
            whitelistStatus.indefiniteWhitelistCount > 0 ||
            whitelistStatus.expirationTimestamp > block.timestamp;
    }

    /// @notice Extends the expiration of the temporary whitelist of
    /// `requester` for the `airnode`–`endpointId` pair
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
                deriveRole(
                    airnode,
                    WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION
                ),
                msg.sender
            ),
            "Not expiration extender"
        );
        require(
            expirationTimestamp >
                airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][
                    endpointId
                ][requester].expirationTimestamp,
            "Does not extend expiration"
        );
        airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][endpointId][
            requester
        ].expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            airnode,
            endpointId,
            requester,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Sets the expiration of the temporary whitelist of `requester`
    /// for the `airnode`–`endpointId` pair
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
                deriveRole(
                    airnode,
                    WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION
                ),
                msg.sender
            ),
            "Not expiration setter"
        );
        airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][endpointId][
            requester
        ].expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            airnode,
            endpointId,
            requester,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Sets the indefinite whitelist status of `requester` for the
    /// `airnode`–`endpointId` pair
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
                deriveRole(airnode, INDEFINITE_WHITELISTER_ROLE_DESCRIPTION),
                msg.sender
            ),
            "Not indefinite whitelister"
        );
        if (
            status &&
            !airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][msg.sender]
        ) {
            airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][msg.sender] = true;
            airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][
                endpointId
            ][requester].indefiniteWhitelistCount++;
        } else if (
            !status &&
            airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][msg.sender]
        ) {
            airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][msg.sender] = false;
            airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][
                endpointId
            ][requester].indefiniteWhitelistCount--;
        }
        emit SetIndefiniteWhitelistStatus(
            airnode,
            endpointId,
            requester,
            msg.sender,
            status
        );
    }

    /// @notice Revokes the indefinite whitelist status set by a sender who no
    /// longer has the indefinite whitelister role
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
                deriveRole(airnode, INDEFINITE_WHITELISTER_ROLE_DESCRIPTION),
                setter
            ),
            "setter is indefinite whitelister"
        );
        if (
            airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][setter]
        ) {
            airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus[
                airnode
            ][endpointId][requester][setter] = false;
            airnodeToEndpointIdToRequesterToWhitelistStatus[airnode][
                endpointId
            ][requester].indefiniteWhitelistCount--;
        }
        emit RevokedIndefiniteWhitelistStatus(
            airnode,
            endpointId,
            requester,
            setter,
            msg.sender
        );
    }

    /// @notice Derives the role ID that should be used to authorize whitelist
    /// interactions
    /// @dev Can be overriden to customize permissions
    /// @param airnode Airnode address
    /// @param roleDescription Role description
    /// @return role Role ID
    function deriveRole(address airnode, string memory roleDescription)
        public
        view
        virtual
        override
        returns (bytes32 role)
    {
        IAccessControlRegistry iAccessControlRegistry = IAccessControlRegistry(
            accessControlRegistry
        );
        bytes32 airnodeRootRole = iAccessControlRegistry.deriveRootRole(
            airnode
        );
        bytes32 airnodeAdminRole = iAccessControlRegistry.deriveRole(
            airnodeRootRole,
            adminRoleDescription
        );
        role = iAccessControlRegistry.deriveRole(
            airnodeAdminRole,
            roleDescription
        );
    }

    /// @notice Verifies the authorization status of a request
    /// @dev This method has redundant arguments because all authorizer
    /// contracts have to have the same interface and potential authorizer
    /// contracts may require to access the arguments that are redundant here
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return Authorization status of the request
    function isAuthorized(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        address airnode,
        bytes32 endpointId,
        address sponsor, // solhint-disable-line no-unused-vars
        address requester
    ) external view override returns (bool) {
        return requesterIsWhitelisted(airnode, endpointId, requester);
    }
}
