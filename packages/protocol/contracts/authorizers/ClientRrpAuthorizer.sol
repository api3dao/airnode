// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IClientRrpAuthorizer.sol";

/// @title Authorizer contract where clients are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
abstract contract ClientRrpAuthorizer is
    RankedAdminnable,
    IClientRrpAuthorizer
{
    /// @notice Keeps the whitelisting statuses of clients for individual
    /// Airnodes
    mapping(bytes32 => mapping(address => WhitelistStatus))
        public
        override airnodeIdToClientToWhitelistStatus;

    /// @notice Called by an admin to extend the whitelist expiration of a
    /// client
    /// @param airnodeId Airnode ID
    /// @param client Client
    /// @param expirationTimestamp Timestamp at which the client will no longer
    /// be whitelisted
    function extendWhitelistExpiration(
        bytes32 airnodeId,
        address client,
        uint64 expirationTimestamp
    ) external override onlyWithRank(airnodeId, uint256(AdminRank.Admin)) {
        require(
            expirationTimestamp >
                airnodeIdToClientToWhitelistStatus[airnodeId][client]
                .expirationTimestamp,
            "Expiration not extended"
        );
        airnodeIdToClientToWhitelistStatus[airnodeId][client]
        .expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            airnodeId,
            client,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// client
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten the expiration
    /// @param airnodeId Airnode ID
    /// @param client Client
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// client will expire
    function setWhitelistExpiration(
        bytes32 airnodeId,
        address client,
        uint64 expirationTimestamp
    ) external override onlyWithRank(airnodeId, uint256(AdminRank.SuperAdmin)) {
        airnodeIdToClientToWhitelistStatus[airnodeId][client]
        .expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            airnodeId,
            client,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a client
    /// past expiration
    /// @param airnodeId Airnode ID
    /// @param client Client
    /// @param status Whitelist status that the client will have past expiration
    function setWhitelistStatusPastExpiration(
        bytes32 airnodeId,
        address client,
        bool status
    ) external override onlyWithRank(airnodeId, uint256(AdminRank.SuperAdmin)) {
        airnodeIdToClientToWhitelistStatus[airnodeId][client]
        .whitelistPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            airnodeId,
            client,
            status,
            msg.sender
        );
    }

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
         = airnodeIdToClientToWhitelistStatus[airnodeId][client];
        return
            designatedWallet.balance != 0 &&
            (whitelistStatus.whitelistPastExpiration ||
                whitelistStatus.expirationTimestamp > block.timestamp);
    }
}
