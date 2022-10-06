//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@api3/airnode-protocol/contracts/authorizers/interfaces/IAuthorizerV0.sol";

/* solhint-disable no-unused-vars */
// prettier-ignore
contract EverythingAuthorizer is IAuthorizerV0
{
  function isAuthorizedV0(
    bytes32 requestId,
    address airnode,
    bytes32 endpointId,
    address sponsor,
    address requester
  ) external pure override returns (bool) {
    return true;
  }
}
/* solhint-enable no-unused-vars */
