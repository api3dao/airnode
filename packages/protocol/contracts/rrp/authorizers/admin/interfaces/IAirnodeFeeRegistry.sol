// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeFeeRegistry {
    event SetAirnodeEndpointFlag(address airnode, bool status);

    event SetDefaultPrice(uint256 price);

    event SetDefaultChainPrice(uint256 chainId, uint256 price);

    event SetDefaultAirnodePrice(address airnode, uint256 price);

    event SetDefaultChainAirnodePrice(
        uint256 chainId,
        address airnode,
        uint256 price
    );

    event SetAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    );

    event SetChainAirnodeEndpointPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 price
    );

    function setAirnodeEndpointFlag(address airnode, bool status) external;

    function setDefaultPrice(uint256 price) external;

    function setDefaultChainPrice(uint256 chainId, uint256 price) external;

    function setDefaultAirnodePrice(address airnode, uint256 price) external;

    function setDefaultChainAirnodePrice(
        uint256 chainId,
        address airnode,
        uint256 price
    ) external;

    function setAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external;

    function setChainAirnodeEndpointPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external;

    function getEndpointPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external view returns (uint256);
}
