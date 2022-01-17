// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./RegistryRolesWithManager.sol";
import "./interfaces/IUint256Registry.sol";

contract Uint256Registry is RegistryRolesWithManager, IUint256Registry {
    mapping(bytes32 => uint256) private idToUint256;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        RegistryRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {}

    function registerUint256(bytes32 id, uint256 uint256_) external override {
        _registerUint256(id, uint256_);
        emit RegisteredUint256(id, uint256_, msg.sender);
    }

    function tryReadRegisteredUint256(bytes32 id)
        public
        override
        returns (bool success, uint256 uint256_)
    {
        uint256_ = idToUint256[id];
        success = uint256_ != 0;
    }

    function _registerUint256(bytes32 id, uint256 uint256_)
        internal
        onlyRegistrarOrManager
    {
        require(uint256_ != 0, "Cannot register zero");
        idToUint256[id] = uint256_;
    }
}
