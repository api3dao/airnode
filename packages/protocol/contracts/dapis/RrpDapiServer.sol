// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../AirnodeRrp.sol";
import "./CustomReducer.sol";

contract RrpDapiServer is CustomReducer {
    struct Dapi {
        uint256 noResponsesToReduce;
        int256 toleranceInPercentages;
        uint256 requesterIndex;
        bytes32[] templateIds;
        address[] designatedWallets;
        address reduceAddress;
        bytes4 reduceFunctionId;
        mapping(uint256 => int256[]) requestIndexToResponses;
        uint128 nextDapiRequestIndex;
        }
    
    struct DapiRequestIndices {
        uint128 dapiIndex;
        uint128 dapiRequestIndex;
        }
    
    AirnodeRrp public airnodeRrp;
    mapping(uint256 => Dapi) private dapis;
    uint256 public nextDapiIndex = 1;
    mapping(bytes32 => DapiRequestIndices) private requestIdToDapiRequestIndices;

    constructor(address _airnodeRrp) {
        airnodeRrp = AirnodeRrp(_airnodeRrp);
    }

    function registerDapi(
        uint256 noResponsesToReduce,
        int256 toleranceInPercentages,
        uint256 requesterIndex,
        bytes32[] calldata templateIds,
        address[] calldata designatedWallets,
        address reduceAddress,
        bytes4 reduceFunctionId
        )
        external
        returns (uint256 dapiIndex)
    {
      dapis[nextDapiIndex].noResponsesToReduce = noResponsesToReduce;
      dapis[nextDapiIndex].toleranceInPercentages = toleranceInPercentages;
      dapis[nextDapiIndex].requesterIndex = requesterIndex;
      dapis[nextDapiIndex].templateIds = templateIds;
      dapis[nextDapiIndex].designatedWallets = designatedWallets;
      dapis[nextDapiIndex].reduceAddress = reduceAddress;
      dapis[nextDapiIndex].reduceFunctionId = reduceFunctionId;
      dapis[nextDapiIndex].nextDapiRequestIndex = 1;

      dapiIndex = nextDapiIndex++;
    }


    function makeDapiRequest(
        uint256 dapiIndex,
        bytes calldata parameters
        )
        external
        returns (uint256 currDapiRequestIndex)
    {
        Dapi storage dapi = dapis[dapiIndex];
        currDapiRequestIndex = dapi.nextDapiRequestIndex;
        dapi.nextDapiRequestIndex++;
        require(
            airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(dapi.requesterIndex, msg.sender),
            "Caller not endorsed"
            );
        for (uint i = 0; i < dapi.templateIds.length; i++) {
            (bool success, bytes memory returnedData) = address(airnodeRrp).delegatecall(abi.encodeWithSelector( // solhint-disable-line
                AirnodeRrp.makeRequest.selector,
                dapi.templateIds[i],
                dapi.requesterIndex,
                dapi.designatedWallets[i],
                address(this),
                this.fulfill.selector,
                parameters
                ));
            require(success, "Request unsuccessful"); // This will never happen if AirnodeRrp is valid
            bytes32 requestId = abi.decode(returnedData, (bytes32));
            requestIdToDapiRequestIndices[requestId] = DapiRequestIndices(uint128(dapiIndex), uint128(currDapiRequestIndex));
        }
    }

    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
        )
        external
    {
        require(
            address(airnodeRrp) == msg.sender,
            "Caller not AirnodeRrp"
            );
        DapiRequestIndices storage dapiRequestIndices = requestIdToDapiRequestIndices[requestId]; 
        require(
            dapiRequestIndices.dapiRequestIndex != 0,
            "Request ID invalid"
            );
        if (statusCode == 0) {
            Dapi storage dapi = dapis[dapiRequestIndices.dapiIndex];
            uint256 responsesLength = dapi.requestIndexToResponses[dapiRequestIndices.dapiRequestIndex].length;
            if (responsesLength < dapi.noResponsesToReduce) {
                int256 decodedData = abi.decode(data, (int256));
                dapi.requestIndexToResponses[dapiRequestIndices.dapiRequestIndex].push(decodedData);
                if (responsesLength + 1 == dapi.noResponsesToReduce) {
                    int256 reducedValue;
                    if (dapi.toleranceInPercentages == 0) {
                        reducedValue = computeMedian(dapi.requestIndexToResponses[dapiRequestIndices.dapiRequestIndex]);
                    }
                    else {
                        reducedValue = computeMeanMedianHybrid(dapi.requestIndexToResponses[dapiRequestIndices.dapiRequestIndex], dapi.toleranceInPercentages);
                    }
                    dapi.reduceAddress.call(abi.encodeWithSelector( // solhint-disable-line
                        dapi.reduceFunctionId,
                        dapiRequestIndices.dapiIndex,
                        dapiRequestIndices.dapiRequestIndex,
                        reducedValue
                        ));
                }
            }
        }
        delete requestIdToDapiRequestIndices[requestId];
    }
}
