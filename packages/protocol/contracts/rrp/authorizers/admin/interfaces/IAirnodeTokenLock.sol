// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeTokenLock {
    event SetOracle(address oracle, bool status, address admin);

    event SetAPI3Price(uint256 price, address oracle);

    event SetOptStatus(address airnode, bool status, address admin);

    event SetSelfOptStatus(address airnode, bool status);

    event SetDaoRequesterRrpAuthorizer(
        uint256 chainId,
        address daoRequesterRrpAuthorizer,
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
        uint256 lockedAmount
    );

    event Unlocked(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker,
        uint256 lockedAmount
    );

    function setOracle(address oracle, bool status) external;

    function setAPI3Price(uint256 price) external;

    function setOptStatus(address airnode, bool status) external;

    function setSelfOptStatus(address airnode, bool status) external;

    function setDaoRequesterRrpAuthorizer(
        uint256 chainId,
        address daoRequesterRrpAuthorizer
    ) external;

    function setBlockWithdrawDestination(address _destination) external;

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
