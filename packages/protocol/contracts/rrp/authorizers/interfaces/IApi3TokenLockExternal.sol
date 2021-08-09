// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLockExternal {
    event SetApi3Token(address api3Token);

    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event SetBlacklistStatus(
        uint256 chainId,
        address airnode,
        address indexed requesterAddress,
        bool status,
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

    event Transfer(
        uint256 chainId,
        address airnode,
        address fromRequesterAddress,
        address toRequesterAddress,
        address sponsor,
        uint256 amount,
        uint256 expirationTime
    );
    event Burn(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor
    );

    event Withdraw(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 amount
    );

    event Authorize(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        uint256 expiration
    );

    function setApi3Token(address api3Token) external;

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function setBlacklistStatus(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        bool status
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

    function withdraw(
        uint256 chainId,
        address airnode,
        address requesterAddress
    ) external;

    function transfer(
        uint256 chainId,
        address airnode,
        address fromRequesterAddress,
        address toRequesterAddress
    ) external;

    function burn(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address burnTarget
    ) external;
}
