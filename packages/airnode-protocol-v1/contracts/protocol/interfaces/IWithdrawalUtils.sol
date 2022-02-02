// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IWithdrawalUtils {
    event RequestedWithdrawal(
        address indexed airnodeOrRelayer,
        address indexed sponsor,
        bytes32 indexed withdrawalRequestId,
        uint256 protocolId
    );

    event FulfilledWithdrawal(
        address indexed airnodeOrRelayer,
        address indexed sponsor,
        bytes32 indexed withdrawalRequestId,
        uint256 protocolId,
        address sponsorWallet,
        uint256 amount
    );

    event ClaimedBalance(address indexed sponsor, uint256 amount);

    function requestWithdrawal(address airnodeOrRelayer, uint256 protocolId)
        external;

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address airnodeOrRelayer,
        uint256 protocolId,
        address sponsor,
        uint256 timestamp,
        bytes calldata signature
    ) external payable;

    function claimBalance() external;

    function withdrawalRequestIsAwaitingFulfillment(bytes32 withdrawalRequestId)
        external
        view
        returns (bool);

    function sponsorToBalance(address sponsor) external view returns (uint256);

    function sponsorToWithdrawalRequestCount(address sponsor)
        external
        view
        returns (uint256);
}
