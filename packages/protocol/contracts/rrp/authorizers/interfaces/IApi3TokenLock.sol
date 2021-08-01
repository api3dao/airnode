// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IApi3TokenLock {
    enum AdminStatus {
        Unauthorized,
        Admin
    }

    event SetMetaAdmin(address metaAdmin);

    event SetAdminStatus(address indexed admin, AdminStatus status);

    event SetApi3RequesterRrpAuthorizer(address api3RequesterRrpAuthorizer);

    event SetApi3Token(address api3Token);

    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event SetBlacklistStatus(
        address indexed clientAddress,
        bool status,
        address indexed admin
    );

    event Lock(
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 lockedAmount
    );

    event Unlock(
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 lockedAmount
    );

    event Transfer(
        bytes32 airnodeId,
        address fromClientAddress,
        address toClientAddress,
        address requester,
        uint256 amount,
        uint256 expirationTime
    );
    event Burn(bytes32 airnodeId, address clientAddress, address requester);

    event Withdraw(
        bytes32 airnodeId,
        address clientAddress,
        address requester,
        uint256 amount
    );

    function setMetaAdmin(address metaAdmin) external;

    function setAdminStatus(address admin, AdminStatus status) external;

    function setApi3RequesterRrpAuthorizer(address api3RequesterRrpAuthorizer)
        external;

    function setApi3Token(address api3Token) external;

    function setMinimumLockingTime(uint256 minimumLockingTime) external;

    function setLockAmount(uint256 lockAmount) external;

    function setBlacklistStatus(address clientAddress, bool status) external;

    function lock(bytes32 airnodeId, address clientAddress) external;

    function unlock(bytes32 airnodeId, address clientAddress) external;

    function withdraw(bytes32 airnodeId, address clientAddress) external;

    function transfer(
        bytes32 airnodeId,
        address fromClientAddress,
        address toClientAddress
    ) external;

    function burn(
        bytes32 airnodeId,
        address clientAddress,
        address burnTarget
    ) external;
}
