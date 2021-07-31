// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../admin/MetaAdminnable.sol";
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

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Overriden to use MetaAdminnable ranks and ignore the `adminnedId`
    /// the caller provides. The caller is recommended to use `bytes32(0)` as
    /// the `adminnedId` here, see the @dev string of the contract and the docs
    /// for more information.
    /// @param adminnedId ID of the entity being adminned (not used)
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(
        bytes32 adminnedId, // solhint-disable-line no-unused-vars
        address admin
    )
        public
        view
        override(MetaAdminnable, RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        return MetaAdminnable.getRank(bytes32(0), admin);
    }
}
