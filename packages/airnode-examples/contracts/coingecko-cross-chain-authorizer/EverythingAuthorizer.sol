// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/authorizers/interfaces/IAuthorizerV0.sol";

contract EverythingAuthorizer is IAuthorizerV0 {
    function isAuthorizedV0(
        bytes32,
        address,
        bytes32,
        address,
        address
    ) external pure override returns (bool) {
        return true;
    }
}
