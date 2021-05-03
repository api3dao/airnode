// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../interfaces/IAuthorizer.sol";

/// @title A mock authorizer that always returns true
contract MockAuthorizerAlwaysTrue is IAuthorizer {
  uint256 public immutable override authorizerType = 33;

  function isAuthorized(
    bytes32 requestId, // solhint-disable-line
    bytes32 airnodeId, // solhint-disable-line
    bytes32 endpointId, // solhint-disable-line
    uint256 requesterIndex, // solhint-disable-line
    address designatedWallet, // solhint-disable-line
    address clientAddress // solhint-disable-line
  ) external view virtual override returns (bool status) {
    status = true;
  }
}
