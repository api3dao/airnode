// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AirnodePspLogBased.sol";

// The logic implemented here is an example
contract PspSubscriber {
    AirnodePspLogBased public airnodePsp;
    mapping(bytes32 => address) public subscriptionIdToSponsorWallet;

    int256 public fulfilledData;

    constructor(address airnodePsp_) {
        airnodePsp = AirnodePspLogBased(airnodePsp_);
        AirnodePspLogBased(airnodePsp_).setSponsorshipStatus(
            address(this),
            true
        );
    }

    function subscribe(
        address airnode,
        bytes32 templateId,
        address sponsorWallet
    ) external {
        bytes32 subscriptionId = airnodePsp.subscribe(
            airnode,
            templateId,
            msg.sender,
            sponsorWallet,
            msg.sender,
            this.isSatisfied.selector,
            msg.sender,
            this.fulfill.selector,
            ""
        );
        subscriptionIdToSponsorWallet[subscriptionId] = sponsorWallet;
    }

    // Say the template is specified to fetch the temperature. The request
    // implementation here asks the Airnode to call this function as soon as
    // the API returns a temperature larger than 25 degrees C and write the
    // temperature value to storage.
    function isSatisfied(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data
    ) public view returns (bool) {
        int256 decodedData = abi.decode(data, (int256));
        return decodedData > 25;
    }

    function fulfill(bytes32 subscriptionId, bytes calldata data)
        external
        returns (bool)
    {
        require(
            msg.sender == subscriptionIdToSponsorWallet[subscriptionId],
            "Caller not sponsor wallet"
        );
        // We are verifying that the provided `data` satisfies the condition because
        // the blockchian provider could have spoofed the response to the Airnode's
        // static call to `isSatisfied()`.
        require(isSatisfied(subscriptionId, data), "Condition not satisfied");
        fulfilledData = abi.decode(data, (int256));
        // Do whatever you want with the data
    }
}
