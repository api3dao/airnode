// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IWhitelistRoles.sol";

interface IWhitelistRolesWithAirnode is IWhitelistRoles {
    function deriveAdminRole(address airnode)
        external
        view
        returns (bytes32 role);

    function deriveWhitelistExpirationExtenderRole(address airnode)
        external
        view
        returns (bytes32 role);

    function deriveWhitelistExpirationSetterRole(address airnode)
        external
        view
        returns (bytes32 role);

    function deriveIndefiniteWhitelisterRole(address airnode)
        external
        view
        returns (bytes32 role);
}
