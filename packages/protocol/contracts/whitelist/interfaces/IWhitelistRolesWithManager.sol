// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IWhitelistRoles.sol";

interface IWhitelistRolesWithManager is IWhitelistRoles {
    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function whitelistExpirationExtenderRole() external view returns (bytes32);

    function whitelistExpirationSetterRole() external view returns (bytes32);

    function indefiniteWhitelisterRole() external view returns (bytes32);
}
