// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface ITokenLockRrpAuthorizerAdminExternal {
    event SetMinimumLockingTime(uint256 minimumLockingTime);

    event SetLockAmount(uint256 lockAmount);

    event BlockedRequester(
        uint256 chainId,
        address airnode,
        address indexed requesterAddress,
        address indexed admin
    );

    event Locked(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event Unlocked(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 lockedAmount
    );

    event WithdrawnExcess(
        uint256 chainId,
        address airnode,
        address requesterAddress,
        address sponsor,
        uint256 amount
    );

    event Authorized(
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
