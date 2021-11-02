// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../authorizers/interfaces/IRequesterAuthorizerWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IERC20Extended.sol";
import "./interfaces/IAirnodeStablecoinPayment.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
/// @notice In order for an Airnode provider to accept payments using this contract
///         it must fist grant the whitelistExpirationExtenderRole to this contract.
contract AirnodeStablecoinPayment is IAirnodeStablecoinPayment {
    string private constant ERROR_ZERO_CHAINID = "Zero chainId";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_NOT_AIRNODE = "Not airnode";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";

    /// @notice Address of AirnodeFeeRegistry
    address public airnodeFeeRegistry;

    /// @notice The maximum whitelisting duration in seconds
    uint64 public maximumWhitelistingDuration;

    /// @notice Mapping to store the default payment address for an airnode
    mapping(address => address) public airnodePaymentAddress;

    /// @notice mapping used to store all the RequesterAuthorizerWithManager
    /// addresses for different chains
    mapping(uint256 => address) public chainIdToRequesterAuthorizerWithManager;

    constructor(address _airnodeFeeRegistry) {
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeFeeRegistry = _airnodeFeeRegistry;
    }

    /// @notice Called by a registry setter to set the address
    /// of the AirnodeFeeRegistry contract
    /// @param _airnodeFeeRegistry The address of the AirnodeFeeRegistry contract
    function setAirnodeFeeRegistry(address _airnodeFeeRegistry)
        external
        override
    {
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeFeeRegistry = _airnodeFeeRegistry;
        emit SetAirnodeFeeRegistry(_airnodeFeeRegistry, msg.sender);
    }

    /// @notice Called by a requesterAuthorizerWithManager setter to set the address of
    /// RequesterAuthorizerWithManager for different chains
    /// @param _chainId The chainId
    /// @param _requesterAuthorizerWithManager The address of the RequesterAuthorizerWithManager on the chainId
    function setRequesterAuthorizerWithManager(
        uint256 _chainId,
        address _requesterAuthorizerWithManager
    ) external override {
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(
            _requesterAuthorizerWithManager != address(0),
            ERROR_ZERO_ADDRESS
        );
        chainIdToRequesterAuthorizerWithManager[
            _chainId
        ] = _requesterAuthorizerWithManager;
        emit SetRequesterAuthorizerWithManager(
            _chainId,
            _requesterAuthorizerWithManager,
            msg.sender
        );
    }

    /// @notice Called by the airnode to set the address to which
    /// requester payments will be transferred
    /// @param _airnode the address of the airnode
    /// @param _paymentAddress The address to which payments will be transferred
    function setAirnodePaymentAddress(address _airnode, address _paymentAddress)
        external
        override
    {
        require(msg.sender == _airnode, ERROR_NOT_AIRNODE);
        airnodePaymentAddress[_airnode] = _paymentAddress;
        emit SetAirnodePaymentAddress(_airnode, _paymentAddress);
    }

    /// @notice Make payments to gain access to Airnode.
    /// @dev chainId-airnode-endpoint-requester pair gets authorized for the time duration specified
    /// @notice The amount to be paid is determined by the fee set in the AirnodeFeeRegistry Contract
    /// @param _stablecoin The address of the stablecoin token contract
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being locked
    function makePayment(
        address _stablecoin,
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        uint64 _days
    ) external override {
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
        require(
            _days * 1 days <= maximumWhitelistingDuration,
            "Exceed maximum whitelisting"
        );

        (
            uint64 expirationTimestamp,
            uint192 indefiniteWhitelistCount
        ) = IRequesterAuthorizerWithManager(
                chainIdToRequesterAuthorizerWithManager[_chainId]
            ).airnodeToEndpointIdToRequesterToWhitelistStatus(
                    _airnode,
                    _endpointId,
                    _requesterAddress
                );

        require(
            indefiniteWhitelistCount == 0,
            "Requester already indefinently whitelisted"
        );
        require(
            _days * 1 days + expirationTimestamp <= maximumWhitelistingDuration,
            "Exceed maximum whitelisting"
        );

        uint256 paymentAmount = getPaymentAmount(
            _stablecoin,
            _chainId,
            _airnode,
            _endpointId,
            _days
        );

        require(
            IERC20Extended(_stablecoin).balanceOf(msg.sender) >= paymentAmount,
            ERROR_INSUFFICIENT_AMOUNT
        );

        IRequesterAuthorizerWithManager(
            chainIdToRequesterAuthorizerWithManager[_chainId]
        ).setWhitelistExpiration(
                _airnode,
                _endpointId,
                _requesterAddress,
                _days * 1 days + expirationTimestamp
            );

        assert(
            IERC20Extended(_stablecoin).transferFrom(
                msg.sender,
                airnodePaymentAddress[_airnode],
                paymentAmount
            )
        );

        emit MadePayment(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            airnodePaymentAddress[_airnode],
            paymentAmount,
            _days * 1 days + expirationTimestamp
        );
    }

    /// @notice Returns the transfer amount a sponsor has to
    /// transfer for a given chainId-airnode-endpointId
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    function getPaymentAmount(
        address _stablecoin,
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        uint64 _days
    ) public view override returns (uint256 paymentAmount) {
        uint256 endpointFee = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint8 endpointFeeDecimals = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .decimals();
        uint16 endpointInterval = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .interval();
        uint8 erc20Decimals = IERC20Extended(_stablecoin).decimals();
        paymentAmount =
            ((10**erc20Decimals) * endpointFee * _days) /
            ((10**endpointFeeDecimals) * endpointInterval);
    }
}
