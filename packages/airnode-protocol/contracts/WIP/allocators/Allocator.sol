// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminned.sol";
import "../AirnodeRequester.sol";
import "./interfaces/IAllocator.sol";

abstract contract Allocator is
    AccessControlRegistryAdminned,
    AirnodeRequester,
    IAllocator
{
    struct Slot {
        bytes32 subscriptionId;
        address setter;
        uint64 expirationTimestamp;
    }

    string public constant override SLOT_SETTER_ROLE_DESCRIPTION =
        "Slot setter";
    bytes32 internal constant SLOT_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(SLOT_SETTER_ROLE_DESCRIPTION));

    mapping(address => mapping(uint256 => Slot))
        public
        override airnodeToSlotIndexToSlot;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _airnodeProtocol
    )
        AccessControlRegistryAdminned(
            _accessControlRegistry,
            _adminRoleDescription
        )
        AirnodeRequester(_airnodeProtocol)
    {}

    function _setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) internal {
        require(airnode != address(0), "Zero Airnode address");
        require(subscriptionId != bytes32(0), "Zero subscription ID");
        (, bytes32 templateId, , , ) = IAirnodeProtocol(airnodeProtocol)
            .subscriptions(subscriptionId);
        require(templateId != bytes32(0), "Subscription does not exist");
        require(
            expirationTimestamp > block.timestamp,
            "Expiration is in the past"
        );
        vacateSlot(airnode, slotIndex);
        airnodeToSlotIndexToSlot[airnode][slotIndex] = Slot({
            subscriptionId: subscriptionId,
            setter: msg.sender,
            expirationTimestamp: expirationTimestamp
        });
    }

    function vacateSlot(address airnode, uint256 slotIndex) public override {
        require(
            airnodeToSlotIndexToSlot[airnode][slotIndex].setter == msg.sender ||
                slotIsVacatable(airnode, slotIndex),
            "Slot occuppied"
        );
        delete airnodeToSlotIndexToSlot[airnode][slotIndex];
    }

    function slotIsVacatable(address airnode, uint256 slotIndex)
        public
        view
        virtual
        override
        returns (bool);
}
