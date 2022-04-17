// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../whitelist/interfaces/IWhitelistRolesWithManager.sol";
import "./IRequesterAuthorizerV0.sol";

interface IRequesterAuthorizerWithManagerV0 is
    IWhitelistRolesWithManager,
    IRequesterAuthorizerV0
{}
