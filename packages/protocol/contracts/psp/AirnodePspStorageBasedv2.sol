// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

contract AirnodePspStorageBasedv2 {
    struct Subscription {
        bytes32 templateId;
        address conditionAddress;
        bytes4 conditionFunctionId;
        address fulfillAddress;
        bytes4 fulfillFunctionId;
        bytes parameters;
    }

    mapping(bytes32 => Subscription) public subscriptions;

    mapping(address => mapping(address => bytes32[]))
        public sponsorWalletToSubscriberToSubscriptionIds;

    // Similar to RRP template creation
    function createSubscription(
        bytes32 templateId,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        subscriptionId = keccak256(
            abi.encodePacked(
                templateId,
                conditionAddress,
                conditionFunctionId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        subscriptions[subscriptionId] = Subscription({
            templateId: templateId,
            conditionAddress: conditionAddress,
            conditionFunctionId: conditionFunctionId,
            fulfillAddress: fulfillAddress,
            fulfillFunctionId: fulfillFunctionId,
            parameters: parameters
        });
    }

    // Airnode only checks subscriptions from a specific subscriber for each
    // sponsor wallet. An unauthorized subscriber can call this function for
    // any sponsor wallet, but the Airnode will not be querying subscriptions
    // with their address so it won't have any effect.
    function subscribe(
        address sponsorWallet,
        bytes32[] calldata subscriptionIds
    ) external {
        sponsorWalletToSubscriberToSubscriptionIds[sponsorWallet][
            msg.sender
        ] = subscriptionIds;
    }

    // Airnode first calls this to see which sponsorWallet-subscriber pairs it
    // needs to process (if length==0, that pair can be skipped)
    function getSubscriptionCounts(
        address[] calldata sponsorWallets,
        address[] calldata subscribers
    ) external returns (uint256[] memory subscriptionCounts) {
        require(
            sponsorWallets.length == subscribers.length,
            "Parameter lengths not equal"
        );
        subscriptionCounts = new uint256[](sponsorWallets.length);
        for (uint256 ind = 0; ind < sponsorWallets.length; ind++) {
            subscriptionCounts[
                ind
            ] = sponsorWalletToSubscriberToSubscriptionIds[sponsorWallets[ind]][
                subscribers[ind]
            ].length;
        }
    }

    // After the Airnode calls getSubscriptionCounts() and decides that a sponsor wallet-subscriber
    // pair needs to be served (i.e., there is at least one subscription active), it calls
    // this function for each pair to get further details
    function getSubscriptions(address sponsorWallet, address subscriber)
        external
        returns (
            bytes32[] memory templateIds,
            address[] memory conditionAddresses,
            bytes4[] memory conditionFunctionIds,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes[] memory parameters
        )
    {
        bytes32[]
            storage subscriptionIds = sponsorWalletToSubscriberToSubscriptionIds[
                sponsorWallet
            ][subscriber];
        templateIds = new bytes32[](subscriptionIds.length);
        conditionAddresses = new address[](subscriptionIds.length);
        conditionFunctionIds = new bytes4[](subscriptionIds.length);
        fulfillAddresses = new address[](subscriptionIds.length);
        fulfillFunctionIds = new bytes4[](subscriptionIds.length);
        parameters = new bytes[](subscriptionIds.length);
        for (uint256 ind = 0; ind < subscriptionIds.length; ind++) {
            templateIds[ind] = subscriptions[subscriptionIds[ind]].templateId;
            conditionAddresses[ind] = subscriptions[subscriptionIds[ind]]
                .conditionAddress;
            conditionFunctionIds[ind] = subscriptions[subscriptionIds[ind]]
                .conditionFunctionId;
            fulfillAddresses[ind] = subscriptions[subscriptionIds[ind]]
                .fulfillAddress;
            fulfillFunctionIds[ind] = subscriptions[subscriptionIds[ind]]
                .fulfillFunctionId;
            parameters[ind] = subscriptions[subscriptionIds[ind]].parameters;
        }
    }

    // We're also sending the subscriptionId to the condition function in case it
    // wants to use it (?)
    function checkConditions(
        bytes32[] calldata subscriptionIds, // solhint-disable-line no-unused-vars
        bytes[] calldata data
    ) external returns (bool[] memory isSatisfied) {
        require(
            subscriptionIds.length == data.length,
            "Parameter lengths not equal"
        );
        isSatisfied = new bool[](subscriptionIds.length);
        for (uint256 ind = 0; ind < subscriptionIds.length; ind++) {
            (bool callSuccess, bytes memory callData) = subscriptions[
                subscriptionIds[ind]
            ].conditionAddress.call( // solhint-disable-line avoid-low-level-calls
                abi.encodeWithSelector(
                    subscriptions[subscriptionIds[ind]].conditionFunctionId,
                    subscriptionIds[ind],
                    data[ind]
                )
            );
            // Condition check must not revert
            require(callSuccess, "Condition check failed");
            // The condition function is expected to return a bool
            isSatisfied[ind] = abi.decode(callData, (bool));
        }
    }

    // The target contract should check for the subscription ID and the caller
    // (sponsor wallet) address
    function fulfill(bytes32[] calldata subscriptionIds, bytes[] calldata data)
        external
    {
        require(
            subscriptionIds.length == data.length,
            "Parameter lengths not equal"
        );
        for (uint256 ind = 0; ind < subscriptionIds.length; ind++) {
            // This may re-enter
            (bool callSuccess, ) = subscriptions[subscriptionIds[ind]]
                .fulfillAddress
                .call( // solhint-disable-line avoid-low-level-calls
                abi.encodeWithSelector(
                    subscriptions[subscriptionIds[ind]].fulfillFunctionId,
                    subscriptionIds[ind],
                    msg.sender,
                    data[ind]
                )
            );
            // Fulfillment must not revert
            require(callSuccess, "Fulfillment failed");
        }
    }
}
