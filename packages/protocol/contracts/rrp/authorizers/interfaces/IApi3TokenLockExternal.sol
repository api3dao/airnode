// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLockExternal {
    enum AdminStatus {
        Unauthorized,
        Admin
    }

    event SetMetaAdmin(address metaAdmin);

    event SetAdminStatus(address indexed admin, AdminStatus status);

    event SetApi3Token(address api3Token);

    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event SetBlacklistStatus(
        address indexed clientAddress,
        bool status,
        address indexed admin
    );

    event Lock(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 lockedAmount
    );

    event Unlock(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 lockedAmount
    );

    event Transfer(
        uint256 chainId,
        bytes32 airnodeId,
        address fromClientAddress,
        address toClientAddress,
        address requester,
        uint256 amount,
        uint256 expirationTime
    );
    event Burn(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        address requester
    );

    event Withdraw(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 amount
    );

    event Authorize(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        uint256 expiration
    );

    function setMetaAdmin(address metaAdmin) external;

    function setAdminStatus(address admin, AdminStatus status) external;

    function setApi3Token(address api3Token) external;

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function setBlacklistStatus(address clientAddress, bool status) external;

    function lock(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress
    ) external;

    function unlock(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress
    ) external;

    function withdraw(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress
    ) external;

    function transfer(
        uint256 chainId,
        bytes32 airnodeId,
        address fromClientAddress,
        address toClientAddress
    ) external;

    function burn(
        uint256 chainId,
        bytes32 airnodeId,
        address clientAddress,
        address burnTarget
    ) external;
}
