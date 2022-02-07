//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequester.sol";

// An example requester which expects the response from Airnode consists of multiple values.
contract Requester is RrpRequester {
    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => address) public requesterAddress;
    mapping(bytes32 => address) public sponsorAddress;
    mapping(bytes32 => address) public sponsorWalletAddress;
    mapping(bytes32 => uint256) public chainId;
    mapping(bytes32 => bytes32) public chainType;

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

    function fulfill(bytes32 requestId, bytes calldata data)
        external
        onlyAirnodeRrp
    {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        (address v1, address v2, address v3, uint256 v4, bytes32 v5) = abi
            .decode(data, (address, address, address, uint256, bytes32));
        requesterAddress[requestId] = v1;
        sponsorAddress[requestId] = v2;
        sponsorWalletAddress[requestId] = v3;
        chainId[requestId] = v4;
        chainType[requestId] = v5;
    }
}
