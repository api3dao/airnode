// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRequesterAuthorizerWhitelisterWithToken.sol";

interface IRequesterAuthorizerWhitelisterWithTokenDeposit is
    IRequesterAuthorizerWhitelisterWithToken
{
    event DepositedTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender,
        uint256 tokenDepositsCount,
        uint256 tokenDepositAmount
    );

    event WithdrewTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender,
        uint256 tokenDepositsCount,
        uint256 tokenWithdrawAmount
    );

    event WithdrewTokensDepositedForBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor,
        uint256 tokenDepositsCount,
        uint256 tokenWithdrawAmount
    );

    function depositTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external;

    function withdrawTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external;

    function withdrawFundsDepositedForBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external;

    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external view returns (uint256);

    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external view returns (uint256);
}
