// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

interface IAccessControlRegistry is IAccessControlEnumerable {
    function initializeRole(
        address treeOwner,
        bytes32 adminRole,
        string calldata description
    ) external returns (bytes32 role);

    function initializeAndGrantRole(
        address treeOwner,
        bytes32 adminRole,
        string calldata description,
        address account
    ) external returns (bytes32 role);

    function treeOwnerToRootRole(address treeOwner)
        external
        pure
        returns (bytes32 rootRole);

    function roleToTreeOwner(bytes32 role)
        external
        view
        returns (address treeOwner);

    function roleToDescription(bytes32 role)
        external
        view
        returns (string memory description);
}
