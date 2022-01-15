// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodePspV1.sol";
import "./interfaces/IAirnodePspRelayedV1.sol";

/// @title Airnode publish–subscribe protocol (PSP), relayed
/// @notice Differently from PSP, relayed PSP allows the requester to specify
/// an Airnode that will sign the fulfillment in the subscription and a relayer
/// that will report the signed fulfillment in the respective Allocator
/// contract.
contract AirnodePspRelayedV1 is AirnodePspV1, IAirnodePspRelayedV1 {
    using ECDSA for bytes32;

    /// @notice Called by the relayer to fulfill the subscription
    /// @dev In relayed PSP, the relayer gets its active subscriptions from the
    /// Allocator contracts it uses, gets Airnode to sign responses for them,
    /// and sends the fulfillment transaction.
    /// @param subscriptionId Subscription ID
    /// @param relayer Relayer address
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Subscription ID, a timestamp, the relayer address,
    /// the sponsor wallet address and the fulfillment data signed by the
    /// Airnode address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillSubscriptionRelayed(
        bytes32 subscriptionId,
        address relayer,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        address airnode = templates[subscription.templateId].airnode;
        require(airnode != address(0), "Subscription does not exist");
        require(
            (
                keccak256(
                    abi.encodePacked(
                        subscriptionId,
                        timestamp,
                        relayer,
                        msg.sender,
                        data
                    )
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        address requester = subscription.requester;
        address sponsor = subscription.sponsor;
        require(
            requester == sponsor ||
                sponsorToRequesterToSponsorshipStatus[sponsor][requester],
            "Requester not sponsored"
        );
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(
                subscription.fulfillFunctionId,
                subscriptionId,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledSubscriptionRelayed(
                relayer,
                subscriptionId,
                airnode,
                timestamp,
                data
            );
        }
    }
}
