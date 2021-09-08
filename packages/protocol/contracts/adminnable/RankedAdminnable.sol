// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IRankedAdminnable.sol";

/// @title Contract that implements multiple levels of admins for multiple
/// services independently
contract RankedAdminnable is IRankedAdminnable {
    mapping(bytes32 => mapping(address => uint256))
        private serviceIdToAdminToRank;

    /// @dev Reverts if the caller's rank is not greater than or equal to
    /// `rank`
    /// @param serviceId Service ID
    /// @param rank Rank caller's rank will be compared to
    modifier onlyWithRank(bytes32 serviceId, uint256 rank) {
        require(getRank(serviceId, msg.sender) >= rank, "Caller ranked low");
        _;
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank
    /// @param serviceId Service ID
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        bytes32 serviceId,
        address targetAdmin,
        uint256 newRank
    )
        public
        virtual
        override
        onlyWithRank(
            serviceId,
            max(serviceIdToAdminToRank[serviceId][targetAdmin], newRank) + 1
        )
    {
        serviceIdToAdminToRank[serviceId][targetAdmin] = newRank;
        emit SetRank(serviceId, targetAdmin, newRank, msg.sender);
    }

    /// @notice Called by an admin to decrease its rank
    /// @param serviceId Service ID
    /// @param newRank Rank to be set
    function decreaseSelfRank(bytes32 serviceId, uint256 newRank)
        public
        virtual
        override
        onlyWithRank(serviceId, newRank + 1)
    {
        serviceIdToAdminToRank[serviceId][msg.sender] = newRank;
        emit DecreasedSelfRank(serviceId, msg.sender, newRank);
    }

    /// @notice Called to get the rank of an admin for a service
    /// @dev Override this method to customize rank calculation
    /// @param serviceId Service ID
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the service
    function getRank(bytes32 serviceId, address admin)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return serviceIdToAdminToRank[serviceId][admin];
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
