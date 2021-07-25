// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RequesterRrpAuthorizer.sol";
import "./interfaces/ISelfRequesterRrpAuthorizer.sol";
import "../interfaces/IAirnodeRrp.sol";

/// @title Authorizer contract that whitelists requesters where each Airnode is
/// adminned by themselves
contract SelfRequesterRrpAuthorizer is
    RequesterRrpAuthorizer,
    ISelfRequesterRrpAuthorizer
{
    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 1;

    uint256 private constant MAX_RANK = 2**256 - 1;

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Respects RankedAdminnable, except treats the Airnode operator as
    /// the highest authority for the respective Airnode
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the adminned entity
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        // Airnodes are identified by addresses. Since Whitelister identifies
        // entities with `bytes32` types, we convert the Airnode address to a
        // `bytes32` type by padding with zeros.
        // See RequesterRrpAuthorizer.sol for more information
        if (adminnedId == bytes32(abi.encode(admin))) return MAX_RANK;
        return RankedAdminnable.getRank(adminnedId, admin);
    }
}
