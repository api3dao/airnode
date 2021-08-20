//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IApi3Token.sol";

/// @title API3 Mock token contract

contract Api3Token is ERC20, Ownable, IApi3Token {
    /// @param contractOwner Address that will receive the ownership of the
    /// token contract
    /// @param mintingDestination Address that the tokens will be minted to
    constructor(address contractOwner, address mintingDestination)
        ERC20("API3", "API3")
    {
        transferOwnership(contractOwner);
        // Initial supply is 100 million (100e6)
        // We are using ether because the token has 18 decimals like ETH
        _mint(mintingDestination, 100e6 ether);
    }

    /// @notice Mints tokens
    /// @param account Address that will receive the minted tokens
    /// @param amount Amount that will be minted
    function mint(address account, uint256 amount) external override {
        _mint(account, amount);
    }
}
