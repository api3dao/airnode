// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface AuthorizerInterface {
    function checkIfAuthorized(
        bytes32 endpointId,
        address requester
        )
        external
        view
        returns (bool status);
}
