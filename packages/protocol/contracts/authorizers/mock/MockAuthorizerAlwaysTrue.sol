// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IRrpAuthorizer.sol";

/// @title A mock authorizer that always returns true
contract MockAuthorizerAlwaysTrue is IRrpAuthorizer {
    uint256 public constant override AUTHORIZER_TYPE = 123;

    function isAuthorized(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        bytes32 airnodeId, // solhint-disable-line no-unused-vars
        bytes32 endpointId, // solhint-disable-line no-unused-vars
        uint256 requester, // solhint-disable-line no-unused-vars
        address designatedWallet, // solhint-disable-line no-unused-vars
        address clientAddress // solhint-disable-line no-unused-vars
    ) external view virtual override returns (bool status) {
        status = true;
    }
}
