/*
The MIT License (MIT)

Copyright (c) 2018 SmartContract ChainLink, Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
pragma solidity 0.4.24;

import "./vendor/SignedSafeMath.sol";
import "./vendor/SafeMath.sol";
import "./vendor/Ownable.sol";


contract ChainlinkAggregator is Ownable {
    using SignedSafeMath for int256;
    using SafeMath for uint256;

    struct Answer {
        uint128 minResponses;
        uint128 maxResponses;
        int256[] responses;
    }

    uint256 internal latestCompletedAnswer;
    mapping(uint256 => Answer) internal answers;
    mapping(uint256 => int256) internal currentAnswers;
    mapping(uint256 => uint256) internal updatedTimestamps;

    event AnswerUpdated(uint256 indexed requestInd, int256 answer);

    /**
    * @dev Performs aggregation of the answers received from the Chainlink nodes.
    * Assumes that at least half the oracles are honest and so can't contol the
    * middle of the ordered responses.
    * @param _answerId The answer ID associated with the group of requests
    */
    function updateLatestAnswer(uint256 _answerId)
        internal
        ensureMinResponsesReceived(_answerId)
        ensureOnlyLatestAnswer(_answerId)
    {
        uint256 responseLength = answers[_answerId].responses.length;
        uint256 middleIndex = responseLength.div(2);
        int256 currentAnswerTemp;
        if (responseLength % 2 == 0) {
            int256 median1 = quickselect(answers[_answerId].responses, middleIndex);
            // quickselect is 1 indexed
            int256 median2 = quickselect(answers[_answerId].responses, middleIndex.add(1));
            // signed integers are not supported by SafeMath
            currentAnswerTemp = median1.add(median2) / 2;
        } else {
            // quickselect is 1 indexed
            currentAnswerTemp = quickselect(answers[_answerId].responses, middleIndex.add(1));
        }
        latestCompletedAnswer = _answerId;
        updatedTimestamps[_answerId] = now;
        currentAnswers[_answerId] = currentAnswerTemp;
        emit AnswerUpdated(_answerId, currentAnswerTemp);
    }

    /**
    * @notice get the most recently reported answer
    */
    function latestAnswer()
      external
      view
      returns (int256)
    {
      return currentAnswers[latestCompletedAnswer];
    }

    /**
    * @notice get the last updated at block timestamp
    */
    function latestTimestamp()
      external
      view
      returns (uint256)
    {
      return updatedTimestamps[latestCompletedAnswer];
    }

    /**
    * @notice get past rounds answers
    * @param _roundId the answer number to retrieve the answer for
    */
    function getAnswer(uint256 _roundId)
      external
      view
      returns (int256)
    {
      return currentAnswers[_roundId];
    }

    /**
    * @notice get block timestamp when an answer was last updated
    * @param _roundId the answer number to retrieve the updated timestamp for
    */
    function getTimestamp(uint256 _roundId)
      external
      view
      returns (uint256)
    {
      return updatedTimestamps[_roundId];
    }

    /**
    * @notice get the latest completed round where the answer was updated
    */
    function latestRound()
      external
      view
      returns (uint256)
    {
      return latestCompletedAnswer;
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
        internal
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
        internal
        pure
        returns(
            int256[] memory,
            int256[] memory
            )
    {
        return (_b, _a);
    }

    /**
    * @dev Cleans up the answer record if all responses have been received.
    * @param _answerId The identifier of the answer to be deleted
    */
    function deleteAnswer(uint256 _answerId)
      internal
      ensureAllResponsesReceived(_answerId)
    {
      delete answers[_answerId];
    }

    /**
    * @dev Prevents taking an action if the minimum number of responses has not
    * been received for an answer.
    * @param _answerId The the identifier of the answer that keeps track of the responses.
    */
    modifier ensureMinResponsesReceived(uint256 _answerId) {
        if (answers[_answerId].responses.length >= answers[_answerId].minResponses) {
            _;
        }
    }

    /**
    * @dev Prevents taking an action if not all responses are received for an answer.
    * @param _answerId The the identifier of the answer that keeps track of the responses.
    */
    modifier ensureAllResponsesReceived(uint256 _answerId) {
      if (answers[_answerId].responses.length == answers[_answerId].maxResponses) {
        _;
      }
    }

    /**
    * @dev Prevents taking an action if a newer answer has been recorded.
    * @param _answerId The current answer's identifier.
    * Answer IDs are in ascending order.
    */
    modifier ensureOnlyLatestAnswer(uint256 _answerId) {
        if (latestCompletedAnswer <= _answerId) {
            _;
        }
    }
}
