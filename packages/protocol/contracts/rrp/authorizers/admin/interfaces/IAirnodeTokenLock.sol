// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeTokenLock {
    event SetOracle(address oracle, bool status, address admin);

    event SetAPI3Price(uint256 price, address oracle);

    event SetOptStatus(address airnode, bool status, address admin);

    event SetSelfOptOutStatus(address airnode, bool status);

    event SetRequesterAuthorizerWithManager(
        uint256 chainId,
        address requesterAuthorizerWithManager,
        address admin
    );

    event SetBlockWithdrawDestination(address destination, address admin);

    event WithdrawBlocked(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker,
        address withdrawDestination,
        uint256 lockedAmount
    );

    event BlockedRequester(
        address airnode,
        address indexed requesterAddress,
        address indexed admin
    );

    event Locked(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker,
        uint256 lockedAmount,
        uint256 whitelistCount
    );

    event Unlocked(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker,
        uint256 lockedAmount,
        uint256 whitelistCount
    );

    function setOracle(address oracle, bool status) external;

    function setAPI3Price(uint256 price) external;

    function setOptStatus(address airnode, bool status) external;

    function setSelfOptOutStatus(address airnode, bool status) external;

    function setRequesterAuthorizerWithManager(
        uint256 chainId,
        address requesterAuthorizerWithManager
    ) external;

    function setBlockWithdrawDestination(address destination) external;

    function lock(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress
    ) external;

    function unlock(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress
    ) external;

    function withdrawBlocked(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker
    ) external;

    function blockRequester(address airnode, address requesterAddress) external;
}
