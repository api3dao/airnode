// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../access-control-registry/interfaces/IWhitelistRoles.sol";
import "./IRequesterAuthorizer.sol";

interface IRequesterAuthorizerWithAirnode is
    IWhitelistRoles,
    IRequesterAuthorizer
{
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
