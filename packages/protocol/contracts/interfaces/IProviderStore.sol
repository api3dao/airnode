// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IRequesterStore.sol";


interface IProviderStore is IRequesterStore {
    event ProviderCreated(
        bytes32 indexed providerId,
        address admin,
        string xpub
        );

    event ProviderUpdated(
        bytes32 indexed providerId,
        address admin
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
        address designatedWallet,
        address destination,
        uint256 amount
        );

    function createProvider(
        address admin,
        string calldata xpub
        )
        external
        payable
        returns (bytes32 providerId);

    function updateProvider(
        bytes32 providerId,
        address admin
        )
        external;

    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterInd,
        address designatedWallet,
        address destination
    )
        external;

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        bytes32 providerId,
        uint256 requesterInd,
        address destination
        )
        external
        payable;

    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            string memory xpub
        );
}
