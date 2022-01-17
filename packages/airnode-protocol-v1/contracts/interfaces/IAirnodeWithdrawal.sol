// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeWithdrawal {
    event RequestedWithdrawal(
        address indexed reporter,
        address indexed sponsor,
        bytes32 indexed withdrawalRequestId,
        uint256 protocolId,
        address sponsorWallet
    );

    event FulfilledWithdrawal(
        address indexed reporter,
        address indexed sponsor,
        bytes32 indexed withdrawalRequestId,
        uint256 protocolId,
        address sponsorWallet,
        uint256 amount
    );

    event ExecutedWithdrawal(address indexed sponsor, uint256 amount);

    function requestWithdrawal(
        address reporter,
        uint256 protocolId,
        address sponsorWallet
    ) external;

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address reporter,
        address sponsor,
        uint256 protocolId
    ) external payable;

    function claimBalance() external;

    function withdrawalRequestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool isAwaitingFulfillment);

    function sponsorToBalance(address sponsor) external view returns (uint256);

    function sponsorToWithdrawalRequestCount(address sponsor)
        external
        view
        returns (uint256);
}
