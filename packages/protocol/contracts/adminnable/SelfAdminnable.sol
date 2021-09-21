// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/ISelfAdminnable.sol";

/// @title Contract that implements multiple levels of admins for multiple
/// "adminned" addresses independently
contract SelfAdminnable is ISelfAdminnable {
    /// @notice Called to get the rank of an admin for the adminned address
    mapping(address => mapping(address => uint256))
        public
        override adminnedToAdminToRank;

    /// @dev Reverts if the caller's rank is not greater than or equal to
    /// `rank` for the adminned address
    /// @dev Adminned address always satisfies rank requirements
    /// @param adminned Adminned address
    /// @param rank Rank caller's rank will be compared to
    modifier onlyWithRank(address adminned, uint256 rank) {
        require(
            adminnedToAdminToRank[adminned][msg.sender] >= rank ||
                msg.sender == adminned,
            "Caller ranked low"
        );
        _;
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank for the adminned address
    /// @param adminned Adminned address
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        address adminned,
        address targetAdmin,
        uint256 newRank
    )
        external
        override
        onlyWithRank(
            adminned,
            max(adminnedToAdminToRank[adminned][targetAdmin], newRank) + 1
        )
    {
        require(targetAdmin != address(0), "Target admin zero");
        adminnedToAdminToRank[adminned][targetAdmin] = newRank;
        emit SetRank(adminned, msg.sender, targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank for the adminned
    /// address
    /// @param adminned Adminned address
    /// @param newRank Rank to be set
    function decreaseSelfRank(address adminned, uint256 newRank)
        external
        override
        onlyWithRank(adminned, newRank + 1)
    {
        adminnedToAdminToRank[adminned][msg.sender] = newRank;
        emit DecreasedSelfRank(adminned, msg.sender, newRank);
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
