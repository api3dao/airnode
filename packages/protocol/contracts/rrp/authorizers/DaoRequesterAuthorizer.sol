// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RequesterAuthorizer.sol";
import "../../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Authorizer contract that a DAO can use to temporarily or
/// indefinitely whitelist requesters for Airnode–endpoint pairs
/// @dev The DAO address here will most likely belong to an AccessControlAgent
/// contract that is owned by the DAO, rather than being the DAO itself
contract DaoRequesterAuthorizer is RequesterAuthorizer {
    /// @notice Address of the DAO that manages the related
    /// AccessControlRegistry roles
    address public immutable dao;

    bytes32 private immutable daoRequesterAuthorizerAdminRole;

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
        daoRequesterAuthorizerAdminRole = keccak256(
            abi.encodePacked(
                keccak256(abi.encodePacked(_dao)),
                adminRoleDescription
            )
        );
    }

    /// @notice Derives the role ID that should be used to authorize whitelist
    /// interactions
    /// @dev Overriden to give all permissions to roles that are managed by the
    /// DAO
    /// @param airnode Airnode address
    /// @param roleDescription Role description
    /// @return role Role ID
    function deriveRequesterAuthorizerRole(
        address airnode, // solhint-disable-line no-unused-vars
        string memory roleDescription
    ) public view override returns (bytes32 role) {
        role = keccak256(
            abi.encodePacked(daoRequesterAuthorizerAdminRole, roleDescription)
        );
    }
}
