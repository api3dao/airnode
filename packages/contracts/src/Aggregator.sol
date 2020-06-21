pragma solidity 0.4.24;

import "./chainlink/ChainlinkAggregator.sol";


// Find out MAX_ORACLE_COUNT


contract Aggregator is ChainlinkAggregator {
    uint256 public minResponses;
    uint256 public requestBlockGap;
    uint256 private requestCounter = 1;
    uint256 private lastRequestBlock;
    address[] public oracles;
    mapping(address => bool) private requesters;
    mapping(address => bool) private oracleRequesters;
    mapping(uint256 => mapping(address => bool)) private awaitingFulfillment;

    uint256 constant public MAX_ORACLE_COUNT = 28;
    uint256 constant public MAX_REQUEST_BLOCK_GAP = 50;

    event NewRequest(address indexed requester, uint256 requestInd);
    event RequestFulfilled(address indexed fulfiller, uint256 requestInd);

    constructor(
        uint128 _minResponses,
        address[] _oracles,
        uint256 _requestBlockGap
        )
        public
        Ownable()
    {
        updateConfiguration(_minResponses, _oracles, _requestBlockGap);
    }

    function updateConfiguration(
        uint128 _minResponses,
        address[] _oracles,
        uint256 _requestBlockGap
        )
        public
        onlyOwner()
        onlyValidConfiguration(_minResponses, _oracles, _requestBlockGap)
    {
        minResponses = _minResponses;
        oracles = _oracles;
        requestBlockGap = _requestBlockGap;
    }

    function updateRequesterStatus(
        address requester,
        bool status
        )
        external
        onlyOwner()
    {
        requesters[requester] = status;
    }

    function updateOracleRequesterStatus(
        address oracleRequester,
        bool status
        )
        external
        onlyOwner()
    {
        oracleRequesters[oracleRequester] = status;
    }

    function createRequest()
        public
        onlyRequesters()
        onlyAfterBlockGap()
    {
        for (uint i = 0; i < oracles.length; i++)
        {
            awaitingFulfillment[requestCounter][oracles[i]] = true;
        }
        answers[requestCounter].minResponses = uint128(minResponses);
        answers[requestCounter].maxResponses = uint128(oracles.length);
        lastRequestBlock = block.number;
        emit NewRequest(msg.sender, requestCounter);
        requestCounter = requestCounter.add(1);
    }

    function createRequestAsOracle(int256 data)
        external
        onlyOracleRequesters()
    {
        createRequest();
        fulfill(requestCounter - 1, data);
    }

    function fulfill(
        uint256 requestInd,
        int256 data
        )
        public
        onlyOraclesNotYetFulfilled(requestInd)
    {
        answers[requestInd].responses.push(data);
        awaitingFulfillment[requestInd][msg.sender] = false;
        updateLatestAnswer(requestInd);
        deleteAnswer(requestInd);
        emit RequestFulfilled(msg.sender, requestInd);
    }

    function checkIfReadyForRequest()
        external
        returns(bool)
    {
        return lastRequestBlock + requestBlockGap <= block.number;
    }

    modifier onlyValidConfiguration(
        uint256 _minResponses,
        address[] _oracles,
        uint256 _requestBlockGap
        )
    {
        require(_oracles.length >= _minResponses, "No. oracles less than minResponses");
        require(_oracles.length <= MAX_ORACLE_COUNT, "No. oracles more than MAX_ORACLE_COUNT");
        require(_requestBlockGap <= MAX_REQUEST_BLOCK_GAP, "Request block gap more than MAX_REQUEST_BLOCK_GAP");
        _;
    }

    modifier onlyOraclesNotYetFulfilled(uint256 requestInd)
    {
        require(awaitingFulfillment[requestInd][msg.sender], "Cannot fulfill");
        _;
    }

    modifier onlyRequesters()
    {
        require(requesters[msg.sender] || oracleRequesters[msg.sender], "Not a requester");
        _;
    }

    modifier onlyOracleRequesters()
    {
        require(oracleRequesters[msg.sender], "Not an oracle-requester");
        _;
    }

    modifier onlyAfterBlockGap()
    {
        require(lastRequestBlock + requestBlockGap <= block.number, "Wait at least requestBlockGap after the last request");
        _;
    }
}
