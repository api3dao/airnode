// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./ProviderStore.sol";
import "./TemplateStore.sol";
import "./interfaces/IConvenience.sol";

/// @title The contract that keeps the convenience methods that Airnodes use to
/// make batch calls
contract Convenience is ProviderStore, TemplateStore, IConvenience {
    /// @notice A convenience method for the Airnode to set provider parameters
    /// and forward the remaining funds in the master wallet to the provider
    /// admin
    /// @param admin Provider admin
    /// @param xpub Master public key of the provider
    /// @param authorizers Authorizer contract addresses of the provider
    /// @return providerId Provider ID from ProviderStore
    function setProviderParametersAndForwardFunds(
        address admin,
        string calldata xpub,
        address[] calldata authorizers
        )
        external
        payable
        override
        returns (bytes32 providerId)
    {
        providerId = setProviderParameters(
            admin,
            xpub,
            authorizers
            );
        if (msg.value > 0)
        {
            (bool success, ) = admin.call{ value: msg.value }("");  // solhint-disable-line
            require(success, "Transfer failed");
        }
    }

    /// @notice A convenience method to retrieve the provider parameters and
    /// the block number with a single call
    /// @param providerId Provider ID from ProviderStore
    /// @return admin Provider admin
    /// @return xpub Master public key of the provider
    /// @return authorizers Authorizer contract addresses of the provider
    /// @return blockNumber Block number
    function getProviderAndBlockNumber(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers,
            uint256 blockNumber
        )
    {
        Provider storage provider = providers[providerId];
        admin = provider.admin;
        xpub = provider.xpub;
        authorizers = provider.authorizers;
        blockNumber = block.number;
    }

    /// @notice A convenience method to retrieve multiple templates with a
    /// single call
    /// @dev If this reverts, Airnode will use getTemplate() to get the
    /// templates individually
    /// @param templateIds Request template IDs from TemplateStore
    /// @return providerIds Array of provider IDs from ProviderStore
    /// @return endpointIds Array of endpoint IDs from EndpointStore
    /// @return parameters Array of request parameters
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            bytes[] memory parameters
        )
    {
        providerIds = new bytes32[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            Template storage template = templates[templateIds[ind]];
            providerIds[ind] = template.providerId;
            endpointIds[ind] = template.endpointId;
            parameters[ind] = template.parameters;
        }
    }

    /// @notice A convenience function to make multiple authorization status
    /// checks with a single call
    /// @dev If this reverts, Airnode will use checkAuthorizationStatus() to
    /// do the checks individually
    /// @param providerId Provider ID from ProviderStore
    /// @param requestIds Request IDs
    /// @param endpointIds Endpoint IDs from EndpointStore
    /// @param requesterIndices Requester indices from RequesterStore
    /// @param designatedWallets Designated wallets
    /// @param clientAddresses Client addresses
    /// @return statuses Authorization statuses of the request
    function checkAuthorizationStatuses(
        bytes32 providerId,
        bytes32[] calldata requestIds,
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterIndices,
        address[] calldata designatedWallets,
        address[] calldata clientAddresses
        )
        external
        view
        override
        returns (bool[] memory statuses)
    {
        require(
            requestIds.length == endpointIds.length
                && requestIds.length == requesterIndices.length
                && requestIds.length == designatedWallets.length
                && requestIds.length == clientAddresses.length,
            "Parameter lengths must be equal"
        );
        statuses = new bool[](requestIds.length);
        for (uint256 ind = 0; ind < requestIds.length; ind++)
        {
            statuses[ind] = checkAuthorizationStatus(
                providerId,
                requestIds[ind],
                endpointIds[ind],
                requesterIndices[ind],
                designatedWallets[ind],
                clientAddresses[ind]
                );
        }
    }
}
