// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./AirnodeClient.sol";


/// @title An example Airnode client contract
contract ExampleAirnodeClient is AirnodeClient {
    bytes32 public requestId;
    uint256 public statusCode;
    bytes32 public data;


    /// @dev Airnode address is set at deployment
    /// @param airnodeAddress Airnode contract address
    constructor (address airnodeAddress)
        public
        AirnodeClient(airnodeAddress)
    {}

    /// @notice Called to make a short request to the Airnode contract
    /// @param templateId Template ID from TemplateStore
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    function triggerShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        requestId = airnode.makeShortRequest(
            templateId,
            parameters
            );
    }

    /// @notice Called by the designated wallet through the Airnode contract to
    /// deliver the response
    /// @param _requestId Request ID
    /// @param _statusCode Status code returned by the provider
    /// @param _data Data returned by the provider
    function fulfill(
        bytes32 _requestId,
        uint256 _statusCode,
        bytes32 _data
        )
        external
        onlyAirnode()
    {
        if (_statusCode == 0)
        {
            require(
                _requestId == requestId,
                "Example request ID check"
                );
            data = _data;
        }
    }
}
