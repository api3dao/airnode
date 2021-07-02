module.exports = {
  increaseBlockTime: function (days) {
    ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
    ethers.provider.send('evm_mine');
  },
};
