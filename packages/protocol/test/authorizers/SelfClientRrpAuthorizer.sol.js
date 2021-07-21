/* globals context ethers */

const { expect } = require('chai');

// const AdminStatus = {
//   Unauthorized: 0,
//   Admin: 1,
//   SuperAdmin: 2,
// };

let roles;
let selfClientRrpAuthorizer;
let airnodeRrp;
let airnodeId;
// const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
// const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeMasterWallet: accounts[1],
    admin: accounts[2],
    client: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const selfClientRrpAuthorizerFactory = await ethers.getContractFactory('SelfClientRrpAuthorizer', roles.deployer);
  selfClientRrpAuthorizer = await selfClientRrpAuthorizerFactory.deploy();
  airnodeId = await airnodeRrp
    .connect(roles.airnodeMasterWallet)
    .callStatic.setAirnodeParameters('xpub...', [selfClientRrpAuthorizer.address]);
  await airnodeRrp
    .connect(roles.airnodeMasterWallet)
    .setAirnodeParameters('xpub...', [selfClientRrpAuthorizer.address]);
});

describe('constructor', function () {
  it('initializes correctly', async function () {
    expect(await selfClientRrpAuthorizer.AUTHORIZER_TYPE()).to.equal(1);
  });
});

describe('getRank', function () {
  context('Caller is the SelfClientRrpAuthorizer deployer', async function () {
    it('returns zero if admin rank has not been set', async function () {
      expect(
        await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.airnodeMasterWallet.address)
      ).to.equal(0);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(0);
      expect(
        await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.randomPerson.address)
      ).to.equal(0);
    });
  });
  context('Caller is the AirnodeRrp master wallet', async function () {
    it('returns MAX_RANK', async function () {
      expect(
        await selfClientRrpAuthorizer
          .connect(roles.airnodeMasterWallet)
          .getRank(airnodeId, roles.airnodeMasterWallet.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).getRank(airnodeId, roles.admin.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
      expect(
        await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).getRank(airnodeId, roles.randomPerson.address)
      ).to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
    });
  });
});

