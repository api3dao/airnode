// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLock {
    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event BlockRequester(
        address airnode,
        address indexed requesterAddress,
        address indexed admin
    );

    event Lock(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event Unlock(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event WithdrawExcess(
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
