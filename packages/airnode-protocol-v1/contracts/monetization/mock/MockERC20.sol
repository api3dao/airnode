//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(uint8 __decimals) ERC20("Mock ERC20", "MOCK") {
        _decimals = __decimals;
        _mint(msg.sender, 1 ether);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
