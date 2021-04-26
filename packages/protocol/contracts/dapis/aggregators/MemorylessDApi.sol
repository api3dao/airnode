// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../AirnodeRrpClient.sol";
import "./Median.sol";
import "./DApi.sol";

/**
 * @title A sample dAPI/aggregator contract
 * @dev only owner can trigger request
 */
contract MemorylessDApi is DApi, AirnodeRrpClient {
    Aggregator public aggregator;

    bytes32[] public templateIds;
    uint256 public requesterIndex;
    address public designatedWallet;
    uint128 public minimumResponses;

    int256 public aggregatedAnswer;

    address immutable _owner;
    address immutable fulfillAddress;
    bytes4 immutable fulfillFunctionId;
    mapping (bytes32 => bool) private _pendingRequests;
    // individual answers from Airnodes are stored in an array
    int256[] _individualAnswers;

    event NewUpdateRequested(uint256 timestamp);
    event RequestFulfilled(uint256 requestId);
    event AggregatedAnswerUpdated(uint256 timestamp, uint256 aggregatedAnswer);
    
    constructor
    (
        address _airnodeRrpAddress,
        address _aggregatorAddress,
        bytes32[] memory _templateIds,
        uint256 _requesterIndex,
        address _designatedWallet,
        uint128 _minimumResponses
    )
        AirnodeRrpClient(_airnodeRrpAddress)
    {
        aggregator = Aggregator(_aggregatorAddress); 

        _owner = msg.sender;
        updateRequestData(
            _templateIds,
            _requesterIndex,
            _designatedWallet,
            _minimumResponses
        );
        fulfillAddress = address(this);
        fulfillFunctionId = bytes4(keccak256("onFulfill(bytes32,uint256,bytes)"));
    }

    modifier onlyOwner(){
        require(msg.sender == _owner, "only owner can call this function");
        _;
    }

    

    /**
     * @notice Creates a request to each Airnode via the template array.
     * @dev This call assumes no additional parameters are required. That is,
     * all necessary parameters for all future requests are in the `Template`
     * struct referenced by `templateIds`.
     */
    function requestUpdatedAnswer()
    external
    onlyOwner
    {
        bytes32 requestId;

        for (uint i = 0; i < templateIds.length; i++) {
            requestId = airnodeRrp.makeRequest(
                templateIds[i],
                requesterIndex,
                designatedWallet,
                fulfillAddress,
                fulfillFunctionId,
                "" // no additional parameters passed
            );
        }
        // must empty existing responses since contract is "memoryless"
        _emptyAnswerArray();
        emit NewUpdateRequested(block.timestamp);
    }

    /**
     * @notice Handles fulfill from Airnode
     * @dev `statusCode` being zero indicates a successful fulfillment, while
     * non-zero values indicate error (the meanings of these values are
     * implementation-dependent).
     */
    function onFulfill
    (
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
    )
        external
    {
        if (statusCode == 0 && _pendingRequests[requestId]) {
            
            int256 decodedData = abi.decode(data, (int256));
            _individualAnswers.push(decodedData);

            delete _pendingRequests[requestId];
            
            if (_individualAnswers.length >= minimumResponses) {
              aggregatedAnswer = aggregator.aggregateInplace(_individualAnswers);
            }
        }
    }

    function updateRequestData
    (
        bytes32[] memory _templateIds,
        uint256 _requesterIndex,
        address _designatedWallet,
        uint128 _minimumResponses
    )
        public
        onlyOwner
    {
        // TODO: validate
        templateIds = _templateIds;
        requesterIndex = _requesterIndex;
        designatedWallet = _designatedWallet;
        minimumResponses = _minimumResponses;
    }

    function _emptyAnswerArray() private
    {
        for (uint i=0; i<_individualAnswers.length; i++) {
            delete _individualAnswers[i];
        }
    }
}

