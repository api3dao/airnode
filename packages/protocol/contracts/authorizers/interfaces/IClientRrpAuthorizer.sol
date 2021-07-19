// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRrpAuthorizer.sol";

interface IClientRrpAuthorizer is IRrpAuthorizer {
  enum AdminRank {
    Unauthorized,
    Admin,
    SuperAdmin
  }

  struct WhitelistStatus {
    uint64 expirationTimestamp;
    bool whitelistPastExpiration;
  }

  event ExtendedWhitelistExpiration(
    bytes32 indexed airnodeId,
    address indexed client,
    uint256 expiration,
    address indexed admin
  );

  event SetWhitelistExpiration(
    bytes32 indexed airnodeId,
    address indexed client,
    uint256 expiration,
    address indexed admin
  );

  event SetWhitelistStatusPastExpiration(
    bytes32 indexed airnodeId,
    address indexed client,
    bool status,
    address indexed admin
  );

  function extendWhitelistExpiration(
    bytes32 airnodeId,
    address client,
    uint64 expirationTimestamp
  ) external;

  function setWhitelistExpiration(
    bytes32 airnodeId,
    address client,
    uint64 expirationTimestamp
  ) external;

  function setWhitelistStatusPastExpiration(
    bytes32 airnodeId,
    address client,
    bool status
  ) external;

  function airnodeIdToClientToWhitelistStatus(bytes32 airnodeId, address client)
    external
    view
    returns (uint64 expirationTimestamp, bool whitelistPastExpiration);
}
