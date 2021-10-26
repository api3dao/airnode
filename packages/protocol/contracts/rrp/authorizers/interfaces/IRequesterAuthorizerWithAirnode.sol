// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../access-control-registry/interfaces/IWhitelistRolesWithAirnode.sol";
import "./IRequesterAuthorizer.sol";

interface IRequesterAuthorizerWithAirnode is
    IWhitelistRolesWithAirnode,
    IRequesterAuthorizer
{}
