// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../../authorizers/interfaces/IRequesterAuthorizerWithManager.sol";
import "./AirnodeTokenPaymentRolesWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IAirnodeTokenPayment.sol";

/// @title The contract used to pay with ERC20 in order to gain access to Airnodes
/// @notice In order for an Airnode provider to accept payments using this contract
/// it must fist grant the whitelistExpirationExtenderRole to this contract.
contract AirnodeTokenPayment is
    AirnodeTokenPaymentRolesWithManager,
    IAirnodeTokenPayment
{
    string private constant ERROR_ZERO_ADDRESS = "Zero address";

    /// @notice The default maximum whitelisting duration in seconds (30 days)
    uint256 public constant DEFAULT_MAXIMUM_WHITELIST_DURATION = 30 days;

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

    /// @notice Mapping to store the maximum whitelisting duration in seconds
    /// for an Airnode
    mapping(address => uint256) public airnodeToMaximumWhitelistDuration;

    /// @notice Mapping to store the default payment address for an Airnode
    mapping(address => address) public airnodeToPaymentDestination;

    /// @dev The manager address here is expected to belong to an
    /// AccessControlAgent contract that is owned by the DAO
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeAuthorizerRegistry AirnodeAuthorizerRegistry contract
    /// address
    /// @param _airnodeFeeRegistry AirnodeFeeRegistry contract address
    /// @param _paymentTokenAddress ERC20 token contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeAuthorizerRegistry,
        address _airnodeFeeRegistry,
        address _paymentTokenAddress
    )
        AirnodeTokenPaymentRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {
        require(_airnodeAuthorizerRegistry != address(0), ERROR_ZERO_ADDRESS);
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        require(_paymentTokenAddress != address(0), ERROR_ZERO_ADDRESS);
        airnodeAuthorizerRegistry = _airnodeAuthorizerRegistry;
        airnodeFeeRegistry = _airnodeFeeRegistry;
        paymentTokenAddress = _paymentTokenAddress;
    }

    /// @notice Called by an Airnode authorizer registry setter to set the
    /// address of the AirnodeAuthorizerRegistry contract
    /// @param _airnodeAuthorizerRegistry AirnodeAuthorizerRegistry contract
    /// address
    function setAirnodeAuthorizerRegistry(address _airnodeAuthorizerRegistry)
        external
        override
    {
        require(
            hasAirnodeAuthorizerRegistrySetterRoleOrIsManager(msg.sender),
            "Not airnode authorizer registry setter"
        );
        require(_airnodeAuthorizerRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeAuthorizerRegistry = _airnodeAuthorizerRegistry;
        emit SetAirnodeAuthorizerRegistry(
            _airnodeAuthorizerRegistry,
            msg.sender
        );
    }

    /// @notice Called by an Airnode fee registry setter to set the address of
    /// the AirnodeFeeRegistry contract
    /// @param _airnodeFeeRegistry AirnodeFeeRegistry contract address
    function setAirnodeFeeRegistry(address _airnodeFeeRegistry)
        external
        override
    {
        require(
            hasAirnodeFeeRegistrySetterRoleOrIsManager(msg.sender),
            "Not Airnode fee registry setter"
        );
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeFeeRegistry = _airnodeFeeRegistry;
        emit SetAirnodeFeeRegistry(_airnodeFeeRegistry, msg.sender);
    }

    /// @notice Called by a payment token price setter to set the payment
    /// token price. The caller most likely be an oracle
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

    /// @notice Called by an Airnode to maximum whitelist duration setter to
    /// set the maximum allowed period of whitelisting for an Airnode
    /// @param _maximumWhitelistDuration Maximum whitelist duration in seconds
    function setAirnodeToMaximumWhitelistDuration(
        uint256 _maximumWhitelistDuration
    ) external override {
        require(
            hasAirnodeToMaximumWhitelistDurationSetterRoleOrIsManager(
                msg.sender
            ),
            "Not Airnode to maximum whitelist duration setter"
        );
        require(_maximumWhitelistDuration != 0, "Invalid duration");
        airnodeToMaximumWhitelistDuration[
            msg.sender
        ] = _maximumWhitelistDuration;
        emit SetAirnodeToMaximumWhitelistDuration(
            _maximumWhitelistDuration,
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
        uint256 _whitelistDuration
    ) external override {
        require(_chainId != 0, "Zero chainId");
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);

        uint256 maximumWhitelistDuration = airnodeToMaximumWhitelistDuration[
            _airnode
        ] != 0
            ? airnodeToMaximumWhitelistDuration[_airnode]
            : DEFAULT_MAXIMUM_WHITELIST_DURATION;

        // This check might be redundant since we are checking it after fetching whitelist status
        // require(
        //     _whitelistDuration <= maximumWhitelistDuration,
        //     "Exceed maximum whitelisting"
        // );

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

        uint256 amount = getPaymentAmount(
            _chainId,
            _airnode,
            _endpointId,
            _whitelistDuration
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
            IERC20Metadata(paymentTokenAddress).transferFrom(
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
            IERC20Metadata(paymentTokenAddress).symbol(),
            _whitelistDuration //+ expirationTimestamp
        );
    }

    /// @notice Returns the amount of tokens a sponsor has to transfer to the
    /// Airnode in order to be whitelisted for a given
    /// chainId-airnode-endpointId
    /// @param _chainId Id of the chain
    /// @param _airnode Airnode address
    /// @param _endpointId Id of the endpoint
    /// @param _whitelistDuration Duration in seconds for which the requester
    /// will be whitelisted
    function getPaymentAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint256 _whitelistDuration
    ) public view override returns (uint256 amount) {
        uint256 feeInUsd = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint8 feeDecimals = IAirnodeFeeRegistry(airnodeFeeRegistry).decimals();
        uint16 feeInterval = IAirnodeFeeRegistry(airnodeFeeRegistry).interval();
        uint8 tokenDecimals = IERC20Metadata(paymentTokenAddress).decimals();
        amount =
            ((10**tokenDecimals) * feeInUsd * _whitelistDuration) /
            ((10**feeDecimals) * paymentTokenPrice * feeInterval);
    }
}
