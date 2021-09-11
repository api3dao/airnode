// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

// The logic implemented here is an example
// The main idea is that an Airnode will be able to support a limited number
// of active subscriptions at a time, so the authorizer should be developed
// in a way to regulate that.
// Note that since the authorizer calls are now in the loop (and they have to be because
// unlike in RRP, validating the subscriptions at the node-end is not feasible both with
// the log-based and storage based implementations), we can't have a protocol
// contract on a chain and its authorizers on Ethereum. In this case, the entire protocol
// contract would have to live on Ethereum, i.e., you would need to make a transaction on
// Ethereum mainnet to subscribe to a service on another chain.
contract PspAuthorizer {
    mapping(address => mapping(address => uint256))
        public airnodeToSponsorToQuota;

    // Note that `isAuthorized()` can no longer have `view` visibility.
    // Do we need `conditionAddress`, `conditionFunctionId`, `fulfillAddress`, `fulfillFunctionId`?
    function isAuthorized(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        address airnode,
        bytes32 templateId, // solhint-disable-line no-unused-vars
        address sponsor,
        address subscriber // solhint-disable-line no-unused-vars
    ) external returns (bool) {
        if (airnodeToSponsorToQuota[airnode][sponsor] == 0) {
            return false;
        }
        airnodeToSponsorToQuota[airnode][sponsor]--;
        return true;
    }

    // This should probably be callable by admin addresses too.
    // For example, the sponsor makes payment to a contract, which calls this
    // contract to increment their quota (i.e., they bought a slot).
    function setQuota(address sponsor, uint256 quota) external {
        airnodeToSponsorToQuota[msg.sender][sponsor] = quota;
    }
}
