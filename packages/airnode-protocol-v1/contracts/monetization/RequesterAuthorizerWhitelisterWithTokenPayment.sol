// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RequesterAuthorizerWhitelisterWithToken.sol";
import "./interfaces/IRequesterAuthorizerWhitelisterWithTokenPayment.sol";
import "../authorizers/interfaces/IRequesterAuthorizer.sol";

/// @title RequesterAuthorizer whitelist setter contract that allows users to
/// pay the respective token to be whitelisted
contract RequesterAuthorizerWhitelisterWithTokenPayment is
    RequesterAuthorizerWhitelisterWithToken,
    IRequesterAuthorizerWhitelisterWithTokenPayment
{
    /// @notice Minimum whitelist extension
    uint64 public override minimumWhitelistExtension = 1 days;

    /// @notice Maximum whitelist duration
    uint64 public override maximumWhitelistDuration = 365 days;

    uint256 private constant PRICING_INTERVAL = 30 days;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeEndpointPriceRegistry AirnodeEndpointPriceRegistry
    /// contract address
    /// @param _requesterAuthorizerRegistry RequesterAuthorizerRegistry
    /// contract address
    /// @param _token Token contract address
    /// @param _tokenPrice Token price in USD (times 10^18)
    /// @param _priceCoefficient Price coefficient (has the same number of
    /// decimals as the token)
    /// @param _proceedsDestination Destination of proceeds
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeEndpointPriceRegistry,
        address _requesterAuthorizerRegistry,
        address _token,
        uint256 _tokenPrice,
        uint256 _priceCoefficient,
        address _proceedsDestination
    )
        RequesterAuthorizerWhitelisterWithToken(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager,
            _airnodeEndpointPriceRegistry,
            _requesterAuthorizerRegistry,
            _token,
            _tokenPrice,
            _priceCoefficient,
            _proceedsDestination
        )
    {
        require(
            IAirnodeEndpointPriceRegistry(airnodeEndpointPriceRegistry)
                .PRICING_INTERVAL() == PRICING_INTERVAL,
            "Pricing interval mismatch"
        );
    }

    /// @notice Called by the maintainers or the manager to set the minimum
    /// whitelist extension
    /// @param _minimumWhitelistExtension Minimum whitelist extension
    function setMinimumWhitelistExtension(uint64 _minimumWhitelistExtension)
        external
        override
        onlyMaintainerOrManager
    {
        require(
            _minimumWhitelistExtension <= maximumWhitelistDuration &&
                _minimumWhitelistExtension != 0,
            "Invalid minimum duration"
        );
        minimumWhitelistExtension = _minimumWhitelistExtension;
        emit SetMinimumWhitelistExtension(
            _minimumWhitelistExtension,
            msg.sender
        );
    }

    /// @notice Called by the maintainers or the manager to set the maximum
    /// whitelist duration
    /// @param _maximumWhitelistDuration Maximum whitelist duration
    function setMaximumWhitelistDuration(uint64 _maximumWhitelistDuration)
        external
        override
        onlyMaintainerOrManager
    {
        require(
            _maximumWhitelistDuration >= minimumWhitelistExtension,
            "Invalid maximum duration"
        );
        maximumWhitelistDuration = _maximumWhitelistDuration;
        emit SetMaximumWhitelistDuration(_maximumWhitelistDuration, msg.sender);
    }

    /// @notice Pays tokens to extend the whitelist expiration of the requester
    /// for the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param whitelistExtension Whitelist expiration
    function payTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        uint64 whitelistExtension
    )
        external
        override
        onlyActiveAirnode(airnode)
        onlyNonZeroChainId(chainId)
        onlyNonZeroRequester(requester)
        onlyNonBlockedRequester(airnode, requester)
    {
        require(
            whitelistExtension >= minimumWhitelistExtension,
            "Extension below minimum"
        );
        uint256 tokenPaymentAmount = getTokenPaymentAmount(
            airnode,
            chainId,
            endpointId,
            whitelistExtension
        );
        IRequesterAuthorizer requesterAuthorizer = IRequesterAuthorizer(
            getRequesterAuthorizerAddress(chainId)
        );
        (uint64 currentExpirationTimestamp, ) = requesterAuthorizer
            .airnodeToEndpointIdToRequesterToWhitelistStatus(
                airnode,
                endpointId,
                requester
            );
        uint64 newExpirationTimestamp = currentExpirationTimestamp >
            block.timestamp
            ? currentExpirationTimestamp + whitelistExtension
            : uint64(block.timestamp) + whitelistExtension;
        require(
            newExpirationTimestamp - block.timestamp <=
                maximumWhitelistDuration,
            "Exceeds maximum duration"
        );
        emit PaidTokens(
            airnode,
            chainId,
            endpointId,
            requester,
            whitelistExtension,
            msg.sender,
            newExpirationTimestamp
        );
        requesterAuthorizer.setWhitelistExpiration(
            airnode,
            endpointId,
            requester,
            newExpirationTimestamp
        );
        require(
            IERC20(token).transferFrom(
                msg.sender,
                proceedsDestination,
                tokenPaymentAmount
            ),
            "Transfer unsuccesful"
        );
    }

    /// @notice Resets the whitelist expiration of the blocked requester for
    /// the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    function resetWhitelistExpirationOfBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external override {
        require(
            requesterIsBlocked(airnode, requester),
            "Requester not blocked"
        );
        emit ResetWhitelistExpirationOfBlockedRequester(
            airnode,
            chainId,
            endpointId,
            requester,
            msg.sender
        );
        IRequesterAuthorizer(getRequesterAuthorizerAddress(chainId))
            .setWhitelistExpiration(airnode, endpointId, requester, 0);
    }

    /// @notice Amount of tokens needed to be paid to extend the whitelist
    /// expiration for the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param whitelistExtension Whitelist extension
    /// @return tokenPaymentAmount Token amount needed to be paid
    function getTokenPaymentAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint64 whitelistExtension
    ) public view override returns (uint256 tokenPaymentAmount) {
        tokenPaymentAmount =
            (getTokenAmount(airnode, chainId, endpointId) *
                whitelistExtension) /
            PRICING_INTERVAL;
    }
}
