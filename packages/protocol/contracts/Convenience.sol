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
        returns (IAirnode.Template[] memory templates)
    {
        templates = new IAirnode.Template[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            templates[ind] = airnode.getTemplate(templateIds[ind]);
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