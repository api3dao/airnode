// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../rrp/interfaces/IAirnodeRrp.sol";
import "./AirnodePsp.sol";

// It would be nice if slots could also expire, similar to whitelisting expiration
contract AirnodeSponsorPspAllocator {
    struct Slot {
        bytes32 subscriptionId;
        address sponsor;
    }

    IAirnodeRrp public airnodeRrp;
    AirnodePsp public airnodePsp;
    mapping(address => mapping(address => uint256))
        public airnodeToSponsorToNoOfTotalSlots;
    mapping(address => mapping(address => uint256))
        public airnodeToSponsorToNoOfUsedSlots;
    mapping(address => mapping(uint256 => Slot))
        public airnodeToSlotIndexToSlot;

    constructor(address airnodeRrp_, address airnodePsp_) {
        airnodeRrp = IAirnodeRrp(airnodeRrp_);
        airnodePsp = AirnodePsp(airnodePsp_);
    }

    function setTotalNoOfSlots(
        address airnode,
        address sponsor,
        uint256 noOfTotalSlots
    ) external {
        // Check if the caller is an Airnode admin, i.e., this contract will inherit SelfAdminnable
        // require(msg.sender == ...)
        airnodeToSponsorToNoOfTotalSlots[airnode][sponsor] = noOfTotalSlots;
    }

    // Need to come up with a way to prevent people from constantly switching between slots to grief
    function subscribe(bytes32 subscriptionId, uint256 slotIndex) external {
        (bytes32 templateId, , , , , ) = airnodePsp.subscriptions(
            subscriptionId
        );
        (address airnode, , ) = airnodeRrp.templates(templateId);
        require(
            airnodeToSponsorToNoOfTotalSlots[airnode][msg.sender] >
                airnodeToSponsorToNoOfUsedSlots[airnode][msg.sender],
            "Sponsor has no available slots"
        );
        address revokedSponsor = airnodeToSlotIndexToSlot[airnode][slotIndex]
            .sponsor;
        if (revokedSponsor != address(0)) {
            require(
                airnodeToSponsorToNoOfTotalSlots[airnode][revokedSponsor] <
                    airnodeToSponsorToNoOfUsedSlots[airnode][revokedSponsor],
                "Slot with index not available"
            );
            airnodeToSponsorToNoOfUsedSlots[airnode][revokedSponsor]--;
        }
        airnodeToSponsorToNoOfUsedSlots[airnode][msg.sender]++;
        airnodeToSlotIndexToSlot[airnode][slotIndex] = Slot({
            subscriptionId: subscriptionId,
            sponsor: msg.sender
        });
    }

    function unsubscribe(address airnode, uint256 slotIndex) external {
        require(
            msg.sender == airnodeToSlotIndexToSlot[airnode][slotIndex].sponsor,
            "Caller does not own slot"
        );
        airnodeToSponsorToNoOfUsedSlots[airnode][msg.sender]--;
        delete airnodeToSlotIndexToSlot[airnode][slotIndex];
    }

    // At the start of each invocation, the node calls this where `limit` is the number of
    // slots specified for this allocator in the config file
    function getActiveSubscriptions(address airnode, uint256 limit)
        external
        view
        returns (bytes32[] memory subscriptionIds,
        address[] memory sponsors)
    {
        // Did a similar thing in the DAO ConvenienceUtils.sol
        uint256 count = 0;
        mapping(uint256 => Slot)
            storage slotIndexToSlot = airnodeToSlotIndexToSlot[airnode];
        for (uint256 ind = 0; ind < limit; ind++) {
            if (slotIndexToSlot[ind].subscriptionId != bytes32(0)) {
                count++;
            }
        }
        subscriptionIds = new bytes32[](count);
        sponsors = new address[](count);
        uint256 subscriptionIndex = 0;
        for (uint256 ind = 0; ind < limit; ind++) {
          bytes32 subscriptionId = slotIndexToSlot[ind].subscriptionId;
            if (subscriptionId != bytes32(0)) {
                subscriptionIds[subscriptionIndex] = subscriptionId;
                sponsors[subscriptionIndex] = slotIndexToSlot[ind].sponsor;
                subscriptionIndex++;
            }
        }
    }
}
