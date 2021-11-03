// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../access-control-registry/RoleDeriver.sol";
import "../../../access-control-registry/AccessControlClient.sol";
import "./AirnodeRequesterAuthorizerRegistryClient.sol";
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
    //     ├── (2) Oracle
    //     ├── (3) AirnodeFeeRegistry setter
    //     ├── (4) Coefficient setter
    //     ├── (5) Opt status setter
    //     ├── (6) Block withdraw destination setter
    //     ├── (7) Block requester
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.
    string public override adminRoleDescription;
    string public constant override ORACLE_ROLE_DESCRIPTION = "Oracle";
    string public constant override AIRNODE_FEE_REGISTRY_SETTER_ROLE =
        "AirnodeFeeRegistry setter";
    string public constant override COEFFICIENT_ROLE_DESCRIPTION =
        "Coefficient setter";
    string public constant override OPT_STATUS_SETTER_ROLE_DESCRIPTION =
        "Opt status setter";
    string
        public constant
        override BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION =
        "Block withdraw destination setter";
    string public constant override BLOCK_REQUESTER_ROLE_DESCRIPTION =
        "Block requester";

    bytes32 internal adminRoleDescriptionHash;
    bytes32 internal constant ORACLE_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(ORACLE_ROLE_DESCRIPTION));
    bytes32 internal constant AIRNODE_FEE_REGISTRY_SETTER_ROLE_HASH =
        keccak256(abi.encodePacked(AIRNODE_FEE_REGISTRY_SETTER_ROLE));
    bytes32 internal constant COEFFICIENT_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(COEFFICIENT_ROLE_DESCRIPTION));
    bytes32 internal constant OPT_STATUS_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(OPT_STATUS_SETTER_ROLE_DESCRIPTION));
    bytes32
        internal constant BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant BLOCK_REQUESTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(BLOCK_REQUESTER_ROLE_DESCRIPTION));

    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    // Since there will be a single manager, we can derive the roles beforehand
    bytes32 public immutable override adminRole;
    bytes32 public immutable override oracleRole;
    bytes32 public immutable override airnodeFeeRegistrySetterRole;
    bytes32 public immutable override coefficientSetterRole;
    bytes32 public immutable override optStatusSetterRole;
    bytes32 public immutable override blockWithdrawDestinationSetterRole;
    bytes32 public immutable override blockRequesterRole;

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
        oracleRole = _deriveOracleRole(_manager);
        airnodeFeeRegistrySetterRole = _deriveAirnodeFeeRegistrySetterRole(
            _manager
        );
        optStatusSetterRole = _deriveOptStatusSetterRole(_manager);
        blockWithdrawDestinationSetterRole = _deriveBlockWithdrawDestinationSetterRole(
            _manager
        );
        blockRequesterRole = _deriveBlockRequesterRole(_manager);
        coefficientSetterRole = _deriveCoefficientSetterRole(_manager);
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

    /// @notice Derives the oracle role for the specific manager address
    /// @param _manager Manager address
    /// @return _oracleRole oracle role role
    function _deriveOracleRole(address _manager)
        private
        view
        returns (bytes32 _oracleRole)
    {
        _oracleRole = _deriveRole(
            _deriveAdminRole(_manager),
            ORACLE_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the airnodeFeeRegistry setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _airnodeFeeRegistrySetterRole airnodeFeeRegistry setter role
    function _deriveAirnodeFeeRegistrySetterRole(address _manager)
        private
        view
        returns (bytes32 _airnodeFeeRegistrySetterRole)
    {
        _airnodeFeeRegistrySetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            AIRNODE_FEE_REGISTRY_SETTER_ROLE_HASH
        );
    }

    /// @notice Derives the coefficient setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _coefficientSetterRole coefficient setter role
    function _deriveCoefficientSetterRole(address _manager)
        private
        view
        returns (bytes32 _coefficientSetterRole)
    {
        _coefficientSetterRole = _deriveRole(
            _deriveAdminRole(_manager),
            COEFFICIENT_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the opt status setter role for the specific
    /// manager address
    /// @param _manager Manager address
    /// @return _optStatusSetterRole Opt Status Setter role
    function _deriveOptStatusSetterRole(address _manager)
        private
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
        private
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
        private
        view
        returns (bytes32 _blockRequesterRole)
    {
        _blockRequesterRole = _deriveRole(
            _deriveAdminRole(_manager),
            BLOCK_REQUESTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @dev Returns if the account has the oracle role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the oracle or is the
    /// manager
    function hasOracleRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                oracleRole,
                account
            );
    }

    /// @dev Returns if the account has the airnodeFeeRegistry setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the airnodeFeeRegistry setter role or is the
    /// manager
    function hasAirnodeFeeRegistrySetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                airnodeFeeRegistrySetterRole,
                account
            );
    }

    /// @dev Returns if the account has the coefficient setter role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the coefficient setter or is the
    /// manager
    function hasCoefficientSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                coefficientSetterRole,
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
}
