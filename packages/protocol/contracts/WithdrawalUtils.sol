// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IWithdrawalUtils.sol";

/// @title Contract that implements logic for withdrawals from sponsor wallets
contract WithdrawalUtils is IWithdrawalUtils {
    /// @notice Called to get the withdrawal request count of the sponsor
    /// @dev Could be used to predict the ID of the next withdrawal request the
    /// sponsor will make
    mapping(address => uint256) public override sponsorToWithdrawalRequestCount;

    /// @dev Hash of expected fulfillment parameters are kept to verify that
    /// the fulfillment will be done with the correct parameters
    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Called by a sponsor to create a request for the Airnode to send
    /// the funds kept in the respective sponsor wallet to the destination
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node-side because all of the
    /// parameters are used during fulfillment and will get validated on-chain
    /// @param airnode Airnode address
    /// @param sponsorWallet Sponsor wallet
    /// @param destination Withdrawal destination
    function requestWithdrawal(
        address airnode,
        address sponsorWallet,
        address destination
    ) external override {
        bytes32 withdrawalRequestId = keccak256(
            abi.encodePacked(
                ++sponsorToWithdrawalRequestCount[msg.sender],
                block.chainid,
                msg.sender
            )
        );
        withdrawalRequestIdToParameters[withdrawalRequestId] = keccak256(
            abi.encodePacked(airnode, msg.sender, sponsorWallet, destination)
        );
        emit RequestedWithdrawal(
            airnode,
            msg.sender,
            withdrawalRequestId,
            sponsorWallet,
            destination
        );
    }

    /// @notice Called by the Airnode using the sponsor wallet to fulfill the
    /// withdrawal request made by the sponsor
    /// @dev The Airnode sends the funds through this method to emit an event
    /// that indicates that the withdrawal request has been fulfilled
    /// @param airnode Airnode address
    /// @param sponsor Sponsor address
    /// @param destination Withdrawal destination
    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address airnode,
        address sponsor,
        address destination
    ) external payable override {
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] ==
                keccak256(
                    abi.encodePacked(airnode, sponsor, msg.sender, destination)
                ),
            "Invalid withdrawal fulfillment"
        );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        emit FulfilledWithdrawal(
            airnode,
            sponsor,
            withdrawalRequestId,
            msg.sender,
            destination,
            msg.value
        );
        (bool success, ) = destination.call{value: msg.value}(""); // solhint-disable-line avoid-low-level-calls
        require(success, "Transfer failed");
    }
}
