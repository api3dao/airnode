// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/Whitelister.sol";
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
        bytes32 endpointId,
        address sponsor, // solhint-disable-line no-unused-vars
        address requester
    ) external view override returns (bool) {
        return
            userIsWhitelisted(deriveServiceId(airnode, endpointId), requester);
    }

    /// @notice Called to check if a user is whitelisted to use a service
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @return isWhitelisted If the user is whitelisted
    function userIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address user
    ) external view override returns (bool isWhitelisted) {
        return userIsWhitelisted(deriveServiceId(airnode, endpointId), user);
    }

    /// @notice Called to get the detailed whitelist status of a user for an
    /// Airnode–endpoint pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    /// @return whitelistedPastExpiration Whitelist status that the user will
    /// have past expiration
    function airnodeToEndpointIdToUserToWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address user
    )
        external
        view
        override
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                deriveServiceId(airnode, endpointId)
            ][user];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        whitelistedPastExpiration = whitelistStatus.whitelistedPastExpiration;
    }

    /// @notice Used internally to derive the service ID from the Airnode
    /// address and the endpoint ID
    /// @dev Whitelister contract that this contract inherits keeps whitelist
    /// statuses in a single level hash map. We have two parameters here
    /// (Airnode address and endpoint ID) from which we need to derive a single
    /// service ID, and we do this by calculating their hash.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @return serviceId Service ID
    function deriveServiceId(address airnode, bytes32 endpointId)
        internal
        pure
        returns (bytes32 serviceId)
    {
        return keccak256(abi.encodePacked(airnode, endpointId));
    }
}
