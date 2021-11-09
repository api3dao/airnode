// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

// condition() and fulfill() doesn't have to be in the same contract
contract ExampleConditionAndFulfillContract {
    uint256 public constant FOO = 10;

    function condition(bytes calldata data)
        public
        view
        returns (bool checkResult)
    {
        // Here, `data` is the API response encoded by the Airnode, i.e., it's
        // `data` from AirnodeRrp.fulfill(). Let's assume the oracle request returns
        // one `uint256`, and one `uint256` is appended as the timestamp (which we discard here).
        (uint256 response, ) = abi.decode(data, (uint256, uint256));
        // Condition checks if the data returned by the API is larger than `FOO` (which means
        // the Airnode should go ahead with the fulfillment if the API returns a number larger
        // than `FOO`)
        checkResult = response > FOO;
    }

    function fulfill(bytes32 subscriptionId, bytes calldata data)
        external
    {
        // Check if the caller is AirnodePsp
        // require(msg.sender == address(airnodePsp));

        // Check if you know about the subscription first
        // require(subscriptionId == ...)
        // Instead, you can also just check if the template ID/parameters is correct
        // (bytes32 templateId, , , , , bytes parameters) = airnodePsp.subscriptions(subscriptionId);
        // require(templateId == ...);
        // require(parameters.length == 0); // No additional parameters

        // Do nothing if the condition doesn't hold.
        // Although this check is optional, it's highly recommended.
        require(condition(data), "Condition not met");
        // The condition may not hold because the chain state has changed or Airnode's blockchain
        // provider lied to it (returned `true` when it should have returned `false`). Note that
        // the condition no longer being met is not necessarily catastrophic (for example, in the 
        // data feed case, the signed data is still sound unless the first-party oracle is malicious,
        // it's just that the update is redundant).

        (uint256 response, uint256 timestamp) = abi.decode(data, (uint256, uint256));

        // Disregard old responses. Note that this is use-case specific, i.e., you may want to
        // reject outdated asset prices, but accept match results no matter when they were signed.
        if (timestamp + 1000 < block.timestamp) {
          return;
        }

        // then do whatever you want with the API response
    }
}
