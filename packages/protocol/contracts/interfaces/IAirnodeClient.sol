// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface IAirnodeClient {
  function airnodeAddress()
      external
      view
      returns(address);
}
