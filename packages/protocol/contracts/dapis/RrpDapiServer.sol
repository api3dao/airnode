// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../AirnodeRrp.sol";
import "./CustomReducer.sol";

contract RrpDapiServer is CustomReducer {
    struct DapiParameters {
        uint256 minResponsesToReduce;
        int256 toleranceInPercentages;
        uint256 requesterIndex;
        bytes32[] templateIds;
        address[] designatedWallets;
        address reduceAddress;
        bytes4 reduceFunctionId;
        }
    
    AirnodeRrp public airnodeRrp;
    mapping(uint256 => DapiParameters) private dapiIdToParameters;
    uint256 public nextDapiID = 1;
    uint256 public nextDapiRequestIndex = 1;
    mapping(bytes32 => uint256) private requestIdToDapiRequestIndex;
    mapping(uint256 => int256[]) private dapiRequestIndexToResponses;
    mapping(uint256 => uint256) private dapiRequestIndexToDapiId;

    constructor(address _airnodeRrp) {
        airnodeRrp = AirnodeRrp(_airnodeRrp);
    }

    function registerDapi
    (
        uint256 minResponsesToReduce,
        int256 toleranceInPercentages,
        uint256 requesterIndex,
        bytes32[] calldata templateIds,
        address[] calldata designatedWallets,
        address reduceAddress,
        bytes4 reduceFunctionId
    )
        external
        returns (uint256 dapiId)
    {
      dapiIdToParameters[nextDapiID] = DapiParameters(
        minResponsesToReduce,
        toleranceInPercentages,
        requesterIndex,
        templateIds,
        designatedWallets,
        reduceAddress,
        reduceFunctionId
      );
      dapiId = nextDapiID++;
    }


    function makeDapiRequest(uint256 dapiId, uint256 requesterIndex)
        external
        returns (uint256 currDapiRequestIndex)
    {
        DapiParameters storage dapiParameters = dapiIdToParameters[dapiId];
        require(
            airnodeRrp.isEndorsed(dapiParameters.requesterIndex, msg.sender),
            "Only an endorsed requester can call this function."
            );
        require(dapiParameters.reduceAddress == msg.sender);
        for (uint i = 0; i < dapiParameters.templateIds.length; i++) {
            // TODO: use delegatecall
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
        currDapiRequestIndex = nextDapiRequestIndex;
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
                int256 reducedValue;
                if (dapiParameters.toleranceInPercentages == 0) {
                    reducedValue = computeMedian(dapiRequestIndexToResponses[dapiRequestIndex]);
                }
                else {
                    reducedValue = meanMedianHybrid(dapiRequestIndexToResponses[dapiRequestIndex], dapiParameters.toleranceInPercentages);
                }
                dapiParameters.reduceAddress.call(  // solhint-disable-line
                    abi.encodeWithSelector(dapiParameters.reduceFunctionId, dapiRequestIndex, reducedValue)
                );
            }
        }
    }
}
