// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AirnodeFeeRegistryRolesWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";

/// @title Contract for storing the price of a airnode endpoints
/// @notice The AirnodeFeeRegistry contract is a central contract that
/// all the different AirnodeTokenLock contracts (of different chains)
/// will be calling to find out what the USD price of a chain-airnode-endpoint is
contract AirnodeFeeRegistry is
    AirnodeFeeRegistryRolesWithManager,
    IAirnodeFeeRegistry
{
    /// @dev The USD price of an endpoint for an airnode on a specific chain
    mapping(uint256 => mapping(address => mapping(bytes32 => uint256)))
        public chainIdToAirnodeToEndpointToPrice;

    /// @dev The USD price of an endpoint for an airnode across all chains
    mapping(address => mapping(bytes32 => uint256))
        public airnodeToEndpointToPrice;

    /// @dev The default price of an endpoint for an airnode on a specific chain
    mapping(uint256 => mapping(address => uint256))
        public defaultChainAirnodePrice;

    /// @dev The default price of an endpoint on an airnode
    mapping(address => uint256) public defaultAirnodePrice;

    /// @dev The default price of an endpoint for a chain
    mapping(uint256 => uint256) public defaultChainPrice;

    /// @dev The global default price of an endpoint
    uint256 public defaultPrice;

    /// @dev A flag that indicates which price to default to in
    /// the getAirnodeEndpointFee function
    mapping(address => bool) public airnodeEndpointFlag;

    /// @dev Prices will have upto 6 decimal places
    uint8 public immutable decimals = 6;

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

    function setAirnodeEndpointFlag(address _airnode, bool status)
        external
        override
    {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_airnode != address(0), "Address is zero");
        airnodeEndpointFlag[_airnode] = status;
        emit SetAirnodeEndpointFlag(_airnode, status, msg.sender);
    }

    /// @dev Called by a global default price setter to set the default price in USD
    /// @param _price The default price of an endpoint on any chain in USD
    function setDefaultPrice(uint256 _price) external override {
        require(
            hasGlobalDefaultPriceSetterRoleOrIsManager(msg.sender),
            "Not global default price setter"
        );
        require(_price != 0, "Price is zero");
        defaultPrice = _price * 10**decimals;
        emit SetDefaultPrice(_price, msg.sender);
    }

    /// @dev Called by a global default price setter to set the default price on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _price The default price of an endpoint on a specific chain in USD
    function setDefaultChainPrice(uint256 _chainId, uint256 _price)
        external
        override
    {
        require(
            hasGlobalDefaultPriceSetterRoleOrIsManager(msg.sender),
            "Not global default price setter"
        );
        require(_chainId != 0, "ChainId is zero");
        require(_price != 0, "Price is zero");
        defaultChainPrice[_chainId] = _price * 10**decimals;
        emit SetDefaultChainPrice(_chainId, _price, msg.sender);
    }

    /// @dev Called by a airnode flag and price setter to set the default price on a chain in USD
    /// @param _airnode The address of the airnode
    /// @param _price The default price of an endpoint on a specific chain in USD
    function setDefaultAirnodePrice(address _airnode, uint256 _price)
        external
        override
    {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_airnode != address(0), "Address is zero");
        require(_price != 0, "Price is zero");
        defaultAirnodePrice[_airnode] = _price * 10**decimals;
        emit SetDefaultAirnodePrice(_airnode, _price, msg.sender);
    }

    /// @dev Called by a airnode flag and price setter to set the default price for an airnode
    ///  on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _price The default price of an endpoint for an airnode on a specific chain in USD
    function setDefaultChainAirnodePrice(
        uint256 _chainId,
        address _airnode,
        uint256 _price
    ) external override {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_chainId != 0, "ChainId is zero");
        require(_airnode != address(0), "Address is zero");
        require(_price != 0, "Price is zero");
        defaultChainAirnodePrice[_chainId][_airnode] = _price * 10**decimals;
        emit SetDefaultChainAirnodePrice(
            _chainId,
            _airnode,
            _price,
            msg.sender
        );
    }

    /// @dev Called by a airnode flag and price setter to set the price of an endpoint for an airnode
    /// across all chains in USD
    /// @param _airnode The address of the airnode
    /// @param _endpointId The endpointId whose price is being set
    /// @param _price The price of an endpointId for an airnode on a specific chain in USD
    function setAirnodeEndpointPrice(
        address _airnode,
        bytes32 _endpointId,
        uint256 _price
    ) external override {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_airnode != address(0), "Address is zero");
        require(_price != 0, "Price is zero");
        airnodeToEndpointToPrice[_airnode][_endpointId] = _price * 10**decimals;
        emit SetAirnodeEndpointPrice(_airnode, _endpointId, _price, msg.sender);
    }

    /// @dev Called by a airnode flag and price setter to set the price of an
    /// endpoint for an airnode on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _endpointId The endpointId whose price is being set
    /// @param _price The price of an endpointId for an airnode on a specific chain in USD
    function setChainAirnodeEndpointPrice(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint256 _price
    ) external override {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_chainId != 0, "ChainId is zero");
        require(_airnode != address(0), "Address is zero");
        require(_price != 0, "Price is zero");
        chainIdToAirnodeToEndpointToPrice[_chainId][_airnode][_endpointId] =
            _price *
            10**decimals;
        emit SetChainAirnodeEndpointPrice(
            _chainId,
            _airnode,
            _endpointId,
            _price,
            msg.sender
        );
    }

    /// @dev Called to get the price of an endpoint for an airnode on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _endpointId The endpointId whose price is being fetched
    function getEndpointPrice(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId
    ) external view override returns (uint256) {
        if (
            chainIdToAirnodeToEndpointToPrice[_chainId][_airnode][
                _endpointId
            ] != 0
        )
            return
                chainIdToAirnodeToEndpointToPrice[_chainId][_airnode][
                    _endpointId
                ];

        if (airnodeEndpointFlag[_airnode]) {
            if (airnodeToEndpointToPrice[_airnode][_endpointId] != 0)
                return airnodeToEndpointToPrice[_airnode][_endpointId];
            if (defaultChainAirnodePrice[_chainId][_airnode] != 0)
                return defaultChainAirnodePrice[_chainId][_airnode];
        } else {
            if (defaultChainAirnodePrice[_chainId][_airnode] != 0)
                return defaultChainAirnodePrice[_chainId][_airnode];
            if (airnodeToEndpointToPrice[_airnode][_endpointId] != 0)
                return airnodeToEndpointToPrice[_airnode][_endpointId];
        }

        if (defaultAirnodePrice[_airnode] != 0)
            return defaultAirnodePrice[_airnode];
        if (defaultChainPrice[_chainId] != 0)
            return defaultChainPrice[_chainId];
        return defaultPrice;
    }
}
