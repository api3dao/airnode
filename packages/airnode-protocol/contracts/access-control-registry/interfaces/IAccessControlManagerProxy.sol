// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAccessControlClient.sol";

interface IAccessControlManagerProxy is IAccessControlClient {
    function initializeRole(bytes32 adminRole, string calldata description)
        external
        returns (bytes32 role);

    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external returns (bytes32[] memory roles);

    function grantRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function renounceRole(bytes32 role, address account) external;
}
