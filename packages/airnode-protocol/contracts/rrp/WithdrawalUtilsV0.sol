// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IWithdrawalUtilsV0.sol";

/// @title Contract that implements logic for withdrawals from sponsor wallets
contract WithdrawalUtilsV0 is IWithdrawalUtilsV0 {
    /// @notice Called to get the withdrawal request count of the sponsor
    /// @dev Can be used to calculate the ID of the next withdrawal request the
    /// sponsor will make
    mapping(address => uint256) public override sponsorToWithdrawalRequestCount;

    /// @dev Hash of expected fulfillment parameters are kept to verify that
    /// the fulfillment will be done with the correct parameters
    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Called by a sponsor to create a request for the Airnode to send
    /// the funds kept in the respective sponsor wallet to the sponsor
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node-side because all of the
    /// parameters are used during fulfillment and will get validated on-chain.
    /// The first withdrawal request a sponsor will make will cost slightly
    /// higher gas than the rest due to how the request counter is implemented.
    /// @param airnode Airnode address
    /// @param sponsorWallet Sponsor wallet that the withdrawal is requested
    /// from
    function requestWithdrawal(address airnode, address sponsorWallet)
        external
        override
    {
        bytes32 withdrawalRequestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                ++sponsorToWithdrawalRequestCount[msg.sender]
            )
        );
        withdrawalRequestIdToParameters[withdrawalRequestId] = keccak256(
            abi.encodePacked(airnode, msg.sender, sponsorWallet)
        );
        emit RequestedWithdrawal(
            airnode,
            msg.sender,
            withdrawalRequestId,
            sponsorWallet
        );
    }

    /// @notice Called by the Airnode using the sponsor wallet to fulfill the
    /// withdrawal request made by the sponsor
    /// @dev The Airnode sends the funds to the sponsor through this method
    /// to emit an event that indicates that the withdrawal request has been
    /// fulfilled
    /// @param withdrawalRequestId Withdrawal request ID
    /// @param airnode Airnode address
    /// @param sponsor Sponsor address
    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address airnode,
        address sponsor
    ) external payable override {
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] ==
                keccak256(abi.encodePacked(airnode, sponsor, msg.sender)),
            "Invalid withdrawal fulfillment"
        );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        emit FulfilledWithdrawal(
            airnode,
            sponsor,
            withdrawalRequestId,
            msg.sender,
            msg.value
        );
        (bool success, ) = sponsor.call{value: msg.value}(""); // solhint-disable-line avoid-low-level-calls
        require(success, "Transfer failed");
    }
}
