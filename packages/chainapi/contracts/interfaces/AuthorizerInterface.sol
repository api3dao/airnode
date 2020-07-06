// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface AuthorizerInterface {
    function checkIfAuthorized(
        address requester,
        bytes32 endpointId
        )
        external
        view
        returns (bool authorized);
}
