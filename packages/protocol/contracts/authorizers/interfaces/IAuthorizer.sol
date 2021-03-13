// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IAuthorizer {
    function checkIfAuthorized(
        bytes32 requestId,
        bytes32 airnodeId,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address clientAddress
        )
        external
        view
        returns (bool status);
}
