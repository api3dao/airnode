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
        mapping(uint256 => uint256) requestIndexToResponsesLength;
        uint64 nextRequestIndex;
        uint64 requestIndexResetCount;
        address requestIndexResetter;
        }
    
    struct DapiRequestIdentifiers {
        bytes16 dapiId;
        uint64 dapiRequestIndex;
        uint64 dapiRequestIndexResetCountAtRequestTime;
        }
    
    AirnodeRrp public airnodeRrp;
    mapping(bytes16 => Dapi) private dapis;
    uint256 public nextDapiIndex = 1;
    mapping(bytes32 => DapiRequestIdentifiers) private airnodeRequestIdToDapiRequestIdentifiers;

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
        bytes4 reduceFunctionId,
        address requestIndexResetter
        )
        external
        returns (bytes16 dapiId)
    {
      require(
          templateIds.length == designatedWallets.length,
          "Parameter lengths do not match"
          );
      require(
          noResponsesToReduce <= templateIds.length && noResponsesToReduce != 0,
          "Invalid number of responses to reduce"
          );
      dapiId = bytes16(keccak256(abi.encodePacked(
          noResponsesToReduce,
          toleranceInPercentages,
          requesterIndex,
          templateIds,
          designatedWallets,
          reduceAddress,
          reduceFunctionId,
          requestIndexResetter
          )));
      dapis[dapiId].noResponsesToReduce = noResponsesToReduce;
      dapis[dapiId].toleranceInPercentages = toleranceInPercentages;
      dapis[dapiId].requesterIndex = requesterIndex;
      dapis[dapiId].templateIds = templateIds;
      dapis[dapiId].designatedWallets = designatedWallets;
      dapis[dapiId].reduceAddress = reduceAddress;
      dapis[dapiId].reduceFunctionId = reduceFunctionId;
      dapis[dapiId].requestIndexResetter = requestIndexResetter;
      dapis[dapiId].nextRequestIndex = 1;
    }

    function resetDapiRequestIndex(bytes16 dapiId)
        external
    {
        Dapi storage dapi = dapis[dapiId];
        require(
            msg.sender == dapi.requestIndexResetter,
            "Caller not resetter"
            );
        dapi.nextRequestIndex = 1;
        dapi.requestIndexResetCount++;
    }

    function makeDapiRequest(
        bytes16 dapiId,
        bytes calldata parameters
        )
        external
        returns (uint64 currDapiRequestIndex)
    {
        Dapi storage dapi = dapis[dapiId];
        currDapiRequestIndex = dapi.nextRequestIndex++;
        dapi.requestIndexToResponsesLength[currDapiRequestIndex] = 0;
        if (dapi.requestIndexToResponses[currDapiRequestIndex].length == 0) {
            dapi.requestIndexToResponses[currDapiRequestIndex] = new int256[](dapi.noResponsesToReduce);
        }
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
            airnodeRequestIdToDapiRequestIdentifiers[requestId] = DapiRequestIdentifiers({
                dapiId: dapiId,
                dapiRequestIndex: uint64(currDapiRequestIndex),
                dapiRequestIndexResetCountAtRequestTime: dapi.requestIndexResetCount
                });
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
        DapiRequestIdentifiers storage dapiRequestIdentifiers = airnodeRequestIdToDapiRequestIdentifiers[requestId]; 
        require(
            dapiRequestIdentifiers.dapiRequestIndex != 0,
            "Request ID invalid"
            );
        if (statusCode == 0) {
            Dapi storage dapi = dapis[dapiRequestIdentifiers.dapiId];
            require(
                dapiRequestIdentifiers.dapiRequestIndexResetCountAtRequestTime == dapi.requestIndexResetCount,
                "Request stale"
                );
            uint256 responsesLength = dapi.requestIndexToResponsesLength[dapiRequestIdentifiers.dapiRequestIndex];
            
            if (responsesLength < dapi.noResponsesToReduce) {
                int256 decodedData = abi.decode(data, (int256));
                dapi.requestIndexToResponses[dapiRequestIdentifiers.dapiRequestIndex][responsesLength] = decodedData;
                dapi.requestIndexToResponsesLength[dapiRequestIdentifiers.dapiRequestIndex] = ++responsesLength;
                
                if (responsesLength == dapi.noResponsesToReduce) {
                    int256 reducedValue;
                    if (dapi.toleranceInPercentages == 0) {
                        reducedValue = computeMedian(dapi.requestIndexToResponses[dapiRequestIdentifiers.dapiRequestIndex]);
                    }
                    else {
                        reducedValue = computeMeanMedianHybrid(dapi.requestIndexToResponses[dapiRequestIdentifiers.dapiRequestIndex], dapi.toleranceInPercentages);
                    }
                    (bool success, ) = dapi.reduceAddress.call(abi.encodeWithSelector( // solhint-disable-line
                        dapi.reduceFunctionId,
                        dapiRequestIdentifiers.dapiId,
                        dapiRequestIdentifiers.dapiRequestIndex,
                        reducedValue
                        ));
                    require(success, "Reduce callback unsuccessful");
                }
            }
        }
        delete airnodeRequestIdToDapiRequestIdentifiers[requestId];
    }
}
