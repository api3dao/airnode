// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IAirnodeRrp.sol";
import "./ClientRrpAuthorizer.sol";
import "./interfaces/IAirnodeClientRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists clients where each Airnode is
/// adminned by themselves
contract AirnodeClientRrpAuthorizer is ClientRrpAuthorizer, IAirnodeClientRrpAuthorizer {
  /// @notice Authorizer contracts use `authorizerType` to signal their type
  uint256 public constant override AUTHORIZER_TYPE = 1;
  /// @notice Airnode RRP contract address
  IAirnodeRrp public airnodeRrp;

  uint256 private constant MAX_RANK = 2**256 - 1;

  /// @param airnodeRrp_ Airnode RRP contract address
  constructor(address airnodeRrp_) {
    require(airnodeRrp_ != address(0), "Zero address");
    airnodeRrp = IAirnodeRrp(airnodeRrp_);
  }

  /// @notice Called to get the rank of an admin for an adminned entity
  /// @dev Respects RankedAdminnable, except treats the Airnode admin as the
  /// highest authority for the respective Airnode
  /// @param adminnedId ID of the entity being adminned
  /// @param admin Admin address whose rank will be returned
  /// @return Admin rank for the adminned entity
  function getRank(bytes32 adminnedId, address admin) public view override returns (uint256) {
    (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(adminnedId);
    if (msg.sender == airnodeAdmin) return MAX_RANK;
    return RankedAdminnable.getRank(adminnedId, admin);
  }
}
