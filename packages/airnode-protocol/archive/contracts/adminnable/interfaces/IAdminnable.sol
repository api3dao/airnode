// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAdminnable {
    event TransferredMetaAdminStatus(address indexed metaAdmin);

    event SetRank(
        address indexed callerAdmin,
        address indexed targetAdmin,
        uint256 newRank
    );

    event DecreasedSelfRank(address indexed admin, uint256 newRank);

    function transferMetaAdminStatus(address metaAdmin_) external;

    function setRank(address targetAdmin, uint256 newRank) external;

    function decreaseSelfRank(uint256 newRank) external;

    function metaAdmin() external view returns (address);

    function adminToRank(address admin) external view returns (uint256);
}
