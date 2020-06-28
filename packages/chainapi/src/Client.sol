// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

// Replace this with interface later
import "./ChainApi.sol";


contract Client {
    bytes32 public requesterId;
    bytes32 public data;

    constructor (bytes32 _requesterId)
        public
    {
        requesterId = _requesterId;
    }

    function request(
        address chainApiAddress,
        bytes32 providerId,
        bytes32 templateId
    )
        external
    {
        ChainApi chainApi = ChainApi(chainApiAddress);
        chainApi.makeRequest(providerId, templateId, address(this), this.fulfill.selector, '0xabcdabcd');
    }

    function fulfill(
        bytes32 requestId,
        bytes32 _data
    )
        external
        // Check if the fulfiller belongs to provider here
    {
        data = _data;
    }
}
