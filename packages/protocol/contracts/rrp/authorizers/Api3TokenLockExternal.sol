// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IApi3Token.sol";
import "./interfaces/IApi3TokenLockExternal.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract Api3TokenLockExternal is IApi3TokenLockExternal, Ownable {
    string private constant ERROR_UNAUTHORIZED = "Unauthorized";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_ALREADY_LOCKED = "Already locked";
    string private constant ERROR_NOT_LOCKED = "No amount locked";
    string private constant ERROR_LOCK_PERIOD_NOT_EXPIRED =
        "Locking period not expired";
    string private constant ERROR_LOCK_PERIOD_ZERO = "Zero lock period";
    string private constant ERROR_CLIENT_BLACKLISTED = "Client blacklisted";
    string private constant ERROR_CLIENT_NOT_BLACKLISTED =
        "Client not blacklisted";

    /// @dev Address of Api3Token
    address public api3Token;
    /// @dev The Minimum locking time (in seconds)
    uint256 public minimumLockingTime;
    /// @dev Lock amount for each user
    uint256 public lockAmount;

    /// @dev Represents the locked amounts, periods and whitelist counts
    /// of a chainId-airnode-client pair
    struct AirnodeRequester {
        mapping(address => uint256) lockAmountAt;
        mapping(address => uint256) canUnlockAt;
        uint256 whitelistCount;
    }

    /// @dev Meta admin sets the admin statuses of addresses and has super
    /// admin privileges
    address public metaAdmin;
    /// @dev Stores information about admins
    mapping(address => AdminStatus) public adminStatuses;

    /// @dev Stores information about all token locks for chainId-airnode-client pair
    mapping(uint256 => mapping(bytes32 => mapping(address => AirnodeRequester)))
        public airnodeToRequesterToTokenLocks;

    /// @dev Stores information for blacklisted requester
    mapping(address => bool) public requesterToBlacklistStatus;

    /// @dev Sets the values for {_metaAdmin}, {_minimumLockingTime} and {_lockAmount}
    /// @param _metaAdmin The address that will be set as meta admin
    /// @param _minimumLockingTime The minimum lock time of API3 tokens for users
    /// @param _lockAmount The lock amount
    constructor(
        address _metaAdmin,
        uint256 _minimumLockingTime,
        uint256 _lockAmount
    ) {
        require(_metaAdmin != address(0), ERROR_ZERO_ADDRESS);
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);

        minimumLockingTime = _minimumLockingTime;
        lockAmount = _lockAmount;
        metaAdmin = _metaAdmin;
    }

    modifier onlyMetaAdmin() {
        require(msg.sender == metaAdmin, ERROR_UNAUTHORIZED);
        _;
    }

    modifier onlyAdmin() {
        require(
            adminStatuses[msg.sender] == AdminStatus.Admin ||
                msg.sender == metaAdmin,
            ERROR_UNAUTHORIZED
        );
        _;
    }

    /// @notice Called by the meta admin to set the meta admin
    /// @param _metaAdmin Address that will be set as the meta admin
    function setMetaAdmin(address _metaAdmin) external override onlyMetaAdmin {
        require(_metaAdmin != address(0), ERROR_ZERO_ADDRESS);
        metaAdmin = _metaAdmin;
        emit SetMetaAdmin(metaAdmin);
    }

    /// @notice Called by the meta admin to set the admin status of an address
    /// @param _admin Address whose admin status will be set
    /// @param _status Admin status
    function setAdminStatus(address _admin, AdminStatus _status)
        external
        override
        onlyMetaAdmin
    {
        adminStatuses[_admin] = _status;
        emit SetAdminStatus(_admin, _status);
    }

    /// @notice Called by admin to set the address of the API3 Token
    /// @param _api3Token Address of the new API3 Token
    function setApi3Token(address _api3Token) external override onlyAdmin {
        require(_api3Token != address(0), ERROR_ZERO_ADDRESS);
        api3Token = _api3Token;

        bool isBurner = IApi3Token(api3Token).getBurnerStatus(address(this));
        if (!isBurner) {
            IApi3Token(api3Token).updateBurnerStatus(true);
        }

        emit SetApi3Token(api3Token);
    }

    /// @notice Called by owner to set the minimum locking time
    /// @param _minimumLockingTime The new minimum locking time
    function setMinimumLockingTime(uint256 _minimumLockingTime)
        external
        override
        onlyMetaAdmin
    {
        minimumLockingTime = _minimumLockingTime;
        emit SetMinimumLockingTime(_minimumLockingTime);
    }

    /// @notice Called by owner to set the locking amount
    /// @param _lockAmount The new lock amount
    function setLockAmount(uint256 _lockAmount)
        external
        override
        onlyMetaAdmin
    {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);
        lockAmount = _lockAmount;
        emit SetLockAmount(_lockAmount);
    }

    /// @notice Called by owner to set the blacklist status of a client
    /// @param clientAddress Client address
    /// @param status Blacklist status to be set
    function setBlacklistStatus(address clientAddress, bool status)
        external
        override
        onlyMetaAdmin
    {
        requesterToBlacklistStatus[clientAddress] = status;
        emit SetBlacklistStatus(clientAddress, status, msg.sender);
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes on a given chain.
    /// Airnode-client pair gets authorized as long as there is at least one token lock for given pair.
    /// @dev The amount to be locked is determined by a memory variable set by
    /// the owners of the contract.
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    function lock(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress
    ) external override {
        AirnodeRequester storage target = airnodeToRequesterToTokenLocks[
            _chainId
        ][_airnodeId][_requesterAddress];
        require(target.lockAmountAt[msg.sender] == 0, ERROR_ALREADY_LOCKED);
        require(
            !requesterToBlacklistStatus[_requesterAddress],
            ERROR_CLIENT_BLACKLISTED
        );

        uint256 expirationTime = block.timestamp + minimumLockingTime;
        target.lockAmountAt[msg.sender] = lockAmount;
        target.canUnlockAt[msg.sender] = expirationTime;
        target.whitelistCount++;

        assert(
            IApi3Token(api3Token).transferFrom(
                msg.sender,
                address(this),
                lockAmount
            )
        );

        if (target.whitelistCount == 1) {
            emit Authorize(
                _chainId,
                _airnodeId,
                _requesterAddress,
                type(uint64).max
            );
        }

        emit Lock(
            _chainId,
            _airnodeId,
            _requesterAddress,
            msg.sender,
            lockAmount
        );
    }

    /// @notice Unlocks the API3 tokens for a given airnode-client pair on a given chain.
    /// Airnode-client pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// if the locked period has expired and if the client address is blacklisted
    /// Transfers to msg.sender the locked amount.
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    function unlock(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress
    ) external override {
        AirnodeRequester storage target = airnodeToRequesterToTokenLocks[
            _chainId
        ][_airnodeId][_requesterAddress];
        require(target.lockAmountAt[msg.sender] != 0, ERROR_NOT_LOCKED);
        require(target.canUnlockAt[msg.sender] != 0, ERROR_LOCK_PERIOD_ZERO);
        require(
            target.canUnlockAt[msg.sender] <= block.timestamp,
            ERROR_LOCK_PERIOD_NOT_EXPIRED
        );
        require(
            !requesterToBlacklistStatus[_requesterAddress],
            ERROR_CLIENT_BLACKLISTED
        );
        uint256 amount = target.lockAmountAt[msg.sender];

        target.lockAmountAt[msg.sender] = 0;
        target.canUnlockAt[msg.sender] = 0;
        target.whitelistCount--;

        if (target.whitelistCount == 0) {
            emit Authorize(_chainId, _airnodeId, _requesterAddress, 0);
        }

        assert(IApi3Token(api3Token).transfer(msg.sender, amount));

        emit Unlock(
            _chainId,
            _airnodeId,
            _requesterAddress,
            msg.sender,
            amount
        );
    }

    /// @notice User calls this when the lock amount has been decreased and wants
    /// to withdraw the redundantly locked tokens
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    function withdraw(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress
    ) external override {
        require(
            airnodeToRequesterToTokenLocks[_chainId][_airnodeId][
                _requesterAddress
            ]
            .lockAmountAt[msg.sender] > lockAmount,
            ERROR_INSUFFICIENT_AMOUNT
        );
        require(
            !requesterToBlacklistStatus[_requesterAddress],
            ERROR_CLIENT_BLACKLISTED
        );

        uint256 withdrawAmount = airnodeToRequesterToTokenLocks[_chainId][
            _airnodeId
        ][_requesterAddress]
        .lockAmountAt[msg.sender] - lockAmount;
        airnodeToRequesterToTokenLocks[_chainId][_airnodeId][_requesterAddress]
        .lockAmountAt[msg.sender] = lockAmount;

        assert(IApi3Token(api3Token).transfer(msg.sender, withdrawAmount));

        emit Withdraw(
            _chainId,
            _airnodeId,
            _requesterAddress,
            msg.sender,
            withdrawAmount
        );
    }

    /// @notice Transfers the user's lock period and tokens to another client
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _fromClientAddress The client from which the transfer will be done
    /// @param _toClientAddress The target client to which the transfer will be done
    function transfer(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _fromClientAddress,
        address _toClientAddress
    ) external override {
        AirnodeRequester storage from = airnodeToRequesterToTokenLocks[
            _chainId
        ][_airnodeId][_fromClientAddress];
        AirnodeRequester storage to = airnodeToRequesterToTokenLocks[_chainId][
            _airnodeId
        ][_toClientAddress];
        require(
            from.lockAmountAt[msg.sender] != 0,
            "locked amount must be != 0"
        );
        require(to.lockAmountAt[msg.sender] == 0, "locked amount must be 0");
        require(
            !requesterToBlacklistStatus[_fromClientAddress],
            "From Client blacklisted"
        );
        require(
            !requesterToBlacklistStatus[_toClientAddress],
            "To Client blacklisted"
        );

        uint256 amount = from.lockAmountAt[msg.sender];
        from.lockAmountAt[msg.sender] = 0;
        to.lockAmountAt[msg.sender] = amount;

        uint256 expirationTime = from.canUnlockAt[msg.sender];
        from.canUnlockAt[msg.sender] = 0;
        to.canUnlockAt[msg.sender] = expirationTime;

        from.whitelistCount--;
        if (from.whitelistCount == 0) {
            emit Authorize(_chainId, _airnodeId, _fromClientAddress, 0);
        }

        to.whitelistCount++;
        if (to.whitelistCount == 1) {
            emit Authorize(
                _chainId,
                _airnodeId,
                _toClientAddress,
                type(uint64).max
            );
        }

        emit Transfer(
            _chainId,
            _airnodeId,
            _fromClientAddress,
            _toClientAddress,
            msg.sender,
            amount,
            expirationTime
        );
    }

    /// @notice Burns tokens for a user of an airnode-client pair.
    /// Can only be done when the client is blacklisted.
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    /// @param _burnTarget The address of the user
    function burn(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress,
        address _burnTarget
    ) external override onlyMetaAdmin {
        AirnodeRequester storage target = airnodeToRequesterToTokenLocks[
            _chainId
        ][_airnodeId][_requesterAddress];
        require(target.lockAmountAt[_burnTarget] != 0, ERROR_ZERO_AMOUNT);
        require(
            requesterToBlacklistStatus[_requesterAddress],
            ERROR_CLIENT_NOT_BLACKLISTED
        );

        uint256 amount = target.lockAmountAt[_burnTarget];

        target.canUnlockAt[_burnTarget] = 0;
        target.lockAmountAt[_burnTarget] = 0;
        target.whitelistCount--;

        if (target.whitelistCount == 0) {
            emit Authorize(_chainId, _airnodeId, _requesterAddress, 0);
        }

        IApi3Token(api3Token).burn(amount);

        emit Burn(_chainId, _airnodeId, _requesterAddress, _burnTarget);
    }

    /// @dev Returns the locked amount for a target address to a chainId-airnode-client
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    /// @param _target The address of the user
    function lockAmountAt(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            airnodeToRequesterToTokenLocks[_chainId][_airnodeId][
                _requesterAddress
            ]
                .lockAmountAt[_target];
    }

    /// @dev Returns the unlock period for a target address to a chainId-airnode-client
    /// @param _chainId The chain id
    /// @param _airnodeId The airnode id
    /// @param _requesterAddress The client address
    /// @param _target The address of the user
    function canUnlockAt(
        uint256 _chainId,
        bytes32 _airnodeId,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            airnodeToRequesterToTokenLocks[_chainId][_airnodeId][
                _requesterAddress
            ]
                .canUnlockAt[_target];
    }
}
