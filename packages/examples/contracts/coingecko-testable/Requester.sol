//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@api3/protocol/contracts/rrp/requesters/RrpRequester.sol";

// An example requester which expects the response from Airnode is a single int256 value.
contract Requester is RrpRequester {
    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => int256) public fulfilledData;

    constructor(address airnodeAddress) RrpRequester(airnodeAddress) {}

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
        uint256 statusCode,
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        int256 decodedData = abi.decode(data, (int256));
        if (statusCode == 0) {
            fulfilledData[requestId] = decodedData;
        }
    }
}
