// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface ClientInterface {
    function endorserId()
      external
      view
      returns(bytes32);

    function chainApiAddress()
      external
      view
      returns(address);
}
