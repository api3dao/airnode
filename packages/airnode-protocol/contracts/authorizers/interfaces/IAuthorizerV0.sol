// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAuthorizerV0 {
    function isAuthorized(
        bytes32 requestId,
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address requester
    ) external view returns (bool);
}
