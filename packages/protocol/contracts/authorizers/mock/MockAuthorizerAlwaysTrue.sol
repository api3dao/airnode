// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IRrpAuthorizerNew.sol";

/// @title A mock authorizer that always returns true
contract MockAuthorizerAlwaysTrue is IRrpAuthorizerNew {
    uint256 public constant override AUTHORIZER_TYPE = 333;

    function isAuthorized(
        bytes32 requestId, // solhint-disable-line
        address airnode, // solhint-disable-line
        bytes32 endpointId, // solhint-disable-line
        address sponsor, // solhint-disable-line
        address requester // solhint-disable-line
    ) external view virtual override returns (bool status) {
        status = true;
    }
}
