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

/// @title The contract used to pay with ERC20 in order to gain access to Airnodes
/// @notice In order for an Airnode provider to accept payments using this contract
/// it must fist grant the whitelistExpirationExtenderRole to this contract.
contract AirnodeTokenPayment is
    AirnodeTokenPaymentRolesWithManager,
    AirnodeRequesterAuthorizerRegistryClient,
    AirnodeFeeRegistryClient,
    IAirnodeTokenPayment
{
    /// @notice The default whitelisting duration in seconds (30 days)
    uint64 public constant DEFAULT_WHITELIST_DURATION = 30 days;

    /// @notice The address of the ERC20 token that is used to pay for the
    /// Airnode whitelisting
    address public immutable paymentTokenAddress;

    /// @notice The price of the ERC20 token in USD
    /// @dev The price is used to calculate the amount of tokens that are
    /// required to be paid and it is defaulted to 1 for stable coin tokens
    /// but if the token has a different price then an oracle must call
    /// setPaymentTokenPrice() in order to keep the price up to date
    uint256 public paymentTokenPrice = 1;

    /// @notice Mapping to store the whitelisting duration in seconds
    /// for an Airnode
    mapping(address => uint64) public airnodeToWhitelistDuration;

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
    /// @dev The price should be set with 18 decimal places
    /// @param _paymentTokenPrice Payment token price in USD
    function setPaymentTokenPrice(uint256 _paymentTokenPrice)
        external
        override
    {
        require(
            hasPaymentTokenPriceSetterRoleOrIsManager(msg.sender),
            "Not payment token price setter"
        );
        require(paymentTokenPrice != 0, "Invalid token price");
        paymentTokenPrice = _paymentTokenPrice;
        emit SetPaymentTokenPrice(_paymentTokenPrice, msg.sender);
    }

    /// @notice Called by an Airnode to whitelist duration setter to set the
    /// period of whitelisting for an Airnode
    /// @param _whitelistDuration Maximum whitelist duration in seconds
    function setAirnodeToWhitelistDuration(uint64 _whitelistDuration)
        external
        override
    {
        require(
            hasAirnodeToWhitelistDurationSetterRoleOrIsManager(msg.sender),
            "Not Airnode to whitelist duration setter"
        );
        require(_whitelistDuration != 0, "Invalid duration");
        airnodeToWhitelistDuration[msg.sender] = _whitelistDuration;
        emit SetAirnodeToWhitelistDuration(_whitelistDuration, msg.sender);
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
            "Not Airnode to payment destination setter"
        );
        airnodeToPaymentDestination[msg.sender] = _paymentDestination;
        emit SetAirnodeToPaymentDestination(_paymentDestination, msg.sender);
    }

    /// @notice Make payments to gain access to Airnode
    /// @dev In order for this function to be able to extend the whitelisting,
    /// the Airnode operator must first grant the whitelist expiration extender
    /// role to this contract, otherwise it will revert.
    /// chainId-airnode-endpoint-requester pair gets authorized for the
    /// duration specified. The amount to be paid is determined by the fee set
    /// in the AirnodeFeeRegistry contract and the token price.
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
        require(_chainId != 0, "Zero chainId");
        require(_airnode != address(0), "Zero address");
        require(_requesterAddress != address(0), "Zero address");
        require(_whitelistDuration != 0, "Zero whitelist duration");
        require(
            _whitelistDuration <= getWhitelistDuration(_airnode),
            "Invalid whitelist duration"
        );

        address requesterAuthorizerWithManager = IAirnodeRequesterAuthorizerRegistry(
                airnodeRequesterAuthorizerRegistry
            ).chainIdToRequesterAuthorizerWithManager(_chainId);
        require(
            requesterAuthorizerWithManager != address(0),
            "No requester authorizer set for chain"
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
            "Already whitelisted indefinently"
        );

        uint256 amount = getPaymentAmount(
            _chainId,
            _airnode,
            _endpointId,
            _whitelistDuration
        );

        IRequesterAuthorizerWithManager(requesterAuthorizerWithManager)
            .extendWhitelistExpiration(
                _airnode,
                _endpointId,
                _requesterAddress,
                expirationTimestamp + _whitelistDuration
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
            IERC20Metadata(paymentTokenAddress).symbol(),
            expirationTimestamp + _whitelistDuration
        );
    }

    /// @notice Returns the amount of tokens a sponsor has to transfer to the
    /// Airnode in order to be whitelisted for a given
    /// chainId-airnode-endpointId
    /// @dev AirnodeFeeRegistry should return the fee in usd using 18 decimals
    /// @param _chainId Id of the chain
    /// @param _airnode Airnode address
    /// @param _endpointId Id of the endpoint
    /// @param _whitelistDuration Duration in seconds for which the requester
    /// will be whitelisted
    function getPaymentAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint64 _whitelistDuration
    ) public view override returns (uint256 amount) {
        uint256 feeInUsd = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint24 feeInterval = IAirnodeFeeRegistry(airnodeFeeRegistry).INTERVAL();
        amount =
            (feeInUsd * _whitelistDuration) /
            (paymentTokenPrice * feeInterval);
    }

    /// @notice Gets the Airnode whitelist duration period in seconds
    /// @dev It defaults to DEFAULT_WHITELIST_DURATION if none was previously set
    /// @param _airnode Airnode address
    function getWhitelistDuration(address _airnode)
        private
        view
        returns (uint64)
    {
        return
            airnodeToWhitelistDuration[_airnode] != 0
                ? airnodeToWhitelistDuration[_airnode]
                : DEFAULT_WHITELIST_DURATION;
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
