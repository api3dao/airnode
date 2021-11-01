// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeFeeRegistry {
    event SetAirnodeEndpointFlag(
        address indexed airnode,
        bool status,
        address airnodeFlagAndPriceSetter
    );

    event SetDefaultPrice(uint256 price, address globalDefaultPriceSetter);

    event SetDefaultChainPrice(
        uint256 indexed chainId,
        uint256 price,
        address globalDefaultPriceSetter
    );

    event SetDefaultAirnodePrice(
        address indexed airnode,
        uint256 price,
        address airnodeFlagAndPriceSetter
    );

    event SetDefaultChainAirnodePrice(
        uint256 indexed chainId,
        address indexed airnode,
        uint256 price,
        address airnodeFlagAndPriceSetter
    );

    event SetAirnodeEndpointPrice(
        address indexed airnode,
        bytes32 indexed endpointId,
        uint256 price,
        address airnodeFlagAndPriceSetter
    );

    event SetChainAirnodeEndpointPrice(
        uint256 indexed chainId,
        address indexed airnode,
        bytes32 indexed endpointId,
        uint256 price,
        address airnodeFlagAndPriceSetter
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

    function chainIdToAirnodeToEndpointToPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external view returns (uint256);

    function airnodeToEndpointToPrice(address airnode, bytes32 endpointId)
        external
        view
        returns (uint256);

    function defaultChainAirnodePrice(uint256 chainId, address airnode)
        external
        view
        returns (uint256);

    function defaultAirnodePrice(address airnode)
        external
        view
        returns (uint256);

    function defaultChainPrice(uint256 chainId) external view returns (uint256);

    function defaultPrice() external view returns (uint256);

    function airnodeEndpointFlag(address airnode) external view returns (bool);
}
