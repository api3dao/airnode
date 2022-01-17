// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeTokenLock {
    event SetAirnodeFeeRegistry(
        address airnodeFeeRegistry,
        address coefficientAndRegistrySetter
    );

    event SetOracle(address oracle, bool status, address oracleAddressSetter);

    event SetAPI3Price(uint256 price, address oracle);

    event SetMultiplierCoefficient(
        uint256 multiplierCoefficient,
        address coefficientAndRegistrySetter
    );

    event SetOptInStatus(address airnode, bool status, address optStatusSetter);

    event SetSelfOptOutStatus(address airnode, bool status);

    event SetBlockWithdrawDestination(
        address destination,
        address blockWithdrawDestinationSetter
    );

    event WithdrewBlocked(
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
        address requesterAddress,
        address blockRequester
    );

    event Locked(
        uint256 chainId,
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed requesterAddress,
        address locker,
        uint256 lockedAmount,
        uint256 whitelistCount
    );

    event Unlocked(
        uint256 chainId,
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed requesterAddress,
        address locker,
        uint256 lockedAmount,
        uint256 whitelistCount
    );

    function setAPI3Price(uint256 price) external;

    function setMultiplierCoefficient(uint256 multiplierCoefficient) external;

    function setOptInStatus(address airnode, bool status) external;

    function setSelfOptOutStatus(bool status) external;

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

    function getLockAmount(
        uint256 chainId,
        address airnode,
        bytes32 endpointId
    ) external returns (uint256);

    function lockerToLockAmount(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        address locker
    ) external returns (uint256);

    function airnodeToRequesterToBlockStatus(
        address airnode,
        address requesterAddress
    ) external view returns (bool);

    function api3PriceInUsd() external view returns (uint256);

    function multiplierCoefficient() external view returns (uint256);

    function blockWithdrawDestination() external view returns (address);

    function airnodeOptInStatus(address airnode) external view returns (bool);

    function airnodeSelfOptOutStatus(address airnode)
        external
        view
        returns (bool);
}
