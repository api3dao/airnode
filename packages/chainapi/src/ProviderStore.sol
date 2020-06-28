// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice For each provider, the admin and platformAgent roles are defined.
/// Both can either be an external address (a wallet) or a contract. The admin
/// role manages provider settings, while platformAgent extends the privileges
/// of the provider as needed. Note that the platformAgent is not allowed to
/// put a provider out of service unexpectedly.
contract ProviderStore is RequesterStore {
    struct Provider {
        address admin;
        address platformAgent;
        uint validUntil;
        mapping(address => bool) walletStatus;
        bytes xpub;
        mapping(bytes32 => uint256) requesterWalletInds;
        uint256 nextWalletInd;
    }

    uint256 constant private MAX_NO_WALLETS_PER_PROVIDER = 2**32 - 1; // Check this, may be 1 off

    mapping(bytes32 => Provider) internal providers;
    uint256 private noProvider = 0;

    event ProviderCreated(bytes32 indexed id);
    event ProviderUpdated(bytes32 indexed id);
    event ProviderXpubUpdated(bytes32 indexed id, bytes xpub);
    event ProviderWalletAllocated(bytes32 indexed providerId, bytes32 indexed requesterId, uint256 walletInd);
    event ProviderWalletEmptyRequest(bytes32 indexed providerId, uint256 walletInd, address destination);


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev The expected workflow is for the platform to have the provider
    /// create the record with the parameters given by the platform, and only
    /// provide service if these parameters were used exactly.
    /// If the provider does not want to use a platform, they can assign
    /// themselves as the platformAgent and set validUntil as
    /// they wish.
    /// @param admin Provider admin
    /// @param platformAgent Platform agent
    /// @param validUntil The validity deadline of the provider
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        address platformAgent,
        uint validUntil
        )
        external
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encodePacked(noProvider++, this));
        providers[providerId] = Provider({
            admin: admin,
            platformAgent: platformAgent,
            validUntil: validUntil,
            xpub: "",
            nextWalletInd: 1
        });
        emit ProviderCreated(providerId);
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
        emit ProviderUpdated(providerId);
    }

    function updateProviderXpub(
        bytes32 providerId,
        bytes calldata xpub
        )
        external
        onlyProviderAdmin(providerId)
    {
        providers[providerId].xpub = xpub;
        emit ProviderXpubUpdated(providerId, xpub);
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
        emit ProviderUpdated(providerId);
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
        emit ProviderUpdated(providerId);
    }

    /// @notice Extends the provider validity deadline
    /// @param providerId Provider ID
    /// @param validUntil Provider validity deadline
    function extendProviderValidityDeadline(
        bytes32 providerId,
        uint validUntil
        )
        external
        onlyProviderPlatformAgent(providerId)
    {
        require(
            validUntil >= providers[providerId].validUntil,
            "You cannot shorten the validity of a provider."
            );
        providers[providerId].validUntil = validUntil;
        emit ProviderUpdated(providerId);
    }

    function allocateWallet(
        bytes32 providerId,
        bytes32 requesterId
    )
        external
        returns(uint256 walletInd)
    {
        require(
            providers[providerId].requesterWalletInds[requesterId] == 0,
            "Requester already has a wallet allocated for this provider"
        );
        require(
            providers[providerId].nextWalletInd < MAX_NO_WALLETS_PER_PROVIDER,
            "Provider cannot allocate more wallets"
        );
        walletInd = providers[providerId].nextWalletInd;
        providers[providerId].requesterWalletInds[requesterId] = walletInd;
        providers[providerId].nextWalletInd++;
        emit ProviderWalletAllocated(providerId, requesterId, walletInd);
    }

    function getWalletWithRequesterId(
        bytes32 providerId,
        bytes32 requesterId
        )
        external
        view
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].requesterWalletInds[requesterId];
    }

    function getWalletWithRequesterAddress(
        bytes32 providerId,
        address requesterAddress
        )
        external
        view
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].requesterWalletInds[this.getContractRequesterId(requesterAddress)];
    }

    function emptyWallet(
        bytes32 providerId,
        bytes32 requesterId,
        address destination
    )
        external
        onlyRequesterAdmin(requesterId)
    {
        require(
            providers[providerId].requesterWalletInds[requesterId] != 0,
            "Requester does not have a wallet allocated for this provider"
        );
        uint256 walletInd = providers[providerId].requesterWalletInds[requesterId];
        emit ProviderWalletEmptyRequest(providerId, walletInd, destination);
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
            uint validUntil
        )
    {
        admin = providers[providerId].admin;
        platformAgent = providers[providerId].platformAgent;
        validUntil = providers[providerId].validUntil;
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
