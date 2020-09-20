// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./IRequesterStore.sol";


interface IProviderStore is IRequesterStore {
    event ProviderCreated(
        bytes32 indexed providerId,
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        );

    event ProviderUpdated(
        bytes32 indexed providerId,
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        );

    event ProviderKeysInitialized(
        bytes32 indexed providerId,
        string xpub,
        address walletDesignator
        );

    event WalletDesignationRequested(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 walletDesignationRequestId,
        uint256 walletInd,
        uint256 depositAmount
        );

    event WalletDesignationFulfilled(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 walletDesignationRequestId,
        address walletAddress,
        uint256 walletInd
        );

    event WithdrawalRequested(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 withdrawalRequestId,
        address destination
        );

    event WithdrawalFulfilled(
        bytes32 indexed providerId,
        bytes32 indexed requesterId,
        bytes32 withdrawalRequestId,
        address destination,
        uint256 amount
        );


    function createProvider(
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        )
        external
        returns (bytes32 providerId);

    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 walletDesignationDeposit,
        uint256 minBalance
        )
        external;

    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub,
        address walletDesignator
        )
        external;

    function requestWalletDesignation(
        bytes32 providerId,
        bytes32 requesterId
    )
        external
        payable
        returns(uint256 walletInd);

    function rebroadcastWalletDesignationRequest(bytes32 walletDesignationRequestId)
        external;

    function fulfillWalletDesignation(
        bytes32 walletDesignationRequestId,
        address walletAddress
        )
        external
        payable;

    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterInd,
        address destination
    )
        external;

    function fulfillWithdrawal(bytes32 withdrawalRequestId)
        external
        payable;

    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            string memory xpub,
            address walletDesignator,
            uint256 walletDesignationDeposit,
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
