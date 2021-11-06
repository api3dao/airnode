// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeFeeRegistry {
    event SetEndpointPriceOverChainPricePriority(
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

    event SetAirnodePrice(
        address indexed airnode,
        uint256 price,
        address airnodeFlagAndPriceSetter
    );

    event SetChainAirnodePrice(
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

    function setEndpointPriceOverChainPricePriority(
        address airnode,
        bool status
    ) external;

    function setDefaultPrice(uint256 price) external;

    function setDefaultChainPrice(uint256 chainId, uint256 price) external;

    function setAirnodePrice(address airnode, uint256 price) external;

    function setChainAirnodePrice(
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

    // solhint-disable-next-line func-name-mixedcase
    function DECIMALS() external view returns (uint8);

    function chainIdToAirnodeToEndpointToPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external view returns (uint256);

    function airnodeToEndpointToPrice(address airnode, bytes32 endpointId)
        external
        view
        returns (uint256);

    function chainIdToAirnodeToPrice(uint256 chainId, address airnode)
        external
        view
        returns (uint256);

    function airnodeToPrice(address airnode) external view returns (uint256);

    function defaultChainPrice(uint256 chainId) external view returns (uint256);

    function defaultPrice() external view returns (uint256);

    function prioritizeEndpointPriceOverChainPrice(address airnode)
        external
        view
        returns (bool);
}
