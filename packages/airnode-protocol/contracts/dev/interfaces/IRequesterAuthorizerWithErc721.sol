// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../access-control-registry/interfaces/IAccessControlRegistryAdminned.sol";

interface IRequesterAuthorizerWithErc721 is
    IERC721Receiver,
    IAccessControlRegistryAdminned
{
    event SetWithdrawalLeadTime(
        address indexed airnode,
        uint32 withdrawalLeadTime,
        address sender
    );

    event SetRequesterBlockStatus(
        address indexed airnode,
        address indexed requester,
        uint256 chainId,
        bool status,
        address sender
    );

    event DepositedToken(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint256 tokenDepositCount
    );

    event UpdatedDepositRequesterFrom(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint256 tokenDepositCount
    );

    event UpdatedDepositRequesterTo(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint256 tokenDepositCount
    );

    event InitiatedTokenWithdrawal(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint32 earliestWithdrawalTime,
        uint256 tokenDepositCount
    );

    event WithdrewToken(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint256 tokenDepositCount
    );

    event RevokedToken(
        address indexed airnode,
        address indexed requester,
        address indexed depositor,
        uint256 chainId,
        address token,
        uint256 tokenId,
        uint256 tokenDepositCount
    );

    function setWithdrawalLeadTime(
        address airnode,
        uint32 withdrawalLeadTime
    ) external;

    function setRequesterBlockStatus(
        address airnode,
        uint256 chainId,
        address requester,
        bool status
    ) external;

    function updateDepositRequester(
        address airnode,
        uint256 chainIdPrevious,
        address requesterPrevious,
        uint256 chainIdNext,
        address requesterNext,
        address token
    ) external;

    function initiateTokenWithdrawal(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external returns (uint32 earliestWithdrawalTime);

    function withdrawToken(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external;

    function revokeToken(
        address airnode,
        uint256 chainId,
        address requester,
        address token,
        address depositor
    ) external;

    function airnodeToChainIdToRequesterToTokenToDepositorToDeposit(
        address airnode,
        uint256 chainId,
        address requester,
        address token,
        address depositor
    )
        external
        view
        returns (
            uint256 tokenId,
            uint32 withdrawalLeadTime,
            uint32 earliestWithdrawalTime
        );

    function isAuthorized(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external view returns (bool);

    function deriveWithdrawalLeadTimeSetterRole(
        address airnode
    ) external view returns (bytes32 withdrawalLeadTimeSetterRole);

    function deriveRequesterBlockerRole(
        address airnode
    ) external view returns (bytes32 requesterBlockerRole);

    // solhint-disable-next-line func-name-mixedcase
    function WITHDRAWAL_LEAD_TIME_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function REQUESTER_BLOCKER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function airnodeToChainIdToRequesterToTokenAddressToTokenDeposits(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external view returns (uint256 tokenDepositCount);

    function airnodeToWithdrawalLeadTime(
        address airnode
    ) external view returns (uint32 withdrawalLeadTime);

    function airnodeToChainIdToRequesterToBlockStatus(
        address airnode,
        uint256 chainId,
        address requester
    ) external view returns (bool isBlocked);
}
