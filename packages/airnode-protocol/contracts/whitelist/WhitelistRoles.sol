// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/RoleDeriver.sol";
import "../access-control-registry/AccessControlClient.sol";
import "./interfaces/IWhitelistRoles.sol";

/// @title Contract that implements generic AccessControlRegistry roles for a
/// whitelist contract
contract WhitelistRoles is RoleDeriver, AccessControlClient, IWhitelistRoles {
    // There are four roles implemented in this contract:
    // Root
    // └── (1) Admin (can grant and revoke the roles below)
    //     ├── (2) Whitelist expiration extender
    //     ├── (3) Whitelist expiration setter
    //     └── (4) Indefinite whitelister
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.
    // To clarify, the root role of the manager is the admin of (1), while (1)
    // is the admin of (2), (3) and (4). So (1) is more of a "contract admin",
    // while the `adminRole` used in AccessControl and AccessControlRegistry
    // refers to a more general adminship relationship between roles.
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
    bytes32 internal adminRoleDescriptionHash;
    bytes32
        internal constant WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION)
        );
    bytes32
        internal constant WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant INDEFINITE_WHITELISTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(INDEFINITE_WHITELISTER_ROLE_DESCRIPTION));

    /// @dev Contracts deployed with the same admin role descriptions will have
    /// the same roles, meaning that granting an account a role will authorize
    /// it in multiple contracts. Unless you want your deployed contract to
    /// reuse the role configuration of another contract, use a unique admin
    /// role description.
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) AccessControlClient(_accessControlRegistry) {
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        adminRoleDescription = _adminRoleDescription;
        adminRoleDescriptionHash = keccak256(
            abi.encodePacked(_adminRoleDescription)
        );
    }

    /// @notice Derives the admin role for the specific manager address
    /// @param manager Manager address
    /// @return adminRole Admin role
    function _deriveAdminRole(address manager)
        internal
        view
        returns (bytes32 adminRole)
    {
        adminRole = _deriveRole(
            _deriveRootRole(manager),
            adminRoleDescriptionHash
        );
    }

    /// @notice Derives the whitelist expiration extender role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return whitelistExpirationExtenderRole Whitelist expiration extender
    /// role
    function _deriveWhitelistExpirationExtenderRole(address manager)
        internal
        view
        returns (bytes32 whitelistExpirationExtenderRole)
    {
        whitelistExpirationExtenderRole = _deriveRole(
            _deriveAdminRole(manager),
            WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the whitelist expiration setter role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return whitelistExpirationSetterRole Whitelist expiration setter role
    function _deriveWhitelistExpirationSetterRole(address manager)
        internal
        view
        returns (bytes32 whitelistExpirationSetterRole)
    {
        whitelistExpirationSetterRole = _deriveRole(
            _deriveAdminRole(manager),
            WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the indefinite whitelister role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return indefiniteWhitelisterRole Indefinite whitelister role
    function _deriveIndefiniteWhitelisterRole(address manager)
        internal
        view
        returns (bytes32 indefiniteWhitelisterRole)
    {
        indefiniteWhitelisterRole = _deriveRole(
            _deriveAdminRole(manager),
            INDEFINITE_WHITELISTER_ROLE_DESCRIPTION_HASH
        );
    }
}
