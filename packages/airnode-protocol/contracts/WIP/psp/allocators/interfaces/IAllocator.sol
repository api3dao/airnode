// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAllocator {
    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) external;

    function vacateSlot(address airnode, uint256 slotIndex) external;

    function slotIsVacatable(address airnode, uint256 slotIndex)
        external
        view
        returns (bool);

    function adminRoleDescription() external view returns (string memory);

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
