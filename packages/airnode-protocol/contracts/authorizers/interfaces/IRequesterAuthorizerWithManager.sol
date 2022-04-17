// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../whitelist/interfaces/IWhitelistRolesWithManager.sol";
import "./IRequesterAuthorizer.sol";

interface IRequesterAuthorizerWithManager is
    IWhitelistRolesWithManager,
    IRequesterAuthorizer
{}
