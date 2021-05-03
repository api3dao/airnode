// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IAuthorizer.sol";

interface ISelfAuthorizer is IAuthorizer {
  // Unauthorized (0):  Cannot do anything
  // Admin (1):         Can extend whitelistings
  // Super admin (2):   Can set (i.e., extend or revoke) whitelistings, blacklist
  enum AdminStatus { Unauthorized, Admin, SuperAdmin }

  event SetAdminStatus(bytes32 indexed airnodeId, address indexed admin, AdminStatus status);

  event RenouncedAdminStatus(bytes32 indexed airnodeId, address indexed admin);

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

  event SetBlacklistStatus(
    bytes32 indexed airnodeId,
    address indexed clientAddress,
    bool status,
    address indexed admin
  );

  function setAdminStatus(
    bytes32 airnodeId,
    address admin,
    AdminStatus status
  ) external;

  function renounceAdminStatus(bytes32 airnodeId) external;

  function extendWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint256 expiration
  ) external;

  function setWhitelistExpiration(
    bytes32 airnodeId,
    address clientAddress,
    uint256 expiration
  ) external;

  function setBlacklistStatus(
    bytes32 airnodeId,
    address clientAddress,
    bool status
  ) external;
}
