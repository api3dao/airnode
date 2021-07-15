const { ethers } = require('ethers');

module.exports = {
  addressToDerivationPath: (address) => {
    const requesterBN = ethers.BigNumber.from(address);
    const paths = [];
    for (let i = 0; i < 6; i++) {
      const shiftedRequesterBN = requesterBN.shr(31 * i);
      paths.push(shiftedRequesterBN.mask(31).toString());
    }
    return paths.join('/');
  },
};
