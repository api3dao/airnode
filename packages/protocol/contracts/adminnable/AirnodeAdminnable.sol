// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IAirnodeAdminnable.sol";

/// @title Contract that implements multiple levels of admins for Airnodes
/// independently
contract AirnodeAdminnable is IAirnodeAdminnable {
    /// @notice Called to get the rank of an admin for the Airnode
    mapping(address => mapping(address => uint256)) public override airnodeToAdminToRank;

    /// @dev Reverts if the caller's rank is not greater than or equal to
    /// `rank` for the Airnode
    /// @dev Airnode address always satisfies rank requirements
    /// @param airnode Airnode address
    /// @param rank Rank caller's rank will be compared to
    modifier onlyWithRank(address airnode, uint256 rank) {
        require(msg.sender == airnode || airnodeToAdminToRank[airnode][msg.sender] >= rank, "Caller ranked low");
        _;
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank for the Airnode
    /// @param airnode Airnode address
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        address airnode,
        address targetAdmin,
        uint256 newRank
    )
        external
        override
        onlyWithRank(
            airnode,
            max(airnodeToAdminToRank[airnode][targetAdmin], newRank) + 1
        )
    {
        airnodeToAdminToRank[airnode][targetAdmin] = newRank;
        emit SetRank(airnode, msg.sender, targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank for the Airnode
    /// @param airnode Airnode address
    /// @param newRank Rank to be set
    function decreaseSelfRank(address airnode, uint256 newRank)
        external
        override
        onlyWithRank(airnode, newRank + 1)
    {
        airnodeToAdminToRank[airnode][msg.sender] = newRank;
        emit DecreasedSelfRank(airnode, msg.sender, newRank);
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
