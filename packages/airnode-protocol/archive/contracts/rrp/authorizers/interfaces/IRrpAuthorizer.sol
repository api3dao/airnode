// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IRrpAuthorizer {
    // solhint-disable-next-line func-name-mixedcase
    function AUTHORIZER_TYPE() external view returns (uint256);

    function isAuthorized(
        bytes32 requestId,
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address requester
    ) external view returns (bool);
}
