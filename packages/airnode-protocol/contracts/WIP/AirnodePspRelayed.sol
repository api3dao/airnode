// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodePsp.sol";
import "./interfaces/IAirnodePspRelayed.sol";

contract AirnodePspRelayed is AirnodePsp, IAirnodePspRelayed {
    using ECDSA for bytes32;

    function fulfillSubscriptionRelayed(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        address airnode = templates[subscription.templateId].airnode;
        require(airnode != address(0), "Subscription does not exist");
        address requester = subscription.requester;
        require(
            requester == subscription.sponsor ||
                sponsorToRequesterToSponsorshipStatus[subscription.sponsor][
                    requester
                ],
            "Requester not sponsored"
        );
        require(
            (
                keccak256(
                    abi.encodePacked(
                        subscriptionId,
                        msg.sender,
                        timestamp,
                        data
                    )
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSignature(
                "fulfillPspRelayed(bytes32,uint256,bytes)",
                subscriptionId,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledSubscriptionRelayed(
                airnode,
                subscriptionId,
                timestamp,
                data
            );
        }
    }
}
