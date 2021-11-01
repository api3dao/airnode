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
        override defaultChainAirnodePrice;

    /// @notice The default price of an endpoint on an airnode
    mapping(address => uint256) public override defaultAirnodePrice;

    /// @notice The default price of an endpoint for a chain
    mapping(uint256 => uint256) public override defaultChainPrice;

    /// @notice The global default price of an endpoint
    uint256 public override defaultPrice;

    /// @notice A flag that indicates which price to default to in
    /// the getAirnodeEndpointFee function
    mapping(address => bool) public override airnodeEndpointFlag;

    /// @notice Prices will have upto 6 decimal places
    uint8 public constant DECIMALS = 6;

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

    /// @notice Called by an airnode flag and price setter to
    /// set the endpoint flag for an airnode
    /// @param _airnode The address of the airnode
    /// @param _status The airnode endpoint flag status
    function setAirnodeEndpointFlag(address _airnode, bool _status)
        external
        override
    {
        require(
            hasAirnodeFlagAndPriceSetterRole(msg.sender),
            "Not airnode flag and price setter"
        );
        require(_airnode != address(0), "Address is zero");
        airnodeEndpointFlag[_airnode] = _status;
        emit SetAirnodeEndpointFlag(_airnode, _status, msg.sender);
    }

    /// @notice Called by a global default price setter to set the
    /// default price in USD
    /// @param _price The price in USD
    function setDefaultPrice(uint256 _price) external override {
        require(
            hasGlobalDefaultPriceSetterRoleOrIsManager(msg.sender),
            "Not global default price setter"
        );
        require(_price != 0, "Price is zero");
        defaultPrice = _price * 10**DECIMALS;
        emit SetDefaultPrice(_price, msg.sender);
    }

    /// @notice Called by a global default price setter to set the
    /// default price on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _price The price in USD
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
        defaultChainPrice[_chainId] = _price * 10**DECIMALS;
        emit SetDefaultChainPrice(_chainId, _price, msg.sender);
    }

    /// @notice Called by an airnode flag and price setter to set the
    /// default price on an airnode across all chains in USD
    /// @param _airnode The address of the airnode
    /// @param _price The price in USD
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
        defaultAirnodePrice[_airnode] = _price * 10**DECIMALS;
        emit SetDefaultAirnodePrice(_airnode, _price, msg.sender);
    }

    /// @notice Called by an airnode flag and price setter to set the
    /// default price for an airnode on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _price The price in USD
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
        defaultChainAirnodePrice[_chainId][_airnode] = _price * 10**DECIMALS;
        emit SetDefaultChainAirnodePrice(
            _chainId,
            _airnode,
            _price,
            msg.sender
        );
    }

    /// @notice Called by an airnode flag and price setter to set the
    /// price of an endpoint for an airnode across all chains in USD
    /// @param _airnode The address of the airnode
    /// @param _endpointId The endpointId whose price is being set
    /// @param _price The price in USD
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
        airnodeToEndpointToPrice[_airnode][_endpointId] = _price * 10**DECIMALS;
        emit SetAirnodeEndpointPrice(_airnode, _endpointId, _price, msg.sender);
    }

    /// @notice Called by an airnode flag and price setter to set the price of an
    /// endpoint for an airnode on a chain in USD
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _endpointId The endpointId whose price is being set
    /// @param _price The price in USD
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
            10**DECIMALS;
        emit SetChainAirnodeEndpointPrice(
            _chainId,
            _airnode,
            _endpointId,
            _price,
            msg.sender
        );
    }

    /// @notice Called to get the price of an endpoint for an airnode on a chain in USD
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
