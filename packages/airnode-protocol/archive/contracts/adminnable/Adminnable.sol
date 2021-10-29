// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAdminnable.sol";

/// @title Contract that implements multiple levels of admins
contract Adminnable is IAdminnable {
    /// @notice Meta-admin ranks higher than all admins
    address public override metaAdmin;

    /// @notice Called to get the rank of an admin
    /// @dev Higher ranks have more authority
    mapping(address => uint256) public override adminToRank;

    /// @dev Reverts if the caller's rank is not greater than or equal to
    /// `rank`. `metaAdmin` always satisfies rank requirements.
    /// @param rank Rank caller's rank will be compared to
    modifier onlyWithRank(uint256 rank) {
        require(
            adminToRank[msg.sender] >= rank || msg.sender == metaAdmin,
            "Caller ranked low"
        );
        _;
    }

    /// @dev Deployer needs to transfer meta-adminship afterwards
    constructor() {
        metaAdmin = msg.sender;
    }

    /// @notice Called by the meta-admin to transfer its status to another
    /// address
    /// @param metaAdmin_ New meta-admin
    function transferMetaAdminStatus(address metaAdmin_) external override {
        require(msg.sender == metaAdmin, "Caller not metaAdmin");
        require(metaAdmin_ != address(0), "Zero address");
        metaAdmin = metaAdmin_;
        emit TransferredMetaAdminStatus(metaAdmin_);
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank
    /// @dev Reverts if `newRank` is `type(uint256).max`
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(address targetAdmin, uint256 newRank)
        external
        override
        onlyWithRank(max(adminToRank[targetAdmin], newRank) + 1)
    {
        require(targetAdmin != address(0), "Target admin zero");
        adminToRank[targetAdmin] = newRank;
        emit SetRank(msg.sender, targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank
    /// @dev Reverts if `newRank` is `type(uint256).max`
    /// @param newRank Rank to be set
    function decreaseSelfRank(uint256 newRank)
        external
        override
        onlyWithRank(newRank + 1)
    {
        adminToRank[msg.sender] = newRank;
        emit DecreasedSelfRank(msg.sender, newRank);
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
