//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

// An example requester which expects the response from Airnode to contain two numbers - the average value of the given
// coins and average 30d percentage of the coins.
contract Requester is RrpRequesterV0 {
    struct FulfillmentData {
        int256 average;
        int256 percentageChange;
    }

    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => FulfillmentData) public fulfilledData;

    constructor(address airnodeRrp) RrpRequesterV0(airnodeRrp) {}

    function makeRequest(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        bytes calldata parameters
    ) external {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointId,
            sponsor,
            sponsorWallet,
            address(this),
            this.fulfill.selector,
            parameters
        );
        incomingFulfillments[requestId] = true;
    }

    function fulfill(
        bytes32 requestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        (int256 average, int256 percentageChange) = abi.decode(
            data,
            (int256, int256)
        );
        fulfilledData[requestId] = FulfillmentData(average, percentageChange);
    }
}
