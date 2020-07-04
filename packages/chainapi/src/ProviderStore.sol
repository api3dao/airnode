// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice For each provider, there is an admin that manages settings and a
/// platformAgent that extends the validity of the provider. The requester uses
/// this contract to reserve a wallet index and the provider authorizes the
/// address that corresponds to that index for it to be able to fulfill
/// requests.
contract ProviderStore is RequesterStore {
    struct Provider {
        address admin;
        address platformAgent;
        uint256 validUntil;
        string xpub;
        address walletAuthorizer;
        uint256 authorizationDeposit;
        mapping(address => uint256) walletAddressToInd;
        mapping(bytes32 => uint256) requesterIdToWalletInd;
        uint256 nextWalletInd;
        }

    struct WithdrawRequest {
        bytes32 providerId;
        address walletAddress;
        address destination;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => WithdrawRequest) private withdrawRequests;
    uint256 private noProvider = 0;
    uint256 private noWithdrawRequests = 0;

    event ProviderCreated(
        bytes32 indexed id,
        address admin,
        address platformAgent,
        uint256 validUntil,
        uint256 authorizationDeposit
        );

    event ProviderUpdated(
        bytes32 indexed id,
        address admin,
        address platformAgent,
        uint256 validUntil,
        uint256 authorizationDeposit
        );

    event ProviderKeysInitialized(
        bytes32 indexed id,
        string xpub,
        address walletAuthorizer
        );

    event ProviderWalletReserved(
        bytes32 indexed id,
        bytes32 indexed requesterId,
        uint256 walletInd,
        uint256 depositAmount
        );

    event ProviderWalletAuthorized(
        bytes32 indexed id,
        address walletAddress,
        uint256 walletInd
        );

    event WithdrawRequested(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 withdrawRequestId,
        address source,
        address destination
        );

    event WithdrawFulfilled(
        bytes32 indexed providerId,
        bytes32 withdrawRequestId,
        address source,
        address destination,
        uint256 amount
        );


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev The expected workflow is for the platform to have the provider
    /// create the record with the parameters given by the platform, and only
    /// provide service if these parameters were used exactly.
    /// If the provider does not want to use a platform, they can assign
    /// themselves as the platformAgent and set validUntil as
    /// they wish. walletAuthorizer and xpub are not set here, assuming the
    /// provider will not have generated them yet.
    /// @param admin Provider admin
    /// @param platformAgent Platform agent
    /// @param validUntil Validity deadline of the provider
    /// @param authorizationDeposit Amount the requesters need to deposit to
    /// reserve a wallet index. It should at least cover the gas cost of
    /// calling authorizeProviderWallet() once.
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        address platformAgent,
        uint256 validUntil,
        uint256 authorizationDeposit
        )
        external
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encodePacked(
            noProvider++,
            this,
            uint256(1)
            ));
        providers[providerId] = Provider({
            admin: admin,
            platformAgent: platformAgent,
            validUntil: validUntil,
            xpub: "",
            walletAuthorizer: address(0),
            authorizationDeposit: authorizationDeposit,
            nextWalletInd: 1
            });
        emit ProviderCreated(
            providerId,
            admin,
            platformAgent,
            validUntil,
            authorizationDeposit
            );
    }

    /// @notice Updates the provider admin
    /// @param providerId Provider ID
    /// @param admin Provider admin
    function updateProviderAdmin(
        bytes32 providerId,
        address admin
        )
        external
        onlyProviderAdmin(providerId)
    {
        providers[providerId].admin = admin;
        emit ProviderUpdated(
            providerId,
            providers[providerId].admin,
            providers[providerId].platformAgent,
            providers[providerId].validUntil,
            providers[providerId].authorizationDeposit
            );
    }

    /// @notice Updates the provider wallet authorization deposit
    /// @dev After the requester reserves a wallet index, the provider needs to
    /// make a transaction to authorize the corresponding wallet address to
    /// fulfill requests. The provider expects the requester to fund this
    /// transaction by depositing authorizationDeposit. The provider is
    /// expected to deposit the change at the wallet that was reserved, yet
    /// this is not enforced.
    /// @param providerId Provider ID
    /// @param authorizationDeposit Wallet authorization deposit. It should at
    /// least cover the gas cost of calling authorizeProviderWallet() once.
    function updateAuthorizationDeposit(
        bytes32 providerId,
        uint256 authorizationDeposit
        )
        external
        onlyProviderAdmin(providerId)
    {
        providers[providerId].authorizationDeposit = authorizationDeposit;
        emit ProviderUpdated(
            providerId,
            providers[providerId].admin,
            providers[providerId].platformAgent,
            providers[providerId].validUntil,
            providers[providerId].authorizationDeposit
            );
    }

    /// @notice Initializes the master public key of the provider and the
    /// address it uses to authorize wallets
    /// @dev Keys can only be initialized once. This means that the provider is
    /// not allowed to update their node key.
    /// @param providerId Provider ID
    /// @param xpub Master public key of the provider
    /// @param walletAuthorizer Address provider uses to authorize nodes
    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletAuthorizer
        )
        external
        onlyProviderAdmin(providerId)
        onlyIfProviderKeysAreNotInitializedYet(providerId)
        onlyWithValidProviderKeys(xpub, walletAuthorizer)
    {
        providers[providerId].xpub = xpub;
        providers[providerId].walletAuthorizer = walletAuthorizer;
        emit ProviderKeysInitialized(
            providerId,
            xpub,
            walletAuthorizer
            );
    }

    /// @notice Authorizes a provider wallet to fulfill requests and sends
    /// funds to it
    /// @dev Note that wallet authorizations cannot be revoked
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address to be authorized
    /// @param walletInd Index of the wallet to be authorized
    function authorizeProviderWallet(
        bytes32 providerId,
        address walletAddress,
        uint256 walletInd
        )
        external
        payable
        onlyProviderWalletAuthorizer(providerId)
    {
        providers[providerId].walletAddressToInd[walletAddress] = walletInd;
        emit ProviderWalletAuthorized(
            providerId,
            walletAddress,
            walletInd
            );
        (bool success, ) = walletAddress.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /// @notice Updates the platform agent
    /// @param providerId Provider ID
    /// @param platformAgent Platform agent
    function updateProviderPlatformAgent(
        bytes32 providerId,
        address platformAgent
        )
        external
        onlyProviderPlatformAgent(providerId)
    {
        providers[providerId].platformAgent = platformAgent;
        emit ProviderUpdated(
            providerId,
            providers[providerId].admin,
            providers[providerId].platformAgent,
            providers[providerId].validUntil,
            providers[providerId].authorizationDeposit
            );
    }

    /// @notice Extends the provider validity deadline
    /// @param providerId Provider ID
    /// @param validUntil Provider validity deadline
    function extendProviderValidityDeadline(
        bytes32 providerId,
        uint256 validUntil
        )
        external
        onlyProviderPlatformAgent(providerId)
        onlyIfExtendsValidity(providerId, validUntil)
    {
        providers[providerId].validUntil = validUntil;
        emit ProviderUpdated(
            providerId,
            providers[providerId].admin,
            providers[providerId].platformAgent,
            providers[providerId].validUntil,
            providers[providerId].authorizationDeposit
            );
    }

    /// @notice Called by the requester to reserve a wallet index from the
    /// provider
    /// @dev The provider expects authorizationDeposit to be sent along with
    /// this call to cover the subsequent cost of authorizing the reserved
    /// wallet. Note that anyone can reserve a wallet for a requester, not
    /// only its admin.
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    function reserveWallet(
        bytes32 providerId,
        bytes32 requesterId
    )
        external
        payable
        onlyIfRequesterHasNotReservedWalletFromProviderBefore(
            providerId,
            requesterId
            )
        onlyIfSentAtLeastAuthorizationDeposit(providerId)
        returns(uint256 walletInd)
    {
        address walletAuthorizer = providers[providerId].walletAuthorizer;
        require(
            walletAuthorizer != address(0),
            "Provider wallet authorizer not set yet"
            );
        walletInd = providers[providerId].nextWalletInd;
        providers[providerId].requesterIdToWalletInd[requesterId] = walletInd;
        providers[providerId].nextWalletInd++;
        emit ProviderWalletReserved(
            providerId,
            requesterId,
            walletInd,
            msg.value
            );
        (bool success, ) = walletAuthorizer.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /// @notice Called by the requester admin to withdraw the funds that the
    /// provider keeps for them in their reserved wallet
    /// @dev This method emits an event, which the provider node listens for
    /// and executes the corresponding withdrawal
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    /// @param walletAddress Address of the wallet that the withdrawal is
    /// requested from
    /// @param destination Withdrawal destination
    function withdrawRequest(
        bytes32 providerId,
        bytes32 requesterId,
        address walletAddress,
        address destination
    )
        external
        onlyRequesterAdmin(requesterId)
        onlyIfRequesterIdReservedWalletAddress(
            providerId,
            requesterId,
            walletAddress
            )
    {
        bytes32 withdrawRequestId = keccak256(abi.encodePacked(
            noWithdrawRequests++,
            this,
            uint256(2)
            ));
        withdrawRequests[withdrawRequestId] = WithdrawRequest({
            providerId: providerId,
            walletAddress: walletAddress,
            destination: destination
            });
        emit WithdrawRequested(
            providerId,
            requesterId,
            withdrawRequestId,
            walletAddress,
            destination
            );
    }

    /// @notice Called by the reserved wallet to fulfill the withdrawal request
    /// made by the requester
    /// @dev The node sends the funds through this method to emit an event that
    /// indicates that the withdrawal request has been fulfilled
    /// @param withdrawRequestId Withdraw request ID
    function withdrawFulfill(
        bytes32 withdrawRequestId
        )
        external
        payable
        onlyTheWalletToBeWithdrawnFrom(withdrawRequestId)
    {
        address destination = withdrawRequests[withdrawRequestId].destination;
        emit WithdrawFulfilled(
            withdrawRequests[withdrawRequestId].providerId,
            withdrawRequestId,
            msg.sender,
            destination,
            msg.value
            );
        delete withdrawRequests[withdrawRequestId];
        (bool success, ) = destination.call{ value: msg.value }("");
        require(success, "Transfer failed");
    }

    /// @notice Retrieves provider parameters addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Provider admin
    /// @return platformAgent Platform agent
    /// @return validUntil Provider validity deadline
    /// @return xpub Master public key of the provider node
    /// @return walletAuthorizer Address provider uses to authorize nodes
    /// @return authorizationDeposit Amount the requesters need to deposit to
    /// reserve a wallet index
    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            address platformAgent,
            uint256 validUntil,
            string memory xpub,
            address walletAuthorizer,
            uint256 authorizationDeposit
        )
    {
        admin = providers[providerId].admin;
        platformAgent = providers[providerId].platformAgent;
        validUntil = providers[providerId].validUntil;
        xpub = providers[providerId].xpub;
        walletAuthorizer = providers[providerId].walletAuthorizer;
        authorizationDeposit = providers[providerId].authorizationDeposit;
    }

    /// @notice Gets the authorization status of a provider wallet
    /// @dev The provider does not reserve wallet index 0 to anyone, which
    /// means that if a wallet address maps to an index of 0, it is not
    /// reserved by anyone or authorized to fulfill requests.
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address
    /// @return status If the wallet is authorized to fulfill requests made to
    /// the provider
    function getProviderWalletStatus(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        returns (bool status)
    {
        status = providers[providerId].walletAddressToInd[walletAddress] != 0;
    }

    /// @notice Gets the index of a provider wallet
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address
    /// @return walletInd Index of the wallet with walletAddress address
    function getProviderWalletIndWithAddress(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].walletAddressToInd[walletAddress];
    }

    /// @notice Gets the index of a provider wallet reserved by a requester
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequestStore
    /// @return walletInd Wallet index reserved by requester with requesterId
    function getProviderWalletIndWithRequesterId(
        bytes32 providerId,
        bytes32 requesterId
        )
        external
        view
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
    }

    /// @notice Gets the index of a provider wallet that a client can use
    /// @dev Used by the oracle node to get the walletInd of a client contract
    /// with a single Ethereum node call
    /// @param providerId Provider ID
    /// @param clientAddress Client address
    /// @return walletInd Index of the wallet that the client can use
    function getProviderWalletIndWithClientAddress(
        bytes32 providerId,
        address clientAddress
        )
        external
        view
        returns (uint256 walletInd)
    {
        bytes32 requesterId = this.getClientEndorserId(clientAddress);
        walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
    }

    /// @dev Reverts if the provider keys are already initialized
    /// @param providerId Provider ID
    modifier onlyIfProviderKeysAreNotInitializedYet(bytes32 providerId)
    {
        require(
            (bytes(providers[providerId].xpub).length == 0) &&
                (providers[providerId].walletAuthorizer == address(0)),
            "Provider keys are already initialized"
            );
        _;
    }

    /// @dev Reverts if the provider keys are not valid
    /// @param xpub Master public key of the provider
    /// @param walletAuthorizer Address provider uses to authorize nodes
    modifier onlyWithValidProviderKeys(
        string memory xpub,
        address walletAuthorizer
        )
    {
        require(
            (bytes(xpub).length != 0) && (walletAuthorizer != address(0)),
            "Invalid provider keys"
            );
        _;
    }

    /// @dev Reverts if the caller is not the provider admin
    /// @param providerId Provider ID
    modifier onlyProviderAdmin(bytes32 providerId)
    {
        require(
            msg.sender == providers[providerId].admin,
            "Caller is not the provider admin"
            );
        _;
    }

    /// @dev Reverts if the caller is not the provider wallet authorizer
    /// @param providerId Provider ID
    modifier onlyProviderWalletAuthorizer(bytes32 providerId)
    {
        require(
            msg.sender == providers[providerId].walletAuthorizer,
            "Only the provider walletAuthorizer can do this"
            );
        _;
    }

    /// @dev Reverts if the caller is not the provider platform agent
    /// @param providerId Provider ID
    modifier onlyProviderPlatformAgent(bytes32 providerId)
    {
        require(
            msg.sender == providers[providerId].platformAgent,
            "Caller is not the platform agent"
            );
        _;
    }

    /// @dev Reverts if validUntil does not extend validity
    /// @param providerId Provider ID
    /// @param validUntil Validity deadline of the provider
    modifier onlyIfExtendsValidity(bytes32 providerId, uint256 validUntil)
    {
        require(
            validUntil > providers[providerId].validUntil,
            "You can only extend validity of a provider"
            );
        _;
    }

    /// @dev Reverts if the provider is not valid. The validity deadline is
    /// significant in the resolution of days, which is why using
    /// block.timestamp here is okay.
    /// @param providerId Provider ID
    modifier onlyIfProviderIsValid(bytes32 providerId)
    {
        require(
            block.timestamp <= providers[providerId].validUntil,
            "Invalid provider"
            );
        _;
    }

    /// @dev Reverts if the requester has reserved a wallet from the provider
    /// before
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequestStore
    modifier onlyIfRequesterHasNotReservedWalletFromProviderBefore(
        bytes32 providerId,
        bytes32 requesterId
        )
    {
        require(
            providers[providerId].requesterIdToWalletInd[requesterId] == 0,
            "Requester already has a wallet allocated for this provider"
            );
        _;
    }

    /// @dev Reverts if the caller has not sent at least authorizationDeposit
    /// set by the provider
    /// @param providerId Provider ID
    modifier onlyIfSentAtLeastAuthorizationDeposit(bytes32 providerId)
    {
        require(
            msg.value >= providers[providerId].authorizationDeposit,
            "Send at least authorizationDeposit along with your call"
            );
        _;
    }

    /// @dev Reverts if the requester with requesterId has not reserved wallet
    /// with walletAddress address
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequestStore
    /// @param walletAddress Wallet address
    modifier onlyIfRequesterIdReservedWalletAddress(
        bytes32 providerId,
        bytes32 requesterId,
        address walletAddress
        )
    {
        require(
            providers[providerId].requesterIdToWalletInd[requesterId] ==
                providers[providerId].walletAddressToInd[walletAddress],
            "Requester with requesterId has not reserved wallet with walletAddress"
            );
        _;
    }

    /// @dev Reverts if the caller is not the wallet to be withdrawn from
    /// @param withdrawRequestId Withdraw request ID
    modifier onlyTheWalletToBeWithdrawnFrom(bytes32 withdrawRequestId)
    {
        require(
            msg.sender == withdrawRequests[withdrawRequestId].walletAddress,
            "Only the wallet to be withdrawn from can call this"
            );
        _;
    }
}
