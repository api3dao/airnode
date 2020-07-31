// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/IProviderStore.sol";
import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice This contract is mostly for the management of requester-designated
/// wallets. If a requester wants to receive services from a provider, they
/// first make a wallet designation request. The provider node fulfills this by
/// designating a wallet automatically, and the requester can then fund that
/// wallet. When a client contract endorsed by the requester makes a request to
/// the provider, this designated wallet is used by the provider to fund the
/// gas costs of the fulfillment. The requester can also use this contract to
/// request the withdrawal of all the funds in their designated wallet.
contract ProviderStore is RequesterStore, IProviderStore {
    struct Provider {
        address admin;
        string xpub;
        address walletDesignator;
        uint256 walletDesignationDeposit;
        uint256 minBalance;
        mapping(address => uint256) walletAddressToInd;
        mapping(uint256 => address) walletIndToAddress;
        mapping(bytes32 => uint256) requesterIdToWalletInd;
        uint256 nextWalletInd;
        }

    struct WalletDesignationRequest {
        bytes32 providerId;
        bytes32 requesterId;
        uint256 walletInd;
        uint256 depositAmount;
    }

    struct WithdrawalRequest {
        bytes32 providerId;
        bytes32 requesterId;
        address destination;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => WalletDesignationRequest) private walletDesignationRequests;
    mapping(bytes32 => WithdrawalRequest) private withdrawalRequests;
    uint256 private noProviders = 0;
    uint256 private noWalletDesignationRequests = 0;
    uint256 private noWithdrawalRequests = 0;


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev walletDesignator and xpub are not set here, assuming the
    /// provider will not have generated them at the time of provider creation
    /// @param admin Provider admin
    /// @param walletDesignationDeposit Amount the requesters need to deposit to
    /// have a wallet designated. It should at least cover the gas cost of
    /// calling fulfillWalletDesignation().
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        )
        external
        override
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encodePacked(
            noProviders++,
            this,
            msg.sender,
            uint256(1)
            ));
        providers[providerId] = Provider({
            admin: admin,
            xpub: "",
            walletDesignator: address(0),
            walletDesignationDeposit: walletDesignationDeposit,
            minBalance: minBalance,
            nextWalletInd: 1
            });
        emit ProviderCreated(
            providerId,
            admin,
            walletDesignationDeposit,
            minBalance
            );
    }

    /// @notice Updates the provider
    /// @param providerId Provider ID
    /// @param admin Provider admin
    /// @param walletDesignationDeposit Amount the requesters need to deposit to
    /// have a wallet designated. It should at least cover the gas cost of
    /// calling fulfillWalletDesignation().
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providers[providerId].admin = admin;
        providers[providerId].walletDesignationDeposit = walletDesignationDeposit;
        providers[providerId].minBalance = minBalance;
        emit ProviderUpdated(
            providerId,
            admin,
            walletDesignationDeposit,
            minBalance
            );
    }

    /// @notice Initializes the master public key of the provider and the
    /// address it uses to designate wallets
    /// @dev Keys can only be initialized once. This means that the provider is
    /// not allowed to update their node key.
    /// walletDesignator is typically the address of m/0/0/0 derived from xpub,
    /// yet it may change with the oracle implementation.
    /// @param providerId Provider ID
    /// @param xpub Master public key of the provider
    /// @param walletDesignator Address the provider uses to designate wallets
    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletDesignator
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        require(
            (bytes(providers[providerId].xpub).length == 0) &&
                (providers[providerId].walletDesignator == address(0)),
            "Provider keys are already initialized"
            );
        require(
            (bytes(xpub).length != 0) && (walletDesignator != address(0)),
            "Invalid provider keys"
            );
        providers[providerId].xpub = xpub;
        providers[providerId].walletDesignator = walletDesignator;
        emit ProviderKeysInitialized(
            providerId,
            xpub,
            walletDesignator
            );
    }

    /// @notice Called by the requester to request a wallet to be designated
    /// by the provider
    /// @dev The provider expects walletDesignationDeposit to be sent along with
    /// this call to cover the subsequent cost of fulfilling the wallet
    /// designation. The provider is expected to return the remaining amount
    /// to the designated wallet, yet this is not enforced.
    /// Anyone can request a wallet to be designated for a requester, not only
    /// its admin.
    /// The requester should wait for enough confirmations to trust the
    /// announced walletInd.
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    function requestWalletDesignation(
        bytes32 providerId,
        bytes32 requesterId
    )
        external
        payable
        override
        returns(uint256 walletInd)
    {
        require(
            providers[providerId].requesterIdToWalletInd[requesterId] == 0,
            "A wallet designation request has already been made this provider-requester pair"
            );
        require(
            msg.value >= providers[providerId].walletDesignationDeposit,
            "Send at least walletDesignationDeposit along with your call"
            );
        address walletDesignator = providers[providerId].walletDesignator;
        require(
            walletDesignator != address(0),
            "Provider wallet designator not set yet"
            );
        walletInd = providers[providerId].nextWalletInd;
        providers[providerId].requesterIdToWalletInd[requesterId] = walletInd;
        providers[providerId].nextWalletInd++;
        bytes32 walletDesignationRequestId = keccak256(abi.encodePacked(
            noWalletDesignationRequests++,
            this,
            msg.sender,
            uint256(2)
            ));
        walletDesignationRequests[walletDesignationRequestId] = WalletDesignationRequest({
            providerId: providerId,
            requesterId: requesterId,
            walletInd: walletInd,
            depositAmount: msg.value
            });
        emit WalletDesignationRequested(
            providerId,
            requesterId,
            walletDesignationRequestId,
            walletInd,
            msg.value
            );
        (bool success, ) = walletDesignator.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /// @notice Called to rebroadcast a wallet designation request in case the
    /// provider node has missed it
    /// @dev The node must ignore duplicate events
    /// @param walletDesignationRequestId Wallet designation request ID
    function rebroadcastWalletDesignationRequest(bytes32 walletDesignationRequestId)
        external
    {
        bytes32 providerId = walletDesignationRequests[walletDesignationRequestId].providerId;
        require(
            providerId != 0,
            "No active wallet designation request with walletDesignationRequestId"
            );
        emit WalletDesignationRequested(
            providerId,
            walletDesignationRequests[walletDesignationRequestId].requesterId,
            walletDesignationRequestId,
            walletDesignationRequests[walletDesignationRequestId].walletInd,
            walletDesignationRequests[walletDesignationRequestId].depositAmount
            );
    }

    /// @notice Designates a provider wallet to fulfill requests and sends
    /// the remains of what has been sent along with requestWalletDesignation()
    /// @dev Wallet designations cannot be revoked, so the provider should
    /// only designate wallets derived from its master key.
    /// The requester should wait for enough confirmations to trust the
    /// announced walletAddress.
    /// @param walletDesignationRequestId Wallet designation request ID
    /// @param walletAddress Wallet address to be designated
    function fulfillWalletDesignation(
        bytes32 walletDesignationRequestId,
        address walletAddress
        )
        external
        payable
        override
    {
        bytes32 providerId = walletDesignationRequests[walletDesignationRequestId].providerId;
        bytes32 requesterId = walletDesignationRequests[walletDesignationRequestId].requesterId;
        uint256 walletInd = walletDesignationRequests[walletDesignationRequestId].walletInd;
        require(
            msg.sender == providers[providerId].walletDesignator,
            "Only the provider walletDesignator can do this"
            );
        require(
            providers[providerId].walletAddressToInd[walletAddress] == 0,
            "Wallet address already designated"
            );
        require(
            providers[providerId].requesterIdToWalletInd[requesterId] == walletInd,
            "No such designation request has been made"
            );
        providers[providerId].walletAddressToInd[walletAddress] = walletInd;
        providers[providerId].walletIndToAddress[walletInd] = walletAddress;
        emit WalletDesignationFulfilled(
            providerId,
            requesterId,
            walletDesignationRequestId,
            walletAddress,
            walletInd
            );
        delete walletDesignationRequests[walletDesignationRequestId];
        (bool success, ) = walletAddress.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /// @notice Called by the requester admin to create a request for the
    /// provider to send the funds kept in their designated wallet to destination
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    /// @param destination Withdrawal destination
    function requestWithdrawal(
        bytes32 providerId,
        bytes32 requesterId,
        address destination
    )
        external
        override
        onlyRequesterAdmin(requesterId)
    {
        uint256 walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
        require(
            walletInd != 0,
            "Requester have not requested a wallet designation from this provider"
            );
        require(
            providers[providerId].walletIndToAddress[walletInd] != address(0),
            "Requester have not had a wallet designated by this provider"
            );
        bytes32 withdrawalRequestId = keccak256(abi.encodePacked(
            noWithdrawalRequests++,
            this,
            msg.sender,
            uint256(3)
            ));
        withdrawalRequests[withdrawalRequestId] = WithdrawalRequest({
            providerId: providerId,
            requesterId: requesterId,
            destination: destination
            });
        emit WithdrawalRequested(
            providerId,
            requesterId,
            withdrawalRequestId,
            destination
            );
    }

    /// @notice Called by the reserved wallet to fulfill the withdrawal request
    /// made by the requester
    /// @dev The oracle sends the funds through this method to emit an event
    /// that indicates that the withdrawal request has been fulfilled
    /// @param withdrawalRequestId Withdraw request ID
    function fulfillWithdrawal(bytes32 withdrawalRequestId)
        external
        payable
        override
    {
        bytes32 providerId = withdrawalRequests[withdrawalRequestId].providerId;
        require(
            providerId != 0,
            "No active withdrawal request with withdrawalRequestId"
            );
        bytes32 requesterId = withdrawalRequests[withdrawalRequestId].requesterId;
        uint256 walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
        address walletAddress = providers[providerId].walletIndToAddress[walletInd];
        require(
            msg.sender == walletAddress,
            "Only the wallet to be withdrawn from can call this"
            );
        address destination = withdrawalRequests[withdrawalRequestId].destination;
        emit WithdrawalFulfilled(
            providerId,
            requesterId,
            withdrawalRequestId,
            destination,
            msg.value
            );
        delete withdrawalRequests[withdrawalRequestId];
        (bool success, ) = destination.call{ value: msg.value }("");
        require(success, "Transfer failed");
    }

    /// @notice Retrieves provider parameters addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Provider admin
    /// @return xpub Master public key of the provider node
    /// @return walletDesignator Address the provider uses to designate wallets
    /// @return walletDesignationDeposit Amount the requesters need to deposit to
    /// have a wallet designated. It should at least cover the gas cost of
    /// calling fulfillWalletDesignation().
    /// @return minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    function getProvider(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub,
            address walletDesignator,
            uint256 walletDesignationDeposit,
            uint256 minBalance
        )
    {
        admin = providers[providerId].admin;
        xpub = providers[providerId].xpub;
        walletDesignator = providers[providerId].walletDesignator;
        walletDesignationDeposit = providers[providerId].walletDesignationDeposit;
        minBalance = providers[providerId].minBalance;
    }

    /// @notice Retrieves the minBalance of the provider
    /// @param providerId Provider ID
    /// @return minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    function getProviderMinBalance(bytes32 providerId)
        external
        view
        override
        returns (uint256 minBalance)
    {
        minBalance = providers[providerId].minBalance;
    }

    /// @notice Gets the authorization status of a provider wallet
    /// @dev The provider does not designate wallet index 0 to anyone, which
    /// means that if a wallet address maps to an index of 0, it is not
    /// designated to anyone or authorized to fulfill requests.
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
        override
        returns (bool status)
    {
        status = providers[providerId].walletAddressToInd[walletAddress] != 0;
    }

    /// @notice Gets the index of a provider wallet with its address
    /// @param providerId Provider ID
    /// @param walletAddress Wallet address
    /// @return walletInd Index of the wallet with walletAddress address
    function getProviderWalletIndWithAddress(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        override
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].walletAddressToInd[walletAddress];
    }

    /// @notice Gets the address of a provider wallet with its index
    /// @param providerId Provider ID
    /// @param walletInd Wallet index
    /// @return walletAddress Address of the wallet with walletInd index
    function getProviderWalletAddressWithInd(
        bytes32 providerId,
        uint256 walletInd
        )
        external
        view
        override
        returns (address walletAddress)
    {
        walletAddress = providers[providerId].walletIndToAddress[walletInd];
    }

    /// @notice Gets the index of the provider wallet reserved by the requester
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequestStore
    /// @return walletInd Wallet index reserved by the requester with requesterId
    function getProviderWalletIndWithRequesterId(
        bytes32 providerId,
        bytes32 requesterId
        )
        external
        view
        override
        returns (uint256 walletInd)
    {
        walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
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
}
