// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/MetaAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/IApi3RequesterRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists requesters where the API3 DAO is
/// the metaAdmin
/// @dev Unlike the MetaAdminnable contract that it inherits, this contract
/// does not support the independent adminning of different entities. In other
/// words, when an address is assigned to be an Admin/SuperAdmin, it becomes
/// the Admin/SuperAdmin of all entities being adminned. To achieve this, when
/// interacting with this contract, always use `bytes32(0)` as the
/// `adminnedId`.
contract Api3RequesterRrpAuthorizer is
    MetaAdminnable,
    RequesterRrpAuthorizer,
    IApi3RequesterRrpAuthorizer
{
    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 2;

    /// @param metaAdmin_ Address that will be set as the API3 metaAdmin
    constructor(address metaAdmin_) MetaAdminnable(metaAdmin_) {}

    /// @notice Called by an admin of higher rank to set the rank of an admin of
    /// lower rank
    /// @dev Overriden to require only using bytes32(0) as the adminnedId
    /// @param adminnedId ID of the entity being adminned
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        bytes32 adminnedId,
        address targetAdmin,
        uint256 newRank
    ) public override(RankedAdminnable, IRankedAdminnable) {
        require(adminnedId == bytes32(0), "adminnedId not zero");
        super.setRank(adminnedId, targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank
    /// @dev Overriden to require only using bytes32(0) as the adminnedId
    /// @param adminnedId ID of the entity being adminned
    /// @param newRank Rank to be set
    function decreaseSelfRank(bytes32 adminnedId, uint256 newRank)
        public
        override(RankedAdminnable, IRankedAdminnable)
    {
        require(adminnedId == bytes32(0), "adminnedId not zero");
        super.decreaseSelfRank(adminnedId, newRank);
    }

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Overriding MetaAdminnable ranks to force `adminnedId`to be `bytes32(0)`
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(MetaAdminnable, RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        require(adminnedId == bytes32(0), "adminnedId not zero");
        return MetaAdminnable.getRank(adminnedId, admin);
    }
}
