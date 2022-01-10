// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../whitelist/interfaces/IWhitelistRolesWithAirnode.sol";
import "./IRequesterAuthorizerV1.sol";

interface IRequesterAuthorizerWithAirnodeV1 is
    IWhitelistRolesWithAirnode,
    IRequesterAuthorizerV1
{}
