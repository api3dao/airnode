// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IRrpAuthorizer.sol";

/// @title A mock authorizer that always returns true
contract MockAuthorizerAlwaysTrue is IRrpAuthorizer {
    uint256 public constant override AUTHORIZER_TYPE = 33;

    function isAuthorized(
        bytes32 requestId, // solhint-disable-line
        bytes32 airnodeId, // solhint-disable-line
        bytes32 endpointId, // solhint-disable-line
        address requester, // solhint-disable-line
        address designatedWallet, // solhint-disable-line
        address clientAddress // solhint-disable-line
    ) external view virtual override returns (bool status) {
        status = true;
    }
}
