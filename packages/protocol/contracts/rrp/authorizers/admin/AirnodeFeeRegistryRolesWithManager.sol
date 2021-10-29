// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../access-control-registry/RoleDeriver.sol";
import "../../../access-control-registry/AccessControlClient.sol";
import "../../../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./interfaces/IAirnodeFeeRegistryRolesWithManager.sol";

/// @title Contract that implements generic AccessControlRegistry roles for
/// the AirnodeTokenLock contract
contract AirnodeFeeRegistryRolesWithManager is
    RoleDeriver,
    AccessControlClient,
    IAirnodeFeeRegistryRolesWithManager
{
    // There are three roles implemented in this contract:
    // Root
    // └── (1) Admin (can grant and revoke the roles below)
    //     ├── (2) Global Default Price setter
    //     └── (3) Airnode Flag and Price setter
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.

    string public override adminRoleDescription;
    string
        public constant
        override GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION =
        "Oracle address setter";
    string public constant override AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION =
        "Whitelist expiration setter";

    bytes32 internal adminRoleDescriptionHash;
    bytes32
        internal constant GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION));

    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    // Since there will be a single manager, we can derive the roles beforehand
    bytes32 public immutable override adminRole;
    bytes32 public immutable override globalDefaultPriceSetterRole;
    bytes32 public immutable override airnodeFlagAndPriceSetterRole;

    /// @dev Contracts deployed with the same admin role descriptions will have
    /// the same roles, meaning that granting an account a role will authorize
    /// it in multiple contracts. Unless you want your deployed contract to
    /// reuse the role configuration of another contract, use a unique admin
    /// role description.
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    ) AccessControlClient(_accessControlRegistry) {
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        require(_manager != address(0), "Manager address zero");
        adminRoleDescription = _adminRoleDescription;
        adminRoleDescriptionHash = keccak256(
            abi.encodePacked(_adminRoleDescription)
        );
        manager = _manager;
        adminRole = _deriveAdminRole(_manager);
        globalDefaultPriceSetterRole = _deriveGlobalDefaultPriceSetterRole(
            _manager
        );
        airnodeFlagAndPriceSetterRole = _deriveAirnodeFlagAndPriceSetterRole(
            _manager
        );
    }

    /// @notice Derives the admin role for the specific manager address
    /// @param _manager Manager address
    /// @return _adminRole Admin role
    function _deriveAdminRole(address _manager)
        internal
        view
        returns (bytes32 _adminRole)
    {
        _adminRole = _deriveRole(
            _deriveRootRole(_manager),
            adminRoleDescriptionHash
        );
    }

    /// @notice Derives the global default price setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _globalDefaultPriceSetterRole Global Default Price Setter
    /// role
    function _deriveGlobalDefaultPriceSetterRole(address _manager)
        internal
        view
        returns (bytes32 _globalDefaultPriceSetterRole)
    {
        _globalDefaultPriceSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the airnode flag and price setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _airnodeFlagAndPriceSetterRole Airnode Flag and Price Setter role
    function _deriveAirnodeFlagAndPriceSetterRole(address _manager)
        internal
        view
        returns (bytes32 _airnodeFlagAndPriceSetterRole)
    {
        _airnodeFlagAndPriceSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION_HASH
        );
    }

    /// @dev Returns if the account has the global default price setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the global default price setter or is the
    /// manager
    function hasGlobalDefaultPriceSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                globalDefaultPriceSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the airnode flag and price setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the airnode flag and price setter or is the
    /// manager
    function hasAirnodeFlagAndPriceSetterRole(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                airnodeFlagAndPriceSetterRole,
                account
            );
    }
}
