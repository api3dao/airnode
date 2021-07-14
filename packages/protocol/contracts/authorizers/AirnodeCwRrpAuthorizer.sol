// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IAirnodeRrp.sol";
import "./ClientWhitelistRrpAuthorizer.sol";
import "./interfaces/IAirnodeCwRrpAuthorizer.sol";

/// @title Authorizer contract where each Airnode is adminned by themselves
contract AirnodeCwRrpAuthorizer is ClientWhitelistRrpAuthorizer, IAirnodeCwRrpAuthorizer {
  /// @notice Authorizer contracts use `authorizerType` to signal their type
  uint256 public constant override AUTHORIZER_TYPE = 1;
  /// @notice Airnode RRP contract address
  IAirnodeRrp public airnodeRrp;
  /// @dev Highest rank precomputed to assign to the Airnode admin. Note that
  /// the Airnode admin cannot assign other admins this rank.
  uint256 private constant MAX_RANK = 2**256 - 1;

  /// @notice constructor sets the airnodeRrp and also sets caller as the metaAdmin
  /// for ID 0
  /// @param _airnodeRrp Airnode RRP contract address
  constructor(address _airnodeRrp) MetaAdminnable(bytes32(0), msg.sender) {
    require(_airnodeRrp != address(0), "Zero address");
    airnodeRrp = IAirnodeRrp(_airnodeRrp);
  }

  /// @notice called to get the address of a metaAdmin of an adminned entity
  /// @dev Ovveriden to specify the Airnode Admin as the metaAdmin of the Airnode
  /// @param adminnedId ID of the entity being adminned
  /// @return Address of the metaAdmin of the adminned entity
  function getMetaAdmin(bytes32 adminnedId) public override returns (address) {
    if (adminnedId == bytes32(0)) return adminnedIdToMetaAdmin[bytes32(0)];
    (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(adminnedId);
    return airnodeAdmin;
  }

  /// @notice Called to get the rank of an admin for an adminned entity
  /// @dev Overriden to give the Airnode admin full control over the
  /// authorization of the respective Airnode
  /// @param adminnedId ID of the entity being adminned
  /// @param admin Admin address whose rank will be returned
  /// @return Admin rank for the adminned entity
  function getRank(bytes32 adminnedId, address admin) public override returns (uint256) {
    (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(adminnedId);
    if (msg.sender == airnodeAdmin) return MAX_RANK;
    return adminnedIdToAdminToRank[adminnedId][admin];
  }
}
