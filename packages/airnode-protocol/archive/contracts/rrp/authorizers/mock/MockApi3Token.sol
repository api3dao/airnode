//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockApi3Token is ERC20 {
    constructor() ERC20("API3", "API3") {
        _mint(msg.sender, 100e6 ether);
    }
}
