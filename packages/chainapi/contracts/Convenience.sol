// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/ConvenienceInterface.sol";
import "./interfaces/ProviderStoreInterface.sol";
import "./interfaces/RequesterStoreInterface.sol";
import "./interfaces/TemplateStoreInterface.sol";


contract Convenience is ConvenienceInterface {
    ProviderStoreInterface public providerStore;
    RequesterStoreInterface public requesterStore;
    TemplateStoreInterface public templateStore;


    constructor (address _chainApi)
        public
    {
        providerStore = ProviderStoreInterface(_chainApi);
        requesterStore = RequesterStoreInterface(_chainApi);
        templateStore = TemplateStoreInterface(_chainApi);
    }

    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            address[] memory fulfillAddresses,
            address[] memory errorAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes4[] memory errorFunctionIds,
            bytes[] memory parameters
        )
    {
        providerIds = new bytes32[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        fulfillAddresses = new address[](templateIds.length);
        errorAddresses = new address[](templateIds.length);
        fulfillFunctionIds = new bytes4[](templateIds.length);
        errorFunctionIds = new bytes4[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            (
                providerIds[ind],
                endpointIds[ind],
                fulfillAddresses[ind],
                errorAddresses[ind],
                fulfillFunctionIds[ind],
                errorFunctionIds[ind],
                parameters[ind]
            ) = templateStore.getTemplate(templateIds[ind]);
        }
    }

    /// @notice Gets a wide array of data using the client address
    /// @param providerId Provider ID from ProviderStore
    /// @param clientAddress Client address
    /// @return requesterId The endorser of the client
    /// @return walletInd The index of the wallet to be used to fulfill the
    /// client's requests
    /// @return walletAddress The address of the wallet to be used to fulfill
    /// the client's requests
    /// @return walletBalance The balance of the wallet to be used to fulfill
    /// the client's requests
    /// @return minBalance The minimum balance the provider expects walletBalance
    /// to be to fulfill requests from the client
    function getDataWithClientAddress(
        bytes32 providerId,
        address clientAddress
        )
        external
        view
        override
        returns (
            bytes32 requesterId,
            uint256 walletInd,
            address walletAddress,
            uint256 walletBalance,
            uint256 minBalance
            )
    {
        requesterId = requesterStore.getClientRequesterId(clientAddress);
        walletInd = providerStore.getProviderWalletIndWithRequesterId(
            providerId,
            requesterId
            );
        walletAddress = providerStore.getProviderWalletAddressWithInd(
            providerId,
            walletInd
            );
        walletBalance = walletAddress.balance;
        minBalance = providerStore.getProviderMinBalance(providerId);
    }
}