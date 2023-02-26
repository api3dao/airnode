//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

// An example requester which expects the response from Airnode consists of multiple values.
contract Requester is RrpRequesterV0 {
    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => address) public relayedRequesterAddress;
    mapping(bytes32 => address) public relayedSponsorAddress;
    mapping(bytes32 => address) public relayedSponsorWalletAddress;
    mapping(bytes32 => uint256) public relayedChainId;
    mapping(bytes32 => bytes32) public relayedChainType;
    mapping(bytes32 => bytes32) public relayedRequestId;

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
        (
            address v1,
            address v2,
            address v3,
            uint256 v4,
            bytes32 v5,
            bytes32 v6
        ) = abi.decode(
                data,
                (address, address, address, uint256, bytes32, bytes32)
            );
        relayedRequesterAddress[requestId] = v1;
        relayedSponsorAddress[requestId] = v2;
        relayedSponsorWalletAddress[requestId] = v3;
        relayedChainId[requestId] = v4;
        relayedChainType[requestId] = v5;
        relayedRequestId[requestId] = v6;
    }
}
