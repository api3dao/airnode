// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IMetaAdminnable {
  event TransferMetaAdminStatus(bytes32 indexed adminnedId, address indexed _metaAdmin);

  function transferMetaAdminStatus(bytes32 adminnedId, address _metaAdmin) external;
}
