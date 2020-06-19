pragma solidity 0.4.24;
// Find out max oracle count
// Implement a minimum delay between requests (per requester?)

import "./interfaces/AggregatorInterface.sol";
import "./vendor/SignedSafeMath.sol";
import "./vendor/SafeMath.sol";
import "./vendor/Ownable.sol";


contract Aggregator is AggregatorInterface, Ownable {
    using SignedSafeMath for int256;
    using SafeMath for uint256;

    struct Request {
        uint128 minResponses;
        uint128 maxResponses;
        int256[] fulfillments;
    }

    // ~~~Configuration~~~
    address[] public oracles;
    mapping(address => bool) public requesters;
    // Oracles must be added to oracleRequesters separately for them to be able to trigger requests
    mapping(address => bool) public oracleRequesters;
    uint256 public minResponses;

    // ~~~State~~~
    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(address => bool)) public awaitingFulfillment;
    uint256 private latestAnswerInd;
    uint256 private requestCounter = 1;

    // ~~~Outputs~~~
    mapping(uint256 => int256) private answers;
    mapping(uint256 => uint256) private answerTimestamps;

    event NewRequest(address indexed requester, uint256 requestInd);
    event RequestFulfilled(address indexed fulfiller, uint256 requestInd);
    // Don't really need this one
    event AnswerUpdated(int256 indexed answer, uint256 indexed requestInd, uint256 timestamp);

    constructor(
        uint128 _minResponses,
        address[] _oracles
        )
        public
        Ownable()
    {
        updateConfiguration(_minResponses, _oracles);
    }

    function updateConfiguration(
        uint128 _minResponses,
        address[] _oracles
        )
        public
        onlyOwner()
        onlyValidConfiguration(_minResponses, _oracles)
    {
        minResponses = _minResponses;
        oracles = _oracles;
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
    {
        for (uint i = 0; i < oracles.length; i++)
        {
            awaitingFulfillment[requestCounter][oracles[i]] = true;
        }
        requests[requestCounter].minResponses = uint128(minResponses);
        requests[requestCounter].maxResponses = uint128(oracles.length);
        emit NewRequest(msg.sender, requestCounter);
        requestCounter = requestCounter.add(1);
    }

    function createRequestAsOracle(int256 data)
        external
        onlyOracleRequesters()
    {
        createRequest();
        // Fulfills the request it just created
        fulfill(requestCounter - 1, data);
    }

    function fulfill(
        uint256 requestInd,
        int256 data
        )
        public
        onlyOraclesNotYetFulfilled(requestInd)
    {
        requests[requestInd].fulfillments.push(data);
        awaitingFulfillment[requestInd][msg.sender] = false;
        updateLatestAnswer(requestInd);
        deleteAnswer(requestInd);
        emit RequestFulfilled(msg.sender, requestInd);
    }

    function updateLatestAnswer(uint256 requestInd)
        private
        minOraclesFulfilled(requestInd)
        onlyOnLatestAnswer(requestInd)
    {
        uint256 responseLength = requests[requestInd].fulfillments.length;
        uint256 middleIndex = responseLength.div(2);
        int256 currentAnswerTemp;
        if (responseLength % 2 == 0) {
            int256 median1 = quickselect(requests[requestInd].fulfillments, middleIndex);
            // quickselect is 1 indexed
            int256 median2 = quickselect(requests[requestInd].fulfillments, middleIndex.add(1));
            // signed integers are not supported by SafeMath
            currentAnswerTemp = median1.add(median2) / 2;
        } else {
            // quickselect is 1 indexed
            currentAnswerTemp = quickselect(requests[requestInd].fulfillments, middleIndex.add(1));
        }
        latestAnswerInd = requestInd;
        answerTimestamps[requestInd] = now;
        answers[requestInd] = currentAnswerTemp;
        emit AnswerUpdated(currentAnswerTemp, requestInd, now);
    }

    /**
    * @dev Returns the kth value of the ordered array
    * See: http://www.cs.yale.edu/homes/aspnes/pinewiki/QuickSelect.html
    * @param _a The list of elements to pull from
    * @param _k The index, 1 based, of the elements you want to pull from when ordered
    */
    function quickselect(
        int256[] memory _a,
        uint256 _k
        )
        private
        pure
        returns (int256)
    {
        int256[] memory a = _a;
        uint256 k = _k;
        uint256 aLen = a.length;
        int256[] memory a1 = new int256[](aLen);
        int256[] memory a2 = new int256[](aLen);
        uint256 a1Len;
        uint256 a2Len;
        int256 pivot;
        uint256 i;

        while (true) {
            pivot = a[aLen.div(2)];
            a1Len = 0;
            a2Len = 0;
            for (i = 0; i < aLen; i++) {
                if (a[i] < pivot) {
                    a1[a1Len] = a[i];
                    a1Len++;
                } else if (a[i] > pivot) {
                    a2[a2Len] = a[i];
                    a2Len++;
                }
            }
            if (k <= a1Len) {
                aLen = a1Len;
                (a, a1) = swap(a, a1);
            } else if (k > (aLen.sub(a2Len))) {
                k = k.sub(aLen.sub(a2Len));
                aLen = a2Len;
                (a, a2) = swap(a, a2);
            } else {
                return pivot;
            }
        }
    }

    /**
    * @dev Swaps the pointers to two uint256 arrays in memory
    * @param _a The pointer to the first in memory array
    * @param _b The pointer to the second in memory array
    */
    function swap(
        int256[] memory _a,
        int256[] memory _b
        )
        private
        pure
        returns(
            int256[] memory,
            int256[] memory
            )
    {
        return (_b, _a);
    }

    function deleteAnswer(uint256 requestInd)
        private
        allOraclesFulfilled(requestInd)
    {
        delete requests[requestInd].fulfillments;
    }

    function latestAnswer()
        external
        view
        returns (int256)
    {
        return answers[latestAnswerInd];
    }

    function latestTimestamp()
        external
        view
        returns (uint256)
    {
        return answerTimestamps[latestAnswerInd];
    }

    function getAnswer(uint256 requestInd)
        external
        view
        returns (int256)
    {
        return answers[requestInd];
    }

    function getTimestamp(uint256 requestInd)
        external
        view
        returns (uint256)
    {
        return answerTimestamps[requestInd];
    }

    function latestRound()
        external
        view
        returns (uint256)
    {
        return latestAnswerInd;
    }

    modifier minOraclesFulfilled(uint256 requestInd) {
        if (requests[requestInd].fulfillments.length >= requests[requestInd].minResponses) {
            _;
        }
    }

    modifier allOraclesFulfilled(uint256 requestInd) {
        if (requests[requestInd].fulfillments.length == requests[requestInd].maxResponses) {
            _;
        }
    }

    modifier onlyOnLatestAnswer(uint256 requestInd) {
        if (latestAnswerInd <= requestInd) {
            _;
        }
    }

    modifier onlyValidConfiguration(
        uint256 _minResponses,
        address[] _oracles
        )
    {
        require(_oracles.length >= _minResponses, "must have at least as many oracles as responses");
        _;
    }

    modifier onlyOraclesNotYetFulfilled(uint256 roundInd)
    {
        require(awaitingFulfillment[roundInd][msg.sender], "Cannot fulfill");
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
}
