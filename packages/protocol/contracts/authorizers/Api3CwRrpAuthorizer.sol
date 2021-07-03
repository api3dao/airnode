// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ClientWhitelistRrpAuthorizer.sol";
import "./interfaces/IApi3CwRrpAuthorizer.sol";

/// @title Authorizer contract meta-adminned by the API3 DAO
contract Api3CwRrpAuthorizer is ClientWhitelistRrpAuthorizer, IApi3CwRrpAuthorizer {
  /// @notice Authorizer contracts use `authorizerType` to signal their type
  uint256 public constant override AUTHORIZER_TYPE = 2;
  /// @notice Address of the API3 meta-admin (e.g., the DAO Agent)
  address public api3Admin;
  /// @dev Highest rank precomputed to assign to the API3 admin. Note that the
  /// API3 admin cannot assign other admins this rank.
  uint256 private constant MAX_RANK = 2**256 - 1;

  /// @param _api3Admin Address that will be set as the API3 meta-admin
  constructor(address _api3Admin) {
    api3Admin = msg.sender;
    setApi3Admin(_api3Admin);
  }

  /// @notice Called by the API3 meta-admin to set the API3 meta-admin
  /// @param _api3Admin Address that will be set as the API3 meta-admin
  function setApi3Admin(address _api3Admin) public override {
    require(msg.sender == api3Admin, "Caller not API3 admin");
    require(_api3Admin != address(0), "Zero address");
    api3Admin = _api3Admin;
    emit SetApi3Admin(_api3Admin);
  }

  /// @notice Called to get the rank of an admin for an adminned entity
  /// @dev Overriden to give the API3 admin full control and disable the
  /// Airnode ID-specific admin ranks (meaning that all admins are kept for ID
  /// 0 and there will be no point in setting admin ranks for Airnode IDs other
  /// than 0)
  /// @param adminnedId ID of the entity being adminned (obsolete, left to
  /// override the existing `getRank()`)
  /// @param admin Admin address whose rank will be returned
  /// @return Admin rank
  // solhint-disable-next-line no-unused-vars
  function getRank(bytes32 adminnedId, address admin) public override returns (uint256) {
    if (msg.sender == api3Admin) return MAX_RANK;
    return adminnedIdToAdminToRank[bytes32(0)][admin];
  }
}
