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
    function extendWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    ) external override {
        extendWhitelistExpiration(
            deriveAdminnedId(airnode, endpointId),
            user,
            expirationTimestamp
        );
    }

    function setWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    ) external override {
        setWhitelistExpiration(
            deriveAdminnedId(airnode, endpointId),
            user,
            expirationTimestamp
        );
    }

    function setWhitelistStatusPastExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        bool status
    ) external override {
        setWhitelistStatusPastExpiration(
            deriveAdminnedId(airnode, endpointId),
            user,
            status
        );
    }

    function userIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address user
    ) external view override returns (bool isWhitelisted) {
        return userIsWhitelisted(deriveAdminnedId(airnode, endpointId), user);
    }

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
                deriveAdminnedId(airnode, endpointId)
            ][user];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        whitelistedPastExpiration = whitelistStatus.whitelistedPastExpiration;
    }

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
            userIsWhitelisted(deriveAdminnedId(airnode, endpointId), requester);
    }

    function deriveAdminnedId(address airnode, bytes32 endpointId)
        internal
        pure
        returns (bytes32 adminnedId)
    {
        return keccak256(abi.encodePacked(airnode, endpointId));
    }
}
