// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRequestUtils.sol";
import "./IWithdrawalUtils.sol";

interface IAirnodeRrp is IRequestUtils, IWithdrawalUtils {
    event SetAirnodeAnnouncement(
        address airnode,
        string xpub,
        address[] authorizers
    );

    function setAirnodeAnnouncement(
        string calldata xpub,
        address[] calldata authorizers
    ) external;

    function getAirnodeAnnouncement(address airnode)
        external
        view
        returns (string memory xpub, address[] memory authorizers);

    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        returns (
            address[] memory airnodes,
            bytes32[] memory endpointIds,
            bytes[] memory parameters
        );

    function checkAuthorizationStatus(
        address[] calldata authorizers,
        address airnode,
        bytes32 requestId,
        bytes32 endpointId,
        address sponsor,
        address requester
    ) external view returns (bool status);

    function checkAuthorizationStatuses(
        address[] calldata authorizers,
        address airnode,
        bytes32[] calldata requestIds,
        bytes32[] calldata endpointIds,
        address[] calldata sponsors,
        address[] calldata requesters
    ) external view returns (bool[] memory statuses);
}
