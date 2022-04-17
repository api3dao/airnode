// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../whitelist/interfaces/IWhitelistRolesWithAirnode.sol";
import "./IRequesterAuthorizer.sol";

interface IRequesterAuthorizerWithAirnode is
    IWhitelistRolesWithAirnode,
    IRequesterAuthorizer
{}
