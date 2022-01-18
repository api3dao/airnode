// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "./AirnodeEndpointFeeRegistryReader.sol";
import "./RequesterAuthorizerRegistryReader.sol";
import "./interfaces/IRequesterAuthorizerWhitelisterWithToken.sol";
import "../authorizers/interfaces/IRequesterAuthorizer.sol";

/// @title RequesterAuthorizer indefinite whitelister contract that allows
/// users to deposit the respective token to be whitelisted
contract RequesterAuthorizerWhitelisterWithToken is
    AccessControlRegistryAdminnedWithManager,
    AirnodeEndpointFeeRegistryReader,
    RequesterAuthorizerRegistryReader,
    IRequesterAuthorizerWhitelisterWithToken
{
    /// @notice Maintainer role description
    string public constant override MAINTAINER_ROLE_DESCRIPTION = "Maintainer";

    /// @notice Maintainer role
    /// @dev Maintainers can call methods to maintain prices and Airnode
    /// statuses, but cannot block requesters
    bytes32 public immutable override maintainerRole;

    /// @notice Blocker role description
    /// @dev Blockers can call block requesters, which can be used to deny
    /// service to a previously whitelisted requester. Therefore, the blocker
    /// role should be handled carefully.
    string public constant override BLOCKER_ROLE_DESCRIPTION = "Blocker";

    bytes32 public immutable override blockerRole;

    /// @notice Contract address of the token that can be deposited to be
    /// whitelisted
    address public immutable token;

    /// @notice Token price in USD (times 10^18)
    uint256 public override tokenPrice;

    /// @notice Coefficient that can be used to adjust the amount of tokens
    /// to be deposited
    /// @dev If `token` has 18 decimals, a `priceCoefficient` of 10^18 means
    /// the fee registry amount will be used directly, while a
    /// `priceCoefficient` of 10^19 means 10 times the fee registry amount will
    /// be used. On the other hand, if `token` has 6 decimals, a
    /// `priceCoefficient` of 10^6 means the fee registry amount will be used
    /// directly.
    uint256 public override priceCoefficient;

    /// @notice Address to which the funds deposited for blocked requesters can
    /// be withdrawn to
    address public override blockedWithdrawalDestination;

    /// @notice Airnode status regarding participation in this contract
    mapping(address => AirnodeStatus) public override airnodeToStatus;

    /// @notice If a requester is blocked globally
    mapping(address => bool) public override requesterToBlockStatus;

    /// @notice If a requester is blocked for the specific Airnode
    mapping(address => mapping(address => bool))
        public
        override airnodeToRequesterToBlockStatus;

    /// @dev Reverts if Airnode address is zero
    /// @param airnode Airnode address
    modifier onlyNonZeroAirnode(address airnode) {
        require(airnode != address(0), "Airnode address zero");
        _;
    }

    /// @dev Reverts if chain ID is zero
    /// @param chainId Chain ID
    modifier onlyNonZeroChainId(uint256 chainId) {
        require(chainId != 0, "Chain ID zero");
        _;
    }

    /// @dev Reverts if requester address is zero
    /// @param requester Requester address
    modifier onlyNonZeroRequester(address requester) {
        require(requester != address(0), "Requester address zero");
        _;
    }

    /// @dev Reverts if requester is blocked
    /// @param airnode Airnode address
    /// @param requester Requester address
    modifier onlyNonBlockedRequester(address airnode, address requester) {
        require(!requesterIsBlocked(airnode, requester), "Requester blocked");
        _;
    }

    /// @dev Reverts if sender does not have the maintainer role and is not the
    /// manager
    modifier onlyMaintainer() {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    maintainerRole,
                    msg.sender
                ),
            "Sender not maintainer"
        );
        _;
    }

    /// @dev Reverts if sender does not have the blocker role and is not the
    /// manager
    modifier onlyBlocker() {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    blockerRole,
                    msg.sender
                ),
            "Sender not blocker"
        );
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeEndpointFeeRegistry AirnodeFeeRegistry contract address
    /// @param _requesterAuthorizerRegistry RequesterAuthorizerRegistry contract address
    /// @param _token Token contract address
    /// @param _tokenPrice Token price in USD (times 10^18)
    /// @param _priceCoefficient Price coefficient (has the same number of
    /// decimals as the token)
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeEndpointFeeRegistry,
        address _requesterAuthorizerRegistry,
        address _token,
        uint256 _tokenPrice,
        uint256 _priceCoefficient
    )
        AccessControlRegistryAdminnedWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        AirnodeEndpointFeeRegistryReader(_airnodeEndpointFeeRegistry)
        RequesterAuthorizerRegistryReader(_requesterAuthorizerRegistry)
    {
        require(_token != address(0), "Token address zero");
        token = _token;
        _setTokenPrice(_tokenPrice);
        _setPriceCoefficient(_priceCoefficient);
        maintainerRole = _deriveRole(
            adminRole,
            keccak256(abi.encodePacked(MAINTAINER_ROLE_DESCRIPTION))
        );
        blockerRole = _deriveRole(
            adminRole,
            keccak256(abi.encodePacked(BLOCKER_ROLE_DESCRIPTION))
        );
    }

    /// @notice Sets token price
    /// @param _tokenPrice Token price in USD (times 10^18)
    function setTokenPrice(uint256 _tokenPrice)
        external
        override
        onlyMaintainer
    {
        _setTokenPrice(_tokenPrice);
        emit SetTokenPrice(_tokenPrice, msg.sender);
    }

    /// @notice Sets price coefficient
    /// @param _priceCoefficient Price coefficient (has the same number of
    /// decimals as the token)
    function setPriceCoefficient(uint256 _priceCoefficient)
        external
        override
        onlyMaintainer
    {
        _setPriceCoefficient(_priceCoefficient);
        emit SetPriceCoefficient(_priceCoefficient, msg.sender);
    }

    /// @notice Sets Airnode activity
    /// @param airnode Airnode address
    /// @param active Activity status (`true` means tokens can be deposited to
    /// be whitelisted and vice versa)
    function setAirnodeActivity(address airnode, bool active)
        external
        override
        onlyMaintainer
        onlyNonZeroAirnode(airnode)
    {
        require(
            airnodeToStatus[airnode] != AirnodeStatus.OptedOut,
            "Airnode opted out"
        );
        if (active) {
            airnodeToStatus[airnode] = AirnodeStatus.Active;
        } else {
            airnodeToStatus[airnode] = AirnodeStatus.Inactive;
        }
        emit SetAirnodeActivity(airnode, active, msg.sender);
    }

    /// @notice Called by the Airnode address to opt out
    /// @dev After an Airnode opts out, maintainers cannot make the Airnode
    /// active
    function optOut() external override {
        require(
            airnodeToStatus[msg.sender] != AirnodeStatus.OptedOut,
            "Sender already opted out"
        );
        airnodeToStatus[msg.sender] = AirnodeStatus.OptedOut;
        emit OptedOut(msg.sender);
    }

    /// @notice Called by the Airnode address to opt in
    /// @dev Does not make the Airnode active
    function optIn() external override {
        require(
            airnodeToStatus[msg.sender] == AirnodeStatus.OptedOut,
            "Sender not opted out"
        );
        airnodeToStatus[msg.sender] = AirnodeStatus.Inactive;
        emit OptedIn(msg.sender);
    }

    /// @notice Sets withdrawal destination for funds deposited for blocked
    /// requesters
    /// @param _blockedWithdrawalDestination Withdrawal destination for funds
    /// deposited for blocked requesters
    function setBlockedWithdrawalDestination(
        address _blockedWithdrawalDestination
    ) external override onlyBlocker {
        require(
            _blockedWithdrawalDestination != address(0),
            "Withdrawal destination zero"
        );
        blockedWithdrawalDestination = _blockedWithdrawalDestination;
        emit SetBlockedWithdrawalDestination(_blockedWithdrawalDestination);
    }

    /// @notice Called to block requester, which disables depositors that have
    /// deposited tokens for the requester from withdrawing their tokens and
    /// makes these tokens withdrawable to the withdrawal destination
    /// @param requester Requester address
    function blockRequester(address requester)
        external
        override
        onlyBlocker
        onlyNonZeroRequester(requester)
    {
        requesterToBlockStatus[requester] = true;
        emit BlockedRequester(requester, msg.sender);
    }

    /// @notice Called to block requester for the Airnode, which disables
    /// depositors that have deposited tokens for the requester for the
    /// specific Airnode from withdrawing their tokens and makes these tokens
    /// withdrawable to the withdrawal destination
    /// @param airnode Airnode address
    /// @param requester Requester address
    function blockRequesterForAirnode(address airnode, address requester)
        external
        override
        onlyBlocker
        onlyNonZeroAirnode(airnode)
        onlyNonZeroRequester(requester)
    {
        airnodeToRequesterToBlockStatus[airnode][requester] = true;
        emit BlockedRequesterForAirnode(airnode, requester, msg.sender);
    }

    /// @notice Called privately to check if the requester is blocked
    /// @dev Requesters can be blocked globally or for the specific Airnode
    /// @param airnode Airnode address
    /// @param requester Requester address
    function requesterIsBlocked(address airnode, address requester)
        internal
        view
        returns (bool)
    {
        return
            !requesterToBlockStatus[requester] &&
            !airnodeToRequesterToBlockStatus[airnode][requester];
    }

    /// @notice Called privately to set the token price
    /// @param _tokenPrice Token price in USD (times 10^18)
    function _setTokenPrice(uint256 _tokenPrice) private {
        require(_tokenPrice != 0, "Token price zero");
        tokenPrice = _tokenPrice;
    }

    /// @notice Called privately to set the price coefficient
    /// @param _priceCoefficient Price coefficient (has the same number of
    /// decimals as the token)
    function _setPriceCoefficient(uint256 _priceCoefficient) private {
        require(_priceCoefficient != 0, "Price coefficient zero");
        priceCoefficient = _priceCoefficient;
    }
}
