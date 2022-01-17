// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminnedWithManager.sol";
import "./IAirnodeEndpointFeeRegistryReader.sol";
import "./IRequesterAuthorizerRegistryReader.sol";

interface IRequesterAuthorizerWhitelisterWithTokenDeposit is
    IAccessControlRegistryAdminnedWithManager,
    IAirnodeEndpointFeeRegistryReader,
    IRequesterAuthorizerRegistryReader
{
    enum AirnodeStatus {
        Inactive,
        Active,
        OptedOut
    }

    event SetTokenPrice(uint256 tokenPrice, address sender);

    event SetPriceCoefficient(uint256 priceCoefficient, address sender);

    event SetAirnodeActivity(address airnode, bool active, address sender);

    event OptedOut(address airnode);

    event OptedIn(address airnode);

    event SetBlockedWithdrawalDestination(address blockedWithdrawalDestination);

    event DepositedTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender,
        uint256 tokenDepositsCount,
        uint256 tokenDepositAmount
    );

    event WithdrewTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender,
        uint256 tokenDepositsCount,
        uint256 tokenWithdrawAmount
    );

    event BlockedRequester(address requester, address sender);

    event BlockedRequesterForAirnode(
        address airnode,
        address requester,
        address sender
    );

    event WithdrewFundsDepositedForBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address sender,
        uint256 tokenDepositsCount,
        uint256 tokenWithdrawAmount
    );

    function setTokenPrice(uint256 _tokenPrice) external;

    function setPriceCoefficient(uint256 _priceCoefficient) external;

    function setAirnodeActivity(address airnode, bool active) external;

    function optOut() external;

    function optIn() external;

    function setBlockedWithdrawalDestination(
        address _blockedWithdrawalDestination
    ) external;

    function depositTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external;

    function withdrawTokens(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external;

    function blockRequester(address requester) external;

    function blockRequesterForAirnode(address airnode, address requester)
        external;

    function withdrawFundsDepositedForBlockedRequester(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external;

    function getDepositAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view returns (uint256 amount);

    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester
    ) external view returns (uint256);

    function airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId,
        address requester,
        address depositor
    ) external view returns (uint256);

    function token() external view returns (address);

    function tokenPrice() external view returns (uint256);

    function priceCoefficient() external view returns (uint256);

    function blockedWithdrawalDestination() external view returns (address);

    function airnodeToStatus(address airnode)
        external
        view
        returns (AirnodeStatus);

    function requesterToBlockStatus(address requester)
        external
        view
        returns (bool);

    function airnodeToRequesterToBlockStatus(address airnode, address requester)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function MAINTAINER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function maintainerRole() external view returns (bytes32);

    // solhint-disable-next-line func-name-mixedcase
    function BLOCKER_ROLE_DESCRIPTION() external view returns (string memory);

    function blockerRole() external view returns (bytes32);
}
