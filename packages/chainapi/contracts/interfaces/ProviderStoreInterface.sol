// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface ProviderStoreInterface {
    event ProviderCreated(
        bytes32 indexed id,
        address admin,
        uint256 authorizationDeposit,
        uint256 minBalance
        );

    event ProviderUpdated(
        bytes32 indexed id,
        address admin,
        uint256 authorizationDeposit,
        uint256 minBalance
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
        bytes32 indexed requesterId,
        address walletAddress,
        uint256 walletInd
        );

    event WithdrawRequested(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 withdrawRequestId,
        address destination
        );

    event WithdrawFulfilled(
        bytes32 indexed providerId,
        bytes32 withdrawRequestId,
        address destination,
        uint256 amount
        );


    function createProvider(
        address admin,
        uint256 authorizationDeposit,
        uint256 minBalance
        )
        external
        returns (bytes32 providerId);

    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 authorizationDeposit,
        uint256 minBalance
        )
        external;

    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletAuthorizer
        )
        external;

    function authorizeProviderWallet(
        bytes32 providerId,
        bytes32 requesterId,
        address walletAddress,
        uint256 walletInd
        )
        external
        payable;

    function reserveWallet(
        bytes32 providerId,
        bytes32 requesterId
    )
        external
        payable
        returns(uint256 walletInd);

    function requestWithdraw(
        bytes32 providerId,
        bytes32 requesterId,
        address destination
    )
        external;

    function fulfillWithdraw(bytes32 withdrawRequestId)
        external
        payable;

    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            string memory xpub,
            address walletAuthorizer,
            uint256 authorizationDeposit,
            uint256 minBalance
        );

    function getProviderMinBalance(bytes32 providerId)
        external
        view
        returns (uint256 minBalance);

    function getProviderWalletStatus(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        returns (bool status);

    function getProviderWalletIndWithAddress(
        bytes32 providerId,
        address walletAddress
        )
        external
        view
        returns (uint256 walletInd);

    function getProviderWalletAddressWithInd(
        bytes32 providerId,
        uint256 walletInd
        )
        external
        view
        returns (address walletAddress);

    function getProviderWalletIndWithRequesterId(
        bytes32 providerId,
        bytes32 requesterId
        )
        external
        view
        returns (uint256 walletInd);
}
