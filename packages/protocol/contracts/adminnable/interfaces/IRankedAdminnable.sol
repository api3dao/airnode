// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IRankedAdminnable {
    event SetRank(
        bytes32 indexed serviceId,
        address indexed targetAdmin,
        uint256 newRank,
        address indexed callerAdmin
    );

    event DecreasedSelfRank(
        bytes32 indexed serviceId,
        address indexed admin,
        uint256 newRank
    );

    function setRank(
        bytes32 serviceId,
        address targetAdmin,
        uint256 newRank
    ) external;

    function decreaseSelfRank(bytes32 serviceId, uint256 newRank) external;

    function getRank(bytes32 serviceId, address admin)
        external
        returns (uint256);
}
