// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeAdminnable {
    event SetRank(
        address indexed airnode,
        address indexed callerAdmin,
        address indexed targetAdmin,
        uint256 newRank
    );

    event DecreasedSelfRank(
        address indexed airnode,
        address indexed admin,
        uint256 newRank
    );

    function setRank(
        address airnode,
        address targetAdmin,
        uint256 newRank
    )
        external;
    
    function decreaseSelfRank(address airnode, uint256 newRank)
        external;

    function airnodeToAdminToRank(address airnode, address admin) external view returns (uint256);
}
