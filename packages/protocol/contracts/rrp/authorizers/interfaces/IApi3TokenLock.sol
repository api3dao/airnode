// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLock {
    event SetApi3RequesterRrpAuthorizer(address api3RequesterRrpAuthorizer);

    event SetApi3Token(address api3Token);

    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event SetBlacklistStatus(
        address airnode,
        address indexed requesterAddress,
        bool status,
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

    event Transfer(
        address airnode,
        address fromRequesterAddress,
        address toRequesterAddress,
        address sponsor,
        uint256 amount,
        uint256 expirationTime
    );
    event Burn(address airnode, address requesterAddress, address sponsor);

    event Withdraw(
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 amount
    );

    function setApi3RequesterRrpAuthorizer(address api3RequesterRrpAuthorizer)
        external;

    function setApi3Token(address api3Token) external;

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function setBlacklistStatus(
        address airnode,
        address requesterAddress,
        bool status
    ) external;

    function lock(address airnode, address requesterAddress) external;

    function unlock(address airnode, address requesterAddress) external;

    function withdraw(address airnode, address requesterAddress) external;

    function transfer(
        address airnode,
        address fromRequesterAddress,
        address toRequesterAddress
    ) external;

    function burn(
        address airnode,
        address requesterAddress,
        address burnTarget
    ) external;
}
