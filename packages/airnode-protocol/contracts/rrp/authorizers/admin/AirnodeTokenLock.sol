// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../authorizers/interfaces/IRequesterAuthorizerWithManager.sol";
import "./AirnodeRequesterAuthorizerRegistryClient.sol";
import "./AirnodeTokenLockRolesWithManager.sol";
import "./interfaces/IAirnodeFeeRegistry.sol";
import "./interfaces/IAirnodeRequesterAuthorizerRegistry.sol";
import "./interfaces/IAirnodeTokenLock.sol";

/// @title The contract used to lock API3 Tokens in order to gain access to Airnodes
contract AirnodeTokenLock is
    AirnodeRequesterAuthorizerRegistryClient,
    AirnodeTokenLockRolesWithManager,
    IAirnodeTokenLock
{
    string private constant ERROR_ZERO_CHAINID = "Zero chainId";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_NOT_AIRNODE = "Not airnode";
    string private constant ERROR_ZERO_AMOUNT = "Zero amount";
    string private constant ERROR_INSUFFICIENT_AMOUNT = "Insufficient amount";
    string private constant ERROR_ALREADY_LOCKED = "Already locked";
    string private constant ERROR_NOT_LOCKED = "No amount locked";
    string private constant ERROR_LOCK_PERIOD_NOT_EXPIRED =
        "Locking period not expired";
    string private constant ERROR_REQUESTER_BLOCKED = "Requester blocked";
    string private constant ERROR_REQUESTER_NOT_BLOCKED =
        "Requester not blocked";
    string private constant ERROR_AIRNODE_NOT_OPTED_IN = "Airnode not opted in";
    string private constant ERROR_NOT_ORACLE = "Not oracle";
    string private constant ERROR_NOT_AIRNODE_FEE_REGISTRY_SETTER =
        "Not airnodeFeeRegistry setter";
    string private constant ERROR_NOT_COEFFICIENT_SETTER =
        "Not coefficient setter";
    string private constant ERROR_NOT_OPT_STATUS_SETTER =
        "Not opt status setter";
    string private constant ERROR_NOT_BLOCK_WITHDRAW_DESTINATION_SETTER =
        "Not block withdraw destination setter";
    string private constant ERROR_NOT_BLOCK_REQUESTER = "Not block requester";

    /// @notice Address of Api3Token
    address public immutable api3Token;

    /// @notice Address of AirnodeFeeRegistry
    address public override airnodeFeeRegistry;

    /// @notice The price of API3 in terms of USD
    /// @dev The price has 18 decimal places
    uint256 public override api3PriceInUsd;

    /// @notice A coefficient used to calculate the amount of tokens to be locked
    /// @dev The multiplier coefficient has 18 decimal places
    uint256 public override multiplierCoefficient;

    /// @notice Represents the locked amounts and the total whitelist counts of Lockers
    /// for a chainId-airnode-endpointId-requester pair
    struct TokenLocks {
        mapping(address => uint256) lockerToLockAmount;
        uint256 whitelistCount;
    }

    /// @notice Stores information about all token locks for a
    /// chainId-airnode-endpointId-requester pair
    mapping(uint256 => mapping(address => mapping(bytes32 => mapping(address => TokenLocks))))
        public tokenLocks;

    /// @notice Stores information for blocked airnode-requester pair
    ///      Stores true if blocked, false otherwise
    mapping(address => mapping(address => bool))
        public
        override airnodeToRequesterToBlockStatus;

    /// @notice The Address to which blocked tokens will be withdrawn to
    address public override blockWithdrawDestination;

    /// @notice mapping used to store opted in status of Airnodes.
    /// The status are set by opt status setter.
    mapping(address => bool) public override airnodeOptInStatus;

    /// @notice mapping used to store opted out status of Airnodes.
    /// The status are set by the airnode itself.
    mapping(address => bool) public override airnodeSelfOptOutStatus;

    /// @notice The manager address here is expected to belong to an
    /// AccessControlAgent contract that is owned by the DAO
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _api3Token The address of the Api3Token contract
    /// @param _airnodeFeeRegistry The address of the of the AirnodeFeeRegistry contract
    /// @param _airnodeRequesterAuthorizerRegistry The address of the AirnodeRequesterAuthorizerRegistry contract
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _api3Token,
        address _airnodeFeeRegistry,
        address _airnodeRequesterAuthorizerRegistry
    )
        AirnodeTokenLockRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        AirnodeRequesterAuthorizerRegistryClient(
            _airnodeRequesterAuthorizerRegistry
        )
    {
        require(_api3Token != address(0), ERROR_ZERO_ADDRESS);
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        api3Token = _api3Token;
        airnodeFeeRegistry = _airnodeFeeRegistry;
    }

    /// @notice Reverts if the requester is blocked globally(address(0)) or
    /// on an airnode address
    /// @param _airnode The airnode Address
    /// @param _requesterAddress The requester address
    modifier isNotBlocked(address _airnode, address _requesterAddress) {
        require(
            !airnodeToRequesterToBlockStatus[address(0)][_requesterAddress] &&
                !airnodeToRequesterToBlockStatus[_airnode][_requesterAddress],
            ERROR_REQUESTER_BLOCKED
        );
        _;
    }

    /// @notice Reverts if the airnode is not opted in or has choosen to opt out
    /// @param _airnode The airnode Address
    modifier isOptedIn(address _airnode) {
        require(
            airnodeOptInStatus[_airnode] && !airnodeSelfOptOutStatus[_airnode],
            ERROR_AIRNODE_NOT_OPTED_IN
        );
        _;
    }

    /// @notice Called by a airnodeFeeRegistry setter to set the address
    /// of the AirnodeFeeRegistry contract
    /// @param _airnodeFeeRegistry The address of the AirnodeFeeRegistry contract
    function setAirnodeFeeRegistry(address _airnodeFeeRegistry)
        external
        override
    {
        require(
            hasAirnodeFeeRegistrySetterRoleOrIsManager(msg.sender),
            ERROR_NOT_AIRNODE_FEE_REGISTRY_SETTER
        );
        require(_airnodeFeeRegistry != address(0), ERROR_ZERO_ADDRESS);
        airnodeFeeRegistry = _airnodeFeeRegistry;
        emit SetAirnodeFeeRegistry(_airnodeFeeRegistry, msg.sender);
    }

    /// @notice Called by an oracle to set the price of API3
    /// @param _price The price of API3 in USD
    function setAPI3Price(uint256 _price) external override {
        require(hasOracleRoleOrIsManager(msg.sender), ERROR_NOT_ORACLE);
        require(_price != 0, ERROR_ZERO_AMOUNT);
        api3PriceInUsd = _price;
        emit SetAPI3Price(_price, msg.sender);
    }

    /// @notice Called by a coefficient setter to set the multiplier coefficient
    /// @param _multiplierCoefficient The multiplier coefficeint
    function setMultiplierCoefficient(uint256 _multiplierCoefficient)
        external
        override
    {
        require(
            hasCoefficientSetterRoleOrIsManager(msg.sender),
            ERROR_NOT_COEFFICIENT_SETTER
        );
        require(_multiplierCoefficient != 0, ERROR_ZERO_AMOUNT);
        multiplierCoefficient = _multiplierCoefficient;
        emit SetMultiplierCoefficient(_multiplierCoefficient, msg.sender);
    }

    /// @notice Called by a opt status setter to set the opt status of an airnode
    /// @param _airnode The airnode address
    /// @param _status The Opted status for the airnode
    function setOptInStatus(address _airnode, bool _status) external override {
        require(
            hasOptStatusSetterRoleOrIsManager(msg.sender),
            ERROR_NOT_OPT_STATUS_SETTER
        );
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        airnodeOptInStatus[_airnode] = _status;
        emit SetOptInStatus(_airnode, _status, msg.sender);
    }

    /// @notice Called by the airnode to set the opt status for itself
    /// @param _status The Opted status for the airnode
    function setSelfOptOutStatus(bool _status) external override {
        airnodeSelfOptOutStatus[msg.sender] = _status;
        emit SetSelfOptOutStatus(msg.sender, _status);
    }

    /// @notice Called by the blockWithdrawDestination setter to set the
    /// withdraw destination of blocked requester tokens
    /// @param _destination The destination to which the blocked requester tokens will be withdrawn
    function setBlockWithdrawDestination(address _destination)
        external
        override
    {
        require(
            hasBlockWithdrawDestinationSetterRoleOrIsManager(msg.sender),
            ERROR_NOT_BLOCK_WITHDRAW_DESTINATION_SETTER
        );
        require(_destination != address(0), ERROR_ZERO_ADDRESS);
        blockWithdrawDestination = _destination;
        emit SetBlockWithdrawDestination(_destination, msg.sender);
    }

    /// @notice Locks API3 Tokens to gain access to Airnodes.
    /// @dev chainId-airnode-endpoint-requester pair gets authorized as long as there is
    /// at least one token lock for given pair.
    /// @notice The amount to be locked is determined by the fee set in the AirnodeFeeRegistry Contract
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
        isOptedIn(_airnode)
        isNotBlocked(_airnode, _requesterAddress)
    {
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
        TokenLocks storage tokenLock = tokenLocks[_chainId][_airnode][
            _endpointId
        ][_requesterAddress];
        require(
            tokenLock.lockerToLockAmount[msg.sender] == 0,
            ERROR_ALREADY_LOCKED
        );

        uint256 lockAmount = getLockAmount(_chainId, _airnode, _endpointId);

        tokenLock.lockerToLockAmount[msg.sender] = lockAmount;
        tokenLock.whitelistCount++;

        if (tokenLock.whitelistCount == 1) {
            IRequesterAuthorizerWithManager(
                IAirnodeRequesterAuthorizerRegistry(
                    airnodeRequesterAuthorizerRegistry
                ).chainIdToRequesterAuthorizerWithManager(_chainId)
            ).setIndefiniteWhitelistStatus(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    true
                );
        }

        assert(
            IERC20(api3Token).transferFrom(
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
            lockAmount,
            tokenLock.whitelistCount
        );
    }

    /// @notice Unlocks the API3 tokens for a given chain-airnode-requester-endpoint pair.
    /// chainId-airnode-endpoint-requester pair will be unauthorized if no token lock for the pair is found.
    /// @dev Checks whether the user (msg.sender) has already locked anything,
    /// or if the requester address is blocked. Transfers to msg.sender the locked amount.
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being unlocked
    function unlock(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress
    ) external override isNotBlocked(_airnode, _requesterAddress) {
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
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
            IRequesterAuthorizerWithManager(
                IAirnodeRequesterAuthorizerRegistry(
                    airnodeRequesterAuthorizerRegistry
                ).chainIdToRequesterAuthorizerWithManager(_chainId)
            ).setIndefiniteWhitelistStatus(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    false
                );
        }

        assert(IERC20(api3Token).transfer(msg.sender, amount));

        emit Unlocked(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            msg.sender,
            amount,
            tokenLock.whitelistCount
        );
    }

    /// @notice Called by a block requester role to set the Block status of a airnode-requester pair.
    /// A blocked requester can have its Locks be withdrawn into the address specified
    /// by the blockWithdrawDestination setter. This is an irreversible action.
    /// @dev A requester blocked on address(0) is blocked globally
    /// @param _airnode The airnode address
    /// @param _requesterAddress requester address
    function blockRequester(address _airnode, address _requesterAddress)
        external
        override
    {
        require(
            hasBlockRequesterRoleOrIsManager(msg.sender),
            ERROR_NOT_BLOCK_REQUESTER
        );
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
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
            ERROR_REQUESTER_NOT_BLOCKED
        );
        require(_chainId != 0, ERROR_ZERO_CHAINID);
        require(_airnode != address(0), ERROR_ZERO_ADDRESS);
        require(_requesterAddress != address(0), ERROR_ZERO_ADDRESS);
        require(_locker != address(0), ERROR_ZERO_ADDRESS);
        TokenLocks storage tokenLock = tokenLocks[_chainId][_airnode][
            _endpointId
        ][_requesterAddress];
        require(tokenLock.lockerToLockAmount[_locker] != 0, ERROR_NOT_LOCKED);

        uint256 amount = tokenLock.lockerToLockAmount[_locker];

        tokenLock.lockerToLockAmount[_locker] = 0;
        tokenLock.whitelistCount--;

        if (tokenLock.whitelistCount == 0) {
            IRequesterAuthorizerWithManager(
                IAirnodeRequesterAuthorizerRegistry(
                    airnodeRequesterAuthorizerRegistry
                ).chainIdToRequesterAuthorizerWithManager(_chainId)
            ).setIndefiniteWhitelistStatus(
                    _airnode,
                    _endpointId,
                    _requesterAddress,
                    false
                );
        }

        assert(IERC20(api3Token).transfer(blockWithdrawDestination, amount));

        emit WithdrewBlocked(
            _chainId,
            _airnode,
            _endpointId,
            _requesterAddress,
            _locker,
            blockWithdrawDestination,
            amount
        );
    }

    /// @notice Returns the current amount a locker has to
    /// lock for a given chainId-airnode-endpointId
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    function getLockAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId
    ) public view override returns (uint256 _lockAmount) {
        uint256 endpointFee = IAirnodeFeeRegistry(airnodeFeeRegistry)
            .getEndpointPrice(_chainId, _airnode, _endpointId);
        _lockAmount = (multiplierCoefficient * endpointFee) / api3PriceInUsd;
    }

    /// @notice Returns the locked amount of a locker for a chainId-airnode-endpointId-requester pair
    /// @param _chainId The id of the chain
    /// @param _airnode The airnode address
    /// @param _endpointId The endpointId
    /// @param _requesterAddress The address of the requester for which tokens are being withdrawn
    /// @param _locker The address of the locker
    function lockerToLockAmount(
        uint256 _chainId,
        address _airnode,
        bytes32 _endpointId,
        address _requesterAddress,
        address _locker
    ) external view override returns (uint256) {
        return
            tokenLocks[_chainId][_airnode][_endpointId][_requesterAddress]
                .lockerToLockAmount[_locker];
    }
}
