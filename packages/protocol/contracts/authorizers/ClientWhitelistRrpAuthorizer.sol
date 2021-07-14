// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./MetaAdminnable.sol";
import "./interfaces/IClientWhitelistRrpAuthorizer.sol";

/// @title Authorizer contract where client addresses are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
abstract contract ClientWhitelistRrpAuthorizer is MetaAdminnable, IClientWhitelistRrpAuthorizer {
  /// @notice Keeps the whitelisting statuses of clients for individual Airnodes
  mapping(bytes32 => mapping(address => WhitelistStatus)) public airnodeIdToClientAddressToWhitelistStatus;

  /// @notice Called by an admin to extend the whitelist expiration of a
  /// client
  /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
  /// @param clientAddress Client address
  /// @param expirationTimestamp Timestamp at which the client will no longer
  /// be whitelisted
  function extendWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint64 expirationTimestamp
  ) external override onlyWithRank(airnodeId, uint256(AdminRank.Admin)) {
    require(
      expirationTimestamp > airnodeIdToClientAddressToWhitelistStatus[airnodeId][clientAddress].expirationTimestamp,
      "Expiration not extended"
    );
    airnodeIdToClientAddressToWhitelistStatus[airnodeId][clientAddress].expirationTimestamp = expirationTimestamp;
    emit ExtendedWhitelistExpiration(airnodeId, clientAddress, expirationTimestamp, msg.sender);
  }

  /// @notice Called by a super admin to set the whitelisting  expiration of a
  /// client
  /// @dev Unlike `extendWhitelistExpiration()`, this can hasten the expiration
  /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
  /// @param clientAddress Client address
  /// @param expirationTimestamp Timestamp at which the whitelisting of the
  /// client will expire
  function setWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint64 expirationTimestamp
  ) external override onlyWithRank(airnodeId, uint256(AdminRank.SuperAdmin)) {
    airnodeIdToClientAddressToWhitelistStatus[airnodeId][clientAddress].expirationTimestamp = expirationTimestamp;
    emit SetWhitelistExpiration(airnodeId, clientAddress, expirationTimestamp, msg.sender);
  }

  /// @notice Called by a super admin to set the whitelist status of a client
  /// past expiration
  /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
  /// @param clientAddress Client address
  /// @param status Whitelist status that the client will have past expiration
  function setWhitelistStatusPastExpiration(
    bytes32 airnodeId,
    address clientAddress,
    bool status
  ) external override onlyWithRank(airnodeId, uint256(AdminRank.SuperAdmin)) {
    airnodeIdToClientAddressToWhitelistStatus[airnodeId][clientAddress].whitelistPastExpiration = status;
    emit SetWhitelistStatusPastExpiration(airnodeId, clientAddress, status, msg.sender);
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
  /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
  /// @param endpointId Endpoint ID
  /// @param requesterIndex Requester index from `RequesterStore.sol`
  /// @param designatedWallet Designated wallet
  /// @param clientAddress Client address
  /// @return Authorization status of the request
  function isAuthorized(
    bytes32 requestId, // solhint-disable-line no-unused-vars
    bytes32 airnodeId,
    bytes32 endpointId, // solhint-disable-line no-unused-vars
    uint256 requesterIndex, // solhint-disable-line no-unused-vars
    address designatedWallet,
    address clientAddress
  ) external view override returns (bool) {
    WhitelistStatus storage whitelistStatus = airnodeIdToClientAddressToWhitelistStatus[airnodeId][clientAddress];
    return
      designatedWallet.balance != 0 &&
      (whitelistStatus.whitelistPastExpiration || whitelistStatus.expirationTimestamp > block.timestamp);
  }
}
