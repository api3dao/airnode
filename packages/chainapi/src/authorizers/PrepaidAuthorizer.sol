// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../Authorizer.sol";


contract PrepaidAuthorizer is Authorizer {
    function verifyAuthorization(
        address requester,
        bytes32 endpointId
        )
        external
        view
        override
        returns (bool)
    {
        return true;
    }
}