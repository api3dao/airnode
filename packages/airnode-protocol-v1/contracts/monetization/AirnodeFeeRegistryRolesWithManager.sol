// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/RoleDeriver.sol";
import "../access-control-registry/AccessControlRegistryUser.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./interfaces/IAirnodeFeeRegistryRolesWithManager.sol";

/// @title Contract that implements generic AccessControlRegistry roles for
/// the AirnodeFeeRegistry contract
/// @notice The manager address here is expected to belong to a contract that
// is owned by the DAO
contract AirnodeFeeRegistryRolesWithManager is
    RoleDeriver,
    AccessControlRegistryUser,
    IAirnodeFeeRegistryRolesWithManager
{
    // There are three roles implemented in this contract:
    // Root
    // └── (1) Admin (can grant and revoke the roles below)
    //     ├── (2) Default price setter
    //     └── (3) Airnode price setter
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.

    string public override adminRoleDescription;
    string public constant override DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION =
        "Default price setter";
    string public constant override AIRNODE_PRICE_SETTER_DESCRIPTION =
        "Airnode price setter";

    bytes32 internal adminRoleDescriptionHash;
    bytes32 internal constant DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION));
    bytes32 internal constant AIRNODE_PRICE_SETTER_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(AIRNODE_PRICE_SETTER_DESCRIPTION));

    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    // Since there will be a single manager, we can derive the roles beforehand
    bytes32 public immutable override adminRole;
    bytes32 public immutable override defaultPriceSetterRole;
    bytes32 public immutable override airnodePriceSetterRole;

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
    ) AccessControlRegistryUser(_accessControlRegistry) {
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
        defaultPriceSetterRole = _deriveDefaultPriceSetterRole(_manager);
        airnodePriceSetterRole = _deriveAirnodePriceSetterRole(_manager);
    }

    /// @notice Derives the admin role for the specific manager address
    /// @param _manager Manager address
    /// @return _adminRole Admin role
    function _deriveAdminRole(address _manager)
        private
        view
        returns (bytes32 _adminRole)
    {
        _adminRole = _deriveRole(
            _deriveRootRole(_manager),
            adminRoleDescriptionHash
        );
    }

    /// @notice Derives the default price setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _defaultPriceSetterRole default price Setter
    /// role
    function _deriveDefaultPriceSetterRole(address _manager)
        private
        view
        returns (bytes32 _defaultPriceSetterRole)
    {
        _defaultPriceSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the airnode price setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _airnodePriceSetterRole airnode price setter role
    function _deriveAirnodePriceSetterRole(address _manager)
        private
        view
        returns (bytes32 _airnodePriceSetterRole)
    {
        _airnodePriceSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            AIRNODE_PRICE_SETTER_DESCRIPTION_HASH
        );
    }

    /// @dev Returns if the account has the default price setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the default price setter role or is the
    /// manager
    function hasDefaultPriceSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                defaultPriceSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the airnode price setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the airnode price setter role or is the
    /// manager
    function hasAirnodePriceSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                airnodePriceSetterRole,
                account
            );
    }
}
