// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract ExampleConditionAndFulfillContract {
    uint256 public constant FOO = 10;

    function condition(bytes calldata data)
        public
        view
        returns (bool checkResult)
    {
        (uint256 response, ) = abi.decode(data, (uint256, uint256));
        checkResult = response > FOO;
    }

    function fulfill(bytes32 subscriptionId, bytes calldata data) external {
        require(condition(data), "Condition not met");

        (uint256 response, uint256 timestamp) = abi.decode(
            data,
            (uint256, uint256)
        );

        require(timestamp + 1000 < block.timestamp, "Fulfillment stale");

        // ...then do whatever you want with the API response
    }
}
