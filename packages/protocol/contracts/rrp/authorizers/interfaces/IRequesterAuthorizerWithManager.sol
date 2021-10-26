// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../access-control-registry/interfaces/IWhitelistRolesWithManager.sol";
import "./IRequesterAuthorizer.sol";

interface IRequesterAuthorizerWithManager is
    IWhitelistRolesWithManager,
    IRequesterAuthorizer
{}
