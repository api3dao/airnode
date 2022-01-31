// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IWithdrawalUtils.sol";

/// @title Contract that implements logic for withdrawals from sponsor wallets
/// @notice This contract is used by sponsors to request withdrawals from
/// sponsor wallets controlled by relayers and relayers to fulfill these
/// requests
/// @dev Withdrawals are implemented in the form of pull payments. The sponsor
/// requests a withdrawal from a sponsor wallet, and the relayer uses the
/// specified sponsor wallet to deposit the entire balance at this contract.
/// Then, the sponsor claims/pulls the payment from this contract.
/// We are referring to the relayer and not the Airnode because although an
/// Airnode operator may choose to relay their own fulfillments
/// (`airnode == relayer`), requesters can also request other parties to
/// relay fulfillments that are signed by a particular Airnode
/// (`airnode != relayer`). Since it is the relayer that is making the
/// fulfillment transaction, the relayer will be controlling the respective
/// sponsor wallet and will have to fulfill any withdrawal requests.
/// Sponsor wallet addresses are derived using the extended public key of the
/// relayer, the protocol ID and the sponsor address. The sponsor specifies
/// the sponsor wallet address and the protocol ID while requesting a
/// withdrawal, and the node must verify the consistency of this information
/// before fulfilling the request.
/// Different protocols (RRP, PSP, etc.) use different sponsor wallets for a
/// particular relayer–sponsor pair, which is why sponsor wallet derivation
/// includes a protocol ID. Refer to the documentation of the particular node
/// implementation for what these protocol IDs are.
contract WithdrawalUtils is IWithdrawalUtils {
    using ECDSA for bytes32;

    /// @notice Sponsor balance that is withdrawn but not claimed yet
    mapping(address => uint256) public override sponsorToBalance;

    /// @notice Withdrawal request count of the sponsor
    /// @dev This can be used to calculate the ID of the next withdrawal
    /// request the sponsor will make
    mapping(address => uint256) public override sponsorToWithdrawalRequestCount;

    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Called by a sponsor to create a request for the relayer to
    /// send the funds kept in the respective sponsor wallet to this contract
    /// where it can be claimed by the sponsor
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node-side because all of the
    /// parameters are used during fulfillment and will get validated on-chain.
    /// The first withdrawal request a sponsor will make will cost slightly
    /// higher gas than the rest due to how the request counter is implemented.
    /// @param airnodeOrRelayer Relayer address
    /// @param protocolId Protocol ID of the sponsor wallet
    function requestWithdrawal(address airnodeOrRelayer, uint256 protocolId)
        external
        override
    {
        require(airnodeOrRelayer != address(0), "Airnode/relayer address zero");
        require(protocolId != 0, "Protocol ID zero");
        bytes32 withdrawalRequestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                ++sponsorToWithdrawalRequestCount[msg.sender]
            )
        );
        withdrawalRequestIdToParameters[withdrawalRequestId] = keccak256(
            abi.encodePacked(airnodeOrRelayer, protocolId, msg.sender)
        );
        emit RequestedWithdrawal(
            airnodeOrRelayer,
            msg.sender,
            withdrawalRequestId,
            protocolId
        );
    }

    /// @notice Called by the relayer using the sponsor wallet to fulfill the
    /// withdrawal request made by the sponsor
    /// @param withdrawalRequestId Withdrawal request ID
    /// @param airnodeOrRelayer Relayer address
    /// @param protocolId Protocol ID of the sponsor wallet
    /// @param sponsor Sponsor address
    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address airnodeOrRelayer,
        uint256 protocolId,
        address sponsor,
        uint256 timestamp,
        bytes calldata signature
    ) external payable override {
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] ==
                keccak256(
                    abi.encodePacked(airnodeOrRelayer, protocolId, sponsor)
                ),
            "Invalid withdrawal fulfillment"
        );
        require(
            timestamp + 1 hours > block.timestamp &&
                timestamp < block.timestamp + 15 minutes,
            "Timestamp not valid"
        );
        require(
            (
                keccak256(
                    abi.encodePacked(withdrawalRequestId, timestamp, msg.sender)
                ).toEthSignedMessageHash()
            ).recover(signature) == airnodeOrRelayer,
            "Signature mismatch"
        );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        sponsorToBalance[sponsor] += msg.value;
        emit FulfilledWithdrawal(
            airnodeOrRelayer,
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
        emit ClaimedBalance(msg.sender, sponsorBalance);
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
