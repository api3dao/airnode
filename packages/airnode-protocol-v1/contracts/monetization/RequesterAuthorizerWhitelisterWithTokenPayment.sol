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
    uint64 public override minimumWhitelistExtension = 1 days;

    uint64 public override maximumWhitelistDuration = 365 days;

    uint256 private constant PRICING_INTERVAL = 30 days;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeEndpointFeeRegistry AirnodeFeeRegistry contract address
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
        address _airnodeEndpointFeeRegistry,
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
            _airnodeEndpointFeeRegistry,
            _requesterAuthorizerRegistry,
            _token,
            _tokenPrice,
            _priceCoefficient,
            _proceedsDestination
        )
    {
        require(
            IAirnodeEndpointFeeRegistry(airnodeEndpointFeeRegistry)
                .PRICING_INTERVAL() == PRICING_INTERVAL,
            "Pricing interval mismatch"
        );
    }

    function setMinimumWhitelistDuration(uint64 _minimumWhitelistExtension)
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
        emit SetMinimumWhitelistDuration(
            _minimumWhitelistExtension,
            msg.sender
        );
    }

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
        require(
            IERC20(token).transferFrom(
                msg.sender,
                proceedsDestination,
                tokenPaymentAmount
            ),
            "Transfer unsuccesful"
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
            "Exceeded maximum duration"
        );
        requesterAuthorizer.setWhitelistExpiration(
            airnode,
            endpointId,
            requester,
            newExpirationTimestamp
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
    }

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
        IRequesterAuthorizer(getRequesterAuthorizerAddress(chainId))
            .setWhitelistExpiration(airnode, endpointId, requester, 0);
        emit ResetWhitelistExpirationOfBlockedRequester(
            airnode,
            chainId,
            endpointId,
            requester,
            msg.sender
        );
    }

    function getTokenPaymentAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        uint64 whitelistDuration
    ) public view override returns (uint256 tokenPaymentAmount) {
        tokenPaymentAmount =
            (getTokenAmount(airnode, chainId, endpointId) * whitelistDuration) /
            PRICING_INTERVAL;
    }
}
