// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./MetaAdminnable.sol";
import "./ClientRrpAuthorizer.sol";
import "./interfaces/IApi3ClientRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists clients where the API3 DAO is
/// the metaAdmin
contract Api3ClientRrpAuthorizer is
    ClientRrpAuthorizer,
    MetaAdminnable,
    IApi3ClientRrpAuthorizer
{
    /// @notice Authorizer contracts use `authorizerType` to signal their type
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
        override(MetaAdminnable, RankedAdminnable)
        returns (uint256)
    {
        return MetaAdminnable.getRank(adminnedId, admin);
    }
}
