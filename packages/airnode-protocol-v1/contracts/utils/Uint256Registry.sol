// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Registry.sol";
import "./interfaces/IUint256Registry.sol";

contract Uint256Registry is Registry, IUint256Registry {
    mapping(bytes32 => uint256) private hashToUint256;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) Registry(_accessControlRegistry, _adminRoleDescription) {}

    function registerUint256(
        address user,
        bytes32 id,
        uint256 uint256_
    ) public override onlyRegistrarOrUser(user) {
        hashToUint256[keccak256(abi.encodePacked(user, id))] = uint256_;
        emit RegisteredUint256(user, id, uint256_);
    }

    function readRegisteredUint256(address user, bytes32 id)
        external
        view
        override
        returns (uint256)
    {
        return hashToUint256[keccak256(abi.encodePacked(user, id))];
    }
}
