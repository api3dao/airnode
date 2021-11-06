// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeFeeRegistryRolesWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";

/// @title Contract for storing the price of airnode endpoints across different chains
/// @notice The AirnodeFeeRegistry contract is a central contract that
/// will be queried to find out the USD price of a chain-airnode-endpoint pair.
contract AirnodeFeeRegistry is
    AirnodeFeeRegistryRolesWithManager,
    IAirnodeFeeRegistry
{
    string private constant ERROR_ZERO_CHAINID = "Zero chainId";

    /// @notice The USD price of an endpoint for an airnode on a specific chain
    mapping(uint256 => mapping(address => mapping(bytes32 => uint256)))
        public
        override chainIdToAirnodeToEndpointToPrice;

    /// @notice The USD price of an endpoint for an airnode across all chains
    mapping(address => mapping(bytes32 => uint256))
        public
        override airnodeToEndpointToPrice;

    /// @notice The default price of an endpoint for an airnode on a specific chain
    mapping(uint256 => mapping(address => uint256))
        public
        override chainIdToAirnodeToPrice;

    /// @notice The default price of an endpoint on an airnode
    mapping(address => uint256) public override airnodeToPrice;

    /// @notice The default price of an endpoint for a chain
    mapping(uint256 => uint256) public override defaultChainPrice;

    /// @notice The global default price of an endpoint
    uint256 public override defaultPrice;

    /// @notice A flag that indicates which price to default to in
    /// the getAirnodeEndpointFee function
    mapping(address => bool)
        public
        override prioritizeEndpointPriceOverChainPrice;

    /// @notice Prices will have upto 18 decimal places
    uint8 public constant DECIMALS = 18;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        AirnodeFeeRegistryRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {}

    /// @notice Called by an airnode price setter to
    /// set the prioritizeEndpointPriceOverChainPrice flag for an airnode
    /// @param airnode The address of the airnode
    /// @param status The airnode endpoint flag status
    function setEndpointPriceOverChainPricePriority(
        address airnode,
        bool status
    ) external override {
        require(
            hasAirnodePriceSetterRoleOrIsManager(msg.sender),
            "Not airnode price setter"
        );
        require(airnode != address(0), "Address is zero");
        prioritizeEndpointPriceOverChainPrice[airnode] = status;
        emit SetEndpointPriceOverChainPricePriority(
            airnode,
            status,
            msg.sender
        );
    }

    /// @notice Called by a default price setter to set the
    /// default price in USD
    /// @param price The price in USD
    function setDefaultPrice(uint256 price) external override {
        require(
            hasDefaultPriceSetterRoleOrIsManager(msg.sender),
            "Not default price setter"
        );
        require(price != 0, "Price is zero");
        defaultPrice = price;
        emit SetDefaultPrice(price, msg.sender);
    }

    /// @notice Called by a default price setter to set the
    /// default price on a chain in USD
    /// @param chainId The id of the chain
    /// @param price The price in USD
    function setDefaultChainPrice(uint256 chainId, uint256 price)
        external
        override
    {
        require(
            hasDefaultPriceSetterRoleOrIsManager(msg.sender),
            "Not default price setter"
        );
        require(chainId != 0, "ChainId is zero");
        require(price != 0, "Price is zero");
        defaultChainPrice[chainId] = price;
        emit SetDefaultChainPrice(chainId, price, msg.sender);
    }

    /// @notice Called by an airnode price setter to set the
    /// default price on an airnode across all chains in USD
    /// @param airnode The address of the airnode
    /// @param price The price in USD
    function setAirnodePrice(address airnode, uint256 price) external override {
        require(
            hasAirnodePriceSetterRoleOrIsManager(msg.sender),
            "Not airnode price setter"
        );
        require(airnode != address(0), "Address is zero");
        require(price != 0, "Price is zero");
        airnodeToPrice[airnode] = price;
        emit SetAirnodePrice(airnode, price, msg.sender);
    }

    /// @notice Called by an airnode price setter to set the
    /// default price for an airnode on a chain in USD
    /// @param chainId The id of the chain
    /// @param airnode The address of the airnode
    /// @param price The price in USD
    function setChainAirnodePrice(
        uint256 chainId,
        address airnode,
        uint256 price
    ) external override {
        require(
            hasAirnodePriceSetterRoleOrIsManager(msg.sender),
            "Not airnode price setter"
        );
        require(chainId != 0, "ChainId is zero");
        require(airnode != address(0), "Address is zero");
        require(price != 0, "Price is zero");
        chainIdToAirnodeToPrice[chainId][airnode] = price;
        emit SetChainAirnodePrice(chainId, airnode, price, msg.sender);
    }

    /// @notice Called by an airnode price setter to set the
    /// price of an endpoint for an airnode across all chains in USD
    /// @param airnode The address of the airnode
    /// @param endpointId The endpointId whose price is being set
    /// @param price The price in USD
    function setAirnodeEndpointPrice(
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external override {
        require(
            hasAirnodePriceSetterRoleOrIsManager(msg.sender),
            "Not airnode price setter"
        );
        require(airnode != address(0), "Address is zero");
        require(price != 0, "Price is zero");
        airnodeToEndpointToPrice[airnode][endpointId] = price;
        emit SetAirnodeEndpointPrice(airnode, endpointId, price, msg.sender);
    }

    /// @notice Called by an airnode price setter to set the price of an
    /// endpoint for an airnode on a chain in USD
    /// @param chainId The id of the chain
    /// @param airnode The address of the airnode
    /// @param endpointId The endpointId whose price is being set
    /// @param price The price in USD
    function setChainAirnodeEndpointPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 price
    ) external override {
        require(
            hasAirnodePriceSetterRoleOrIsManager(msg.sender),
            "Not airnode price setter"
        );
        require(chainId != 0, "ChainId is zero");
        require(airnode != address(0), "Address is zero");
        require(price != 0, "Price is zero");
        chainIdToAirnodeToEndpointToPrice[chainId][airnode][endpointId] = price;
        emit SetChainAirnodeEndpointPrice(
            chainId,
            airnode,
            endpointId,
            price,
            msg.sender
        );
    }

    /// @notice Called to get the price of an endpoint for an airnode on a chain in USD
    /// @param chainId The id of the chain
    /// @param airnode The address of the airnode
    /// @param endpointId The endpointId whose price is being fetched
    function getEndpointPrice(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external view override returns (uint256) {
        if (
            chainIdToAirnodeToEndpointToPrice[chainId][airnode][endpointId] != 0
        )
            return
                chainIdToAirnodeToEndpointToPrice[chainId][airnode][endpointId];

        if (prioritizeEndpointPriceOverChainPrice[airnode]) {
            if (airnodeToEndpointToPrice[airnode][endpointId] != 0)
                return airnodeToEndpointToPrice[airnode][endpointId];
            if (chainIdToAirnodeToPrice[chainId][airnode] != 0)
                return chainIdToAirnodeToPrice[chainId][airnode];
        } else {
            if (chainIdToAirnodeToPrice[chainId][airnode] != 0)
                return chainIdToAirnodeToPrice[chainId][airnode];
            if (airnodeToEndpointToPrice[airnode][endpointId] != 0)
                return airnodeToEndpointToPrice[airnode][endpointId];
        }

        if (airnodeToPrice[airnode] != 0) return airnodeToPrice[airnode];
        if (defaultChainPrice[chainId] != 0) return defaultChainPrice[chainId];
        return defaultPrice;
    }
}
