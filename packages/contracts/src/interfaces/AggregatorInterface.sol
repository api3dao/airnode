pragma solidity >=0.4.24;

interface AggregatorInterface {
  function latestAnswer() external view returns (int256);
  function latestTimestamp() external view returns (uint256);
  function latestRound() external view returns (uint256);
  function getAnswer(uint256 roundId) external view returns (int256);
  function getTimestamp(uint256 roundId) external view returns (uint256);

  event NewRequest(address indexed requester, uint256 requestInd);
  event RequestFulfilled(address indexed fulfiller, uint256 requestInd);
  event AnswerUpdated(int256 indexed answer, uint256 indexed requestInd, uint256 timestamp);
}
