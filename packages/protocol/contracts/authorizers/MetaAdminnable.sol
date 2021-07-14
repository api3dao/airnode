// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IMetaAdminnable.sol";

/// @title Contract that implements metaAdmin
contract MetaAdminnable is RankedAdminnable, IMetaAdminnable {
  /// @notice Keeps the metaAdmin for each individual adminned entity
  /// @dev This contract implements metaAdmin for a mapping of entities, rather
  /// than a single entity. However, the logic at the inheriting contract can
  /// easily be adapted to use this contract to metaAdmin a single entity (see
  /// Api3CwRrpAuthorizer.sol)
  mapping(bytes32 => address) public adminnedIdToMetaAdmin;

  /// @notice The metaAdmin is the max possible rank
  uint256 private constant MAX_RANK = 2**256 - 1;

  /// @param adminnedId ID of the entity being adminned
  /// @param _metaAdmin The address to be assigned as the metaAdmin
  constructor(bytes32 adminnedId, address _metaAdmin) {
    require(_metaAdmin != address(0), "Zero address");
    adminnedIdToMetaAdmin[adminnedId] = _metaAdmin;
    adminnedIdToAdminToRank[adminnedId][_metaAdmin] = MAX_RANK;
  }

  /// @dev Reverts if the caller's rank is not equal to metaAdmin Rank
  /// @param adminnedId ID of the entity being adminned
  modifier onlyMetaAdmin(bytes32 adminnedId) {
    require(getRank(adminnedId, msg.sender) == MAX_RANK, "Caller is not metaAdmin");
    _;
  }

  /// @notice Called to transfer the metaAdmin status from one address to another
  /// for an adminned entity.
  /// @param adminnedId ID of the entity being adminned
  /// @param _metaAdmin The address to be assigned as the metaAdmin
  function transferMetaAdminStatus(bytes32 adminnedId, address _metaAdmin) public override onlyMetaAdmin(adminnedId) {
    adminnedIdToMetaAdmin[adminnedId] = _metaAdmin;
    adminnedIdToAdminToRank[adminnedId][msg.sender] = 0;
    adminnedIdToAdminToRank[adminnedId][_metaAdmin] = MAX_RANK;
    emit TransferMetaAdminStatus(adminnedId, _metaAdmin);
  }

  /// @notice called to get the address of a metaAdmin of an adminned entity
  /// @param adminnedId ID of the entity being adminned
  /// @return Address of the metaAdmin of the adminned entity
  function getMetaAdmin(bytes32 adminnedId) public virtual returns (address) {
    return adminnedIdToMetaAdmin[adminnedId];
  }
}
