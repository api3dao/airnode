// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./TemplateStore.sol";
import "./interfaces/ISubscriptionStore.sol";

contract SubscriptionStore is TemplateStore, ISubscriptionStore {
    struct Subscription {
        address airnode;
        bytes32 templateId;
        bytes parameters;
        bytes conditions;
        address relayer;
        address sponsor;
        address requester;
        bytes4 fulfillFunctionId;
    }

    /// @notice Subscription with the ID
    mapping(bytes32 => Subscription) public override subscriptions;

    /// @notice Stores a subscription record
    /// @param templateId Template ID (allowed to be `bytes32(0)`)
    /// @param parameters Parameters provided by the subscription in addition
    /// to the parameters in the request template
    /// @param conditions Conditions under which the subscription is requested
    /// to be fulfilled
    /// @param relayer Relayer address
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @return subscriptionId Subscription ID
    function storeSubscription(
        address airnode,
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 subscriptionId) {
        require(airnode != address(0), "Airnode address zero");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(
            conditions.length <= MAXIMUM_PARAMETER_LENGTH,
            "Conditions too long"
        );
        require(relayer != address(0), "Relayer address zero");
        require(sponsor != address(0), "Sponsor address zero");
        require(requester != address(0), "Requester address zero");
        require(fulfillFunctionId != bytes4(0), "Fulfill function ID zero");
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                airnode,
                templateId,
                parameters,
                conditions,
                relayer,
                sponsor,
                requester,
                fulfillFunctionId
            )
        );
        subscriptions[subscriptionId] = Subscription({
            airnode: airnode,
            templateId: templateId,
            parameters: parameters,
            conditions: conditions,
            relayer: relayer,
            sponsor: sponsor,
            requester: requester,
            fulfillFunctionId: fulfillFunctionId
        });
        emit StoredSubscription(
            subscriptionId,
            airnode,
            templateId,
            parameters,
            conditions,
            relayer,
            sponsor,
            requester,
            fulfillFunctionId
        );
    }
}
