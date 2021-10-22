// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IAccessControlRegistry is IAccessControl {
    event InitializedManager(address indexed manager, bytes32 rootRole);

    event InitializedRole(
        bytes32 indexed role,
        bytes32 indexed adminRole,
        string description,
        address sender
    );

    function initializeManager(address manager) external;

    function initializeRole(bytes32 adminRole, string calldata description)
        external
        returns (bytes32 role);

    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external returns (bytes32[] memory roles);

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
}
