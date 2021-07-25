// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./Whitelister.sol";
import "./interfaces/IRequesterRrpAuthorizer.sol";

/// @title Authorizer contract where requesters are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
abstract contract RequesterRrpAuthorizer is
    Whitelister,
    IRequesterRrpAuthorizer
{
    /// @notice Verifies the authorization status of a request
    /// @dev This method has redundant arguments because all authorizer
    /// contracts have to have the same interface and potential authorizer
    /// contracts may require to access the arguments that are redundant here
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return Authorization status of the request
    function isAuthorized(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        address airnode,
        bytes32 endpointId, // solhint-disable-line no-unused-vars
        address sponsor, // solhint-disable-line no-unused-vars
        address requester
    ) external view override returns (bool) {
        return userIsWhitelisted(bytes32(abi.encode(airnode)), requester);
    }
}
