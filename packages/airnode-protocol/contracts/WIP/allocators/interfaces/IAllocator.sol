// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminned.sol";

interface IAllocator is IAccessControlRegistryAdminned {
    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) external;

    function vacateSlot(address airnode, uint256 slotIndex) external;

    function getActiveSubscriptionId(address airnode, uint256 slotIndex)
        external
        view
        returns (bytes32 subscriptionId);

    function slotIsVacatable(address airnode, uint256 slotIndex)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function SLOT_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function airnodeToSlotIndexToSlot(address airnode, uint256 slotIndex)
        external
        view
        returns (
            bytes32 subscriptionId,
            address setter,
            uint64 expirationTimestamp
        );
}
