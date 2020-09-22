// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/IConvenience.sol";
import "./interfaces/IAirnode.sol";


contract Convenience is IConvenience {
    IAirnode public airnode;


    constructor (address _airnode)
        public
    {
        airnode = IAirnode(_airnode);
    }

    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            uint256[] memory requesterInd,
            address[] memory designatedWallets,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes[] memory parameters
        )
    {
        providerIds = new bytes32[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        requesterInd = new uint256[](templateIds.length);
        designatedWallets = new address[](templateIds.length);
        fulfillAddresses = new address[](templateIds.length);
        fulfillFunctionIds = new bytes4[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            (
                providerIds[ind],
                endpointIds[ind],
                requesterInd[ind],
                designatedWallets[ind],
                fulfillAddresses[ind],
                fulfillFunctionIds[ind],
                parameters[ind]
            ) = airnode.getTemplate(templateIds[ind]);
        }
    }

    function checkAuthorizationStatuses(
        bytes32[] calldata providerIds,
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterInds,
        address[] calldata clientAddresses
        )
        external
        view
        override
        returns (bool[] memory statuses)
    {
        require(
            providerIds.length == endpointIds.length
                && providerIds.length == requesterInds.length
                && providerIds.length == clientAddresses.length,
            "Parameter lengths must be equal"
        );
        statuses = new bool[](providerIds.length);
        for (uint256 ind = 0; ind < providerIds.length; ind++)
        {
            statuses[ind] = airnode.checkAuthorizationStatus(
                providerIds[ind],
                endpointIds[ind],
                requesterInds[ind],
                clientAddresses[ind]
                );
        }
    }
}