// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../DaoRequesterRrpAuthorizer.sol";
import "../interfaces/IApi3Token.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IAirnodeTokenLock.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract AirnodeTokenLock is IAirnodeTokenLock {
    string private constant ERROR_ZERO_CHAINID = "Zero ChainID";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_NOT_AIRNODE = "Caller not Airnode";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_ALREADY_LOCKED = "Already locked";
    string private constant ERROR_NOT_LOCKED = "No amount locked";
    string private constant ERROR_LOCK_PERIOD_NOT_EXPIRED =
        "Locking period not expired";
    string private constant ERROR_REQUESTER_BLOCKED = "Requester Blocked";
    string private constant ERROR_REQUESTER_NOT_BLOCKED =
        "Requester Not Blocked";
    string private constant ERROR_AIRNODE_NOT_OPTED_IN = "Airnode not opted in";
    string private constant ERROR_NOT_ORACLE = "NOT ORACLE";

    /// @dev Address of Api3Token
    address public immutable api3Token;

    /// @dev Address of AirnodeFeeRegistry
    address public airnodeFeeRegistry;

    /// @dev The price of API3 in terms of USD
    /// @notice The price is specified upto 6 decimal places
    uint256 public api3PriceInUsd;

    /// @dev A coefficient used to calculate the amount of tokens to be locked
    uint8 public multiplierCoefficient;

    /// @dev Represents the locked amounts and the total whitelist counts of Lockers
    /// for a chainId-airnode-endpointId-requester pair
    struct TokenLocks {
        mapping(address => uint256) lockerToLockAmount;
        uint256 whitelistCount;
    }

    /// @dev Stores information about all token locks for a chainId-airnode-endpointId-requester pair
    mapping(uint256 => mapping(address => mapping(bytes32 => mapping(address => TokenLocks))))
        public tokenLocks;

    /// @dev Stores information for blocked airnode-requester pair
    ///      Stores true if blocked, false otherwise
    mapping(address => mapping(address => bool))
        public airnodeToRequesterToBlockStatus;

    /// @dev The Address to which blocked tokens will be withdrawn to
    address public blockWithdrawDestination;

    /// @dev mapping used to store all the oracle addresses
    mapping(address => bool) public isOracle;

    /// @dev mapping used to store opted in status of Airnodes.
    /// The status are set by admins.
    mapping(address => bool) public AirnodeOptStatus;

    /// @dev mapping used to store opted in status of Airnodes.
    /// The status are set by the airnode itself.
    mapping(address => bool) public AirnodeSelfOptStatus;

    /// @dev mapping used to store all the DaoRequesterRrpAuthorizer addresses for different chains
    mapping(uint256 => address) public chainIdToDaoRequesterRrpAuthorizer;

    /// @dev Sets the metaAdmin and values for api3Token
    ///      and daoRequesterRrpAuthorizer
    /// @param _api3Token The address of the Api3Token contract
    constructor(address _api3Token, address _airnodeFeeRegistry) {
        require(_api3Token != address(0), ERROR_ZERO_ADDRESS);
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        api3Token = _api3Token;
        airnodeFeeRegistry = _airnodeFeeRegistry;
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

    /// @dev Reverts if the requester is not opted in or has choosen to opt out
    /// @param _airnode The airnode Address
    modifier isOptedIn(address _airnode) {
        require(
            AirnodeOptStatus[_airnode] && AirnodeSelfOptStatus[_airnode],
            ERROR_AIRNODE_NOT_OPTED_IN
        );
        _;
    }

    /// @dev Called by an admin or higher rank to set the status of an oracle address
    /// @param _oracle The address of the oracle that can update the price
    /// @param _status The status to be set
    function setOracle(address _oracle, bool _status) external override {
        isOracle[_oracle] = _status;
        emit SetOracle(_oracle, _status, msg.sender);
    }

    /// @dev Called by an oracle to set the price of API3
    /// @param _price The price of API3 in USD
    function setAPI3Price(uint256 _price) external override {
        require(isOracle[msg.sender], ERROR_NOT_ORACLE);
        api3PriceInUsd = _price;
        emit SetAPI3Price(_price, msg.sender);
    }

    /// @dev Called by an admin to set the opt status of an airnode
    /// @param _airnode The airnode address
    /// @param _status The Opted status for the airnode
    function setOptStatus(address _airnode, bool _status) external override {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        AirnodeOptStatus[_airnode] = _status;
        emit SetOptStatus(_airnode, _status, msg.sender);
    }

    /// @dev Called by the airnode to set the opt status for itself
    /// @param _airnode The airnode address
    /// @param _status The Opted status for the airnode
    function setSelfOptStatus(address _airnode, bool _status)
        external
        override
    {
        require(msg.sender == _airnode, ERROR_NOT_AIRNODE);
        AirnodeSelfOptStatus[_airnode] = _status;
        emit SetSelfOptStatus(_airnode, _status);
    }

    /// @dev Called by an admin or higher rank to set the address of DaoRequesterRrpAuthorizer
    /// for different chains
    /// @param _chainId The chainId
    /// @param _daoRequesterRrpAuthorizer The address of the DaoRequesterRrpAuthorizer on the chainId
    function setDaoRequesterRrpAuthorizer(
        uint256 _chainId,
        address _daoRequesterRrpAuthorizer
    ) external override {
        chainIdToDaoRequesterRrpAuthorizer[
            _chainId
        ] = _daoRequesterRrpAuthorizer;
        emit SetDaoRequesterRrpAuthorizer(
            _chainId,
            _daoRequesterRrpAuthorizer,
            msg.sender
        );
    }

    /// @dev Called by the metaAdmin to set the withdraw destination of blocked requester tokens
    /// @param _destination The destination to which the blocked requester tokens will be withdrawn
    function setBlockWithdrawDestination(address _destination)
        external
        override
    {
        require(_destination != address(0), ERROR_ZERO_ADDRESS);
        blockWithdrawDestination = _destination;
        emit SetBlockWithdrawDestination(_destination, msg.sender);
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes.
    /// chainId-airnode-endpoint-requester pair gets authorized as long as there is at least one token lock for given pair.
    /// @dev The amount to be locked is determined by the fee set in the AirnodeFeeRegistry Contract
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being locked
    function lock(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress
    )
        external
        override
        isNotBlocked(_airnode, _requesterAddress)
        isOptedIn(_airnode)
    {
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        TokenLocks storage tokenLock = tokenLocks[_chainId][_airnode][
            _endpointId
        ][_requesterAddress];
        require(
            tokenLock.lockerToLockAmount[msg.sender] == 0,
            ERROR_ALREADY_LOCKED
        );

        uint256 endpointFee = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        uint256 lockAmount = (multiplierCoefficient * endpointFee) /
            api3PriceInUsd;

        tokenLock.lockerToLockAmount[msg.sender] = lockAmount;
        tokenLock.whitelistCount++;

        if (tokenLock.whitelistCount == 1) {
            IDaoRequesterRrpAuthorizer(
                chainIdToDaoRequesterRrpAuthorizer[_chainId]
            ).setWhitelistExpiration(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    type(uint64).max
                );
        }

        assert(
            IApi3Token(api3Token).transferFrom(
                msg.sender,
                address(this),
                lockAmount
            )
        );

        emit Locked(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            lockAmount
        );
    }

    /// @notice Unlocks the API3 tokens for a given airnode-requester-endpoint pair.
    /// chainId-airnode-endpoint-requester pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// or if the requester address is blocked
    /// Transfers to msg.sender the locked amount.
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being unlocked
    function unlock(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress
    )
        external
        override
        isNotBlocked(_airnode, _requesterAddress)
        isOptedIn(_airnode)
    {
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        TokenLocks storage tokenLock = tokenLocks[_chainId][_airnode][
            _endpointId
        ][_requesterAddress];
        require(
            tokenLock.lockerToLockAmount[msg.sender] != 0,
            ERROR_NOT_LOCKED
        );

        uint256 amount = tokenLock.lockerToLockAmount[msg.sender];

        tokenLock.lockerToLockAmount[msg.sender] = 0;
        tokenLock.whitelistCount--;

        if (tokenLock.whitelistCount == 0) {
            IDaoRequesterRrpAuthorizer(
                chainIdToDaoRequesterRrpAuthorizer[_chainId]
            ).setWhitelistExpiration(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    0
                );
        }

        assert(IApi3Token(api3Token).transfer(msg.sender, amount));

        emit Unlocked(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            amount
        );
    }

    /// @notice Called by a SuperAdmin set the Block status of a airnode-requester pair.
    /// A blocked requester can have its Locks be withdrawn into the address specified
    /// by the metaAdmin. This is an irreversible action.
    /// @param _airnode The airnode address
    /// @param _requesterAddress requester address
    function blockRequester(address _airnode, address _requesterAddress)
        external
        override
    {
        airnodeToRequesterToBlockStatus[_airnode][_requesterAddress] = true;
        emit BlockedRequester(_airnode, _requesterAddress, msg.sender);
    }

    /// @notice Function called to withdraw locked tokens of blocked requesters.
    /// The tokens are transferred to the address specified in "blockWithdrawDestination"
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being withdrawn
    /// @param _locker The address of the locker that locked tokens for the requester
    function withdrawBlocked(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        address _locker
    ) external override {
        require(
            airnodeToRequesterToBlockStatus[address(0)][_requesterAddress] ||
                airnodeToRequesterToBlockStatus[_airnode][_requesterAddress],
            ERROR_REQUESTER_BLOCKED
        );
        TokenLocks storage tokenLock = tokenLocks[_chainId][_airnode][
            _endpointId
        ][_requesterAddress];
        require(tokenLock.lockerToLockAmount[_locker] != 0, ERROR_NOT_LOCKED);

        uint256 amount = tokenLock.lockerToLockAmount[_locker];

        tokenLock.lockerToLockAmount[_locker] = 0;
        tokenLock.whitelistCount--;

        if (tokenLock.whitelistCount == 0) {
            IDaoRequesterRrpAuthorizer(
                chainIdToDaoRequesterRrpAuthorizer[_chainId]
            ).setWhitelistExpiration(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    0
                );
        }

        assert(
            IApi3Token(api3Token).transfer(blockWithdrawDestination, amount)
        );

        emit WithdrawBlocked(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            _locker,
            blockWithdrawDestination,
            amount
        );
    }

    /// @dev Returns the locked amount for a target sponsor address to an airnode-requester pair
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being withdrawn
    /// @param _locker The address of the locker
    function lockerLockAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        address _locker
    ) public view returns (uint256) {
        return
            tokenLocks[_chainId][_airnode][_endpointId][_requesterAddress]
                .lockerToLockAmount[_locker];
    }
}
