// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IRrpAuthorizer {
  // solhint-disable-next-line func-name-mixedcase
  function AUTHORIZER_TYPE() external view returns (uint256);

  function isAuthorized(
    bytes32 requestId,
    bytes32 airnodeId,
    bytes32 endpointId,
    uint256 requesterIndex,
    address designatedWallet,
    address clientAddress
  ) external view returns (bool);
}
