// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRequesterAuthorizerWhitelisterWithToken.sol";

interface IRequesterAuthorizerWhitelisterWithTokenPayment is
    IRequesterAuthorizerWhitelisterWithToken
{
    event PaidTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        uint64 whitelistExtension,
        address sender,
        uint64 newExpirationTimestamp
    );

    event ResetWhitelistExpirationOfBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender
    );

    event SetMinimumWhitelistExtension(
        uint64 minimumWhitelistExtension,
        address sender
    );

    event SetMaximumWhitelistDuration(
        uint64 maximumWhitelistDuration,
        address sender
    );

    function payTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        uint64 whitelistExtension
    ) external;

    function resetWhitelistExpirationOfBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external;

    function setMinimumWhitelistExtension(uint64 _minimumWhitelistExtension)
        external;

    function setMaximumWhitelistDuration(uint64 _maximumWhitelistDuration)
        external;

    function getTokenPaymentAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint64 whitelistExtension
    ) external view returns (uint256 tokenPaymentAmount);

    function minimumWhitelistExtension() external view returns (uint64);

    function maximumWhitelistDuration() external view returns (uint64);
}
