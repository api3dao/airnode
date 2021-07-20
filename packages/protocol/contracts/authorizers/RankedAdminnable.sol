// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IRankedAdminnable.sol";

/// @title Contract that implements independent and multiple levels of admins
/// for multiple entities
contract RankedAdminnable is IRankedAdminnable {
    mapping(bytes32 => mapping(address => uint256))
        private adminnedIdToAdminToRank;

    /// @dev Reverts if the caller's rank is not greater than or equal to `rank`
    /// @param adminnedId ID of the entity being adminned
    /// @param rank Rank caller's rank will be compared to
    modifier onlyWithRank(bytes32 adminnedId, uint256 rank) {
        require(getRank(adminnedId, msg.sender) >= rank, "Caller ranked low");
        _;
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin of
    /// lower rank
    /// @param adminnedId ID of the entity being adminned
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        bytes32 adminnedId,
        address targetAdmin,
        uint256 newRank
    )
        external
        override
        onlyWithRank(
            adminnedId,
            max(adminnedIdToAdminToRank[adminnedId][targetAdmin], newRank) + 1
        )
    {
        adminnedIdToAdminToRank[adminnedId][targetAdmin] = newRank;
        emit SetRank(adminnedId, targetAdmin, newRank, msg.sender);
    }

    /// @notice Called by an admin to decrease its rank
    /// @param adminnedId ID of the entity being adminned
    /// @param newRank Rank to be set
    function decreaseSelfRank(bytes32 adminnedId, uint256 newRank)
        external
        override
        onlyWithRank(adminnedId, newRank + 1)
    {
        adminnedIdToAdminToRank[adminnedId][msg.sender] = newRank;
        emit DecreasedSelfRank(adminnedId, msg.sender, newRank);
    }

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Override this method to customize the rank calculation
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the adminned entity
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return adminnedIdToAdminToRank[adminnedId][admin];
    }

    /// @notice Called internally to compute the maximum between two unsigned
    /// integers
    /// @param a First unsigned integer
    /// @param b Second unsigned integer
    /// @return Larger of the two unsigned integers
    function max(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a : b;
    }
}
