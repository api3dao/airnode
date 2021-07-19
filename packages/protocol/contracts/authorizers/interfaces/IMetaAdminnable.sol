// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRankedAdminnable.sol";

interface IMetaAdminnable is IRankedAdminnable {
  event TransferredMetaAdminStatus(address indexed metaAdmin);

  function transferMetaAdminStatus(address metaAdmin_) external;

  function metaAdmin() external view returns (address);
}
