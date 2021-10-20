// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

interface IAccessControlRegistry is IAccessControlEnumerable {
    function initializeRole(
        address manager,
        bytes32 adminRole,
        string calldata description
    ) external returns (bytes32 role);

    function initializeAndGrantRole(
        address manager,
        bytes32 adminRole,
        string calldata description,
        address account
    ) external returns (bytes32 role);

    function managerToRootRole(address manager)
        external
        pure
        returns (bytes32 rootRole);

    function roleToManager(bytes32 role)
        external
        view
        returns (address manager);
    
    function managerToRoles(address manager, uint256 index)
        external
        view
        returns (bytes32 roles);

    function roleToDescription(bytes32 role)
        external
        view
        returns (string memory description);
    
    function managerToRoleCount(address manager)
        external
        view
        returns (uint256 roleCount);

    function getManagerRoles(address manager, uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory roles);
    
    function getRoleMembers(bytes32 role, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory members);
}
