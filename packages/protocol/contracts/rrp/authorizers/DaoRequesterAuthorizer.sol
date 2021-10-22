// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RequesterAuthorizer.sol";
import "../../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Requester authorizer contract where the AccessControlRegistry roles
/// are owned by a single account, such as an AccessControlManager controlled
/// by a DAO
contract DaoRequesterAuthorizer is RequesterAuthorizer {
    /// @notice Address of the DAO that manages the authorized
    /// AccessControlRegistry roles
    address public immutable dao;

    /// @param _dao Address of the DAO that manages the authorized
    /// AccessControlRegistry roles
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _dao
    ) RequesterAuthorizer(_accessControlRegistry, _adminRoleDescription) {
        dao = _dao;
    }

    /// @notice Derives the role ID that should be used to authorize whitelist
    /// interactions
    /// @dev Overriden to give all permissions to roles that are managed by
    /// `dao`
    /// @param airnode Airnode address
    /// @param roleDescription Role description
    /// @return role Role ID
    function deriveRole(
        address airnode, // solhint-disable-line no-unused-vars
        string memory roleDescription
    ) public view override returns (bytes32 role) {
        IAccessControlRegistry iAccessControlRegistry = IAccessControlRegistry(
            accessControlRegistry
        );
        bytes32 daoRootRole = iAccessControlRegistry.deriveRootRole(dao);
        bytes32 adminRole = iAccessControlRegistry.deriveRole(
            daoRootRole,
            adminRoleDescription
        );
        role = iAccessControlRegistry.deriveRole(adminRole, roleDescription);
    }
}
