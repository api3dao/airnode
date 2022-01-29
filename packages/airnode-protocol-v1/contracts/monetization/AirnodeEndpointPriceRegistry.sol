// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../utils/Uint256Registry.sol";
import "./interfaces/IAirnodeEndpointPriceRegistry.sol";

/// @title Contract that stores the price of accessing Airnode endpoints across
/// different chains
/// @notice AirnodeEndpointPriceRegistry is a central contract that can be queried for
/// the USD price of an Airnode–chain–endpoint pair
contract AirnodeEndpointPriceRegistry is
    Uint256Registry,
    IAirnodeEndpointPriceRegistry
{
    /// @notice A flag to determine which price to default to
    /// @dev See `getPrice()` for details
    mapping(address => bool)
        public
        override prioritizeEndpointPriceOverChainPrice;

    string public constant override DENOMINATION = "USD";

    uint256 public constant override DECIMALS = 18;

    uint256 public constant override PRICING_INTERVAL = 30 days;

    bytes32 private constant DEFAULT_PRICE_ID =
        keccak256(abi.encodePacked("Default price"));

    bytes32 private constant SALT =
        keccak256(abi.encodePacked("Salt to avoid hash collision"));

    /// @dev Reverts if Airnode address is zero
    /// @param airnode Airnode address
    modifier onlyNonZeroAirnode(address airnode) {
        require(airnode != address(0), "Airnode address zero");
        _;
    }

    /// @dev Reverts if Chain ID is zero
    /// @param chainId Chain ID
    modifier onlyNonZeroChainId(uint256 chainId) {
        require(chainId != 0, "Chain ID zero");
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        Uint256Registry(_accessControlRegistry, _adminRoleDescription, _manager)
    {}

    /// @notice Sets the default price
    /// @param price Price in USD (times 10^18)
    function setDefaultPrice(uint256 price)
        external
        override
        onlyRegistrarOrManager
    {
        _registerUint256(DEFAULT_PRICE_ID, price);
        emit SetDefaultPrice(price, msg.sender);
    }

    /// @notice Sets the default chain price
    /// @param chainId Chain ID
    /// @param price Price in USD (times 10^18)
    function setDefaultChainPrice(uint256 chainId, uint256 price)
        external
        override
        onlyRegistrarOrManager
        onlyNonZeroChainId(chainId)
    {
        _registerUint256(
            keccak256(abi.encodePacked(DEFAULT_PRICE_ID, chainId)),
            price
        );
        emit SetDefaultChainPrice(chainId, price, msg.sender);
    }

    /// @notice Sets the Airnode price
    /// @param airnode Airnode address
    /// @param price Price in USD (times 10^18)
    function setAirnodePrice(address airnode, uint256 price)
        external
        override
        onlyRegistrarOrManager
        onlyNonZeroAirnode(airnode)
    {
        _registerUint256(keccak256(abi.encodePacked(airnode)), price);
        emit SetAirnodePrice(airnode, price, msg.sender);
    }

    /// @notice Sets the Airnode chain price
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param price Price in USD (times 10^18)
    function setAirnodeChainPrice(
        address airnode,
        uint256 chainId,
        uint256 price
    )
        external
        override
        onlyRegistrarOrManager
        onlyNonZeroAirnode(airnode)
        onlyNonZeroChainId(chainId)
    {
        _registerUint256(keccak256(abi.encodePacked(airnode, chainId)), price);
        emit SetAirnodeChainPrice(airnode, chainId, price, msg.sender);
    }

    /// @notice Sets the Airnode endpoint price
    /// @dev The registry ID hash is salted in case the Airnode is not using
    /// hashes for `endpointId` as they are supposed to and numbers instead,
    /// which may be the same as chain IDs and result in collision.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param price Price in USD (times 10^18)
    function setAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external override onlyRegistrarOrManager onlyNonZeroAirnode(airnode) {
        _registerUint256(
            keccak256(abi.encodePacked(SALT, airnode, endpointId)),
            price
        );
        emit SetAirnodeEndpointPrice(airnode, endpointId, price, msg.sender);
    }

    /// @notice Sets the Airnode chain endpoint price
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param price Price in USD (times 10^18)
    function setAirnodeChainEndpointPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint256 price
    )
        external
        override
        onlyRegistrarOrManager
        onlyNonZeroAirnode(airnode)
        onlyNonZeroChainId(chainId)
    {
        _registerUint256(
            keccak256(abi.encodePacked(airnode, chainId, endpointId)),
            price
        );
        emit SetAirnodeChainEndpointPrice(
            airnode,
            chainId,
            endpointId,
            price,
            msg.sender
        );
    }

    /// @notice Sets if the endpoint or the chain price will be prioritized
    /// for the Airnode
    /// @param airnode Airnode address
    /// @param status Flag status, `true` prioritizes the endpoint price,
    /// `false` prioritizes the chain price (default)
    function setEndpointAndChainPricePriority(address airnode, bool status)
        external
        override
        onlyRegistrarOrManager
        onlyNonZeroAirnode(airnode)
    {
        prioritizeEndpointPriceOverChainPrice[airnode] = status;
        emit SetEndpointAndChainPricePriority(airnode, status, msg.sender);
    }

    /// @notice Returns the default price
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadDefaultPrice()
        public
        view
        override
        returns (bool success, uint256 price)
    {
        (success, price) = tryReadRegisteredUint256(DEFAULT_PRICE_ID);
    }

    /// @notice Returns the default chain price
    /// @param chainId Chain ID
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadDefaultChainPrice(uint256 chainId)
        public
        view
        override
        returns (bool success, uint256 price)
    {
        (success, price) = tryReadRegisteredUint256(
            keccak256(abi.encodePacked(DEFAULT_PRICE_ID, chainId))
        );
    }

    /// @notice Returns the Airnode price
    /// @param airnode Airnode address
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadAirnodePrice(address airnode)
        public
        view
        override
        returns (bool success, uint256 price)
    {
        (success, price) = tryReadRegisteredUint256(
            keccak256(abi.encodePacked(airnode))
        );
    }

    /// @notice Returns the Airnode, chain price
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadAirnodeChainPrice(address airnode, uint256 chainId)
        public
        view
        override
        returns (bool success, uint256 price)
    {
        (success, price) = tryReadRegisteredUint256(
            keccak256(abi.encodePacked(airnode, chainId))
        );
    }

    /// @notice Returns the Airnode, endpoint price
    /// @dev The registry ID hash is salted in case the Airnode is not using
    /// hashes for `endpointId` as they are supposed to and numbers instead,
    /// which may be the same as chain IDs and result in collision.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadAirnodeEndpointPrice(address airnode, bytes32 endpointId)
        public
        view
        override
        returns (bool success, uint256 price)
    {
        (success, price) = tryReadRegisteredUint256(
            keccak256(abi.encodePacked(SALT, airnode, endpointId))
        );
    }

    /// @notice Returns the Airnode, chain, endpoint price
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @return success If the price was set
    /// @return price Price in USD (times 10^18)
    function tryReadAirnodeChainEndpointPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) public view override returns (bool success, uint256 price) {
        (success, price) = tryReadRegisteredUint256(
            keccak256(abi.encodePacked(airnode, chainId, endpointId))
        );
    }

    /// @notice Returns the price that should be used for the given Airnode,
    /// chain and endpoint
    /// @dev The logic prioritizes more specific prices over less specific
    /// prices. There is ambiguity in if Airnode + chain or Airnode + endpoint
    /// should be prioritize, which we made to configurable (defaults to
    /// prioritizing Airnode + chain).
    /// Reverts if no price is set.
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @return price Price in USD (times 10^18)
    function getPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view override returns (uint256 price) {
        bool success;
        (success, price) = tryReadAirnodeChainEndpointPrice(
            airnode,
            chainId,
            endpointId
        );
        if (success) {
            return price;
        }
        if (prioritizeEndpointPriceOverChainPrice[airnode]) {
            (success, price) = tryReadAirnodeEndpointPrice(airnode, endpointId);
            if (success) {
                return price;
            }
            (success, price) = tryReadAirnodeChainPrice(airnode, chainId);
            if (success) {
                return price;
            }
        } else {
            (success, price) = tryReadAirnodeChainPrice(airnode, chainId);
            if (success) {
                return price;
            }
            (success, price) = tryReadAirnodeEndpointPrice(airnode, endpointId);
            if (success) {
                return price;
            }
        }
        (success, price) = tryReadAirnodePrice(airnode);
        if (success) {
            return price;
        }
        (success, price) = tryReadDefaultChainPrice(chainId);
        if (success) {
            return price;
        }
        (success, price) = tryReadDefaultPrice();
        require(success, "No default price set");
    }
}
