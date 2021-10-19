// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeFeeRegistry {
    event SetDefaultPrice(uint256 price);

    event SetDefaultChainPrice(uint256 chainId, uint256 price);

    event SetDefaultChainAirnodePrice(
        uint256 chainId,
        address airnode,
        uint256 price
    );

    event SetAirnodeEndpointFee(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 price
    );

    function setDefaultPrice(uint256 price) external;

    function setDefaultChainPrice(uint256 chainId, uint256 price) external;

    function setDefaultChainAirnodePrice(
        uint256 chainId,
        address airnode,
        uint256 price
    ) external;

    function setAirnodeEndpointFee(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external;

    function getAirnodeEndpointFee(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external view returns (uint256);
}
