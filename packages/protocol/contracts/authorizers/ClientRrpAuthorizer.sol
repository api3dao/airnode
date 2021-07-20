// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./ClientWhitelister.sol";
import "./interfaces/IClientRrpAuthorizer.sol";

/// @title Authorizer contract where clients are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
abstract contract ClientRrpAuthorizer is
    ClientWhitelister,
    IClientRrpAuthorizer
{
    /// @notice Verifies the authorization status of a request
    /// @dev This method has redundant arguments because all authorizer
    /// contracts have to have the same interface and potential authorizer
    /// contracts may require to access the arguments that are redundant here.
    /// Note that we are also validating that the `designatedWallet` balance is
    /// not `0`. The ideal condition to check would be if `designatedWallet`
    /// has enough funds to fulfill the request. However, that is not a
    /// condition that can be checked deterministically.
    /// @param requestId Request ID
    /// @param airnodeId Airnode ID
    /// @param endpointId Endpoint ID
    /// @param requester Requester
    /// @param designatedWallet Designated wallet
    /// @param client Client
    /// @return Authorization status of the request
    function isAuthorized(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        bytes32 airnodeId,
        bytes32 endpointId, // solhint-disable-line no-unused-vars
        address requester, // solhint-disable-line no-unused-vars
        address designatedWallet,
        address client
    ) external view override returns (bool) {

            WhitelistStatus storage whitelistStatus
         = serviceIdToClientToWhitelistStatus[airnodeId][client];
        return
            designatedWallet.balance != 0 &&
            (whitelistStatus.whitelistPastExpiration ||
                whitelistStatus.expirationTimestamp > block.timestamp);
    }
}
