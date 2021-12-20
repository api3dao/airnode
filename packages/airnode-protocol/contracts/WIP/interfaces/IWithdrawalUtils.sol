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
}
