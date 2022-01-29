// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeEndpointPriceRegistry {
    event SetDefaultPrice(uint256 price, address sender);

    event SetDefaultChainPrice(uint256 chainId, uint256 price, address sender);

    event SetAirnodePrice(address airnode, uint256 price, address sender);

    event SetAirnodeChainPrice(
        address airnode,
        uint256 chainId,
        uint256 price,
        address sender
    );

    event SetAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price,
        address sender
    );

    event SetAirnodeChainEndpointPrice(
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

    function setDefaultPrice(uint256 price) external;

    function setDefaultChainPrice(uint256 chainId, uint256 price) external;

    function setAirnodePrice(address airnode, uint256 price) external;

    function setAirnodeChainPrice(
        address airnode,
        uint256 chainId,
        uint256 price
    ) external;

    function setAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external;

    function setAirnodeChainEndpointPrice(
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
