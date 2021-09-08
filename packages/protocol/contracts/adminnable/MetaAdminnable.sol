// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IMetaAdminnable.sol";

/// @title Contract that implements a metaAdmin that has full authority over
/// all the services being adminned by RankedAdminnable
contract MetaAdminnable is RankedAdminnable, IMetaAdminnable {
    uint256 private constant MAX_RANK = type(uint256).max;

    /// @notice The metaAdmin has the maximum possible rank
    address public override metaAdmin;

    /// @param metaAdmin_ Initial metaAdmin
    constructor(address metaAdmin_) {
        require(metaAdmin_ != address(0), "Zero address");
        metaAdmin = metaAdmin_;
    }

    /// @notice Called by the metaAdmin to transfer its status to another
    /// address
    /// @param metaAdmin_ New metaAdmin
    function transferMetaAdminStatus(address metaAdmin_) external override {
        require(msg.sender == metaAdmin, "Caller not metaAdmin");
        require(metaAdmin_ != address(0), "Zero address");
        metaAdmin = metaAdmin_;
        emit TransferredMetaAdminStatus(metaAdmin_);
    }

    /// @notice Called to get the rank of an admin for a service
    /// @dev Respects RankedAdminnable, except treats `metaAdmin` as the
    /// highest authority
    /// @param serviceId Service ID
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the service
    function getRank(bytes32 serviceId, address admin)
        public
        view
        virtual
        override(RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        if (admin == metaAdmin) return MAX_RANK;
        return RankedAdminnable.getRank(serviceId, admin);
    }
}
