// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

interface IAccessControlRegistry is IAccessControlEnumerable {
    function initializeManager(address manager) external;

    function initializeRole(bytes32 adminRole, string calldata description)
        external
        returns (bytes32 role);

    function initializeAndGrantRole(
        bytes32 adminRole,
        string calldata description,
        address account
    ) external returns (bytes32 role);

    function managerToRoleCount(address manager)
        external
        view
        returns (uint256 roleCount);

    function hasRoleOrIsManagerOfRole(bytes32 role, address account)
        external
        view
        returns (bool);

    function deriveRootRole(address manager)
        external
        pure
        returns (bytes32 rootRole);

    function deriveRole(bytes32 adminRole, string calldata description)
        external
        pure
        returns (bytes32 role);

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
}
