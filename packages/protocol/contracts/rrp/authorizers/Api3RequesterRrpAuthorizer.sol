// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/MetaAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/IApi3RequesterRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists requesters where the API3 DAO is
/// the metaAdmin
/// @dev Unlike the MetaAdminnable contract that it inherits, this contract
/// does not support the independent adminning of different services. In other
/// words, when an address is assigned to be an Admin/SuperAdmin, it becomes
/// the Admin/SuperAdmin of all services. To achieve this, when interacting
/// with this contract, always use `bytes32(0)` as the `serviceId`.
contract Api3RequesterRrpAuthorizer is
    MetaAdminnable,
    RequesterRrpAuthorizer,
    IApi3RequesterRrpAuthorizer
{
    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 2;

    /// @param metaAdmin_ Address that will be set as the API3 metaAdmin
    constructor(address metaAdmin_) MetaAdminnable(metaAdmin_) {}

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank
    /// @dev Overriden to disable
    /// @param serviceId Service ID
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        bytes32 serviceId, // solhint-disable-line no-unused-vars
        address targetAdmin, // solhint-disable-line no-unused-vars
        uint256 newRank // solhint-disable-line no-unused-vars
    ) public override(RankedAdminnable, IRankedAdminnable) {
        revert("Disabled interface");
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank
    /// @dev Overriden to force `bytes32(0)` as `serviceId`
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        address targetAdmin,
        uint256 newRank
    ) public override {
        RankedAdminnable.setRank(bytes32(0), targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank
    /// @dev Overriden to disable
    /// @param serviceId Service ID
    /// @param newRank Rank to be set
    function decreaseSelfRank(
        bytes32 serviceId, // solhint-disable-line no-unused-vars
        uint256 newRank // solhint-disable-line no-unused-vars
        )
        public
        override(RankedAdminnable, IRankedAdminnable)
    {
        revert("Disabled interface");
    }

    /// @notice Called by an admin to decrease its rank
    /// @dev Overriden to force `bytes32(0)` as `serviceId`
    /// @param newRank Rank to be set
    function decreaseSelfRank(uint256 newRank)
        public
        override
    {
        RankedAdminnable.decreaseSelfRank(bytes32(0), newRank);
    }

    /// @notice Called to get the rank of an admin
    /// @dev We cannot disable this method because it is used internally.
    /// Instead, we require `serviceId` to be `bytes32(0)`. External callers
    /// are recommended to use `getRank(address)` instead.
    /// @param serviceId Service ID
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(bytes32 serviceId, address admin)
        public
        view
        override(MetaAdminnable, RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        require(serviceId == bytes32(0), "serviceId not zero");
        return MetaAdminnable.getRank(serviceId, admin);
    }

    /// @notice Called to get the rank of an admin
    /// @dev Overriden to force `bytes32(0)` as `serviceId`
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(address admin)
        public
        view
        override
        returns (uint256)
    {
        return MetaAdminnable.getRank(bytes32(0), admin);
    }
}
