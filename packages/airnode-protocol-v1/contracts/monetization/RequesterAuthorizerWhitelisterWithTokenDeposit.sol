// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RequesterAuthorizerWhitelisterWithToken.sol";
import "./interfaces/IRequesterAuthorizerWhitelisterWithTokenDeposit.sol";
import "../authorizers/interfaces/IRequesterAuthorizer.sol";

/// @title RequesterAuthorizer indefinite whitelister contract that allows
/// users to deposit the respective token to be whitelisted
contract RequesterAuthorizerWhitelisterWithTokenDeposit is
    RequesterAuthorizerWhitelisterWithToken,
    IRequesterAuthorizerWhitelisterWithTokenDeposit
{
    struct TokenDeposits {
        mapping(address => uint256) depositorToAmount;
        uint256 count;
    }

    /// @notice Token deposits made for Airnode, chain, endpoint, requester
    mapping(address => mapping(uint256 => mapping(bytes32 => mapping(address => TokenDeposits))))
        private airnodeToChainIdToEndpointIdToRequesterToTokenDeposits;

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
    {}

    /// @notice Deposits tokens for the requester to be whitelisted for the
    /// Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    function depositTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    )
        external
        override
        onlyActiveAirnode(airnode)
        onlyNonZeroChainId(chainId)
        onlyNonZeroRequester(requester)
        onlyNonBlockedRequester(airnode, requester)
    {
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToEndpointIdToRequesterToTokenDeposits[
                airnode
            ][chainId][endpointId][requester];
        require(
            tokenDeposits.depositorToAmount[msg.sender] == 0,
            "Sender already deposited tokens"
        );
        uint256 tokenDepositAmount = getTokenAmount(
            airnode,
            chainId,
            endpointId
        );
        tokenDeposits.depositorToAmount[msg.sender] = tokenDepositAmount;
        uint256 tokenDepositsCount = ++tokenDeposits.count;
        emit DepositedTokens(
            airnode,
            chainId,
            endpointId,
            requester,
            msg.sender,
            tokenDepositsCount,
            tokenDepositAmount
        );
        if (tokenDepositsCount == 1) {
            IRequesterAuthorizer(getRequesterAuthorizerAddress(chainId))
                .setIndefiniteWhitelistStatus(
                    airnode,
                    endpointId,
                    requester,
                    true
                );
        }
        require(
            IERC20(token).transferFrom(
                msg.sender,
                address(this),
                tokenDepositAmount
            ),
            "Transfer unsuccesful"
        );
    }

    /// @notice Withdraws tokens previously deposited for the requester to be
    /// whitelisted for the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    function withdrawTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external override onlyNonBlockedRequester(airnode, requester) {
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToEndpointIdToRequesterToTokenDeposits[
                airnode
            ][chainId][endpointId][requester];
        uint256 tokenWithdrawAmount = tokenDeposits.depositorToAmount[
            msg.sender
        ];
        require(tokenWithdrawAmount != 0, "Sender has not deposited tokens");
        tokenDeposits.depositorToAmount[msg.sender] = 0;
        uint256 tokenDepositsCount = --tokenDeposits.count;
        emit WithdrewTokens(
            airnode,
            chainId,
            endpointId,
            requester,
            msg.sender,
            tokenDepositsCount,
            tokenWithdrawAmount
        );
        if (tokenDepositsCount == 0) {
            IRequesterAuthorizer(getRequesterAuthorizerAddress(chainId))
                .setIndefiniteWhitelistStatus(
                    airnode,
                    endpointId,
                    requester,
                    false
                );
        }
        assert(IERC20(token).transfer(msg.sender, tokenWithdrawAmount));
    }

    /// @notice Withdraws tokens previously deposited for the blocked requester
    /// to be whitelisted for the Airnode–endpoint pair on the chain by the
    /// depositor
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param depositor Depositor address
    function withdrawFundsDepositedForBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external override {
        require(
            requesterIsBlocked(airnode, requester),
            "Requester not blocked"
        );
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToEndpointIdToRequesterToTokenDeposits[
                airnode
            ][chainId][endpointId][requester];
        uint256 tokenWithdrawAmount = tokenDeposits.depositorToAmount[
            depositor
        ];
        require(tokenWithdrawAmount != 0, "Depositor has not deposited");
        tokenDeposits.depositorToAmount[depositor] = 0;
        uint256 tokenDepositsCount = --tokenDeposits.count;
        emit WithdrewTokensDepositedForBlockedRequester(
            airnode,
            chainId,
            endpointId,
            requester,
            depositor,
            tokenDepositsCount,
            tokenWithdrawAmount
        );
        if (tokenDepositsCount == 0) {
            IRequesterAuthorizer(getRequesterAuthorizerAddress(chainId))
                .setIndefiniteWhitelistStatus(
                    airnode,
                    endpointId,
                    requester,
                    false
                );
        }
        assert(
            IERC20(token).transfer(proceedsDestination, tokenWithdrawAmount)
        );
    }

    /// @notice Number of deposits made for the requester to be whitelisted for
    /// the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external view override returns (uint256) {
        return
            airnodeToChainIdToEndpointIdToRequesterToTokenDeposits[airnode][
                chainId
            ][endpointId][requester].count;
    }

    /// @notice Amount of tokens deposited by the depositor for the requester
    /// to be whitelisted for the Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester address
    /// @param depositor Depositor address
    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external view override returns (uint256) {
        return
            airnodeToChainIdToEndpointIdToRequesterToTokenDeposits[airnode][
                chainId
            ][endpointId][requester].depositorToAmount[depositor];
    }
}
