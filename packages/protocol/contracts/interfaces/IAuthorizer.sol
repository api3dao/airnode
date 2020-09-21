// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface IAuthorizer {
    function checkIfAuthorized(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address clientAddress
        )
        external
        view
        returns (bool status);
}
