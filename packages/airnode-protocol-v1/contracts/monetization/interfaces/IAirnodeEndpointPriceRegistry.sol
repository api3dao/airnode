// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeEndpointPriceRegistry {
    event RegisterDefaultPrice(uint256 price, address sender);

    event RegisterDefaultChainPrice(
        uint256 chainId,
        uint256 price,
        address sender
    );

    event RegisterAirnodePrice(address airnode, uint256 price, address sender);

    event RegisterAirnodeChainPrice(
        address airnode,
        uint256 chainId,
        uint256 price,
        address sender
    );

    event RegisterAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price,
        address sender
    );

    event RegisterAirnodeChainEndpointPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint256 price,
        address sender
    );

    event SetEndpointAndChainPricePriority(
        address indexed airnode,
        bool status,
        address sender
    );

    function registerDefaultPrice(uint256 price) external;

    function registerDefaultChainPrice(uint256 chainId, uint256 price) external;

    function registerAirnodePrice(address airnode, uint256 price) external;

    function registerAirnodeChainPrice(
        address airnode,
        uint256 chainId,
        uint256 price
    ) external;

    function registerAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external;

    function registerAirnodeChainEndpointPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint256 price
    ) external;

    function setEndpointAndChainPricePriority(address airnode, bool status)
        external;

    function tryReadDefaultPrice()
        external
        view
        returns (bool success, uint256 price);

    function tryReadDefaultChainPrice(uint256 chainId)
        external
        view
        returns (bool success, uint256 price);

    function tryReadAirnodePrice(address airnode)
        external
        view
        returns (bool success, uint256 price);

    function tryReadAirnodeChainPrice(address airnode, uint256 chainId)
        external
        view
        returns (bool success, uint256 price);

    function tryReadAirnodeEndpointPrice(address airnode, bytes32 endpointId)
        external
        view
        returns (bool success, uint256 price);

    function tryReadAirnodeChainEndpointPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view returns (bool success, uint256 price);

    function getPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view returns (uint256 price);

    function prioritizeEndpointPriceOverChainPrice(address airnode)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function DENOMINATION() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function DECIMALS() external view returns (uint256);

    // solhint-disable-next-line func-name-mixedcase
    function PRICING_INTERVAL() external view returns (uint256);
}
