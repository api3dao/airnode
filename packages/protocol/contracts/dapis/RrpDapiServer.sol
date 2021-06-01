// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../AirnodeRrp.sol";
import "./reducers/MeanMedianHybrid.sol";

import "hardhat/console.sol";

contract RrpDapiServer is MeanMedianHybrid {
  event DapiRegistered(bytes16 indexed dapiId);

  struct TemplateIndex {
    uint256 index;
    bool exists;
  }

  struct Dapi {
    uint256 noResponsesToReduce;
    uint256 toleranceInPercentages;
    uint256 requesterIndex;
    bytes32[] templateIds;
    mapping(bytes32 => TemplateIndex) templateIdToIndex;
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
  // TODO: are we missing a dapiIds bytes16 array for getting all the dapi ids?
  uint256 public nextDapiIndex = 1;
  mapping(bytes32 => DapiRequestIdentifiers) private airnodeRequestIdToDapiRequestIdentifiers;

  constructor(address _airnodeRrp) {
    airnodeRrp = AirnodeRrp(_airnodeRrp);
  }

  function getTemplateIdIndex(bytes16 _dapiId, bytes32 _templateId) external view returns (uint256, bool) {
    return (dapis[_dapiId].templateIdToIndex[_templateId].index, dapis[_dapiId].templateIdToIndex[_templateId].exists);
  }

  function getDapi(bytes16 dapiId)
    external
    view
    returns (
      uint256,
      uint256,
      uint256,
      bytes32[] memory,
      address[] memory,
      address,
      bytes4,
      address
    )
  {
    Dapi storage dapi = dapis[dapiId];
    return (
      dapi.noResponsesToReduce,
      dapi.toleranceInPercentages,
      dapi.requesterIndex,
      dapi.templateIds,
      dapi.designatedWallets,
      dapi.reduceAddress,
      dapi.reduceFunctionId,
      dapi.requestIndexResetter
    );
  }

  function registerDapi(
    uint256 noResponsesToReduce,
    uint256 toleranceInPercentages,
    uint256 requesterIndex,
    bytes32[] calldata templateIds,
    address[] calldata designatedWallets,
    address reduceAddress,
    bytes4 reduceFunctionId,
    address requestIndexResetter
  ) external returns (bytes16 dapiId) {
    require(templateIds.length == designatedWallets.length, "Parameter lengths do not match");
    require(noResponsesToReduce <= templateIds.length && noResponsesToReduce != 0, "Invalid no. responses to reduce");

    dapiId = bytes16(
      keccak256(
        abi.encodePacked(
          noResponsesToReduce,
          toleranceInPercentages,
          requesterIndex,
          templateIds,
          designatedWallets,
          reduceAddress,
          reduceFunctionId,
          requestIndexResetter
        )
      )
    );
    dapis[dapiId].noResponsesToReduce = noResponsesToReduce;
    dapis[dapiId].toleranceInPercentages = toleranceInPercentages;
    dapis[dapiId].requesterIndex = requesterIndex;
    dapis[dapiId].templateIds = templateIds;
    for (uint256 i; i < templateIds.length; i++) {
      dapis[dapiId].templateIdToIndex[templateIds[i]].index = i;
      dapis[dapiId].templateIdToIndex[templateIds[i]].exists = templateIds[i] != 0;
    }
    dapis[dapiId].designatedWallets = designatedWallets;
    dapis[dapiId].reduceAddress = reduceAddress;
    dapis[dapiId].reduceFunctionId = reduceFunctionId;
    dapis[dapiId].requestIndexResetter = requestIndexResetter;
    dapis[dapiId].nextRequestIndex = 1;

    // for (uint256 i = 0; i < dapis[dapiId].templateIds.length; i++) {
    //   TemplateIndex memory ti = dapis[dapiId].templateIdToIndex[dapis[dapiId].templateIds[i]];
    //   console.logBytes32(dapis[dapiId].templateIds[i]);
    //   console.logUint(ti.index);
    //   console.logBool(ti.exists);
    // }

    nextDapiIndex++;

    // TODO: move this into an interface? IRrpDapiServer.sol?
    emit DapiRegistered(
      dapiId /* , noResponsesToReduce, toleranceInPercentages, requesterIndex, templateIds, designatedWallets, reduceAddress, reduceFunctionId, requestIndexResetter, 1 */
    );
  }

  function resetDapiRequestIndex(bytes16 dapiId) external {
    Dapi storage dapi = dapis[dapiId];
    require(msg.sender == dapi.requestIndexResetter, "Caller not resetter");
    dapi.nextRequestIndex = 1;
    dapi.requestIndexResetCount++;
  }

  function makeDapiRequest(bytes16 dapiId, bytes calldata parameters) external returns (uint64 currDapiRequestIndex) {
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
    for (uint256 i = 0; i < dapi.templateIds.length; i++) {
      if (dapi.templateIds[i] != 0) {
        (bool success, bytes memory returnedData) =
          address(airnodeRrp).delegatecall(
            abi.encodeWithSelector( // solhint-disable-line
              AirnodeRrp.makeRequest.selector,
              dapi.templateIds[i],
              dapi.requesterIndex,
              dapi.designatedWallets[i],
              address(this),
              this.fulfill.selector,
              parameters
            )
          );
        require(success, "Request unsuccessful"); // This will never happen if AirnodeRrp is valid
        bytes32 requestId = abi.decode(returnedData, (bytes32));
        airnodeRequestIdToDapiRequestIdentifiers[requestId] = DapiRequestIdentifiers({
          dapiId: dapiId,
          dapiRequestIndex: uint64(currDapiRequestIndex),
          dapiRequestIndexResetCountAtRequestTime: dapi.requestIndexResetCount
        });
      }
    }
  }

  function fulfill(
    bytes32 requestId,
    uint256 statusCode,
    bytes calldata data
  ) external {
    require(address(airnodeRrp) == msg.sender, "Caller not AirnodeRrp");
    DapiRequestIdentifiers storage dapiRequestIdentifiers = airnodeRequestIdToDapiRequestIdentifiers[requestId];
    require(dapiRequestIdentifiers.dapiRequestIndex != 0, "Request ID invalid");
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
            reducedValue = computeMedianInPlace(dapi.requestIndexToResponses[dapiRequestIdentifiers.dapiRequestIndex]);
          } else {
            reducedValue = computeMeanMedianHybridInPlace(
              dapi.requestIndexToResponses[dapiRequestIdentifiers.dapiRequestIndex],
              dapi.toleranceInPercentages
            );
          }
          (bool success, ) =
            dapi.reduceAddress.call(
              abi.encodeWithSelector( // solhint-disable-line
                dapi.reduceFunctionId,
                dapiRequestIdentifiers.dapiId,
                dapiRequestIdentifiers.dapiRequestIndex,
                reducedValue
              )
            );
          require(success, "Reduce callback unsuccessful");
        }
      }
    }
    delete airnodeRequestIdToDapiRequestIdentifiers[requestId];
  }
}
