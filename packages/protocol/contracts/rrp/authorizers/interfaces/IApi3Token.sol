// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IApi3Token is IERC20 {
    event MinterStatusUpdated(address indexed minterAddress, bool minterStatus);

    event BurnerStatusUpdated(address indexed burnerAddress, bool burnerStatus);

    function updateMinterStatus(address minterAddress, bool minterStatus)
        external;

    function updateBurnerStatus(bool burnerStatus) external;

    function mint(address account, uint256 amount) external;

    function burn(uint256 amount) external;

    function getMinterStatus(address minterAddress)
        external
        view
        returns (bool minterStatus);

    function getBurnerStatus(address burnerAddress)
        external
        view
        returns (bool burnerStatus);
}
