// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./interfaces/IApi3Adminship.sol";

/// @title Adminship contract controlled by the API3 DAO
contract Api3Adminship is IApi3Adminship {
  /// @dev Meta admin sets the admin statuses of addresses and has super
  /// admin privileges
  address public metaAdmin;
  mapping(address => AdminStatus) public adminStatuses;

  /// @dev Reverts if the caller is not the meta admin or has admin/superadmin priviliges
  modifier onlyAdminOrMetaAdmin() {
    require(adminStatuses[msg.sender] >= AdminStatus.Admin || msg.sender == metaAdmin, "Unauthorized");
    _;
  }

  /// @param _metaAdmin Address that will be set as the meta admin
  constructor(address _metaAdmin) {
    require(_metaAdmin != address(0), "Zero address");
    metaAdmin = _metaAdmin;
  }

  /// @notice Called by the meta admin to set the meta admin
  /// @param _metaAdmin Address that will be set as the meta admin
  function setMetaAdmin(address _metaAdmin) external override {
    require(msg.sender == metaAdmin, "Unauthorized");
    require(_metaAdmin != address(0), "Zero address");
    metaAdmin = _metaAdmin;
    emit SetMetaAdmin(metaAdmin);
  }

  /// @notice Called by the meta admin to set the admin status of an address
  /// @param admin Address whose admin status will be set
  /// @param status Admin status
  function setAdminStatus(address admin, AdminStatus status) external override {
    require(msg.sender == metaAdmin, "Unauthorized");
    adminStatuses[admin] = status;
    emit SetAdminStatus(admin, status);
  }

  /// @notice Called by an admin to renounce their admin status
  /// @dev To minimize the number of transactions the meta admin will have
  /// to make, the contract is implemented optimistically, i.e., the admins
  /// are expected to renounce their admin status when they are needed to.
  /// If this is not the case, the meta admin can always revoke their
  /// adminship.
  /// This method cannot be used by the meta admin to renounce their meta
  /// adminship.
  function renounceAdminStatus() external override {
    require(adminStatuses[msg.sender] > AdminStatus.Unauthorized, "Unauthorized");
    adminStatuses[msg.sender] = AdminStatus.Unauthorized;
    emit RenouncedAdminStatus(msg.sender);
  }
}
