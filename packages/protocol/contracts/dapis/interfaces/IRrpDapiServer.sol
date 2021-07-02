// SPDX-License-Identifier: MIT
interface IRrpDapiServer {
  event DapiRegistered(bytes16 indexed dapiId);

  function getDapi(bytes16 dapiId)
    external
    view
    returns (
      bytes32[] memory,
      address[] memory,
      uint256,
      uint256,
      uint256,
      address,
      bytes4,
      address
    );

  function registerDapi(
    bytes32[] calldata templateIds,
    address[] calldata designatedWallets,
    uint256 noResponsesToReduce,
    uint256 toleranceInPercentages,
    uint256 requesterIndex,
    address reduceAddress,
    bytes4 reduceFunctionId,
    address requestIndexResetter
  ) external returns (bytes16 dapiId);

  function resetDapiRequestIndex(bytes16 dapiId) external;

  function makeDapiRequest(bytes16 dapiId, bytes calldata parameters) external returns (uint64 currDapiRequestIndex);

  function fulfill(
    bytes32 requestId,
    uint256 statusCode,
    bytes calldata data
  ) external;
}
