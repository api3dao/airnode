// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


interface IAuthorizer {
    function checkIfAuthorized(
        bytes32 requestId,
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address clientAddress
        )
        external
        view
        returns (bool status);
}
