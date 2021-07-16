// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./ClientWhitelistRrpAuthorizer.sol";
import "./interfaces/IApi3CwRrpAuthorizer.sol";

/// @title Authorizer contract meta-adminned by the API3 DAO
contract Api3CwRrpAuthorizer is
    ClientWhitelistRrpAuthorizer,
    IApi3CwRrpAuthorizer
{
    /// @notice Authorizer contracts use `authorizerType` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 2;

    /// @param _api3MetaAdmin Address that will be set as the API3 meta-admin
    constructor(address _api3MetaAdmin)
        MetaAdminnable(bytes32(0), _api3MetaAdmin)
    {}

    /// @notice Called to get the api3MetaAdmin
    /// @dev Use this instead of `getMetaAdmin(bytes32)` with
    /// `adminnedId` of `bytes32(0)`
    function getMetaAdmin() external override returns (address) {
        return getMetaAdmin(bytes32(0));
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin of
    /// lower rank
    /// @dev Use this instead of `setRank(bytes32,address,uint256)` with
    /// `adminnedId` of `bytes32(0)`
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(address targetAdmin, uint256 newRank) external override {
        setRank(bytes32(0), targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank
    /// @dev Use this instead of `setRank(bytes32,uint256)` with `adminnedId`
    /// of `bytes32(0)`
    /// @param newRank Rank to be set
    function decreaseSelfRank(uint256 newRank) external override {
        decreaseSelfRank(bytes32(0), newRank);
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
    function getRank(bytes32 adminnedId, address admin)
        public
        override
        returns (uint256)
    {
        if (msg.sender == getMetaAdmin(bytes32(0)))
            return adminnedIdToAdminToRank[bytes32(0)][msg.sender];
        return adminnedIdToAdminToRank[bytes32(0)][admin];
    }
}
