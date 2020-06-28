// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


contract Client {
    bytes32 public requesterId;

    constructor (bytes32 _requesterId)
        public
    {
        requesterId = _requesterId;
    }
}
