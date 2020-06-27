// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


/// @title The contract where the providers are stored
/// @notice For each provider, the admin and platformAgent roles are defined.
/// Both can either be an external address (a wallet) or a contract. The admin
/// role manages provider settings, while platformAgent extends the privileges
/// of the provider as needed. Note that the platformAgent is not allowed to
/// put a provider out of service unexpectedly.
contract ProviderStore {
    struct Provider {
        address admin;
        address platformAgent;
        uint validUntil;
        uint endpointLimit;
        uint noEndpoints;
        mapping(address => bool) walletStatus;
    }

    mapping(bytes32 => Provider) internal providers;
    uint256 private noProvider = 0;

    event ProviderCreated(bytes32 indexed id);
    event ProviderUpdated(bytes32 indexed id);

    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev The expected workflow is for the platform to have the provider
    /// create the record with the parameters given by the platform, and only
    /// provide service if these parameters were used exactly.
    /// If the provider does not want to use a platform, they can assign
    /// themselves as the platformAgent and set validUntil/endpointLimit as
    /// they wish.
    /// @param admin Provider admin
    /// @param platformAgent Platform agent
    /// @param validUntil The validity deadline of the provider
    /// @param endpointLimit Maximum number of endpoints the provider is
    /// allowed to have
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        address platformAgent,
        uint validUntil,
        uint endpointLimit
        )
        external
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encodePacked(noProvider++, this));
        providers[providerId] = Provider({
            admin: admin,
            platformAgent: platformAgent,
            validUntil: validUntil,
            endpointLimit: endpointLimit,
            noEndpoints: 0
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

    /// @notice Updates the maximum number of endpoints the provider is allowed
    /// to have
    /// @param providerId Provider ID
    /// @param endpointLimit The maximum number of endpoints the provider is
    /// allowed to have
    function updateProviderEndpointLimit(
        bytes32 providerId,
        uint endpointLimit
        )
        external
        onlyProviderPlatformAgent(providerId)
    {
        providers[providerId].endpointLimit = endpointLimit;
        emit ProviderUpdated(providerId);
    }

    /// @notice Retrieves provider parameters addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Endpoint admin
    /// @return platformAgent Platform agent
    /// @return validUntil Provider validity deadline
    /// @return endpointLimit Maximum number of endpoints the provider is
    /// allowed to have
    /// @return noEndpoints Number of endpoints the provider has
    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            address platformAgent,
            uint validUntil,
            uint endpointLimit,
            uint noEndpoints
        )
    {
        admin = providers[providerId].admin;
        platformAgent = providers[providerId].platformAgent;
        validUntil = providers[providerId].validUntil;
        endpointLimit = providers[providerId].endpointLimit;
        noEndpoints = providers[providerId].noEndpoints;
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

    /// @dev Reverts if the maximum number of endpoints the provider is allowed
    /// to have is met
    /// @param providerId Provider ID
    modifier onlyIfEndpointLimitIsNotMet(bytes32 providerId)
    {
        require(
            providers[providerId].noEndpoints < providers[providerId].endpointLimit,
            "Provider is not allowed to have more endpoints"
        );
        _;
    }
}
