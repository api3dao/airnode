// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./RrpDapiServer.sol";

// A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed {
    RrpDapiServer public rrpDapiServer;
    bytes16 public latestDapiId;
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
    }

    function makeDapiRequest()
        external
        // onlyOwner
    {
        rrpDapiServer.resetDapiRequestIndex(latestDapiId);
        rrpDapiServer.makeDapiRequest(latestDapiId, "");
        // We don't need to get the dAPI request index because we know
        // it will be 1, we just have reset it
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
            dapiRequestIndex == 1,
            "Request stale"
            );
        latestAnswer = reducedValue;
    }
}