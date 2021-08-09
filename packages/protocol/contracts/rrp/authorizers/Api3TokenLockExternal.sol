// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IApi3Token.sol";
import "./interfaces/IApi3TokenLockExternal.sol";
import "../../admin/MetaAdminnable.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract Api3TokenLockExternal is MetaAdminnable, IApi3TokenLockExternal {
    enum AdminRank {
        Unauthorized,
        Admin
    }
    uint256 private constant MAX_RANK = 2**256 - 1;
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

    /// @dev Stores information about all token locks for chainId-airnode-client pair
    mapping(uint256 => mapping(address => mapping(address => AirnodeRequester)))
        public chainIdToairnodeToRequesterToTokenLocks;

    /// @dev Stores information for blacklisted airndoe-requester pair
    mapping(uint256 => mapping(address => mapping(address => bool)))
        public chainIdToairnodeToRequesterToBlacklistStatus;

    /// @dev Sets the metaAdmin and values for {_minimumLockingTime} and {_lockAmount}
    /// @param _metaAdmin The address that will be set as meta admin
    /// @param _minimumLockingTime The minimum lock time of API3 tokens for users
    /// @param _lockAmount The lock amount
    constructor(
        address _metaAdmin,
        uint256 _minimumLockingTime,
        uint256 _lockAmount
    ) MetaAdminnable(_metaAdmin) {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);

        minimumLockingTime = _minimumLockingTime;
        lockAmount = _lockAmount;
    }

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Overriden to use the bytes32(0) as the only adminnedId
    ///      Overriden to use metaAdminned ranks
    /// @param adminnedId ID of the entity being adminned(not used)
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(MetaAdminnable)
        returns (uint256)
    {
        if (adminnedId == bytes32(abi.encode(admin))) return MAX_RANK;
        return MetaAdminnable.getRank(bytes32(0), admin);
    }

    /// @dev Reverts if the requester is blacklisted globally(address(0)) or
    ///      on an airnode address on a particular chain
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    modifier isNotBlacklisted(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    ) {
        require(
            !chainIdToairnodeToRequesterToBlacklistStatus[_chainId][address(0)][
                _requesterAddress
            ],
            ERROR_CLIENT_BLACKLISTED
        );
        require(
            !chainIdToairnodeToRequesterToBlacklistStatus[_chainId][_airnode][
                _requesterAddress
            ],
            ERROR_CLIENT_BLACKLISTED
        );
        _;
    }

    /// @notice Called by admin to set the address of the API3 Token
    /// @param _api3Token Address of the new API3 Token
    function setApi3Token(address _api3Token)
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
    {
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
        onlyWithRank(bytes32(0), MAX_RANK)
    {
        minimumLockingTime = _minimumLockingTime;
        emit SetMinimumLockingTime(_minimumLockingTime);
    }

    /// @notice Called by owner to set the locking amount
    /// @param _lockAmount The new lock amount
    function setLockAmount(uint256 _lockAmount)
        external
        override
        onlyWithRank(bytes32(0), MAX_RANK)
    {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);
        lockAmount = _lockAmount;
        emit SetLockAmount(_lockAmount);
    }

    /// @notice Called by owner to set the blacklist status of a airnode-requester pair on a chain
    ///         also revokes access by setting whitelistExpiration to 0
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param status Blacklist status to be set
    function setBlacklistStatus(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        bool status
    ) external override onlyWithRank(bytes32(abi.encode(_airnode)), MAX_RANK) {
        chainIdToairnodeToRequesterToBlacklistStatus[_chainId][_airnode][
            _requesterAddress
        ] = status;
        emit Authorize(_chainId, _airnode, _requesterAddress, 0);
        emit SetBlacklistStatus(
            _chainId,
            _airnode,
            _requesterAddress,
            status,
            msg.sender
        );
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes on a given chain.
    /// Airnode-client pair gets authorized as long as there is at least one token lock for given pair.
    /// @dev The amount to be locked is determined by a memory variable set by
    /// the owners of the contract.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function lock(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    )
        external
        override
        isNotBlacklisted(_chainId, _airnode, _requesterAddress)
    {
        AirnodeRequester
            storage target = chainIdToairnodeToRequesterToTokenLocks[_chainId][
                _airnode
            ][_requesterAddress];
        require(target.lockAmountAt[msg.sender] == 0, ERROR_ALREADY_LOCKED);

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
                _airnode,
                _requesterAddress,
                type(uint64).max
            );
        }

        emit Lock(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender,
            lockAmount
        );
    }

    /// @notice Unlocks the API3 tokens for a given airnode-client pair on a given chain.
    /// Airnode-client pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// if the locked period has expired and if the requester address is blacklisted
    /// Transfers to msg.sender the locked amount.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function unlock(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    )
        external
        override
        isNotBlacklisted(_chainId, _airnode, _requesterAddress)
    {
        AirnodeRequester
            storage target = chainIdToairnodeToRequesterToTokenLocks[_chainId][
                _airnode
            ][_requesterAddress];
        require(target.lockAmountAt[msg.sender] != 0, ERROR_NOT_LOCKED);
        require(target.canUnlockAt[msg.sender] != 0, ERROR_LOCK_PERIOD_ZERO);
        require(
            target.canUnlockAt[msg.sender] <= block.timestamp,
            ERROR_LOCK_PERIOD_NOT_EXPIRED
        );
        uint256 amount = target.lockAmountAt[msg.sender];

        target.lockAmountAt[msg.sender] = 0;
        target.canUnlockAt[msg.sender] = 0;
        target.whitelistCount--;

        if (target.whitelistCount == 0) {
            emit Authorize(_chainId, _airnode, _requesterAddress, 0);
        }

        assert(IApi3Token(api3Token).transfer(msg.sender, amount));

        emit Unlock(_chainId, _airnode, _requesterAddress, msg.sender, amount);
    }

    /// @notice User calls this when the lock amount has been decreased and wants
    /// to withdraw the redundantly locked tokens
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function withdraw(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    )
        external
        override
        isNotBlacklisted(_chainId, _airnode, _requesterAddress)
    {
        require(
            chainIdToairnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].lockAmountAt[msg.sender] > lockAmount,
            ERROR_INSUFFICIENT_AMOUNT
        );
        uint256 withdrawAmount = chainIdToairnodeToRequesterToTokenLocks[
            _chainId
        ][_airnode][_requesterAddress].lockAmountAt[msg.sender] - lockAmount;
        chainIdToairnodeToRequesterToTokenLocks[_chainId][_airnode][
            _requesterAddress
        ].lockAmountAt[msg.sender] = lockAmount;

        assert(IApi3Token(api3Token).transfer(msg.sender, withdrawAmount));

        emit Withdraw(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender,
            withdrawAmount
        );
    }

    /// @notice Transfers the user's lock period and tokens to another client
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _fromRequesterAddress The client from which the transfer will be done
    /// @param _toRequesterAddress The target client to which the transfer will be done
    function transfer(
        uint256 _chainId,
        address _airnode,
        address _fromRequesterAddress,
        address _toRequesterAddress
    )
        external
        override
        isNotBlacklisted(_chainId, _airnode, _fromRequesterAddress)
        isNotBlacklisted(_chainId, _airnode, _toRequesterAddress)
    {
        AirnodeRequester storage from = chainIdToairnodeToRequesterToTokenLocks[
            _chainId
        ][_airnode][_fromRequesterAddress];
        AirnodeRequester storage to = chainIdToairnodeToRequesterToTokenLocks[
            _chainId
        ][_airnode][_toRequesterAddress];
        require(
            from.lockAmountAt[msg.sender] != 0,
            "locked amount must be != 0"
        );
        require(to.lockAmountAt[msg.sender] == 0, "locked amount must be 0");

        uint256 amount = from.lockAmountAt[msg.sender];
        from.lockAmountAt[msg.sender] = 0;
        to.lockAmountAt[msg.sender] = amount;

        uint256 expirationTime = from.canUnlockAt[msg.sender];
        from.canUnlockAt[msg.sender] = 0;
        to.canUnlockAt[msg.sender] = expirationTime;

        from.whitelistCount--;
        if (from.whitelistCount == 0) {
            emit Authorize(_chainId, _airnode, _fromRequesterAddress, 0);
        }

        to.whitelistCount++;
        if (to.whitelistCount == 1) {
            emit Authorize(
                _chainId,
                _airnode,
                _toRequesterAddress,
                type(uint64).max
            );
        }

        emit Transfer(
            _chainId,
            _airnode,
            _fromRequesterAddress,
            _toRequesterAddress,
            msg.sender,
            amount,
            expirationTime
        );
    }

    /// @notice Burns tokens for a user of an airnode-client pair.
    /// Can only be done when the client is blacklisted.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _burnTarget The address of the user
    function burn(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        address _burnTarget
    ) external override onlyWithRank(bytes32(0), uint256(AdminRank.Admin)) {
        AirnodeRequester
            storage target = chainIdToairnodeToRequesterToTokenLocks[_chainId][
                _airnode
            ][_requesterAddress];
        require(target.lockAmountAt[_burnTarget] != 0, ERROR_ZERO_AMOUNT);

        uint256 amount = target.lockAmountAt[_burnTarget];

        target.canUnlockAt[_burnTarget] = 0;
        target.lockAmountAt[_burnTarget] = 0;
        target.whitelistCount--;

        IApi3Token(api3Token).burn(amount);

        emit Burn(_chainId, _airnode, _requesterAddress, _burnTarget);
    }

    /// @dev Returns the locked amount for a target address to a chainId-airnode-client
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the user
    function lockAmountAt(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            chainIdToairnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].lockAmountAt[_target];
    }

    /// @dev Returns the unlock period for a target address to a chainId-airnode-client
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the user
    function canUnlockAt(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            chainIdToairnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].canUnlockAt[_target];
    }
}
