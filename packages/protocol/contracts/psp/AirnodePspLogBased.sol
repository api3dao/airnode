// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AirnodePsp.sol";
import "./interfaces/IPspAuthorizer.sol";

// ~~~ Log-based PSP ~~~
// + Cheaper to use, subscriptions don't write to storage
// - There is no unsubscribe because subscription logs will always be returned,
// which means they will pile up. As a solution, Airnode can only fetch logs from
// the last X blocks, which means this doesn't support indefinite subscriptions,
// which is not nice (it's not set and forget).
// - `getLogs()` is sometimes poorly supported by some chains and blockchain providers.
contract AirnodePspLogBased is AirnodePsp {
    event MadeTemplateSubscription(
        address indexed airnode,
        bytes32 indexed subscriptionId,
        uint256 subscriberSubscriptionCount,
        uint256 chainId,
        bytes32 templateId,
        address sponsor,
        address sponsorWallet,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    // `sponsorWallet` is not required to be specified, but it's good practice to
    // let the Airnode validate that it matches the `sponsor`. Otherwise, the
    // subscriber implementation can make a fake subscription and authorize an
    // arbitrary address to call `fulfill()` and the fact that this address is not
    // actually the sponsor wallet would require off-chain analysis.
    function subscribe(
        address airnode,
        bytes32 templateId,
        address sponsor,
        address sponsorWallet,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        require(
            sponsorToSubscriberToSponsorshipStatus[sponsor][msg.sender],
            "Subscriber not sponsored"
        );
        uint256 subscriberSubscriptionCount = subscriberToSubscriptionCountPlusOne[
                msg.sender
            ];
        // Validating `conditionAddress` and `conditionFunctionId` is redundant because
        // the blockchain provider can spoof the result of the static call made to it.
        // The condition should be checked on-chain in the fulfillment function to
        // protect against these being tampered with.
        subscriptionId = keccak256(
            abi.encodePacked(
                airnode,
                subscriberSubscriptionCount,
                block.chainid,
                templateId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        emit MadeTemplateSubscription(
            airnode,
            subscriptionId,
            subscriberSubscriptionCount,
            block.chainid,
            templateId,
            sponsor,
            sponsorWallet,
            conditionAddress,
            conditionFunctionId,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        subscriberToSubscriptionCountPlusOne[msg.sender]++;
        // This is a call to a non-trusted authorizer contract.
        // Would it be extra undesirable to loop through an array of non-trusted
        // authorizer contracts like RRP here?
        IPspAuthorizer(airnodeToAuthorizer[airnode]).isAuthorized(
            subscriptionId,
            airnode,
            templateId,
            sponsor,
            msg.sender
        );
    }
}
