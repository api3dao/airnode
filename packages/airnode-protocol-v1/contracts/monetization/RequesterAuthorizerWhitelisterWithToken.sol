// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "./AirnodeEndpointFeeRegistryReader.sol";
import "./RequesterAuthorizerRegistryReader.sol";
import "./interfaces/IRequesterAuthorizerWhitelisterWithToken.sol";
import "../authorizers/interfaces/IRequesterAuthorizer.sol";

/// @title Base contract for RequesterAuthorizer whitelister contracts that
/// will whitelist based on token interaction
contract RequesterAuthorizerWhitelisterWithToken is
    AccessControlRegistryAdminnedWithManager,
    AirnodeEndpointFeeRegistryReader,
    RequesterAuthorizerRegistryReader,
    IRequesterAuthorizerWhitelisterWithToken
{
    /// @notice Maintainer role description
    string public constant override MAINTAINER_ROLE_DESCRIPTION = "Maintainer";

    /// @notice Maintainer role
    /// @dev Maintainers do day-to-day operation such as maintaining price
    /// parameters and Airnode participation statuses
    bytes32 public immutable override maintainerRole;

    /// @notice Blocker role description
    string public constant override BLOCKER_ROLE_DESCRIPTION = "Blocker";

    /// @notice Blocker role
    /// @dev Blockers deny service to malicious requesters. Since this
    /// functionality can also be used to deny service to regular users, it
    /// should be limited at the blocker contract level (instead of giving this
    /// role to EOAs).
    bytes32 public immutable override blockerRole;

    /// @notice Contract address of the token that will be deposited, paid,
    /// etc.
    address public immutable token;

    /// @notice Token price in USD (times 10^18)
    uint256 public override tokenPrice;

    /// @notice Coefficient that can be used to adjust the amount of tokens
    /// @dev If `token` has 18 decimals, a `priceCoefficient` of 10^18 means
    /// the fee registry amount will be used directly, while a
    /// `priceCoefficient` of 10^19 means 10 times the fee registry amount will
    /// be used. On the other hand, if `token` has 6 decimals, a
    /// `priceCoefficient` of 10^6 means the fee registry amount will be used
    /// directly.
    uint256 public override priceCoefficient;

    /// @notice Address to which the funds will be collected at
    address public override proceedsDestination;

    /// @notice Airnode status regarding participation in this contract
    mapping(address => AirnodeParticipationStatus)
        public
        override airnodeToParticipationStatus;

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

    /// @dev Reverts if Airnode is not active
    /// @param airnode Airnode address
    modifier onlyActiveAirnode(address airnode) {
        require(
            airnodeToParticipationStatus[airnode] ==
                AirnodeParticipationStatus.Active,
            "Airnode not active"
        );
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
    /// @param _requesterAuthorizerRegistry RequesterAuthorizerRegistry
    /// contract address
    /// @param _token Token contract address
    /// @param _tokenPrice Token price in USD (times 10^18)
    /// @param _priceCoefficient Price coefficient (has the same number of
    /// decimals as the token)
    /// @param _proceedsDestination Destination of proceeds
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeEndpointFeeRegistry,
        address _requesterAuthorizerRegistry,
        address _token,
        uint256 _tokenPrice,
        uint256 _priceCoefficient,
        address _proceedsDestination
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
        _setProceedsDestination(_proceedsDestination);
        maintainerRole = _deriveRole(
            adminRole,
            keccak256(abi.encodePacked(MAINTAINER_ROLE_DESCRIPTION))
        );
        blockerRole = _deriveRole(
            adminRole,
            keccak256(abi.encodePacked(BLOCKER_ROLE_DESCRIPTION))
        );
        require(
            keccak256(
                abi.encodePacked(
                    IAirnodeEndpointFeeRegistry(airnodeEndpointFeeRegistry)
                        .DENOMINATION()
                )
            ) == keccak256(abi.encodePacked("USD")),
            "Fee denomination mismatch"
        );
        require(
            IAirnodeEndpointFeeRegistry(airnodeEndpointFeeRegistry)
                .DECIMALS() == 18,
            "Fee decimals mismatch"
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

    /// @notice Sets Airnode participation status
    /// @param airnode Airnode address
    /// @param airnodeParticipationStatus Airnode participation status
    function setAirnodeParticipationStatus(
        address airnode,
        AirnodeParticipationStatus airnodeParticipationStatus
    ) external override onlyMaintainer onlyNonZeroAirnode(airnode) {
        if (msg.sender != airnode) {
            if (
                airnodeParticipationStatus ==
                AirnodeParticipationStatus.OptedOut
            ) {
                revert("Only Airnode can opt out");
            }
            if (
                airnodeToParticipationStatus[airnode] ==
                AirnodeParticipationStatus.OptedOut
            ) {
                revert("Airnode opted out");
            }
        } else {
            if (
                airnodeParticipationStatus == AirnodeParticipationStatus.Active
            ) {
                revert("Airnode cannot activate itself");
            }
        }
        airnodeToParticipationStatus[airnode] = airnodeParticipationStatus;
        emit SetAirnodeParticipationStatus(
            airnode,
            airnodeParticipationStatus,
            msg.sender
        );
    }

    /// @notice Sets destination of proceeds
    /// @param _proceedsDestination Destination of proceeds
    function setProceedsDestination(address _proceedsDestination)
        external
        override
    {
        require(msg.sender == manager, "Sender not manager");
        _setProceedsDestination(_proceedsDestination);
        emit SetProceedsDestination(_proceedsDestination);
    }

    /// @notice Called to block requester globally
    /// @param requester Requester address
    /// @param status Requester block status (`true` represents being blocked)
    function setRequesterBlockStatus(address requester, bool status)
        external
        override
        onlyBlocker
        onlyNonZeroRequester(requester)
    {
        requesterToBlockStatus[requester] = status;
        emit SetRequesterBlockStatus(requester, status, msg.sender);
    }

    /// @notice Called to block requester for the Airnode
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param status Requester block status (`true` represents being blocked)
    function setRequesterBlockStatusForAirnode(
        address airnode,
        address requester,
        bool status
    )
        external
        override
        onlyBlocker
        onlyNonZeroAirnode(airnode)
        onlyNonZeroRequester(requester)
    {
        airnodeToRequesterToBlockStatus[airnode][requester] = status;
        emit SetRequesterBlockStatusForAirnode(
            airnode,
            requester,
            status,
            msg.sender
        );
    }

    /// @notice Called internally to check if the requester is blocked
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

    /// @notice Amount of tokens needed to be whitelisted for the
    /// Airnode–endpoint pair on the chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param endpointId Endpoint ID
    function getTokenAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) public view override returns (uint256 amount) {
        uint256 endpointPrice = IAirnodeEndpointFeeRegistry(
            airnodeEndpointFeeRegistry
        ).getPrice(airnode, chainId, endpointId);
        amount = (endpointPrice * priceCoefficient) / tokenPrice;
    }

    /// @notice Fetches the RequesterAuthorizer address for the chain
    /// @dev Reverts if the contract address has not been registered beforehand
    /// @param chainId Chain ID
    /// @return RequesterAuthorizer address
    function getRequesterAuthorizerAddress(uint256 chainId)
        internal
        view
        returns (address)
    {
        (
            bool success,
            address requesterAuthorizer
        ) = IRequesterAuthorizerRegistry(requesterAuthorizerRegistry)
                .tryReadChainRequesterAuthorizer(chainId);
        require(success, "No authorizer for chain");
        return requesterAuthorizer;
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

    function _setProceedsDestination(address _proceedsDestination) private {
        require(
            _proceedsDestination != address(0),
            "Proceeds destination zero"
        );
        proceedsDestination = _proceedsDestination;
    }
}
