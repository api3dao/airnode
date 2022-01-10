// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../whitelist/interfaces/IWhitelistRolesWithManager.sol";
import "./IRequesterAuthorizerV1.sol";

interface IRequesterAuthorizerWithManagerV1 is
    IWhitelistRolesWithManager,
    IRequesterAuthorizerV1
{}
