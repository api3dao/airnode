// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/ConvenienceInterface.sol";
import "./interfaces/TemplateStoreInterface.sol";


contract Convenience is ConvenienceInterface {
    TemplateStoreInterface templateStore;


    constructor (address _chainApi)
        public
    {
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
}