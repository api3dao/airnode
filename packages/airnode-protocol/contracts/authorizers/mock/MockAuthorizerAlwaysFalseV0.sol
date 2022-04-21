// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IAuthorizerV0.sol";

/// @title A mock authorizer that always returns false
contract MockAuthorizerAlwaysFalseV0 is IAuthorizerV0 {
    function isAuthorizedV0(
        bytes32 requestId, // solhint-disable-line
        address airnode, // solhint-disable-line
        bytes32 endpointId, // solhint-disable-line
        address sponsor, // solhint-disable-line
        address requester // solhint-disable-line
    ) external view virtual override returns (bool status) {
        status = false;
    }
}
