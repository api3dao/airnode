// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/IProviderStore.sol";
import "./RequesterStore.sol";


/// @title The contract where the providers are stored
contract ProviderStore is RequesterStore, IProviderStore {
    struct Provider {
        address admin;
        string xpub;
        uint256 minBalance;
        }

    struct WithdrawalRequest {
        bytes32 providerId;
        uint256 requesterInd;
        address designatedWallet;
        address destination;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => WithdrawalRequest) private withdrawalRequests;
    uint256 private noProviders = 0;
    uint256 private noWithdrawalRequests = 0;


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @dev walletDesignator and xpub are not set here, assuming the
    /// provider will not have generated them at the time of provider creation
    /// @param admin Provider admin
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from Airnode.sol a few times.
    /// @return providerId Provider ID
    function createProvider(
        address admin,
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
            minBalance: minBalance
            });
        emit ProviderCreated(
            providerId,
            admin,
            minBalance
            );
    }

    /// @notice Updates the provider
    /// @param providerId Provider ID
    /// @param admin Provider admin
    /// @param minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from Airnode.sol a few times.
    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 minBalance
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providers[providerId].admin = admin;
        providers[providerId].minBalance = minBalance;
        emit ProviderUpdated(
            providerId,
            admin,
            minBalance
            );
    }

    /// @notice Initializes the master public key of the provider
    /// @dev Keys can only be initialized once. This means that the provider is
    /// not allowed to update their node key.
    /// @param providerId Provider ID
    /// @param xpub Master public key of the provider
    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        require(
            bytes(providers[providerId].xpub).length == 0,
            "Provider key is already initialized"
            );
        require(
            bytes(xpub).length != 0,
            "Invalid provider key"
            );
        providers[providerId].xpub = xpub;
        emit ProviderKeysInitialized(
            providerId,
            xpub
            );
    }

    /// @notice Called by the requester admin to create a request for the
    /// provider to send the funds kept in their designated wallet to
    /// destination
    /// @param providerId Provider ID
    /// @param requesterInd Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that the withdrawal is
    /// requested from
    /// @param destination Withdrawal destination
    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterInd,
        address designatedWallet,
        address destination
    )
        external
        override
        onlyRequesterAdmin(requesterInd)
        onlyIfDesignatedWalletIsFunded(
          designatedWallet,
          providers[providerId].minBalance
          )
    {
        bytes32 withdrawalRequestId = keccak256(abi.encodePacked(
            noWithdrawalRequests++,
            this,
            msg.sender,
            uint256(3)
            ));
        withdrawalRequests[withdrawalRequestId] = WithdrawalRequest({
            providerId: providerId,
            requesterInd: requesterInd,
            designatedWallet: designatedWallet,
            destination: destination
            });
        emit WithdrawalRequested(
            providerId,
            requesterInd,
            withdrawalRequestId,    
            designatedWallet,
            destination
            );
    }

    /// @notice Called by the designated wallet to fulfill the withdrawal
    /// request made by the requester
    /// @dev The oracle node sends the funds through this method to emit an
    /// event that indicates that the withdrawal request has been fulfilled
    /// @param withdrawalRequestId Withdrawal request ID
    function fulfillWithdrawal(bytes32 withdrawalRequestId)
        external
        payable
        override
    {
        address designatedWallet = withdrawalRequests[withdrawalRequestId].designatedWallet;
        require(
            designatedWallet != address(0),
            "No active withdrawal request with withdrawalRequestId"
            );
        require(
            msg.sender == designatedWallet,
            "Only the wallet to be withdrawn from can call this"
            );
        address destination = withdrawalRequests[withdrawalRequestId].destination;
        emit WithdrawalFulfilled(
            withdrawalRequests[withdrawalRequestId].providerId,
            withdrawalRequests[withdrawalRequestId].requesterInd,
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
    /// @return minBalance The minimum balance the provider expects a requester
    /// to have in their designated wallet to attempt to fulfill requests from
    /// their endorsed client contracts. It should cover the gas cost of calling
    /// fail() from Airnode.sol a few times.
    function getProvider(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub,
            uint256 minBalance
        )
    {
        admin = providers[providerId].admin;
        xpub = providers[providerId].xpub;
        minBalance = providers[providerId].minBalance;
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

    /// @dev Reverts if the designated wallet balance is lower than minBalance
    /// of the provider it belongs to
    /// @param designatedWallet Designated wallet
    /// @param minBalance Minimum balance the designated wallet needs to
    /// contain for the provider to process the request
    modifier onlyIfDesignatedWalletIsFunded(
        address designatedWallet,
        uint256 minBalance
        )
    {
        require(
            designatedWallet.balance >= minBalance,
            "Designated wallet does not have enough funds"
            );
        _;
    }
}
