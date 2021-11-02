// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../authorizers/interfaces/IRequesterAuthorizerWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IERC20Extended.sol";
import "./interfaces/IAirnodeTokenPayment.sol";

/// @title The contract used to pay with ERC20 in order to gain access to Airnodes
/// @notice In order for an Airnode provider to accept payments using this contract
/// it must fist grant the whitelistExpirationExtenderRole to this contract.
contract AirnodeTokenPayment is IAirnodeTokenPayment {
    string private constant ERROR_ZERO_CHAINID = "Zero chainId";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_INVALID_DURATION = "Invalid duration";
    string private constant ERROR_INVALID_TOKEN_PRICE = "Invalid token price";

    /// @notice Address of AirnodeFeeRegistry
    address public airnodeAuthorizerRegistry;

    /// @notice Address of AirnodeFeeRegistry
    address public airnodeFeeRegistry;

    /// @notice The address of the ERC20 token that is used to pay for the
    /// Airnode whitelisting
    address public immutable paymentTokenAddress;

    /// @notice The price of the ERC20 token in USD
    /// @dev The price is used to calculate the amount of tokens that are
    /// required to be paid and it is defaulted to 1 for stable coin tokens
    /// but if the token has a different price then an oracle must call
    /// `setPaymentTokenPrice()` in order to keep the price up to date
    uint256 public paymentTokenPrice = 1;

    /// @notice The maximum whitelisting duration in seconds
    uint256 public maximumWhitelistDuration = 30 days;

    /// @notice Mapping to store the default payment address for an airnode
    mapping(address => address) public airnodeToPaymentDestination;

    constructor(
        address _airnodeAuthorizerRegistry,
        address _airnodeFeeRegistry,
        address _paymentTokenAddress,
        uint256 _maximumWhitelistDuration
    ) {
        require(_airnodeAuthorizerRegistry != address(0), ERROR_ZERO_ADDRESS);
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        require(_paymentTokenAddress != address(0), ERROR_ZERO_ADDRESS);
        require(maximumWhitelistDuration != 0, ERROR_INVALID_DURATION);
        airnodeAuthorizerRegistry = _airnodeAuthorizerRegistry;
        airnodeFeeRegistry = _airnodeFeeRegistry;
        paymentTokenAddress = _paymentTokenAddress;
        maximumWhitelistDuration = _maximumWhitelistDuration;
    }

    /// @notice Called by an airnode authorizer registry setter to set the
    /// address of the AirnodeAuthorizerRegistry contract
    /// @param _airnodeAuthorizerRegistry The address of the
    /// AirnodeAuthorizerRegistry contract
    function setAirnodeAuthorizerRegistry(address _airnodeAuthorizerRegistry)
        external
        override
    {
        // require(
        //     hasAirnodeAuthorizerRegistrySetterRoleOrIsManager(msg.sender),
        //     "Not airnode authorizer registry setter"
        // );
        require(_airnodeAuthorizerRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeAuthorizerRegistry = _airnodeAuthorizerRegistry;
        emit SetAirnodeAuthorizerRegistry(
            _airnodeAuthorizerRegistry,
            msg.sender
        );
    }

    /// @notice Called by an airnode fee registry setter to set the address of
    /// the AirnodeAuthorizerRegistry contract
    /// @param _airnodeFeeRegistry The address of the AirnodeFeeRegistry
    /// contract
    function setAirnodeFeeRegistry(address _airnodeFeeRegistry)
        external
        override
    {
        // require(
        //     hasAirnodeAuthorizerRegistrySetterRoleOrIsManager(msg.sender),
        //     "Not airnode fee registry setter"
        // );
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeFeeRegistry = _airnodeFeeRegistry;
        emit SetAirnodeFeeRegistry(_airnodeFeeRegistry, msg.sender);
    }

    /// @notice Called by a payment token price setter to set the payment
    /// token price. The caller most likely be an oracle
    /// @dev The price should be set with 18 decimal places
    /// @param _paymentTokenPrice The price of the token in USD
    function setPaymentTokenPrice(uint256 _paymentTokenPrice)
        external
        override
    {
        // require(
        //     hasPaymentTokenPriceSetterRoleOrIsManager(msg.sender),
        //     "Not payment token price setter"
        // );
        require(paymentTokenPrice != 0, ERROR_INVALID_TOKEN_PRICE);
        paymentTokenPrice = _paymentTokenPrice;
        emit SetPaymentTokenPrice(_paymentTokenPrice, msg.sender);
    }

    /// @notice Called by a maximum whitelist duration setter to set the
    /// maximum allowed period of whitelisting for an airnode
    /// @param _maximumWhitelistDuration The maximum whitelist duration in seconds
    function setMaximumWhitelistDuration(uint256 _maximumWhitelistDuration)
        external
        override
    {
        // require(
        //     hasMaximumWhitelistDurationSetterRoleOrIsManager(msg.sender),
        //     "Not maximum whitelist duration setter"
        // );
        require(maximumWhitelistDuration != 0, ERROR_INVALID_DURATION);
        maximumWhitelistDuration = _maximumWhitelistDuration;
        emit SetMaximumWhitelistDuration(_maximumWhitelistDuration, msg.sender);
    }

    /// @notice Called by an airnode to payment destination setter to set the
    /// address to which payments will be transferred
    /// @param _paymentDestination The address of the payment destination
    function setAirnodeToPaymentDestination(address _paymentDestination)
        external
        override
    {
        // require(
        //     hasAirnodeToPaymentDestinationSetterRoleOrIsManager(msg.sender),
        //     "Not airnode to payment destination setter"
        // );
        airnodeToPaymentDestination[msg.sender] = _paymentDestination;
        emit SetAirnodeToPaymentDestination(msg.sender, _paymentDestination);
    }

    /// @notice Make payments to gain access to Airnode only if the sender has
    /// the whitelist expiration extender role.
    /// @dev chainId-airnode-endpoint-requester pair gets authorized for the
    /// duration specified. The amount to be paid is determined by the fee set
    /// in the AirnodeFeeRegistry contract and the token price
    /// @param _token The address of the ERC20 token contract
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _endpointId The id of the endpoint
    /// @param _requesterAddress The address of the requester for which tokens are being locked
    /// @param _whitelistDuration The duration in seconds for which the requester will be whitelisted
    function makePayment(
        address _token,
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        uint256 _whitelistDuration
    ) external override {
        // require(
        //     hasWhitelistExpirationExtenderRoleOrIsManager(msg.sender),
        //     "Not whitelist expiration extender"
        // );
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
        require(
            _whitelistDuration <= maximumWhitelistDuration,
            "Exceed maximum whitelisting"
        );

        // (
        //     uint64 expirationTimestamp,
        //     uint192 indefiniteWhitelistCount
        // ) = IRequesterAuthorizerWithManager(
        //         airnodeAuthorizerRegistry.getAuthorizerAddress(_chainId)
        //     ).airnodeToEndpointIdToRequesterToWhitelistStatus(
        //             _airnode,
        //             _endpointId,
        //             _requesterAddress
        //         );

        // require(
        //     indefiniteWhitelistCount == 0,
        //     "Requester already indefinently whitelisted"
        // );
        // require(
        //     _whitelistDuration + expirationTimestamp <= maximumWhitelistDuration,
        //     "Exceed maximum whitelisting"
        // );

        uint256 amount = getTokenPaymentAmount(
            _token,
            _chainId,
            _airnode,
            _endpointId,
            _whitelistDuration
        );

        require(
            IERC20Extended(_token).balanceOf(msg.sender) >= amount,
            ERROR_INSUFFICIENT_AMOUNT
        );

        // IRequesterAuthorizerWithManager(
        //     airnodeAuthorizerRegistry.getAuthorizerAddress(_chainId)
        // ).extendWhitelistExpiration(
        //         _airnode,
        //         _endpointId,
        //         _requesterAddress,
        //         _whitelistDuration + expirationTimestamp
        //     );

        assert(
            IERC20Extended(_token).transferFrom(
                msg.sender,
                airnodeToPaymentDestination[_airnode],
                amount
            )
        );

        emit MadePayment(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            airnodeToPaymentDestination[_airnode],
            amount,
            _whitelistDuration //+ expirationTimestamp
        );
    }

    /// @notice Returns the amount of tokens a sponsor has to transfer to the
    /// airnode in order to be whitelisted for a given
    /// chainId-airnode-endpointId
    /// @param _token The address of the ERC20 token contract
    /// @param _chainId The id of the chain
    /// @param _airnode The address of the airnode
    /// @param _endpointId The id of the endpoint
    /// @param _whitelistDuration The duration in seconds for which the requester will be whitelisted
    function getTokenPaymentAmount(
        address _token,
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint256 _whitelistDuration
    ) public view override returns (uint256 amount) {
        uint256 feeInUsd = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint8 feeDecimals = IAirnodeFeeRegistry(airnodeFeeRegistry).decimals();
        uint16 feeInterval = IAirnodeFeeRegistry(airnodeFeeRegistry).interval();
        uint8 tokenDecimals = IERC20Extended(_token).decimals();
        amount =
            ((10**tokenDecimals) * feeInUsd * _whitelistDuration) /
            ((10**feeDecimals) * paymentTokenPrice * feeInterval);
    }
}
