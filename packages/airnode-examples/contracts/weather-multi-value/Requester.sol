//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

// An example requester which expects the response from Airnode consists of multiple values.
contract Requester is RrpRequesterV0 {
    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => uint256) public sunsetData;
    mapping(bytes32 => int256) public tempData;
    mapping(bytes32 => string) public weatherData;
    mapping(bytes32 => uint256) public timestampData;

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
        (uint256 v1, int256 v2, string memory v3, uint256 v4) = abi.decode(
            data,
            (uint256, int256, string, uint256)
        );
        sunsetData[requestId] = v1;
        tempData[requestId] = v2;
        weatherData[requestId] = v3;
        timestampData[requestId] = v4;
    }
}
