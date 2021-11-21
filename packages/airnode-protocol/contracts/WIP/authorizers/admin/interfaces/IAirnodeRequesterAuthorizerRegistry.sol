// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeRequesterAuthorizerRegistry {
    event SetRequesterAuthorizerWithManager(
        uint256 chainId,
        address requesterAuthorizerWithManager,
        address requesterAuthorizerWithManagerSetter
    );

    function setRequesterAuthorizerWithManager(
        uint256 chainId,
        address requesterAuthorizerWithManager
    ) external;

    function chainIdToRequesterAuthorizerWithManager(uint256 chainId)
        external
        view
        returns (address);
}
