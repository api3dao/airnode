// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./access-control-registry/AccessControlRegistryAdminned.sol";
import "./interfaces/IRequesterAuthorizerWithErc721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Authorizer contract that users can deposit the ERC721 tokens
/// recognized by the Airnode to receive authorization for the requester contract
/// on the chain
/// @notice For an Airnode to recognize an ERC721 token, it needs to be
/// configured to do so at deploy-time. It can be expected for Airnodes to only
/// recognize the respective NFT keys that their operators have issued, but
/// this is not necessarily true.
/// For an Airnode to serve requesters on a chain, it needs to be configured to
/// do so at deploy-time.
/// Airnodes are allowed to block specific requesters. It can be expected for
/// Airnodes to only do this when the requester is breaking T&C. The tokens
/// that have been deposited to authorize requesters that have been blocked can
/// be revoked, which transfers them to the Airnode account. This can be seen
/// as a staking–slashing mechanism.
contract RequesterAuthorizerWithErc721 is
    ERC2771Context,
    AccessControlRegistryAdminned,
    IRequesterAuthorizerWithErc721
{
    struct TokenDeposits {
        uint256 count;
        mapping(address => Deposit) depositorToDeposit;
    }

    struct Deposit {
        uint256 tokenId;
        uint32 withdrawalLeadTime;
        uint32 earliestWithdrawalTime;
    }

    /// @notice Withdrawal lead time setter role description
    string
        public constant
        override WITHDRAWAL_LEAD_TIME_SETTER_ROLE_DESCRIPTION =
        "Withdrawal lead time setter";

    /// @notice Requester blocker role description
    string public constant override REQUESTER_BLOCKER_ROLE_DESCRIPTION =
        "Requester blocker";

    bytes32 private constant WITHDRAWAL_LEAD_TIME_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(WITHDRAWAL_LEAD_TIME_SETTER_ROLE_DESCRIPTION)
        );

    bytes32 private constant REQUESTER_BLOCKER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(REQUESTER_BLOCKER_ROLE_DESCRIPTION));

    /// @notice Deposits of the token with the address made for the Airnode to
    /// authorize the requester address on the chain
    mapping(address => mapping(uint256 => mapping(address => mapping(address => TokenDeposits))))
        public
        override airnodeToChainIdToRequesterToTokenAddressToTokenDeposits;

    /// @notice Withdrawal lead time of the Airnode. This creates the window of
    /// opportunity during which a requester can be blocked for breaking T&C
    /// and the respective tokens can be revoked.
    /// The withdrawal lead time at deposit-time will apply to a specific
    /// deposit.
    mapping(address => uint32) public override airnodeToWithdrawalLeadTime;

    /// @notice If the Airnode has blocked the requester on the chain. Tokens
    /// deposited to authorize a blocked requester are revocable.
    mapping(address => mapping(uint256 => mapping(address => bool)))
        public
        override airnodeToChainIdToRequesterToBlockStatus;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    )
        ERC2771Context(_accessControlRegistry)
        AccessControlRegistryAdminned(
            _accessControlRegistry,
            _adminRoleDescription
        )
    {}

    /// @notice Called by the Airnode or its withdrawal lead time setters to
    /// set withdrawal lead time
    /// @param airnode Airnode address
    /// @param withdrawalLeadTime Withdrawal lead time
    function setWithdrawalLeadTime(
        address airnode,
        uint32 withdrawalLeadTime
    ) external override {
        require(
            airnode == _msgSender() ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveWithdrawalLeadTimeSetterRole(airnode),
                    _msgSender()
                ),
            "Sender cannot set lead time"
        );
        require(withdrawalLeadTime <= 30 days, "Lead time too long");
        airnodeToWithdrawalLeadTime[airnode] = withdrawalLeadTime;
        emit SetWithdrawalLeadTime(airnode, withdrawalLeadTime, _msgSender());
    }

    /// @notice Called by the Airnode or its requester blockers to set
    /// requester block statuses
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param status Block status
    function setRequesterBlockStatus(
        address airnode,
        uint256 chainId,
        address requester,
        bool status
    ) external override {
        require(
            airnode == _msgSender() ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveRequesterBlockerRole(airnode),
                    _msgSender()
                ),
            "Sender cannot block requester"
        );
        require(chainId != 0, "Chain ID zero");
        require(requester != address(0), "Requester address zero");
        airnodeToChainIdToRequesterToBlockStatus[airnode][chainId][
            requester
        ] = status;
        emit SetRequesterBlockStatus(
            airnode,
            requester,
            chainId,
            status,
            _msgSender()
        );
    }

    /// @notice Called by the ERC721 contract upon `safeTransferFrom()` to this
    /// contract to deposit a token to authorize the requester
    /// @dev The first argument is the operator, which we do not need
    /// @param _from Account from which the token is transferred
    /// @param _tokenId Token ID
    /// @param _data Airnode address, chain ID and requester address in
    /// ABI-encoded form
    /// @return `onERC721Received()` function selector
    function onERC721Received(
        address,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external override returns (bytes4) {
        require(_data.length == 96, "Unexpected data length");
        (address airnode, uint256 chainId, address requester) = abi.decode(
            _data,
            (address, uint256, address)
        );
        require(airnode != address(0), "Airnode address zero");
        require(chainId != 0, "Chain ID zero");
        require(requester != address(0), "Requester address zero");
        require(
            !airnodeToChainIdToRequesterToBlockStatus[airnode][chainId][
                requester
            ],
            "Requester blocked"
        );
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainId][requester][_msgSender()];
        uint256 tokenDepositCount;
        unchecked {
            tokenDepositCount = ++tokenDeposits.count;
        }
        require(
            tokenDeposits.depositorToDeposit[_from].earliestWithdrawalTime == 0,
            "Token already deposited"
        );
        tokenDeposits.depositorToDeposit[_from] = Deposit({
            tokenId: _tokenId,
            withdrawalLeadTime: airnodeToWithdrawalLeadTime[airnode],
            earliestWithdrawalTime: type(uint32).max
        });
        emit DepositedToken(
            airnode,
            requester,
            _from,
            chainId,
            _msgSender(),
            _tokenId,
            tokenDepositCount
        );
        return this.onERC721Received.selector;
    }

    /// @notice Called by a token depositor to update the requester for which
    /// they have deposited the token for
    /// @dev This is especially useful for not having to wait when the Airnode
    /// has set a non-zero withdrawal lead time
    /// @param airnode Airnode address
    /// @param chainIdPrevious Previous chain ID
    /// @param requesterPrevious Previous requester address
    /// @param chainIdNext Next chain ID
    /// @param requesterNext Next requester address
    /// @param token Token address
    function updateDepositRequester(
        address airnode,
        uint256 chainIdPrevious,
        address requesterPrevious,
        uint256 chainIdNext,
        address requesterNext,
        address token
    ) external override {
        require(
            !airnodeToChainIdToRequesterToBlockStatus[airnode][chainIdPrevious][
                requesterPrevious
            ],
            "Previous requester blocked"
        );
        require(
            !airnodeToChainIdToRequesterToBlockStatus[airnode][chainIdNext][
                requesterNext
            ],
            "Next requester blocked"
        );
        TokenDeposits
            storage requesterPreviousTokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainIdPrevious][requesterPrevious][token];
        Deposit
            storage requesterPreviousDeposit = requesterPreviousTokenDeposits
                .depositorToDeposit[_msgSender()];
        require(
            requesterPreviousDeposit.earliestWithdrawalTime != 0,
            "Token not deposited"
        );
        require(
            requesterPreviousDeposit.earliestWithdrawalTime == type(uint32).max,
            "Withdrawal initiated"
        );
        TokenDeposits
            storage requesterNextTokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainIdNext][requesterNext][token];
        require(
            requesterNextTokenDeposits
                .depositorToDeposit[_msgSender()]
                .earliestWithdrawalTime == 0,
            "Token already deposited"
        );
        uint256 requesterNextTokenDepositCount = ++requesterNextTokenDeposits
            .count;
        requesterNextTokenDeposits.count = requesterNextTokenDepositCount;
        uint256 requesterPreviousTokenDepositCount = --requesterPreviousTokenDeposits
                .count;
        requesterPreviousTokenDeposits
            .count = requesterPreviousTokenDepositCount;
        uint256 tokenId = requesterPreviousDeposit.tokenId;
        requesterNextTokenDeposits.depositorToDeposit[_msgSender()] = Deposit({
            tokenId: tokenId,
            withdrawalLeadTime: requesterPreviousDeposit.withdrawalLeadTime,
            earliestWithdrawalTime: 0
        });
        requesterPreviousTokenDeposits.depositorToDeposit[
            _msgSender()
        ] = Deposit({
            tokenId: 0,
            withdrawalLeadTime: 0,
            earliestWithdrawalTime: 0
        });
        emit UpdatedDepositRequesterTo(
            airnode,
            requesterNext,
            _msgSender(),
            chainIdNext,
            token,
            tokenId,
            requesterNextTokenDepositCount
        );
        emit UpdatedDepositRequesterFrom(
            airnode,
            requesterPrevious,
            _msgSender(),
            chainIdPrevious,
            token,
            tokenId,
            requesterPreviousTokenDepositCount
        );
    }

    /// @notice Called by a token depositor to initiate withdrawal
    /// @dev The depositor is allowed to initiate a withdrawal even if the
    /// respective requester is blocked. However, the withdrawal will not be
    /// executable as long as the requester is blocked.
    /// Token withdrawals can be initiated even if withdrawal lead time is
    /// zero.
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param token Token address
    /// @return earliestWithdrawalTime Earliest withdrawal time
    function initiateTokenWithdrawal(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external override returns (uint32 earliestWithdrawalTime) {
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainId][requester][token];
        Deposit storage deposit = tokenDeposits.depositorToDeposit[
            _msgSender()
        ];
        require(deposit.earliestWithdrawalTime != 0, "Token not deposited");
        require(
            deposit.earliestWithdrawalTime == type(uint32).max,
            "Withdrawal already initiated"
        );
        uint256 tokenDepositCount;
        unchecked {
            tokenDepositCount = --tokenDeposits.count;
        }
        earliestWithdrawalTime = uint32(
            block.timestamp + deposit.withdrawalLeadTime
        );
        deposit.earliestWithdrawalTime = earliestWithdrawalTime;
        emit InitiatedTokenWithdrawal(
            airnode,
            requester,
            _msgSender(),
            chainId,
            token,
            deposit.tokenId,
            earliestWithdrawalTime,
            tokenDepositCount
        );
    }

    /// @notice Called by a token depositor to withdraw
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param token Token address
    function withdrawToken(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external override {
        require(
            !airnodeToChainIdToRequesterToBlockStatus[airnode][chainId][
                requester
            ],
            "Requester blocked"
        );
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainId][requester][token];
        Deposit storage deposit = tokenDeposits.depositorToDeposit[
            _msgSender()
        ];
        require(deposit.earliestWithdrawalTime != 0, "Token not deposited");
        uint256 tokenDepositCount;
        if (deposit.earliestWithdrawalTime == type(uint32).max) {
            require(
                deposit.withdrawalLeadTime == 0,
                "Withdrawal not initiated"
            );
            unchecked {
                tokenDepositCount = --tokenDeposits.count;
            }
        } else {
            require(
                block.timestamp >= deposit.earliestWithdrawalTime,
                "Cannot withdraw yet"
            );
            unchecked {
                tokenDepositCount = tokenDeposits.count;
            }
        }
        uint256 tokenId = deposit.tokenId;
        tokenDeposits.depositorToDeposit[_msgSender()] = Deposit({
            tokenId: 0,
            withdrawalLeadTime: 0,
            earliestWithdrawalTime: 0
        });
        emit WithdrewToken(
            airnode,
            requester,
            _msgSender(),
            chainId,
            token,
            tokenId,
            tokenDepositCount
        );
        IERC721(token).safeTransferFrom(address(this), _msgSender(), tokenId);
    }

    /// @notice Called to revoke the token deposited to authorize a requester
    /// that is blocked now
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param token Token address
    /// @param depositor Depositor address
    function revokeToken(
        address airnode,
        uint256 chainId,
        address requester,
        address token,
        address depositor
    ) external override {
        require(
            airnodeToChainIdToRequesterToBlockStatus[airnode][chainId][
                requester
            ],
            "Airnode did not block requester"
        );
        TokenDeposits
            storage tokenDeposits = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainId][requester][token];
        Deposit storage deposit = tokenDeposits.depositorToDeposit[depositor];
        require(deposit.earliestWithdrawalTime != 0, "Token not deposited");
        uint256 tokenDepositCount;
        if (deposit.earliestWithdrawalTime == type(uint32).max) {
            unchecked {
                tokenDepositCount = --tokenDeposits.count;
            }
        } else {
            unchecked {
                tokenDepositCount = tokenDeposits.count;
            }
        }
        uint256 tokenId = deposit.tokenId;
        tokenDeposits.depositorToDeposit[depositor] = Deposit({
            tokenId: 0,
            withdrawalLeadTime: 0,
            earliestWithdrawalTime: 0
        });
        emit RevokedToken(
            airnode,
            requester,
            depositor,
            chainId,
            token,
            tokenId,
            tokenDepositCount
        );
        IERC721(token).safeTransferFrom(address(this), airnode, tokenId);
    }

    /// @notice Returns the deposit of the token with the address made by the
    /// depositor for the Airnode to authorize the requester address on the
    /// chain
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param token Token address
    /// @param depositor Depositor address
    /// @return tokenId Token ID
    /// @return withdrawalLeadTime Withdrawal lead time captured at
    /// deposit-time
    /// @return earliestWithdrawalTime Earliest withdrawal time
    function airnodeToChainIdToRequesterToTokenToDepositorToDeposit(
        address airnode,
        uint256 chainId,
        address requester,
        address token,
        address depositor
    )
        external
        view
        override
        returns (
            uint256 tokenId,
            uint32 withdrawalLeadTime,
            uint32 earliestWithdrawalTime
        )
    {
        Deposit
            storage deposit = airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[
                airnode
            ][chainId][requester][token].depositorToDeposit[depositor];
        (tokenId, withdrawalLeadTime, earliestWithdrawalTime) = (
            deposit.tokenId,
            deposit.withdrawalLeadTime,
            deposit.earliestWithdrawalTime
        );
    }

    /// @notice Returns if the requester on the chain is authorized for the
    /// Airnode due to a token with the address being deposited
    /// @param airnode Airnode address
    /// @param chainId Chain ID
    /// @param requester Requester address
    /// @param token Token address
    /// @return Authorization status
    function isAuthorized(
        address airnode,
        uint256 chainId,
        address requester,
        address token
    ) external view override returns (bool) {
        return
            !airnodeToChainIdToRequesterToBlockStatus[airnode][chainId][
                requester
            ] &&
            airnodeToChainIdToRequesterToTokenAddressToTokenDeposits[airnode][
                chainId
            ][requester][token].count >
            0;
    }

    /// @notice Derives the withdrawal lead time setter role for the Airnode
    /// @param airnode Airnode address
    /// @return withdrawalLeadTimeSetterRole Withdrawal lead time setter role
    function deriveWithdrawalLeadTimeSetterRole(
        address airnode
    ) public view override returns (bytes32 withdrawalLeadTimeSetterRole) {
        withdrawalLeadTimeSetterRole = _deriveRole(
            _deriveAdminRole(airnode),
            WITHDRAWAL_LEAD_TIME_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the requester blocker role for the Airnode
    /// @param airnode Airnode address
    /// @return requesterBlockerRole Requester blocker role
    function deriveRequesterBlockerRole(
        address airnode
    ) public view override returns (bytes32 requesterBlockerRole) {
        requesterBlockerRole = _deriveRole(
            _deriveAdminRole(airnode),
            REQUESTER_BLOCKER_ROLE_DESCRIPTION_HASH
        );
    }
}
