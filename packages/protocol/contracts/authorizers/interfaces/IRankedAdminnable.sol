// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IRankedAdminnable {
    event SetRank(
        bytes32 indexed adminnedId,
        address indexed targetAdmin,
        uint256 newRank,
        address indexed callerAdmin
    );

    event DecreasedSelfRank(
        bytes32 indexed adminnedId,
        address indexed admin,
        uint256 newRank
    );

    function setRank(
        bytes32 adminnedId,
        address targetAdmin,
        uint256 newRank
    ) external;

    function decreaseSelfRank(bytes32 adminnedId, uint256 newRank) external;
}
