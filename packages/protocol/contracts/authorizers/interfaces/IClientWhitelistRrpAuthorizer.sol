// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRrpAuthorizer.sol";

interface IClientWhitelistRrpAuthorizer is IRrpAuthorizer {
  enum AdminRank {
    Unauthorized,
    Admin,
    SuperAdmin
  }

  struct WhitelistStatus {
    uint64 expirationTimestamp;
    bool whitelistPastExpiration; // Stored as 8 bits
  }

  event ExtendedWhitelistExpiration(
    bytes32 indexed airnodeId,
    address indexed clientAddress,
    uint256 expiration,
    address indexed admin
  );

  event SetWhitelistExpiration(
    bytes32 indexed airnodeId,
    address indexed clientAddress,
    uint256 expiration,
    address indexed admin
  );

  event SetWhitelistStatusPastExpiration(
    bytes32 indexed airnodeId,
    address indexed clientAddress,
    bool status,
    address indexed admin
  );

  function extendWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint64 expirationTimestamp
  ) external;

  function setWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint64 expirationTimestamp
  ) external;

  function setWhitelistStatusPastExpiration(
    bytes32 airnodeId,
    address clientAddress,
    bool status
  ) external;
}
