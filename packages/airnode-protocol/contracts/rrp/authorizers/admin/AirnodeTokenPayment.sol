// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../../authorizers/interfaces/IRequesterAuthorizerWithManager.sol";
import "./AirnodeRequesterAuthorizerRegistryClient.sol";
import "./AirnodeFeeRegistryClient.sol";
import "./AirnodeTokenPaymentRolesWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IAirnodeRequesterAuthorizerRegistry.sol";
import "./interfaces/IAirnodeTokenPayment.sol";

/// @title The contract used to pay with ERC20 in order to get whitelisted to
/// be able to make requests to an Airnode
/// @notice In order for an Airnode provider to accept payments using this
/// contract it must first grant the whitelistExpirationExtenderRole to this
/// contract
contract AirnodeTokenPayment is
    AirnodeTokenPaymentRolesWithManager,
    AirnodeRequesterAuthorizerRegistryClient,
    AirnodeFeeRegistryClient,
    IAirnodeTokenPayment
{
    struct WhitelistDuration {
        uint64 maximum;
        uint64 minimum;
    }

    /// @notice The default maximum whitelisting duration in seconds (~5 years)
    uint64 public constant DEFAULT_MAXIMUM_WHITELIST_DURATION = 5 * 365 days;

    /// @notice The default minimum whitelisting duration in seconds (1 day)
    uint64 public constant DEFAULT_MINIMUM_WHITELIST_DURATION = 24 hours;

    /// @notice The address of the ERC20 token that is used to pay for the
    /// Airnode whitelisting
    address public immutable paymentTokenAddress;

    /// @notice The price of the ERC20 token in USD
    /// @dev The price is used to calculate the amount of tokens that are
    /// required to be paid and it is defaulted to 1e18 for stable coin tokens
    /// but if the token has a different price then an oracle must call
    /// setPaymentTokenPrice() in order to keep the price up to date
    uint256 public paymentTokenPrice = 1e18;

    /// @notice Mapping to store the maximum and minimum whitelisting duration
    /// in seconds for an Airnode
    mapping(address => WhitelistDuration) public airnodeToWhitelistDuration;

    /// @notice Mapping to store the default payment address for an Airnode
    mapping(address => address) public airnodeToPaymentDestination;

    /// @dev The manager address here is expected to belong to an
    /// AccessControlAgent contract that is owned by the DAO
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeRequesterAuthorizerRegistry AirnodeRequesterAuthorizerRegistry
    /// contract address
    /// @param _airnodeFeeRegistry AirnodeFeeRegistry contract address
    /// @param _paymentTokenAddress ERC20 token contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeRequesterAuthorizerRegistry,
        address _airnodeFeeRegistry,
        address _paymentTokenAddress
    )
        AirnodeTokenPaymentRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        AirnodeRequesterAuthorizerRegistryClient(
            _airnodeRequesterAuthorizerRegistry
        )
        AirnodeFeeRegistryClient(_airnodeFeeRegistry)
    {
        require(_paymentTokenAddress != address(0), "Zero address");
        paymentTokenAddress = _paymentTokenAddress;
    }

    /// @notice Called by a payment token price setter to set the payment
    /// token price. The caller most likely be an oracle with the role granted
    /// or the manager of the contract
    /// @dev The price should be set using 18 decimal places
    /// @param _paymentTokenPrice Payment token price in USD
    function setPaymentTokenPrice(uint256 _paymentTokenPrice)
        external
        override
    {
        require(
            hasPaymentTokenPriceSetterRoleOrIsManager(msg.sender),
            "Not payment token price setter"
        );
        require(_paymentTokenPrice != 0, "Invalid token price");
        paymentTokenPrice = _paymentTokenPrice;
        emit SetPaymentTokenPrice(_paymentTokenPrice, msg.sender);
    }

    /// @notice Called by an Airnode to whitelist duration setter to set the
    /// maximum and minimum whitelisting duration for an Airnode
    /// @dev Custom maximum and minimun whitelist duration for an Airnode can
    /// be resetted by calling this function with '0' for both arguments. Also
    /// the Airnode operator can set them with the same values to only allow
    /// the payment of a single duration period
    /// @param _maximumWhitelistDuration Maximum whitelist duration in seconds
    /// @param _minimumWhitelistDuration Minimum whitelist duration in seconds
    function setAirnodeToWhitelistDuration(
        uint64 _maximumWhitelistDuration,
        uint64 _minimumWhitelistDuration
    ) external override {
        require(
            hasAirnodeToWhitelistDurationSetterRoleOrIsManager(msg.sender),
            "Not whitelist duration setter"
        );
        if (_maximumWhitelistDuration != 0 || _minimumWhitelistDuration != 0) {
            require(
                _maximumWhitelistDuration >= _minimumWhitelistDuration,
                "Invalid duration"
            );
            require(
                _maximumWhitelistDuration >=
                    DEFAULT_MINIMUM_WHITELIST_DURATION &&
                    _maximumWhitelistDuration <=
                    DEFAULT_MAXIMUM_WHITELIST_DURATION,
                "Invalid duration"
            );
            require(
                _minimumWhitelistDuration >=
                    DEFAULT_MINIMUM_WHITELIST_DURATION &&
                    _minimumWhitelistDuration <=
                    DEFAULT_MAXIMUM_WHITELIST_DURATION,
                "Invalid duration"
            );
        }
        airnodeToWhitelistDuration[msg.sender] = WhitelistDuration(
            _maximumWhitelistDuration,
            _minimumWhitelistDuration
        );
        emit SetAirnodeToWhitelistDuration(
            _maximumWhitelistDuration,
            _minimumWhitelistDuration,
            msg.sender
        );
    }

    /// @notice Called by an Airnode to payment destination setter to set the
    /// address to which payments will be transferred
    /// @param _paymentDestination Payment destination address
    function setAirnodeToPaymentDestination(address _paymentDestination)
        external
        override
    {
        require(
            hasAirnodeToPaymentDestinationSetterRoleOrIsManager(msg.sender),
            "Not payment destination setter"
        );
        require(
            _paymentDestination != address(0),
            "Invalid destination address"
        );
        airnodeToPaymentDestination[msg.sender] = _paymentDestination;
        emit SetAirnodeToPaymentDestination(_paymentDestination, msg.sender);
    }

    /// @notice Caller makes payments to whitelist a requester for making
    /// requests to an endpoint by an Airnode on a specific chain
    /// @dev In order for this function to be able to extend the whitelisting,
    /// the Airnode operator must first grant the whitelist expiration extender
    /// role to this contract, otherwise it will revert.
    /// Requester gets authorized for the specified duration on a specific
    /// chainId-airnode-endpointId. The amount to be paid is determined by the
    /// fee set in the AirnodeFeeRegistry contract and the token price.
    /// @param _chainId Id of the chain
    /// @param _airnode Airnode address
    /// @param _endpointId Id of the endpoint
    /// @param _requesterAddress Requester address
    /// @param _whitelistDuration Duration in seconds for which the requester
    /// will be whitelisted
    function makePayment(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        uint64 _whitelistDuration
    ) external override {
        require(_chainId != 0, "Invalid chainId");
        require(_airnode != address(0), "Invalid Airnode address");
        require(_requesterAddress != address(0), "Invalid requester address");
        require(
            _whitelistDuration != 0 &&
                _whitelistDuration <= getMaximumWhitelistDuration(_airnode) &&
                _whitelistDuration >= getMinimumWhitelistDuration(_airnode),
            "Invalid whitelist duration"
        );

        address requesterAuthorizerWithManager = IAirnodeRequesterAuthorizerRegistry(
                airnodeRequesterAuthorizerRegistry
            ).chainIdToRequesterAuthorizerWithManager(_chainId);
        require(
            requesterAuthorizerWithManager != address(0),
            "No requester authorizer set"
        );

        (
            uint64 expirationTimestamp,
            uint192 indefiniteWhitelistCount
        ) = IRequesterAuthorizerWithManager(requesterAuthorizerWithManager)
                .airnodeToEndpointIdToRequesterToWhitelistStatus(
                    _airnode,
                    _endpointId,
                    _requesterAddress
                );
        require(
            indefiniteWhitelistCount == 0,
            "Already whitelisted indefinitely"
        );

        uint256 amount = getPaymentAmount(
            _chainId,
            _airnode,
            _endpointId,
            _whitelistDuration
        );

        uint64 newExpirationTimestamp = expirationTimestamp >
            uint64(block.timestamp)
            ? expirationTimestamp + _whitelistDuration
            : uint64(block.timestamp) + _whitelistDuration;
        IRequesterAuthorizerWithManager(requesterAuthorizerWithManager)
            .extendWhitelistExpiration(
                _airnode,
                _endpointId,
                _requesterAddress,
                newExpirationTimestamp
            );

        assert(
            IERC20Metadata(paymentTokenAddress).transferFrom(
                msg.sender,
                getAirnodeToPaymentDestination(_airnode),
                amount
            )
        );

        emit MadePayment(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            getAirnodeToPaymentDestination(_airnode),
            amount,
            paymentTokenAddress,
            newExpirationTimestamp
        );
    }

    /// @notice Returns the amount of tokens a requester has to transfer to the
    /// Airnode in order to be whitelisted for a given
    /// chainId-airnode-endpointId
    /// @dev AirnodeFeeRegistry should return the fee in usd using 18 decimals
    /// and the token price should also be set using 18 decimals places
    /// @param _chainId Id of the chain
    /// @param _airnode Airnode address
    /// @param _endpointId Id of the endpoint
    /// @param _whitelistDuration Duration in seconds for which the requester
    /// will be whitelisted
    /// @return amount Amount of tokens to be transferred to the Airnode
    function getPaymentAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint64 _whitelistDuration
    ) public view override returns (uint256 amount) {
        uint8 tokenDecimals = IERC20Metadata(paymentTokenAddress).decimals();
        uint256 feeInUsd = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint24 feeDecimals = IAirnodeFeeRegistry(airnodeFeeRegistry).DECIMALS();
        uint24 feeInterval = IAirnodeFeeRegistry(airnodeFeeRegistry).INTERVAL();
        amount =
            (1e18 * ((10**tokenDecimals) * feeInUsd * _whitelistDuration)) /
            ((10**feeDecimals) * paymentTokenPrice * feeInterval);
    }

    /// @notice Gets the Airnode maximum whitelist duration period in seconds
    /// @dev It defaults to DEFAULT_MAXIMUM_WHITELIST_DURATION if no value was
    /// previously set
    /// @param _airnode Airnode address
    function getMaximumWhitelistDuration(address _airnode)
        private
        view
        returns (uint64 maximumWhitelistDuration)
    {
        WhitelistDuration
            storage whitelistDuration = airnodeToWhitelistDuration[_airnode];
        maximumWhitelistDuration = whitelistDuration.maximum != 0
            ? whitelistDuration.maximum
            : DEFAULT_MAXIMUM_WHITELIST_DURATION;
    }

    /// @notice Gets the Airnode minimum whitelist duration period in seconds
    /// @dev It defaults to DEFAULT_MINIMUM_WHITELIST_DURATION if no value was
    /// previously set
    /// @param _airnode Airnode address
    function getMinimumWhitelistDuration(address _airnode)
        private
        view
        returns (uint64 minimumWhitelistDuration)
    {
        WhitelistDuration
            storage whitelistDuration = airnodeToWhitelistDuration[_airnode];
        minimumWhitelistDuration = whitelistDuration.minimum != 0
            ? whitelistDuration.minimum
            : DEFAULT_MINIMUM_WHITELIST_DURATION;
    }

    /// @notice Gets the Airnode payment destination address
    /// @dev It defaults to the Airnode address if none was previously set
    /// @param _airnode Airnode address
    function getAirnodeToPaymentDestination(address _airnode)
        private
        view
        returns (address)
    {
        return
            airnodeToPaymentDestination[_airnode] != address(0)
                ? airnodeToPaymentDestination[_airnode]
                : _airnode;
    }
}
