// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

// This contract is for dev reference and will be removed later on
contract ExampleConditionAndFulfillContract {
    uint256 public constant FOO = 10;

    function condition(bytes32 subscriptionId, bytes calldata data)
        public
        view
        returns (bool checkResult)
    {
        (uint256 response, ) = abi.decode(data, (uint256, uint256));
        checkResult = response > FOO;
    }

    function fulfill(bytes32 subscriptionId, bytes calldata data) external {
        require(condition(subscriptionId, data), "Condition not met");

        // Check if you know about the subscription first
        // require(subscriptionId == ...)
        // Instead, you can also just check if the template ID/parameters is correct (e.g. for a common BeaconServer for RRP+PSP)
        // (bytes32 templateId, , , , , bytes parameters) = airnodePsp.subscriptions(subscriptionId);
        // require(templateId == ...);
        // require(parameters.length == 0); // No additional parameters

        (uint256 response, uint256 timestamp) = abi.decode(
            data,
            (uint256, uint256)
        );

        // Check for staleness or not, it depends on your use case
        require(timestamp + 1000 < block.timestamp, "Fulfillment stale");

        // ...then do whatever you want with the API response
    }
}
