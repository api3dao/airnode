// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminnedWithManager.sol";
import "./IAirnodeEndpointPriceRegistryUser.sol";
import "./IRequesterAuthorizerRegistryUser.sol";

interface IRequesterAuthorizerWhitelisterWithToken is
    IAccessControlRegistryAdminnedWithManager,
    IAirnodeEndpointPriceRegistryUser,
    IRequesterAuthorizerRegistryUser
{
    enum AirnodeParticipationStatus {
        Inactive,
        Active,
        OptedOut
    }

    event SetTokenPrice(uint256 tokenPrice, address sender);

    event SetPriceCoefficient(uint256 priceCoefficient, address sender);

    event SetAirnodeParticipationStatus(
        address airnode,
        AirnodeParticipationStatus airnodeParticipationStatus,
        address sender
    );

    event SetProceedsDestination(address proceedsDestination);

    event SetRequesterBlockStatus(
        address requester,
        bool status,
        address sender
    );

    event SetRequesterBlockStatusForAirnode(
        address airnode,
        address requester,
        bool status,
        address sender
    );

    function setTokenPrice(uint256 _tokenPrice) external;

    function setPriceCoefficient(uint256 _priceCoefficient) external;

    function setAirnodeParticipationStatus(
        address airnode,
        AirnodeParticipationStatus airnodeParticipationStatus
    ) external;

    function setProceedsDestination(address _proceedsDestination) external;

    function setRequesterBlockStatus(address requester, bool status) external;

    function setRequesterBlockStatusForAirnode(
        address airnode,
        address requester,
        bool status
    ) external;

    function getTokenAmount(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view returns (uint256 amount);

    function token() external view returns (address);

    function tokenPrice() external view returns (uint256);

    function priceCoefficient() external view returns (uint256);

    function proceedsDestination() external view returns (address);

    function airnodeToParticipationStatus(address airnode)
        external
        view
        returns (AirnodeParticipationStatus);

    function requesterToBlockStatus(address requester)
        external
        view
        returns (bool);

    function airnodeToRequesterToBlockStatus(address airnode, address requester)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function MAINTAINER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function maintainerRole() external view returns (bytes32);

    // solhint-disable-next-line func-name-mixedcase
    function BLOCKER_ROLE_DESCRIPTION() external view returns (string memory);

    function blockerRole() external view returns (bytes32);
}
