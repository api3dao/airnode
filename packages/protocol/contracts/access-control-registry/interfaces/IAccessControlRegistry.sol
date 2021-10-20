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

    function roleToDescription(bytes32 role)
        external
        view
        returns (string memory description);
}
