// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../Api3RequesterRrpAuthorizer.sol";
import "../interfaces/IApi3Token.sol";
import "./interfaces/ITokenLockRrpAuthorizerAdmin.sol";
import "../../../admin/MetaAdminnable.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract TokenLockRrpAuthorizerAdmin is
    MetaAdminnable,
    ITokenLockRrpAuthorizerAdmin
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }
    uint256 private constant MAX_RANK = 2**256 - 1;
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_ALREADY_LOCKED = "Already locked";
    string private constant ERROR_NOT_LOCKED = "No amount locked";
    string private constant ERROR_LOCK_PERIOD_NOT_EXPIRED =
        "Locking period not expired";
    string private constant ERROR_REQUESTER_BLOCKED = "Requester Blocked";

    /// @dev Address of api3RequesterRrpAuthorizer contract
    address public immutable api3RequesterRrpAuthorizer;
    /// @dev Address of Api3Token
    address public immutable api3Token;
    /// @dev The Minimum locking time (in seconds)
    uint256 public minimumLockingTime;
    /// @dev Lock amount for each user
    uint256 public lockAmount;

    /// @dev Represents the locked amounts, periods for the sponsors
    /// and the total whitelist counts of a airnode-requester pair
    struct AirnodeRequester {
        mapping(address => uint256) sponsorLockAmount;
        mapping(address => uint256) sponsorUnlockTime;
        uint256 whitelistCount;
    }

    /// @dev Stores information about all token locks for airnode-requester pair
    mapping(address => mapping(address => AirnodeRequester))
        public airnodeToRequesterToTokenLocks;

    /// @dev Stores information for blocked airnode-requester pair
    ///      Stores true if blocked, false otherwise
    mapping(address => mapping(address => bool))
        public airnodeToRequesterToBlockStatus;

    /// @dev Sets the metaAdmin and values for minimumLockingTime,lockAmount,api3Token
    ///      and api3RequesterRrpAuthorizer
    /// @param _metaAdmin The address that will be set as meta admin
    /// @param _minimumLockingTime The minimum lock time of API3 tokens for users
    /// @param _lockAmount The lock amount
    /// @param _api3RequesterRrpAuthorizer The address of the Api3RequesterRrpAuthorizer contract
    /// @param _api3Token The address of the Api3Token contract
    constructor(
        address _metaAdmin,
        uint256 _minimumLockingTime,
        uint256 _lockAmount,
        address _api3RequesterRrpAuthorizer,
        address _api3Token
    ) MetaAdminnable(_metaAdmin) {
        require(_lockAmount != 0, ERROR_ZERO_AMOUNT);
        require(_api3RequesterRrpAuthorizer != address(0), ERROR_ZERO_ADDRESS);
        require(_api3Token != address(0), ERROR_ZERO_ADDRESS);
        minimumLockingTime = _minimumLockingTime;
        lockAmount = _lockAmount;
        api3RequesterRrpAuthorizer = _api3RequesterRrpAuthorizer;
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

    /// @dev Reverts if the requester is blocked globally(address(0)) or
    ///      on an airnode address
    /// @param _airnode The airnode Address
    /// @param _requesterAddress The requester address
    modifier isNotBlocked(address _airnode, address _requesterAddress) {
        require(
            !airnodeToRequesterToBlockStatus[address(0)][_requesterAddress],
            ERROR_REQUESTER_BLOCKED
        );
        require(
            !airnodeToRequesterToBlockStatus[_airnode][_requesterAddress],
            ERROR_REQUESTER_BLOCKED
        );
        _;
    }

    /// @notice Called by the admin to set the minimum locking time
    /// @param _minimumLockingTime The new minimum locking time
    function setMinimumLockingTime(uint256 _minimumLockingTime)
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
    {
        minimumLockingTime = _minimumLockingTime;
        emit SetMinimumLockingTime(_minimumLockingTime);
    }

    /// @notice Called by the admin to set the locking amount
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

    /// @notice Called by a SuperAdmin or the airnodeAdmin to set the Block status of a airnode-requester pair
    ///         also revokes access by setting whitelistExpiration to 0.
    ///         Whitelist access is only revoked when the specified airnode address is specified
    ///         otherwise specifying adress(0) would only result in the requester being unable
    ///         to lock/unlock across all airnodes. This is an irreversible action.
    /// @param _airnode The airnode address
    /// @param _requesterAddress requester address
    function blockRequester(address _airnode, address _requesterAddress)
        external
        override
        onlyWithRank(
            bytes32(abi.encode(_airnode)),
            uint256(AdminRank.SuperAdmin)
        )
    {
        airnodeToRequesterToBlockStatus[_airnode][_requesterAddress] = true;
        IApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer)
            .setWhitelistExpiration(
                bytes32(abi.encode(_airnode)),
                _requesterAddress,
                0
            );
        emit BlockedRequester(_airnode, _requesterAddress, msg.sender);
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes.
    /// Airnode-requester pair gets authorized as long as there is at least one token lock for given pair.
    /// @dev The amount to be locked is determined by a memory variable set by
    /// the owners of the contract.
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function lock(address _airnode, address _requesterAddress)
        external
        override
        isNotBlocked(_airnode, _requesterAddress)
    {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        AirnodeRequester
            storage airnodeRequester = airnodeToRequesterToTokenLocks[_airnode][
                _requesterAddress
            ];
        require(
            airnodeRequester.sponsorLockAmount[msg.sender] == 0,
            ERROR_ALREADY_LOCKED
        );

        uint256 expirationTime = block.timestamp + minimumLockingTime;
        airnodeRequester.sponsorLockAmount[msg.sender] = lockAmount;
        airnodeRequester.sponsorUnlockTime[msg.sender] = expirationTime;
        airnodeRequester.whitelistCount++;

        assert(
            IApi3Token(api3Token).transferFrom(
                msg.sender,
                address(this),
                lockAmount
            )
        );

        if (airnodeRequester.whitelistCount == 1) {
            IApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer)
                .setWhitelistExpiration(
                    bytes32(abi.encode(_airnode)),
                    _requesterAddress,
                    type(uint64).max
                );
        }

        emit Locked(_airnode, _requesterAddress, msg.sender, lockAmount);
    }

    /// @notice Unlocks the API3 tokens for a given airnode-requester pair.
    /// Airnode-requester pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// if the locked period has expired and if the requester address is blocked
    /// Transfers to msg.sender the locked amount.
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function unlock(address _airnode, address _requesterAddress)
        external
        override
        isNotBlocked(_airnode, _requesterAddress)
    {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        AirnodeRequester
            storage airnodeRequester = airnodeToRequesterToTokenLocks[_airnode][
                _requesterAddress
            ];
        require(
            airnodeRequester.sponsorLockAmount[msg.sender] != 0,
            ERROR_NOT_LOCKED
        );
        require(
            airnodeRequester.sponsorUnlockTime[msg.sender] <= block.timestamp,
            ERROR_LOCK_PERIOD_NOT_EXPIRED
        );
        uint256 amount = airnodeRequester.sponsorLockAmount[msg.sender];

        airnodeRequester.sponsorLockAmount[msg.sender] = 0;
        airnodeRequester.sponsorUnlockTime[msg.sender] = 0;
        airnodeRequester.whitelistCount--;

        if (airnodeRequester.whitelistCount == 0) {
            IApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer)
                .setWhitelistExpiration(
                    bytes32(abi.encode(_airnode)),
                    _requesterAddress,
                    0
                );
        }

        assert(IApi3Token(api3Token).transfer(msg.sender, amount));

        emit Unlocked(_airnode, _requesterAddress, msg.sender, amount);
    }

    /// @notice User calls this when the lock amount has been decreased and wants
    /// to withdraw the redundantly locked tokens
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    function withdrawExcess(address _airnode, address _requesterAddress)
        external
        override
        isNotBlocked(_airnode, _requesterAddress)
    {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(
            airnodeToRequesterToTokenLocks[_airnode][_requesterAddress]
                .sponsorLockAmount[msg.sender] > lockAmount,
            ERROR_INSUFFICIENT_AMOUNT
        );
        uint256 withdrawAmount = airnodeToRequesterToTokenLocks[_airnode][
            _requesterAddress
        ].sponsorLockAmount[msg.sender] - lockAmount;
        airnodeToRequesterToTokenLocks[_airnode][_requesterAddress]
            .sponsorLockAmount[msg.sender] = lockAmount;
        assert(IApi3Token(api3Token).transfer(msg.sender, withdrawAmount));

        emit WithdrawnExcess(
            _airnode,
            _requesterAddress,
            msg.sender,
            withdrawAmount
        );
    }

    /// @dev Returns the locked amount for a target sponsor address to an airnode-requester pair
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the sponsor
    function sponsorLockAmount(
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            airnodeToRequesterToTokenLocks[_airnode][_requesterAddress]
                .sponsorLockAmount[_target];
    }

    /// @dev Returns the unlock period for a target sponsor address to an airnode-requester pair
    /// @param _airnode The airnode address
    /// @param _requesterAddress The requester address
    /// @param _target The address of the sponsor
    function sponsorUnlockTime(
        address _airnode,
        address _requesterAddress,
        address _target
    ) public view returns (uint256) {
        return
            airnodeToRequesterToTokenLocks[_airnode][_requesterAddress]
                .sponsorUnlockTime[_target];
    }
}
