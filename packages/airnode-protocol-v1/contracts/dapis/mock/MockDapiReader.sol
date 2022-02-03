// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DapiReader.sol";

contract MockDapiReader is DapiReader {
    constructor(address _dapiServer) DapiReader(_dapiServer) {}

    function exposedSetDapiServer(address _dapiServer) external {
        setDapiServer(_dapiServer);
    }

    function exposedReadWithDataPointId(bytes32 dataPointId)
        external
        view
        returns (int224 value, uint32 timestamp)
    {
        return IBaseDapiServer(dapiServer).readWithDataPointId(dataPointId);
    }

    function exposedReadWithName(bytes32 name)
        external
        view
        returns (int224 value, uint32 timestamp)
    {
        return IBaseDapiServer(dapiServer).readWithName(name);
    }
}
