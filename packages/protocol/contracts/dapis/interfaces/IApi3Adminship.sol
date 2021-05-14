// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IApi3Adminship {
  // Unauthorized (0):  Cannot do anything
  // Admin (1):         Can extend whitelistings
  // Super admin (2):   Can set (i.e., extend or revoke) whitelistings, blacklist
  enum AdminStatus { Unauthorized, Admin, SuperAdmin }

  event SetMetaAdmin(address metaAdmin);

  event SetAdminStatus(address indexed admin, AdminStatus status);

  event RenouncedAdminStatus(address indexed admin);

  function setMetaAdmin(address _metaAdmin) external;

  function setAdminStatus(address admin, AdminStatus status) external;

  function renounceAdminStatus() external;
}