describe('setRank', function () {
  context('Caller is the AirnodeRrp master wallet', async function () {
    it('sets admin rank', async function () {
      // Sets rank 1
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 1);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(1);

      // Back to 0
      await expect(
        selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 0)
      )
        .to.emit(selfClientRrpAuthorizer, 'SetRank')
        .withArgs(airnodeId, roles.admin.address, 0, roles.airnodeMasterWallet.address);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(0);
    });
    it('sets admin rank but this time checks that airnodeMasterWallet has higher rank than previous rank set', async function () {
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
        10
      );

      // new rank is 9 but onlyWithRank modifier will check against 10 since it's higher
      await expect(
        selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 9)
      )
        .to.emit(selfClientRrpAuthorizer, 'SetRank')
        .withArgs(airnodeId, roles.admin.address, 9, roles.airnodeMasterWallet.address);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(9);
    });
  });
  context('Caller is an admin with higher rank', async function () {
    it('sets client rank', async function () {
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
        10
      );

      await expect(selfClientRrpAuthorizer.connect(roles.admin).setRank(airnodeId, roles.client.address, 1))
        .to.emit(selfClientRrpAuthorizer, 'SetRank')
        .withArgs(airnodeId, roles.client.address, 1, roles.admin.address);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.client.address)).to.equal(
        1
      );
    });
  });
  context('Caller is not the AirnodeRrp master wallet', async function () {
    it('reverts', async function () {
      await expect(
        selfClientRrpAuthorizer.connect(roles.randomPerson).setRank(airnodeId, roles.admin.address, 1)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
  context('Caller is an admin with lower rank', async function () {
    it('revers', async function () {
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
        10
      );
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.client.address, 9);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.client.address)).to.equal(
        9
      );

      await expect(
        selfClientRrpAuthorizer.connect(roles.client).setRank(airnodeId, roles.admin.address, 100)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
  context('Caller is a randomPerson for which no rank has been set', async function () {
    it('reverts', async function () {
      await expect(
        selfClientRrpAuthorizer.connect(roles.randomPerson).setRank(airnodeId, roles.admin.address, 1)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

describe('decreaseSelfRank', function () {
  context('Caller is the AirnodeRrp master wallet', async function () {
    it('decreases self rank', async function () {
      await expect(selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).decreaseSelfRank(airnodeId, 1))
        .to.emit(selfClientRrpAuthorizer, 'DecreasedSelfRank')
        .withArgs(airnodeId, roles.airnodeMasterWallet.address, 1);
      expect(
        await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.airnodeMasterWallet.address)
      ).to.equal(1);
    });
  });
  context('Caller is an admin', async function () {
    it('decreases self rank', async function () {
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
        10
      );

      await expect(selfClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(airnodeId, 9))
        .to.emit(selfClientRrpAuthorizer, 'DecreasedSelfRank')
        .withArgs(airnodeId, roles.admin.address, 9);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(9);
    });
    it('reverts when new rank is higher than current', async function () {
      await selfClientRrpAuthorizer.connect(roles.airnodeMasterWallet).setRank(airnodeId, roles.admin.address, 10);
      expect(await selfClientRrpAuthorizer.connect(roles.deployer).getRank(airnodeId, roles.admin.address)).to.equal(
        10
      );

      await expect(selfClientRrpAuthorizer.connect(roles.admin).decreaseSelfRank(airnodeId, 11)).to.be.revertedWith(
        'Caller ranked low'
      );
    });
  });
  context('Caller is a randomPerson for which no rank has been set', async function () {
    it('reverts', async function () {
      await expect(
        selfClientRrpAuthorizer.connect(roles.randomPerson).decreaseSelfRank(airnodeId, 1)
      ).to.be.revertedWith('Caller ranked low');
    });
  });
});

// describe('setAdminStatus', function () {
//   context('Caller is the Airnode admin', async function () {
//     it('sets admin status', async function () {
//       // Give admin status
//       await expect(
//         selfAuthorizer.connect(roles.airnodeAdmin).setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin)
//       )
//         .to.emit(selfAuthorizer, 'SetAdminStatus')
//         .withArgs(airnodeId, roles.admin.address, AdminStatus.Admin);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.admin.address)).to.equal(AdminStatus.Admin);
//       // Revoke admin status
//       await expect(
//         selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Unauthorized)
//       )
//         .to.emit(selfAuthorizer, 'SetAdminStatus')
//         .withArgs(airnodeId, roles.admin.address, AdminStatus.Unauthorized);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.admin.address)).to.equal(
//         AdminStatus.Unauthorized
//       );
//     });
//     it('sets super admin status', async function () {
//       // Give super admin status
//       await expect(
//         selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin)
//       )
//         .to.emit(selfAuthorizer, 'SetAdminStatus')
//         .withArgs(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.superAdmin.address)).to.equal(
//         AdminStatus.SuperAdmin
//       );
//       // Revoke super admin status
//       await expect(
//         selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.Unauthorized)
//       )
//         .to.emit(selfAuthorizer, 'SetAdminStatus')
//         .withArgs(airnodeId, roles.superAdmin.address, AdminStatus.Unauthorized);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.superAdmin.address)).to.equal(
//         AdminStatus.Unauthorized
//       );
//     });
//   });
//   context('Caller is not the Airnode admin', async function () {
//     it('reverts', async function () {
//       await expect(
//         selfAuthorizer.connect(roles.randomPerson).setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin)
//       ).to.be.revertedWith('Unauthorized');
//       await expect(
//         selfAuthorizer
//           .connect(roles.randomPerson)
//           .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.SuperAdmin)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
// });

// describe('renounceAdminStatus', function () {
//   context('Caller is an admin', async function () {
//     it('renounces admin status', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin);
//       await expect(selfAuthorizer.connect(roles.admin).renounceAdminStatus(airnodeId))
//         .to.emit(selfAuthorizer, 'RenouncedAdminStatus')
//         .withArgs(airnodeId, roles.admin.address);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.admin.address)).to.equal(
//         AdminStatus.Unauthorized
//       );
//     });
//   });
//   context('Caller is a super admin', async function () {
//     it('renounces admin status', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//       await expect(selfAuthorizer.connect(roles.superAdmin).renounceAdminStatus(airnodeId))
//         .to.emit(selfAuthorizer, 'RenouncedAdminStatus')
//         .withArgs(airnodeId, roles.superAdmin.address);
//       expect(await selfAuthorizer.airnodeIdToAdminStatuses(airnodeId, roles.superAdmin.address)).to.equal(
//         AdminStatus.Unauthorized
//       );
//     });
//   });
//   context('Caller is not an admin', async function () {
//     it('reverts', async function () {
//       await expect(selfAuthorizer.connect(roles.randomPerson).renounceAdminStatus(airnodeId)).to.be.revertedWith(
//         'Unauthorized'
//       );
//     });
//   });
// });

// describe('extendWhitelistExpiration', function () {
//   context('Caller is an admin', function () {
//     context('Provided expiration extends', function () {
//       it('extends whitelist expiration', async function () {
//         await selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin);
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         const expiration = now + 100;
//         await expect(
//           selfAuthorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         )
//           .to.emit(selfAuthorizer, 'ExtendedWhitelistExpiration')
//           .withArgs(airnodeId, roles.client.address, expiration, roles.admin.address);
//         expect(
//           await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//         ).to.equal(expiration);
//       });
//     });
//     context('Provided expiration does not extend', function () {
//       it('reverts', async function () {
//         await selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin);
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         await selfAuthorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
//         const expiration = now - 100;
//         await expect(
//           selfAuthorizer.connect(roles.admin).extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         ).to.be.revertedWith('Expiration not extended');
//       });
//     });
//   });
//   context('Caller is a super admin', async function () {
//     context('Provided expiration extends', function () {
//       it('extends whitelist expiration', async function () {
//         await selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         const expiration = now + 100;
//         await expect(
//           selfAuthorizer
//             .connect(roles.superAdmin)
//             .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         )
//           .to.emit(selfAuthorizer, 'ExtendedWhitelistExpiration')
//           .withArgs(airnodeId, roles.client.address, expiration, roles.superAdmin.address);
//         expect(
//           await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//         ).to.equal(expiration);
//       });
//     });
//     context('Provided expiration does not extend', function () {
//       it('reverts', async function () {
//         await selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         await selfAuthorizer.connect(roles.superAdmin).extendWhitelistExpiration(airnodeId, roles.client.address, now);
//         const expiration = now - 100;
//         await expect(
//           selfAuthorizer
//             .connect(roles.superAdmin)
//             .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         ).to.be.revertedWith('Expiration not extended');
//       });
//     });
//   });
//   context('Caller is the Airnode admin', function () {
//     context('Provided expiration extends', function () {
//       it('extends whitelist expiration', async function () {
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         const expiration = now + 100;
//         await expect(
//           selfAuthorizer
//             .connect(roles.airnodeAdmin)
//             .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         )
//           .to.emit(selfAuthorizer, 'ExtendedWhitelistExpiration')
//           .withArgs(airnodeId, roles.client.address, expiration, roles.airnodeAdmin.address);
//         expect(
//           await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//         ).to.equal(expiration);
//       });
//     });
//     context('Provided expiration does not extend', function () {
//       it('reverts', async function () {
//         const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//         await selfAuthorizer
//           .connect(roles.airnodeAdmin)
//           .extendWhitelistExpiration(airnodeId, roles.client.address, now);
//         const expiration = now - 100;
//         await expect(
//           selfAuthorizer
//             .connect(roles.airnodeAdmin)
//             .extendWhitelistExpiration(airnodeId, roles.client.address, expiration)
//         ).to.be.revertedWith('Expiration not extended');
//       });
//     });
//   });
//   context('Caller is not an admin', function () {
//     it('reverts', async function () {
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       await expect(
//         selfAuthorizer.connect(roles.randomPerson).extendWhitelistExpiration(airnodeId, roles.client.address, now)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
// });

// describe('setWhitelistExpiration', function () {
//   context('Caller is a super admin', async function () {
//     it('sets whitelist expiration', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       const expiration = now + 100;
//       await expect(
//         selfAuthorizer.connect(roles.superAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration)
//       )
//         .to.emit(selfAuthorizer, 'SetWhitelistExpiration')
//         .withArgs(airnodeId, roles.client.address, expiration, roles.superAdmin.address);
//       expect(
//         await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//       ).to.equal(expiration);
//       await expect(
//         selfAuthorizer.connect(roles.superAdmin).setWhitelistExpiration(airnodeId, roles.client.address, now)
//       )
//         .to.emit(selfAuthorizer, 'SetWhitelistExpiration')
//         .withArgs(airnodeId, roles.client.address, now, roles.superAdmin.address);
//       expect(
//         await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//       ).to.equal(now);
//     });
//   });
//   context('Caller is the Airnode admin', async function () {
//     it('sets whitelist expiration', async function () {
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       const expiration = now + 100;
//       await expect(
//         selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration)
//       )
//         .to.emit(selfAuthorizer, 'SetWhitelistExpiration')
//         .withArgs(airnodeId, roles.client.address, expiration, roles.airnodeAdmin.address);
//       expect(
//         await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//       ).to.equal(expiration);
//       await expect(
//         selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistExpiration(airnodeId, roles.client.address, now)
//       )
//         .to.emit(selfAuthorizer, 'SetWhitelistExpiration')
//         .withArgs(airnodeId, roles.client.address, now, roles.airnodeAdmin.address);
//       expect(
//         await selfAuthorizer.airnodeIdToClientAddressToWhitelistExpiration(airnodeId, roles.client.address)
//       ).to.equal(now);
//     });
//   });
//   context('Caller is an admin', function () {
//     it('reverts', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin);
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       await expect(
//         selfAuthorizer.connect(roles.admin).setWhitelistExpiration(airnodeId, roles.client.address, now)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
//   context('Caller is not an admin', function () {
//     it('reverts', async function () {
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       await expect(
//         selfAuthorizer.connect(roles.randomPerson).setWhitelistExpiration(airnodeId, roles.client.address, now)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
// });

// describe('setWhitelistStatus', function () {
//   context('Caller is a super admin', async function () {
//     it('sets Whitelist status', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.superAdmin.address, AdminStatus.SuperAdmin);
//       await expect(selfAuthorizer.connect(roles.superAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
//         .to.emit(selfAuthorizer, 'SetWhitelistStatus')
//         .withArgs(airnodeId, roles.client.address, true, roles.superAdmin.address);
//       expect(await selfAuthorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
//         true
//       );
//       await expect(selfAuthorizer.connect(roles.superAdmin).setWhitelistStatus(airnodeId, roles.client.address, false))
//         .to.emit(selfAuthorizer, 'SetWhitelistStatus')
//         .withArgs(airnodeId, roles.client.address, false, roles.superAdmin.address);
//       expect(await selfAuthorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
//         false
//       );
//     });
//   });
//   context('Caller is the Airnode admin', async function () {
//     it('sets whitelist expiration', async function () {
//       await expect(selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistStatus(airnodeId, roles.client.address, true))
//         .to.emit(selfAuthorizer, 'SetWhitelistStatus')
//         .withArgs(airnodeId, roles.client.address, true, roles.airnodeAdmin.address);
//       expect(await selfAuthorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
//         true
//       );
//       await expect(
//         selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistStatus(airnodeId, roles.client.address, false)
//       )
//         .to.emit(selfAuthorizer, 'SetWhitelistStatus')
//         .withArgs(airnodeId, roles.client.address, false, roles.airnodeAdmin.address);
//       expect(await selfAuthorizer.airnodeIdToClientAddressToWhitelistStatus(airnodeId, roles.client.address)).to.equal(
//         false
//       );
//     });
//   });
//   context('Caller is an admin', function () {
//     it('reverts', async function () {
//       await selfAuthorizer
//         .connect(roles.airnodeAdmin)
//         .setAdminStatus(airnodeId, roles.admin.address, AdminStatus.Admin);
//       await expect(
//         selfAuthorizer.connect(roles.admin).setWhitelistStatus(airnodeId, roles.client.address, true)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
//   context('Caller is not an admin', function () {
//     it('reverts', async function () {
//       await expect(
//         selfAuthorizer.connect(roles.randomPerson).setWhitelistStatus(airnodeId, roles.client.address, true)
//       ).to.be.revertedWith('Unauthorized');
//     });
//   });
// });

// describe('isAuthorized', function () {
//   context('Designated wallet balance is not zero', function () {
//     context('Client is not Whitelisted', function () {
//       context('Client whitelisting has not expired', function () {
//         it('returns true', async function () {
//           const designatedWallet = ethers.Wallet.createRandom();
//           await roles.client.sendTransaction({
//             to: designatedWallet.address,
//             value: 1,
//           });
//           const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//           const expiration = now + 100;
//           selfAuthorizer
//             .connect(roles.airnodeAdmin)
//             .setWhitelistExpiration(airnodeId, roles.client.address, expiration);
//           expect(
//             await selfAuthorizer.isAuthorized(
//               requestId,
//               airnodeId,
//               endpointId,
//               requesterIndex,
//               designatedWallet.address,
//               roles.client.address
//             )
//           ).to.equal(true);
//         });
//       });
//       context('Client whitelisting has expired and whitelisting has not been set', function () {
//         it('returns false', async function () {
//           const designatedWallet = ethers.Wallet.createRandom();
//           await roles.client.sendTransaction({
//             to: designatedWallet.address,
//             value: 1,
//           });
//           expect(
//             await selfAuthorizer.isAuthorized(
//               requestId,
//               airnodeId,
//               endpointId,
//               requesterIndex,
//               designatedWallet.address,
//               roles.client.address
//             )
//           ).to.equal(false);
//         });
//       });
//     });
//     context('Client whitelisting was set then revoked', function () {
//       it('returns false', async function () {
//         const designatedWallet = ethers.Wallet.createRandom();
//         await roles.client.sendTransaction({
//           to: designatedWallet.address,
//           value: 1,
//         });
//         await selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistStatus(airnodeId, roles.client.address, true);
//         expect(
//           await selfAuthorizer.isAuthorized(
//             requestId,
//             airnodeId,
//             endpointId,
//             requesterIndex,
//             designatedWallet.address,
//             roles.client.address
//           )
//         ).to.equal(true);
//         await selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistStatus(airnodeId, roles.client.address, false);
//         expect(
//           await selfAuthorizer.isAuthorized(
//             requestId,
//             airnodeId,
//             endpointId,
//             requesterIndex,
//             designatedWallet.address,
//             roles.client.address
//           )
//         ).to.equal(false);
//       });
//     });
//   });
//   context('Designated wallet balance is zero', function () {
//     it('returns false', async function () {
//       const designatedWallet = ethers.Wallet.createRandom();
//       const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
//       const expiration = now + 100;
//       selfAuthorizer.connect(roles.airnodeAdmin).setWhitelistExpiration(airnodeId, roles.client.address, expiration);
//       expect(
//         await selfAuthorizer.isAuthorized(
//           requestId,
//           airnodeId,
//           endpointId,
//           requesterIndex,
//           designatedWallet.address,
//           roles.client.address
//         )
//       ).to.equal(false);
//     });
//   });
// });
