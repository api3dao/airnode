// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/IProviderStore.sol";
import "./RequesterStore.sol";


/// @title The contract where the providers are stored
/// @notice This contract is mostly for the management of requester-designated
/// wallets. If a requester wants to receive services from a provider, they
/// first request a wallet reservation. The provider authorizes this wallet
/// automatically, and the requester can then fund the wallet. When a client
/// contract endorsed by the requester makes a request to the provider, this
/// designated wallet is used by the provider to fund the gas costs of the
/// fulfillment. The requester can also use this contract to request the
/// withdrawal off all the funds in their designated wallet.
contract ProviderStore is RequesterStore, IProviderStore {
    struct Provider {
        address admin;
        string xpub;
        address walletAuthorizer;
        uint256 authorizationDeposit;
        uint256 minBalance;
        mapping(address => uint256) walletAddressToInd;
        mapping(uint256 => address) walletIndToAddress;
        mapping(bytes32 => uint256) requesterIdToWalletInd;
        uint256 nextWalletInd;
        }

    struct WithdrawRequest {
        bytes32 providerId;
        bytes32 requesterId;
        address destination;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => WithdrawRequest) private withdrawRequests;
    uint256 private noProviders = 0;
    uint256 private noWithdrawRequests = 0;


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev walletAuthorizer and xpub are not set here, assuming the
    /// provider will not have generated them at the time of provider creation
    /// @param admin Provider admin
    /// @param authorizationDeposit Amount the requesters need to deposit to
    /// reserve a wallet index. It should at least cover the gas cost of
    /// calling authorizeProviderWallet().
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        uint256 authorizationDeposit,
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
            walletAuthorizer: address(0),
            authorizationDeposit: authorizationDeposit,
            minBalance: minBalance,
            nextWalletInd: 1
            });
        emit ProviderCreated(
            providerId,
            admin,
            authorizationDeposit,
            minBalance
            );
    }

    /// @notice Updates the provider
    /// @param providerId Provider ID
    /// @param admin Provider admin
    /// @param authorizationDeposit Amount the requesters need to deposit to
    /// reserve a wallet index. It should at least cover the gas cost of
    /// calling authorizeProviderWallet().
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from ChainApi.sol a few times.
    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 authorizationDeposit,
        uint256 minBalance
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providers[providerId].admin = admin;
        providers[providerId].authorizationDeposit = authorizationDeposit;
        providers[providerId].minBalance = minBalance;
        emit ProviderUpdated(
            providerId,
            admin,
            authorizationDeposit,
            minBalance
            );
    }

    /// @notice Initializes the master public key of the provider and the
    /// address it uses to authorize wallets
    /// @dev Keys can only be initialized once. This means that the provider is
    /// not allowed to update their node key.
    /// walletAuthorizer is typically the address of m/0/0/0 derived from xpub,
    /// yet it may change with the oracle implementation.
    /// @param providerId Provider ID
    /// @param xpub Master public key of the provider
    /// @param walletAuthorizer Address the provider uses to authorize wallets
    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletAuthorizer
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        require(
            (bytes(providers[providerId].xpub).length == 0) &&
                (providers[providerId].walletAuthorizer == address(0)),
            "Provider keys are already initialized"
            );
        require(
            (bytes(xpub).length != 0) && (walletAuthorizer != address(0)),
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

    /// @notice Called by the requester to reserve a wallet from the provider
    /// @dev The provider expects authorizationDeposit to be sent along with
    /// this call to cover the subsequent cost of authorizing the reserved
    /// wallet. The provider is expected to return the remaining amount
    /// to the authorized wallet, yet this is not enforced.
    /// Anyone can reserve a wallet for a requester, not only its admin.
    /// The requester should wait for enough confirmations to trust the
    /// announced walletInd.
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    function reserveWallet(
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
            "Requester already has a wallet index reserved for this provider"
            );
        require(
            msg.value >= providers[providerId].authorizationDeposit,
            "Send at least authorizationDeposit along with your call"
            );
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

    /// @notice Authorizes a provider wallet to fulfill requests and sends
    /// the remains of what has been sent along with reserveWallet()
    /// @dev Wallet authorizations cannot be revoked, so the provider should
    /// only reserve wallets derived from its master key.
    /// The requester should wait for enough confirmations to trust the
    /// announced walletAddress.
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequestStore
    /// @param walletAddress Wallet address to be authorized
    /// @param walletInd Index of the wallet to be authorized
    function authorizeProviderWallet(
        bytes32 providerId,
        bytes32 requesterId,
        address walletAddress,
        uint256 walletInd
        )
        external
        payable
        override
    {
        require(
            msg.sender == providers[providerId].walletAuthorizer,
            "Only the provider walletAuthorizer can do this"
            );
        require(
            providers[providerId].walletAddressToInd[walletAddress] == 0,
            "Wallet adderss already authorized"
            );
        require(
            providers[providerId].requesterIdToWalletInd[requesterId] == walletInd,
            "No such wallet index reservation has been made"
            );
        providers[providerId].walletAddressToInd[walletAddress] = walletInd;
        providers[providerId].walletIndToAddress[walletInd] = walletAddress;
        emit ProviderWalletAuthorized(
            providerId,
            requesterId,
            walletAddress,
            walletInd
            );
        (bool success, ) = walletAddress.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /// @notice Called by the requester admin to create a request for the
    /// provider to send the funds kept in their designated wallet to destination
    /// @param providerId Provider ID
    /// @param requesterId Requester ID from RequesterStore
    /// @param destination Withdrawal destination
    function requestWithdraw(
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
            "Requester does not have a wallet reserved by this provider"
            );
        require(
            providers[providerId].walletIndToAddress[walletInd] != address(0),
            "Requester does not have a wallet authorized by this provider"
            );
        bytes32 withdrawRequestId = keccak256(abi.encodePacked(
            noWithdrawRequests++,
            this,
            msg.sender,
            uint256(2)
            ));
        withdrawRequests[withdrawRequestId] = WithdrawRequest({
            providerId: providerId,
            requesterId: requesterId,
            destination: destination
            });
        emit WithdrawRequested(
            providerId,
            requesterId,
            withdrawRequestId,
            destination
            );
    }

    /// @notice Called by the reserved wallet to fulfill the withdrawal request
    /// made by the requester
    /// @dev The oracle sends the funds through this method to emit an event
    /// that indicates that the withdrawal request has been fulfilled
    /// @param withdrawRequestId Withdraw request ID
    function fulfillWithdraw(bytes32 withdrawRequestId)
        external
        payable
        override
    {
        bytes32 providerId = withdrawRequests[withdrawRequestId].providerId;
        require(
            providerId != 0,
            "No active withdrawal request with withdrawRequestId"
            );
        bytes32 requesterId = withdrawRequests[withdrawRequestId].requesterId;
        uint256 walletInd = providers[providerId].requesterIdToWalletInd[requesterId];
        address walletAddress = providers[providerId].walletIndToAddress[walletInd];
        require(
            msg.sender == walletAddress,
            "Only the wallet to be withdrawn from can call this"
            );
        address destination = withdrawRequests[withdrawRequestId].destination;
        emit WithdrawFulfilled(
            providerId,
            withdrawRequestId,
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
    /// @return xpub Master public key of the provider node
    /// @return walletAuthorizer Address the provider uses to authorize wallets
    /// @return authorizationDeposit Amount the requesters need to deposit to
    /// reserve a wallet index. It should at least cover the gas cost of
    /// calling authorizeProviderWallet().
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
            address walletAuthorizer,
            uint256 authorizationDeposit,
            uint256 minBalance
        )
    {
        admin = providers[providerId].admin;
        xpub = providers[providerId].xpub;
        walletAuthorizer = providers[providerId].walletAuthorizer;
        authorizationDeposit = providers[providerId].authorizationDeposit;
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
    /// @param walletInd Wallet inde
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
