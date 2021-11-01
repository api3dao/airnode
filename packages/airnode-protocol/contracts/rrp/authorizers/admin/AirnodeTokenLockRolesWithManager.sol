// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../access-control-registry/RoleDeriver.sol";
import "../../../access-control-registry/AccessControlClient.sol";
import "../../../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./interfaces/IAirnodeTokenLockRolesWithManager.sol";

/// @title Contract that implements generic AccessControlRegistry roles for
/// the AirnodeTokenLock contract
contract AirnodeTokenLockRolesWithManager is
    RoleDeriver,
    AccessControlClient,
    IAirnodeTokenLockRolesWithManager
{
    // There are Six roles implemented in this contract:
    // Root
    // └── (1) Admin (can grant and revoke the roles below)
    //     ├── (2) Oracle address setter
    //     ├── (3) coefficient and registry setter
    //     ├── (4) Opt status setter
    //     ├── (5) Block Withdraw Destination setter
    //     ├── (6) Block Requester
    //     └── (7) RequesterAuthorizerWithManager setter
    // The coefficient and registry setter can set the AirnodeFeeRegistry address
    /// and Multiplier Coefficient integer.
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.
    string public override adminRoleDescription;
    string public constant override ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION =
        "Oracle address setter";
    string
        public constant
        override COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION =
        "Coefficient and registry setter";
    string public constant override OPT_STATUS_SETTER_ROLE_DESCRIPTION =
        "Opt status setter";
    string
        public constant
        override BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION =
        "Block Withdraw Destination setter";
    string public constant override BLOCK_REQUESTER_ROLE_DESCRIPTION =
        "Block Requester";
    string
        public constant
        override REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION =
        "RequesterAuthorizerWithManager setter";
    bytes32 internal adminRoleDescriptionHash;
    bytes32 internal constant ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION));
    bytes32
        internal constant COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant OPT_STATUS_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(OPT_STATUS_SETTER_ROLE_DESCRIPTION));
    bytes32
        internal constant BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant BLOCK_REQUESTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(BLOCK_REQUESTER_ROLE_DESCRIPTION));
    bytes32
        internal constant REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(
                REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION
            )
        );

    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    // Since there will be a single manager, we can derive the roles beforehand
    bytes32 public immutable override adminRole;
    bytes32 public immutable override oracleAddressSetterRole;
    bytes32 public immutable override coefficientAndRegistrySetterRole;
    bytes32 public immutable override optStatusSetterRole;
    bytes32 public immutable override blockWithdrawDestinationSetterRole;
    bytes32 public immutable override blockRequesterRole;
    bytes32 public immutable override requesterAuthorizerWithManagerSetterRole;

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
        oracleAddressSetterRole = _deriveOracleAddressSetterRole(_manager);
        coefficientAndRegistrySetterRole = _deriveCoefficientAndRegistrySetterRole(
            _manager
        );
        optStatusSetterRole = _deriveOptStatusSetterRole(_manager);
        blockWithdrawDestinationSetterRole = _deriveBlockWithdrawDestinationSetterRole(
            _manager
        );
        blockRequesterRole = _deriveBlockRequesterRole(_manager);
        requesterAuthorizerWithManagerSetterRole = _deriveRequesterAuthorizerWithManagerSetterRole(
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

    /// @notice Derives the oracle address setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _oracleAddressSetterRole Oracle Address Setter
    /// role
    function _deriveOracleAddressSetterRole(address _manager)
        internal
        view
        returns (bytes32 _oracleAddressSetterRole)
    {
        _oracleAddressSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the coefficient and registry setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _coefficientAndRegistrySetterRole coefficient and registry setter
    /// role
    function _deriveCoefficientAndRegistrySetterRole(address _manager)
        internal
        view
        returns (bytes32 _coefficientAndRegistrySetterRole)
    {
        _coefficientAndRegistrySetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the opt status setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _optStatusSetterRole Opt Status Setter role
    function _deriveOptStatusSetterRole(address _manager)
        internal
        view
        returns (bytes32 _optStatusSetterRole)
    {
        _optStatusSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            OPT_STATUS_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives blockWithdrawDestinationAddress role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _blockWithdrawDestinationSetterRole BlockWithdrawDestination Setter
    /// role
    function _deriveBlockWithdrawDestinationSetterRole(address _manager)
        internal
        view
        returns (bytes32 _blockWithdrawDestinationSetterRole)
    {
        _blockWithdrawDestinationSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the block requester role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _blockRequesterRole Block Requester role
    function _deriveBlockRequesterRole(address _manager)
        internal
        view
        returns (bytes32 _blockRequesterRole)
    {
        _blockRequesterRole = _deriveRole(
            _deriveAdminRole(_manager),
            BLOCK_REQUESTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the requesterAuthorizerWithManager setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _requesterAuthorizerWithManagerSetterRole RequesterAuthorizerWithManager
    /// Setter role
    function _deriveRequesterAuthorizerWithManagerSetterRole(address _manager)
        internal
        view
        returns (bytes32 _requesterAuthorizerWithManagerSetterRole)
    {
        _requesterAuthorizerWithManagerSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @dev Returns if the account has the oracle address setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the oracle address setter or is the
    /// manager
    function hasOracleAddressSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                oracleAddressSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the coefficient and registry setter role role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the coefficient and registry setter role or is the
    /// manager
    function hasCoefficientAndRegistrySetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                coefficientAndRegistrySetterRole,
                account
            );
    }

    /// @dev Returns if the account has the opt status setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the opt status setter or is the
    /// manager
    function hasOptStatusSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                optStatusSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the blockWithdrawDestination setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the blockWithdrawDestination setter or is the
    /// manager
    function hasBlockWithdrawDestinationSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                blockWithdrawDestinationSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the block requester role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the block requester or is the
    /// manager
    function hasBlockRequesterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                blockRequesterRole,
                account
            );
    }

    /// @dev Returns if the account has the requesterAuthorizerWithManager setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the requesterAuthorizerWithManager setter or is the
    /// manager
    function hasRequesterAuthorizerWithManagerSetterRoleOrIsManager(
        address account
    ) internal view returns (bool) {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                requesterAuthorizerWithManagerSetterRole,
                account
            );
    }
}
