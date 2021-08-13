// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLockExternal {
    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event BlockRequester(
        uint256 chainId,
        address airnode,
        address indexed requesterAddress,
        address indexed admin
    );

    event Lock(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event Unlock(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event WithdrawExcess(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 amount
    );

    event Authorize(
        uint256 chainId,
        bytes32 airnodeId,
        address requesterAddress,
        uint256 expiration
    );

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function blockRequester(
        uint256 chainId,
        address airnode,
        address requesterAddress
    ) external;

    function lock(
        uint256 chainId,
        address airnode,
        address requesterAddress
    ) external;

    function unlock(
        uint256 chainId,
        address airnode,
        address requesterAddress
    ) external;

    function withdrawExcess(
        uint256 chainId,
        address airnode,
        address requesterAddress
    ) external;
}
