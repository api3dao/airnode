// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./reducers/Reducer.sol";
import "./rrpDapiServer.sol";

// A stub for an RRP dAPI contract
// When the user wants to deploy a dAPI contract, they inherit the specific
// reducer contract such as:
//       contract myRrpDapi is rrpDapi, Median {
//           // Any specific implementation required
//       }
abstract contract rrpDapi is Reducer {

    RrpDapiServer public rrpDapiServer;

    uint256 immutable maxAnswersInStorage;
    uint256 immutable dapiId;
    uint256 immutable requesterIndex;

    uint256 public nextAnswerId = 1;
    
    mapping(uint256 => uint256) private requestIndexToAnswerIdMod;    
    mapping(uint256 => uint256) private answerIdModToRequestIndex;    
    mapping(uint256 => int256) private answerIdModToValue;    

    constructor
    (
      address _rrpDapiServer,
      uint256 _requesterIndex,
      uint256 _maxAnswersInStorage,
      uint256 _minResponsesToReduce,
      int256 _toleranceInPercentages,
      bytes32[] memory _templateIds,
      address[] memory _designatedWallets
    ){
      rrpDapiServer = RrpDapiServer(_rrpDapiServer);
      
      maxAnswersInStorage = _maxAnswersInStorage;
      requesterIndex = _requesterIndex;
      
      // register with the main RRP dAPI server
      dapiId = rrpDapiServer.registerDapi(
        _minResponsesToReduce,
        _toleranceInPercentages,
        _requesterIndex,
        _templateIds,
        _designatedWallets,
        address(this),
        this.reduce.selector
      );
    }

    function getAnswer(uint answerId) internal view returns (int256) {
      require(
             0 < answerId
             && (answerId <= maxAnswersInStorage || nextAnswerId - maxAnswersInStorage <= answerId)
             && answerId < nextAnswerId,
            "Answer doesn't exist."
        );
        return answerIdModToValue[answerId % maxAnswersInStorage + 1];
    }

    function makeRequest() external returns (uint256 answerId){
      
      // reverts if requester is not endorsed
      uint256 requestIndex = rrpDapiServer.makeDapiRequest(dapiId, requesterIndex);

      // +1 is added to the modulo to prevent 0 values
      uint256 answerMod = nextAnswerId % maxAnswersInStorage + 1;
      
      // delete stale answer in storage
      delete requestIndexToAnswerIdMod[answerIdModToRequestIndex[answerMod]];
      
      requestIndexToAnswerIdMod[requestIndex] = answerMod;
      answerIdModToRequestIndex[answerMod] = requestIndex;
      
      answerId = nextAnswerId++;
    }

    function reduce
    (
      uint256 dapiRequestIndex,
      int256 reducedValue
    )
      external
    {
      uint256 answerIdMod = requestIndexToAnswerIdMod[dapiRequestIndex];
      require(answerIdMod != 0, "dAPI request index doesn't exist.");
      answerIdModToValue[answerIdMod] = reducedValue;
    }
}
