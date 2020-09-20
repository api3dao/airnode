// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./IRequesterStore.sol";


interface IProviderStore is IRequesterStore {
    event ProviderCreated(
        bytes32 indexed providerId,
        address admin,
        uint256 minBalance
        );

    event ProviderUpdated(
        bytes32 indexed providerId,
        address admin,
        uint256 minBalance
        );

    event ProviderKeysInitialized(
        bytes32 indexed providerId,
        string xpub
        );

    event WithdrawalRequested(
        bytes32 indexed providerId,
        uint256 indexed requesterInd,
        bytes32 withdrawalRequestId,
        address designatedWallet,
        address destination
        );

    event WithdrawalFulfilled(
        bytes32 indexed providerId,
        uint256 indexed requesterInd,
        bytes32 withdrawalRequestId,
        address destination,
        uint256 amount
        );


    function createProvider(
        address admin,
        uint256 minBalance
        )
        external
        returns (bytes32 providerId);

    function updateProvider(
        bytes32 providerId,
        address admin,
        uint256 minBalance
        )
        external;

    function initializeProviderKeys(
        bytes32 providerId,
        string calldata xpub
        )
        external;

    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterInd,
        address designatedWallet,
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
            uint256 minBalance
        );
}
