// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/IConvenience.sol";
import "./interfaces/IProviderStore.sol";
import "./interfaces/IRequesterStore.sol";
import "./interfaces/ITemplateStore.sol";


contract Convenience is IConvenience {
    IProviderStore public providerStore;
    IRequesterStore public requesterStore;
    ITemplateStore public templateStore;


    constructor (address _chainApi)
        public
    {
        providerStore = IProviderStore(_chainApi);
        requesterStore = IRequesterStore(_chainApi);
        templateStore = ITemplateStore(_chainApi);
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

    function getDataWithClientAddresses(
        bytes32 providerId,
        address[] calldata clientAddresses
        )
        external
        view
        override
        returns (
            bytes32[] memory requesterIds,
            uint256[] memory walletInds,
            address[] memory walletAddresses,
            uint256[] memory walletBalances,
            uint256[] memory minBalances
            )
    {
        requesterIds = new bytes32[](clientAddresses.length);
        walletInds = new uint256[](clientAddresses.length);
        walletAddresses = new address[](clientAddresses.length);
        walletBalances = new uint256[](clientAddresses.length);
        minBalances = new uint256[](clientAddresses.length);

        for (uint256 ind = 0; ind < clientAddresses.length; ind++)
        {
            bytes32 requesterId = requesterStore.getClientRequesterId(clientAddresses[ind]);
            uint256 walletInd = providerStore.getProviderWalletIndWithRequesterId(
                providerId,
                requesterId
                );
            address walletAddress = providerStore.getProviderWalletAddressWithInd(
                providerId,
                walletInd
                );
            requesterIds[ind] = requesterId;
            walletInds[ind] = walletInd;
            walletAddresses[ind] = walletAddress;
            walletBalances[ind] = walletAddress.balance;
            minBalances[ind] = providerStore.getProviderMinBalance(providerId);
        }
    }
}