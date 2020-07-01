// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice For each provider, there is an admin that manages settings and a
/// platformAgent that extends the validity of the provider. The requesters use
/// this contract to reserve a wallet index and the provider authorizes the
/// address that corresponds to that index to be able to fulfill the requests
/// it receives.
contract ProviderStore is RequesterStore {
    struct Provider {
        address admin;
        address platformAgent;
        uint256 validUntil;
        string xpub;
        address walletAuthorizer;
        uint256 authorizationDeposit;
        mapping(address => bool) walletStatus;
        mapping(uint256 => bytes32) walletIndToRequesterId;
        uint256 nextWalletInd;
        }

    struct WithdrawRequest {
        bytes32 providerId;
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
        address walletAddress,
        bool status
        );
    event ProviderWalletReserved(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        uint256 walletInd
        );
    event WithdrawRequested(
        bytes32 indexed providerId,
        bytes32 walletEmptyRequestId,
        uint256 walletInd,
        address destination
        );
    event WithdrawFulfilled(
        bytes32 indexed walletEmptyRequestId,
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
    /// reserve a wallet index
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
        providerId = keccak256(abi.encodePacked(noProvider++, this));
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
    /// @param providerId Provider ID
    /// @param authorizationDeposit Wallet authorization deposit
    function updateProviderAdmin(
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

    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletAuthorizer
        )
        external
        onlyProviderAdmin(providerId)
    {
        require(
            (bytes(xpub).length == 0) &&
                (providers[providerId].walletAuthorizer == address(0)),
            "Provider keys are already initialized"
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
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address
    /// @param status If the wallet is valid for the provider
    function updateProviderWalletStatus(
        bytes32 providerId,
        address walletAddress,
        bool status
        )
        external
        onlyProviderAdmin(providerId)
    {
        providers[providerId].walletStatus[walletAddress] = status;
        emit ProviderWalletStatusUpdated(
            providerId,
            walletAddress,
            status
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
            "Send at least authorizationDeposit along with your request"
        );
        walletInd = providers[providerId].nextWalletInd;
        providers[providerId].walletIndToRequesterId[walletInd] = requesterId;
        providers[providerId].nextWalletInd++;
        emit ProviderWalletReserved(
            providerId,
            requesterId,
            walletInd
            );
        (bool success, ) = walletAuthorizer.call.value(msg.value)("");
        require(success, "Transfer failed.");
    }

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

    function checkIfRequesterAddressOwnsWalletInd(
        bytes32 providerId,
        address requesterAddress,
        uint256 walletInd
        )
        external
        view
        returns (bool result)
    {
        bytes32 requesterId = providers[providerId].walletIndToRequesterId[walletInd];
        result = this.getContractRequesterId(requesterAddress) == requesterId;
    }

    function withdrawRequest(
        bytes32 providerId,
        uint256 walletInd,
        address destination
    )
        external
    {
        bytes32 requesterId = providers[providerId].walletIndToRequesterId[walletInd];
        require(
            msg.sender == requesters[requesterId].admin,
            "Caller is not the requester admin"
        );
        bytes32 withdrawRequestId = keccak256(abi.encodePacked(noWithdrawRequests++, this));
        withdrawRequests[withdrawRequestId] = WithdrawRequest({
            providerId: providerId,
            destination: destination
            });
        emit WithdrawRequested(
            providerId,
            withdrawRequestId,
            walletInd,
            destination
            );
    }

    function emptyWalletRequest(
        bytes32 withdrawRequestId
    )
        external
        payable
    {
        bytes32 providerId = withdrawRequests[withdrawRequestId].providerId;
        require(
            (msg.sender == providers[providerId].admin) ||
                (msg.sender == providers[providerId].walletAuthorizer),
            "Either the provider admin or the walletAuthorizer can do this"
        );
        address destination = withdrawRequests[withdrawRequestId].destination;
        delete withdrawRequests[withdrawRequestId];
        emit WithdrawFulfilled(
            withdrawRequestId,
            msg.value
            );
        (bool success, ) = destination.call.value(msg.value)("");
        require(success, "Transfer failed.");
    }

    /// @notice Retrieves provider parameters addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Endpoint admin
    /// @return platformAgent Platform agent
    /// @return validUntil Provider validity deadline
    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            address platformAgent,
            uint256 validUntil,
            string memory xpub,
            address walletAuthorizer,
            uint256 authorizationDeposit,
            uint256 nextWalletInd
        )
    {
        admin = providers[providerId].admin;
        platformAgent = providers[providerId].platformAgent;
        validUntil = providers[providerId].validUntil;
        xpub = providers[providerId].xpub;
        walletAuthorizer = providers[providerId].walletAuthorizer;
        authorizationDeposit = providers[providerId].authorizationDeposit;
        nextWalletInd = providers[providerId].nextWalletInd;
    }

    /// @notice Gets the status of a provider wallet
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address
    /// @return status If the wallet is valid for the provider
    function getProviderWalletStatus(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        returns (bool status)
    {
        status = providers[providerId].walletStatus[walletAddress];
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

    /// @dev Reverts if the provider is not valid
    /// The validity deadline is significant in the resolution of days, which
    /// is why using block.timestamp here is okay
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
