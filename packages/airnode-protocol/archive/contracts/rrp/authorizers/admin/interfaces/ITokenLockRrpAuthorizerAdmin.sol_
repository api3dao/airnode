// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface ITokenLockRrpAuthorizerAdmin {
    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event BlockedRequester(
        address airnode,
        address indexed requesterAddress,
        address indexed admin
    );

    event Locked(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event Unlocked(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event WithdrawnExcess(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 amount
    );

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function blockRequester(address airnode, address requesterAddress) external;

    function lock(address airnode, address requesterAddress) external;

    function unlock(address airnode, address requesterAddress) external;

    function withdrawExcess(address airnode, address requesterAddress) external;
}
