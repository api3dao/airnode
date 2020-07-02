// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice For each provider, there is an admin that manages settings and a
/// platformAgent that extends the validity of the provider. The requester uses
/// this contract to reserve a wallet index and the provider authorizes the
/// address that corresponds to that index to be able to fulfill requests.
contract ProviderStore is RequesterStore {
    struct Provider {
        address admin;
        address platformAgent;
        uint256 validUntil;
        string xpub;
        address walletAuthorizer; // Address of m/0/0
        uint256 authorizationDeposit;
        mapping(address => uint256) walletAddressToInd;
        mapping(uint256 => bytes32) walletIndToRequesterId;
        uint256 nextWalletInd;
        }

    struct WithdrawRequest {
        address walletAddress;
        address destination;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => WithdrawRequest) internal withdrawRequests;
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

    event ProviderWalletStatusUpdated(
        bytes32 indexed id,
        uint256 indexed walletInd,
        address walletAddress
        );

    event ProviderWalletReserved(
        bytes32 indexed id,
        bytes32 indexed requesterId,
        uint256 walletInd,
        uint256 depositAmount
        );

    event WithdrawRequested(
        bytes32 indexed providerId,
        bytes32 indexed withdrawRequestId,
        address walletAddress,
        address destination
        );

    event WithdrawFulfilled(
        bytes32 indexed withdrawRequestId,
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
    /// calling updateProviderWalletStatus() once.
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
            walletAuthorizer: address(0),
            authorizationDeposit: authorizationDeposit,
            xpub: "",
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
    /// least cover the gas cost of calling updateProviderWalletStatus() once.
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
    /// address it uses to authorize wallets (m/0/0).
    /// @dev Keys can only be initialized once. This means that the provider is
    /// not allowed to update their node key.
    /// @param providerId Provider ID
    /// @param xpub Master public key of the provider node
    /// @param walletAuthorizer Address provider uses to authorize nodes.
    /// This can be derived from xpub with the path m/0/0 off-chain.
    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletAuthorizer
        )
        external
        onlyProviderAdmin(providerId)
    {
        require(
            (bytes(providers[providerId].xpub).length == 0) &&
                (providers[providerId].walletAuthorizer == address(0)),
            "Provider keys are already initialized"
        );
        // Note that the check below does not actually validate if xpub is a
        // public key and walletAuthorizer can be derived from that with
        // the path m/0/0. We depend on the provider for the correctness of
        // these values.
        require(
            (bytes(xpub).length == 0) || (walletAuthorizer == address(0)),
            "Invalid provider keys"
        );
        providers[providerId].xpub = xpub;
        providers[providerId].walletAuthorizer = walletAuthorizer;
        emit ProviderKeysInitialized(
            providerId,
            xpub,
            walletAuthorizer
            );
    }

    /// @notice Updates the status of a provider wallet
    /// @dev We expect the provider to be able to derive walletAddress from
    /// walletInd correctly. A wallet index of 0 means the address is not
    /// authorized to fulfill requests made to this provider.
    /// @param providerId Provider ID
    /// @param walletInd Wallet index
    /// @param walletAddress Wallet address that can be derived from xpub with
    /// the path m/{walletInd / 2^31}/{walletInd % 2^31}
    function updateProviderWalletStatus(
        bytes32 providerId,
        uint256 walletInd,
        address walletAddress
        )
        external
    {
        require(
            (msg.sender == providers[providerId].admin) ||
                (msg.sender == providers[providerId].walletAuthorizer),
            "Only the provider admin or the walletAuthorizer can do this"
        );
        providers[providerId].walletAddressToInd[walletAddress] = walletInd;
        emit ProviderWalletStatusUpdated(
            providerId,
            walletInd,
            walletAddress
            );
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
    {
        require(
            validUntil >= providers[providerId].validUntil,
            "You cannot shorten the validity of a provider."
            );
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
        returns(uint256 walletInd)
    {
        address walletAuthorizer = providers[providerId].walletAuthorizer;
        require(
            walletAuthorizer != address(0),
            "Provider wallet authorizer not set yet"
        );
        require(
            msg.value >= providers[providerId].authorizationDeposit,
            "Send at least authorizationDeposit along with your call"
        );
        walletInd = providers[providerId].nextWalletInd;
        providers[providerId].walletIndToRequesterId[walletInd] = requesterId;
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
    /// and executes the withdrawal
    /// @param providerId Provider ID
    /// @param walletAddress Address of the wallet that the withdrawal is
    /// requested from
    /// @param destination Withdrawal destination
    function withdrawRequest(
        bytes32 providerId,
        address walletAddress,
        address destination
    )
        external
    {
        uint256 walletInd = providers[providerId].walletAddressToInd[walletAddress];
        bytes32 requesterId = providers[providerId].walletIndToRequesterId[walletInd];
        require(
            msg.sender == requesterIdToAdmin[requesterId],
            "Caller is not the requester admin"
        );
        bytes32 withdrawRequestId = keccak256(abi.encodePacked(
            noWithdrawRequests++,
            this,
            uint256(2)
            ));
        withdrawRequests[withdrawRequestId] = WithdrawRequest({
            walletAddress: walletAddress,
            destination: destination
            });
        emit WithdrawRequested(
            providerId,
            withdrawRequestId,
            walletAddress,
            destination
            );
    }

    /// @notice Called by the reserved wallet to fulfill the withdrawal request
    /// made by the requester
    /// @dev The node sends the funds through this method to emit an event that
    /// indicates that the withdrawal request has been fulfilled
    /// @param withdrawRequestId Withdraw Request ID
    function withdrawFulfill(
        bytes32 withdrawRequestId
    )
        external
        payable
    {
        require(
            msg.sender == withdrawRequests[withdrawRequestId].walletAddress,
            "Only the wallet to be withdrawn from can call this"
        );
        address destination = withdrawRequests[withdrawRequestId].destination;
        delete withdrawRequests[withdrawRequestId];
        emit WithdrawFulfilled(
            withdrawRequestId,
            msg.value
            );
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

    /// @notice Gets the ID of the requester that has reserved a wallet index
    /// of a provider
    /// @param providerId Provider ID
    /// @param walletInd Wallet index of the provider reserved by a requester
    /// @return requesterId ID of the requester that has reserved walletInd
    /// from the provider with providerId
    function getRequesterIdOfWalletInd(
        bytes32 providerId,
        uint256 walletInd
        )
        external
        view
        returns (bytes32 requesterId)
    {
        requesterId = providers[providerId].walletIndToRequesterId[walletInd];
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

    /// @dev Reverts if the provider is not valid. The validity deadline is
    /// significant in the resolution of days, which is why using
    /// block.timestamp here is okay.
    /// @param providerId Provider ID
    modifier onlyIfProviderIsValid(bytes32 providerId)
    {
        require(
            block.timestamp < providers[providerId].validUntil,
            "Invalid provider"
        );
        _;
    }
}
