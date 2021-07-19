// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IAirnodeRrp.sol";
import "./ClientRrpAuthorizer.sol";
import "./interfaces/IAirnodeClientRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists clients where each Airnode is
/// adminned by themselves
contract AirnodeClientRrpAuthorizer is
    ClientRrpAuthorizer,
    IAirnodeClientRrpAuthorizer
{
    /// @notice Authorizer contracts use `authorizerType` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 1;

    uint256 private constant MAX_RANK = 2**256 - 1;

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Respects RankedAdminnable, except treats the Airnode admin as the
    /// highest authority for the respective Airnode
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the adminned entity
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override
        returns (uint256)
    {
        // See AirnodeParameterStore.sol for more information
        bytes32 airnodeId = keccak256(abi.encode(msg.sender));
        if (airnodeId == adminnedId) return MAX_RANK;
        return RankedAdminnable.getRank(adminnedId, admin);
    }
}
