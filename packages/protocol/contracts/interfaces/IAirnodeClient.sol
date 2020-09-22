// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


interface IAirnodeClient {
  function airnodeAddress()
      external
      view
      returns(address _airnodeAddress);
}
