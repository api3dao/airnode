// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAccessControlManager {
    function grantRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function initializeRole(bytes32 adminRole, string calldata description)
        external
        returns (bytes32 role);

    function initializeAndGrantRole(
        bytes32 adminRole,
        string calldata description,
        address account
    ) external returns (bytes32 role);
}
