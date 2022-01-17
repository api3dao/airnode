// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title A mock requester authorizer that always returns true
contract MockRequesterAuthorizerAlwaysTrue {
    function isAuthorized(
        address airnode, // solhint-disable-line no-unused-vars
        bytes32 endpointId, // solhint-disable-line no-unused-vars
        address requester // solhint-disable-line no-unused-vars
    ) external view returns (bool status) {
        status = true;
    }
}
