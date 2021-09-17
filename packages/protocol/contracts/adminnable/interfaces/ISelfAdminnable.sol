// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface ISelfAdminnable {
    event SetRank(
        address indexed adminned,
        address indexed callerAdmin,
        address indexed targetAdmin,
        uint256 newRank
    );

    event DecreasedSelfRank(
        address indexed adminned,
        address indexed admin,
        uint256 newRank
    );

    function setRank(
        address adminned,
        address targetAdmin,
        uint256 newRank
    ) external;

    function decreaseSelfRank(address adminned, uint256 newRank) external;

    function adminnedToAdminToRank(address adminned, address admin)
        external
        view
        returns (uint256);
}
