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

    uint256 private constant MAX_RANK = type(uint256).max;

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Respects RankedAdminnable, except treats the Airnode operator as
    /// the highest authority for the respective Airnode
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the adminned entity
    function getRank(
        address airnode,
        bytes32 endpointId,
        address admin
    ) external view returns (uint256) {
        bytes32 adminnedId = deriveAdminnedId(airnode, endpointId);
        if (adminnedId == bytes32(abi.encode(admin))) return MAX_RANK;
        return RankedAdminnable.getRank(adminnedId, admin);
    }
}
