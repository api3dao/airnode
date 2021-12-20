// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IWithdrawalUtils {
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

    function withdrawBalance() external;
}
