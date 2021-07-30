// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../admin/MetaAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/IApi3RequesterRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists requesters where the API3 DAO is
/// the metaAdmin
contract Api3RequesterRrpAuthorizer is
    MetaAdminnable,
    RequesterRrpAuthorizer,
    IApi3RequesterRrpAuthorizer
{
    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 2;

    /// @param metaAdmin_ Address that will be set as the API3 metaAdmin
    constructor(address metaAdmin_) MetaAdminnable(metaAdmin_) {}

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Overriden to use metaAdminned ranks
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(MetaAdminnable, RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        return MetaAdminnable.getRank(bytes32(0), admin);
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin of
    /// lower rank
    /// @param targetAdmin Target admin addressZ
    /// @param newRank Rank to be set
    function setRank(address targetAdmin, uint256 newRank) public {
        RankedAdminnable.setRank(bytes32(0), targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank
    /// @param newRank Rank to be set
    function decreaseSelfRank(uint256 newRank) public {
        RankedAdminnable.decreaseSelfRank(bytes32(0), newRank);
    }
}
