// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IWithdrawalUtils.sol";

/// @title Contract that can be used by sponsors to request withdrawals from
/// sponsor wallets and Airnodes/relayers to fulfill these
/// @notice The respective Airnode/relayer may not support withdrawals for the
/// specified protocol, or at all. Similarly, an Airnode/relayer may deposit
/// funds directly to the sponsor address without being prompted, e.g., because
/// they are ceasing operations. In general, no guarantee is provided for the
/// funds deposited to sponsor wallets at the protocol level. Therefore, the
/// sponsors should limit their deposits to the minimum amount required for
/// their operations, and assume they will not receive these funds back.
/// @dev Withdrawals are implemented in the form of pull payments. The sponsor
/// requests a withdrawal from a sponsor wallet, and the Airnode/relayer uses
/// the specified sponsor wallet to deposit the entire balance at this
/// contract. Then, the sponsor claims/pulls the payment from this contract.
/// Different protocols (RRP, PSP, etc.) use different sponsor wallets for a
/// particular Airnode/relayer–sponsor pair, which is why sponsor wallet
/// derivation includes a protocol ID. Refer to the node documentation for what
/// these protocol IDs are.
contract WithdrawalUtils is IWithdrawalUtils {
    using ECDSA for bytes32;

    /// @notice Sponsor balance that is withdrawn but not claimed
    mapping(address => uint256) public override sponsorToBalance;

    /// @notice Number of withdrawal requests the sponsor made
    /// @dev This can be used to calculate the ID of the next withdrawal
    /// request the sponsor will make
    mapping(address => uint256) public override sponsorToWithdrawalRequestCount;

    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Called by a sponsor to request a withdrawal
    /// @param airnodeOrRelayer Airnode/relayer address
    /// @param protocolId Protocol ID
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

    /// @notice Called by the Airnode/relayer using the sponsor wallet to
    /// fulfill the withdrawal request made by the sponsor
    /// @param withdrawalRequestId Withdrawal request ID
    /// @param airnodeOrRelayer Airnode/relayer address
    /// @param protocolId Protocol ID
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
    /// @dev The sponsor must be able to receive funds. For example, if the
    /// sponsor is a contract without a default `payable` function, this will
    /// revert.
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
    /// @param withdrawalRequestId Withdrawal request ID
    /// @return isAwaitingFulfillment If the withdrawal request is awaiting
    /// fulfillment
    function withdrawalRequestIsAwaitingFulfillment(bytes32 withdrawalRequestId)
        external
        view
        override
        returns (bool)
    {
        return
            withdrawalRequestIdToParameters[withdrawalRequestId] != bytes32(0);
    }
}
