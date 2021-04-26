// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../AirnodeRrp.sol";
import "./reducers/MeanMedianHybrid.sol";

abstract contract rrpDapiServer is MeanMedianHybrid {
    struct DapiParameters {
        uint256 minResponsesToReduce;
        bytes32[] templateIds;
        address[] designatedWallets;
        address reduceAddress;
        bytes4 reduceFunctionId;
        }
    
    AirnodeRrp public airnodeRrp;
    mapping(bytes32 => DapiParameters) private dapiIdToParameters;
    uint256 public requesterIndex;
    uint256 public nextDapiRequestIndex = 1;
    mapping(bytes32 => uint256) private requestIdToDapiRequestIndex;
    mapping(uint256 => int256[]) private dapiRequestIndexToResponses;
    mapping(uint256 => bytes32) private dapiRequestIndexToDapiId;

    constructor(address _airnodeRrp) {
        airnodeRrp = AirnodeRrp(_airnodeRrp);
    }

    function makeDapiRequest(bytes32 dapiId)
        external
    {
        DapiParameters storage dapiParameters = dapiIdToParameters[dapiId];
        require(dapiParameters.reduceAddress == msg.sender);
        for (uint i = 0; i < dapiParameters.templateIds.length; i++) {
            bytes32 requestId = airnodeRrp.makeRequest(
                dapiParameters.templateIds[i],
                requesterIndex,
                dapiParameters.designatedWallets[i],
                address(this),
                this.fulfill.selector,
                "" // no additional parameters passed
                );
            requestIdToDapiRequestIndex[requestId] = nextDapiRequestIndex;
        }
        dapiRequestIndexToDapiId[nextDapiRequestIndex] = dapiId;
        nextDapiRequestIndex++;
    }

    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
        )
        external
    {
        require(address(airnodeRrp) == msg.sender);
        uint256 dapiRequestIndex = requestIdToDapiRequestIndex[requestId]; 
        require(dapiRequestIndex != 0);
        delete requestIdToDapiRequestIndex[requestId];
        if (statusCode == 0) {
            int256 decodedData = abi.decode(data, (int256));
            dapiRequestIndexToResponses[dapiRequestIndex].push(decodedData);
            uint256 responsesLength = dapiRequestIndexToResponses[dapiRequestIndex].length;
            DapiParameters storage dapiParameters = dapiIdToParameters[dapiRequestIndexToDapiId[dapiRequestIndex]];
            if (
                responsesLength % 2 == 1
                    && responsesLength >= dapiParameters.minResponsesToReduce
                )
            {
                int256 reducedValue = reduceInPlace(dapiRequestIndexToResponses[dapiRequestIndex]);
                dapiParameters.reduceAddress.call(  // solhint-disable-line
                    abi.encodeWithSelector(dapiParameters.reduceFunctionId, dapiRequestIndex, reducedValue)
                    );
            }
        }
    }
}
