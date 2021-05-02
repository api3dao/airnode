// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./RrpDapiServer.sol";

// A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed {
    RrpDapiServer public rrpDapiServer;
    bytes16 public latestDapiId;
    uint64 public latestDapiRequestIndex;
    int256 public latestAnswer;

    constructor (address _rrpDapiServer)
    {
        rrpDapiServer = RrpDapiServer(_rrpDapiServer);
    }

    function setDapi(bytes16 dapiId)
        external
        // onlyOwner
    {
        latestDapiId = dapiId;
        latestDapiRequestIndex = 0;
    }

    function makeDapiRequest()
        external
        // onlyOwner
    {
        latestDapiRequestIndex = rrpDapiServer.makeDapiRequest(latestDapiId, "");
    }

    function reduce(
        bytes16 dapiId,
        uint64 dapiRequestIndex,
        int256 reducedValue
        )
        external
    {
        require(
            msg.sender == address(rrpDapiServer),
            "Caller not RRP dAPI server"
            );
        require(
            dapiId == latestDapiId,
            "dAPI stale"
            );
        require(
            dapiRequestIndex == latestDapiRequestIndex,
            "Request stale"
            );
        latestAnswer = reducedValue;
    }
}