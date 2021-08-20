// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IApi3Token.sol";
import "./interfaces/ITokenLockRrpAuthorizerAdminExternal.sol";
import "../../../admin/MetaAdminnable.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract TokenLockRrpAuthorizerAdminExternal is
    MetaAdminnable,
    ITokenLockRrpAuthorizerAdminExternal
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }
    uint256 private constant MAX_RANK = 2**256 - 1;
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_ZERO_CHAINID = "Zero ChainId";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_ALREADY_LOCKED = "Already locked";
    string private constant ERROR_NOT_LOCKED = "No amount locked";
    string private constant ERROR_LOCK_PERIOD_NOT_EXPIRED =
        "Locking period not expired";
    string private constant ERROR_REQUESTER_BLOCKED = "Requester blocked";

    /// @dev Address of Api3Token
    address public immutable api3Token;
    /// @dev The Minimum locking time (in seconds)
    uint256 public minimumLockingTime;
    /// @dev Lock amount for each user
    uint256 public lockAmount;

    /// @dev Represents the locked amounts, periods for the sponsors
    /// and the total whitelist counts of a chainId-airnode-requester pair
    struct AirnodeRequester {
        mapping(address => uint256) sponsorLockAmount;
        mapping(address => uint256) sponsorUnlockTime;
        uint256 whitelistCount;
    }

    /// @dev Stores information about all token locks for chainId-airnode-requester pair
    mapping(uint256 => mapping(address => mapping(address => AirnodeRequester)))
        public chainIdToAirnodeToRequesterToTokenLocks;

    /// @dev Stores information for blocked chainId-airnode-requester pair
    ///      Stores true if blocked, false otherwise
    mapping(uint256 => mapping(address => mapping(address => bool)))
        public chainIdToAirnodeToRequesterToBlockStatus;

    /// @dev Sets the metaAdmin and values for minimumLockingTime,lockAmount and apiToken
    /// @param _metaAdmin The address that will be set as meta admin
    /// @param _minimumLockingTime The minimum lock time of API3 tokens for users
    /// @param _lockAmount The lock amount
    /// @param _api3Token The address of the Api3Token contract
    constructor(
        address _metaAdmin,
        uint256 _minimumLockingTime,
        uint256 _lockAmount,
        address _api3Token
    ) MetaAdminnable(_metaAdmin) {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);
        require(_api3Token != address(0), ERROR_ZERO_ADDRESS);
        minimumLockingTime = _minimumLockingTime;
        lockAmount = _lockAmount;
        api3Token = _api3Token;
    }

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev    Overriden to give Max Rank to the Airnode Master Wallet
    ///         Overriden to use the bytes32(0) as the adminnedId otherwise
    ///         Overriden to use metaAdminned ranks
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

    /// @dev Reverts if the requester is blocked globally(address(0) and chainId 0)
    ///      or on an airnode address on a particular chain
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    modifier isNotBlocked(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    ) {
        require(
            !chainIdToAirnodeToRequesterToBlockStatus[0][address(0)][
                _requesterAddress
            ],
            ERROR_REQUESTER_BLOCKED
        );
        require(
            !chainIdToAirnodeToRequesterToBlockStatus[_chainId][_airnode][
                _requesterAddress
            ],
            ERROR_REQUESTER_BLOCKED
        );
        _;
    }

    /// @notice Called by an Admin to set the minimum locking time
    /// @param _minimumLockingTime The new minimum locking time
    function setMinimumLockingTime(uint256 _minimumLockingTime)
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
    {
        minimumLockingTime = _minimumLockingTime;
        emit SetMinimumLockingTime(_minimumLockingTime);
    }

    /// @notice Called by an Admin to set the locking amount
    /// @param _lockAmount The new lock amount
    function setLockAmount(uint256 _lockAmount)
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
    {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);
        lockAmount = _lockAmount;
        emit SetLockAmount(_lockAmount);
    }

    /// @notice Called by a SuperAdmin or the airnodeAdmin to set the Block status of a chain-airnode-requester pair
    ///         also revokes access by setting whitelistExpiration to 0.
    ///         Whitelist access is only revoked when the specified chainId and airnode address is specified
    ///         otherwise specifying adress(0) and chainId 0 would only result in the requester being unable
    ///         to lock/unlock across all airnodes and chains. This is an irreversible action.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function blockRequester(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    )
        external
        override
        onlyWithRank(
            bytes32(abi.encode(_airnode)),
            uint256(AdminRank.SuperAdmin)
        )
    {
        chainIdToAirnodeToRequesterToBlockStatus[_chainId][_airnode][
            _requesterAddress
        ] = true;
        emit Authorized(
            _chainId,
            bytes32(abi.encode(_airnode)),
            _requesterAddress,
            0
        );
        emit BlockedRequester(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender
        );
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes on a given chain.
    /// Airnode-requester pair gets authorized as long as there is at least one token lock for given pair.
    /// @dev The amount to be locked is determined by a memory variable set by
    /// the owners of the contract.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function lock(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    ) external override isNotBlocked(_chainId, _airnode, _requesterAddress) {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        AirnodeRequester
            storage target = chainIdToAirnodeToRequesterToTokenLocks[_chainId][
                _airnode
            ][_requesterAddress];
        require(
            target.sponsorLockAmount[msg.sender] == 0,
            ERROR_ALREADY_LOCKED
        );

        uint256 expirationTime = block.timestamp + minimumLockingTime;
        target.sponsorLockAmount[msg.sender] = lockAmount;
        target.sponsorUnlockTime[msg.sender] = expirationTime;
        target.whitelistCount++;

        assert(
            IApi3Token(api3Token).transferFrom(
                msg.sender,
                address(this),
                lockAmount
            )
        );

        if (target.whitelistCount == 1) {
            emit Authorized(
                _chainId,
                bytes32(abi.encode(_airnode)),
                _requesterAddress,
                type(uint64).max
            );
        }

        emit Locked(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender,
            lockAmount
        );
    }

    /// @notice Unlocks the API3 tokens for a given airnode-requester pair on a given chain.
    /// Airnode-requester pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// if the locked period has expired and if the requester address is blocked
    /// Transfers to msg.sender the locked amount.
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function unlock(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    ) external override isNotBlocked(_chainId, _airnode, _requesterAddress) {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        AirnodeRequester
            storage target = chainIdToAirnodeToRequesterToTokenLocks[_chainId][
                _airnode
            ][_requesterAddress];
        require(target.sponsorLockAmount[msg.sender] != 0, ERROR_NOT_LOCKED);
        require(
            target.sponsorUnlockTime[msg.sender] <= block.timestamp,
            ERROR_LOCK_PERIOD_NOT_EXPIRED
        );
        uint256 amount = target.sponsorLockAmount[msg.sender];

        target.sponsorLockAmount[msg.sender] = 0;
        target.sponsorUnlockTime[msg.sender] = 0;
        target.whitelistCount--;

        if (target.whitelistCount == 0) {
            emit Authorized(
                _chainId,
                bytes32(abi.encode(_airnode)),
                _requesterAddress,
                0
            );
        }

        assert(IApi3Token(api3Token).transfer(msg.sender, amount));

        emit Unlocked(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender,
            amount
        );
    }

    /// @notice User calls this when the lock amount has been decreased and wants
    /// to withdraw the redundantly locked tokens
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function withdrawExcess(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress
    ) external override isNotBlocked(_chainId, _airnode, _requesterAddress) {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(
            chainIdToAirnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].sponsorLockAmount[msg.sender] > lockAmount,
            ERROR_INSUFFICIENT_AMOUNT
        );
        uint256 withdrawAmount = chainIdToAirnodeToRequesterToTokenLocks[
            _chainId
        ][_airnode][_requesterAddress].sponsorLockAmount[msg.sender] -
            lockAmount;
        chainIdToAirnodeToRequesterToTokenLocks[_chainId][_airnode][
            _requesterAddress
        ].sponsorLockAmount[msg.sender] = lockAmount;

        assert(IApi3Token(api3Token).transfer(msg.sender, withdrawAmount));

        emit WithdrawnExcess(
            _chainId,
            _airnode,
            _requesterAddress,
            msg.sender,
            withdrawAmount
        );
    }

    /// @dev Returns the locked amount for a target address to a chainId-airnode-requester sponsor
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the sponsor
    function sponsorLockAmount(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            chainIdToAirnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].sponsorLockAmount[_target];
    }

    /// @dev Returns the unlock time for a target sponsor address to a chainId-airnode-requester
    /// @param _chainId The chain id
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the sponsor
    function sponsorUnlockTime(
        uint256 _chainId,
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            chainIdToAirnodeToRequesterToTokenLocks[_chainId][_airnode][
                _requesterAddress
            ].sponsorUnlockTime[_target];
    }
}
