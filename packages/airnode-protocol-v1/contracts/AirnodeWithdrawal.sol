// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeWithdrawal.sol";

/// @title Contract that implements logic for withdrawals from sponsor wallets
/// @notice This contract is used by sponsors to request withdrawals from
/// sponsor wallets controlled by reporters and reporters to fulfill these
/// requests
/// @dev Withdrawals are implemented in the form of pull payments. The sponsor
/// requests a withdrawal from a sponsor wallet, and the reporter uses the
/// specified sponsor wallet to deposit the entire balance at this contract.
/// Then, the sponsor claims/pulls the payment from this contract.
/// We are referring to the reporter and not the Airnode because although an
/// Airnode operator may choose to report their own fulfillments
/// (`airnode == reporter`), requesters can also request other parties to
/// report fulfillments that are signed by a particular Airnode
/// (`airnode != reporter`). Since it is the reporter that is making the
/// fulfillment transaction, the reporter will be controlling the respective
/// sponsor wallet and will have to fulfill any withdrawal requests.
/// Sponsor wallet addresses are derived using the extended public key of the
/// reporter, the protocol ID and the sponsor address. The sponsor specifies
/// the sponsor wallet address and the protocol ID while requesting a
/// withdrawal, and the node must verify the consistency of this information
/// before fulfilling the request.
/// Different protocols (RRP, PSP, etc.) use different sponsor wallets for a
/// particular reporter–sponsor pair, which is why sponsor wallet derivation
/// includes a protocol ID. Refer to the documentation of the particular node
/// implementation for what these protocol IDs are.
contract AirnodeWithdrawal is IAirnodeWithdrawal {
    /// @notice Sponsor balance that is withdrawn but not claimed yet
    mapping(address => uint256) public override sponsorToBalance;

    /// @notice Withdrawal request count of the sponsor
    /// @dev This can be used to calculate the ID of the next withdrawal
    /// request the sponsor will make
    mapping(address => uint256) public override sponsorToWithdrawalRequestCount;

    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Called by a sponsor to create a request for the reporter to
    /// send the funds kept in the respective sponsor wallet to this contract
    /// where it can be claimed by the sponsor
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node-side because all of the
    /// parameters are used during fulfillment and will get validated on-chain.
    /// The first withdrawal request a sponsor will make will cost slightly
    /// higher gas than the rest due to how the request counter is implemented.
    /// @param reporter Reporter address
    /// @param protocolId Protocol ID of the sponsor wallet
    /// @param sponsorWallet Address of the sponsor wallet that the withdrawal
    /// is requested from
    function requestWithdrawal(
        address reporter,
        uint256 protocolId,
        address sponsorWallet
    ) external override {
        require(reporter != address(0), "Reporter address zero");
        require(protocolId != 0, "Protocol ID zero");
        require(sponsorWallet != address(0), "Sponsor wallet address zero");
        bytes32 withdrawalRequestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                ++sponsorToWithdrawalRequestCount[msg.sender]
            )
        );
        withdrawalRequestIdToParameters[withdrawalRequestId] = keccak256(
            abi.encodePacked(reporter, msg.sender, protocolId, sponsorWallet)
        );
        emit RequestedWithdrawal(
            reporter,
            msg.sender,
            withdrawalRequestId,
            protocolId,
            sponsorWallet
        );
    }

    /// @notice Called by the reporter using the sponsor wallet to fulfill the
    /// withdrawal request made by the sponsor
    /// @param withdrawalRequestId Withdrawal request ID
    /// @param reporter Reporter address
    /// @param sponsor Sponsor address
    /// @param protocolId Protocol ID of the sponsor wallet
    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address reporter,
        address sponsor,
        uint256 protocolId
    ) external payable override {
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] ==
                keccak256(
                    abi.encodePacked(reporter, sponsor, protocolId, msg.sender)
                ),
            "Invalid withdrawal fulfillment"
        );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        sponsorToBalance[sponsor] += msg.value;
        emit FulfilledWithdrawal(
            reporter,
            sponsor,
            withdrawalRequestId,
            protocolId,
            msg.sender,
            msg.value
        );
    }

    /// @notice Called by the sponsor to claim the withdrawn funds
    function claimBalance() external override {
        uint256 sponsorBalance = sponsorToBalance[msg.sender];
        require(sponsorBalance != 0, "Sender balance zero");
        sponsorToBalance[msg.sender] = 0;
        emit ExecutedWithdrawal(msg.sender, sponsorBalance);
        (bool success, ) = msg.sender.call{value: sponsorBalance}(""); // solhint-disable-line avoid-low-level-calls
        require(success, "Transfer failed");
    }

    /// @notice Returns if the withdrawal request with the ID is made but not
    /// fulfilled yet
    /// @param requestId Request ID
    /// @return isAwaitingFulfillment If the request is awaiting fulfillment
    function withdrawalRequestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        override
        returns (bool isAwaitingFulfillment)
    {
        isAwaitingFulfillment =
            withdrawalRequestIdToParameters[requestId] != bytes32(0);
    }
}
