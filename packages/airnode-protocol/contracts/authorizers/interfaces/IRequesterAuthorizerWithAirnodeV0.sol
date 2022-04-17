// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../whitelist/interfaces/IWhitelistRolesWithAirnode.sol";
import "./IRequesterAuthorizerV0.sol";

interface IRequesterAuthorizerWithAirnodeV0 is
    IWhitelistRolesWithAirnode,
    IRequesterAuthorizerV0
{}
