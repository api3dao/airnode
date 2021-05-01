// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../AirnodeRrp.sol";
import "./CustomReducer.sol";

contract RrpDapiServer is CustomReducer {
    struct DapiParameters {
        uint256 noResponsesToReduce;
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


    function makeDapiRequest(
        uint256 dapiId,
        bytes calldata parameters
        )
        external
        returns (uint256 currDapiRequestIndex)
    {
        DapiParameters storage dapiParameters = dapiIdToParameters[dapiId];
        require(
            airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(dapiParameters.requesterIndex, msg.sender),
            "Only an endorsed requester can call this function."
            );
        for (uint i = 0; i < dapiParameters.templateIds.length; i++) {
            // TODO: use delegatecall
            (bool success, bytes memory returnedData) = address(airnodeRrp).delegatecall(abi.encodeWithSignature( // solhint-disable-line
                "makeRequest(bytes32,uint256,address,address,bytes4,bytes)",
                dapiParameters.templateIds[i],
                dapiParameters.requesterIndex,
                dapiParameters.designatedWallets[i],
                address(this),
                this.fulfill.selector,
                parameters
                ));
            require(success);
            bytes32 requestId = abi.decode(returnedData, (bytes32));
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
            DapiParameters storage dapiParameters = dapiIdToParameters[dapiRequestIndexToDapiId[dapiRequestIndex]];
            uint256 responsesLength = dapiRequestIndexToResponses[dapiRequestIndex].length;
            if (responsesLength < dapiParameters.noResponsesToReduce) {
                int256 decodedData = abi.decode(data, (int256));
                dapiRequestIndexToResponses[dapiRequestIndex].push(decodedData);
                if (responsesLength + 1 == dapiParameters.noResponsesToReduce) {
                    int256 reducedValue;
                    if (dapiParameters.toleranceInPercentages == 0) {
                        reducedValue = computeMedian(dapiRequestIndexToResponses[dapiRequestIndex]);
                    }
                    else {
                        reducedValue = computeMeanMedianHybrid(dapiRequestIndexToResponses[dapiRequestIndex], dapiParameters.toleranceInPercentages);
                    }
                    dapiParameters.reduceAddress.call(abi.encodeWithSelector( // solhint-disable-line
                        dapiParameters.reduceFunctionId,
                        dapiRequestIndex,
                        reducedValue
                        ));
                }
            }
        }
    }
}
