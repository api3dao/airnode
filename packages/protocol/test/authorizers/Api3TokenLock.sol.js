/* globals context ethers */
const { expect } = require('chai');
const { timeTravel } = require('../utils');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let api3TokenLockFactory;
const ONE_MINUTE_IN_SECONDS = 60;
const LOCK_AMOUNT = 10;
const adminnedId = ethers.constants.HashZero;

const Errors = {
  ClientBlacklisted: 'Client blacklisted',
  ClientNotBlacklisted: 'Client not blacklisted',
  FromClientBlacklisted: 'From Client blacklisted',
  LockPeriodNotExpired: 'Locking period not expired',
  ToClientBlacklisted: 'To Client blacklisted',
  Unauthorized: 'Unauthorized',
  ZeroAddress: 'Zero address',
  ZeroAmount: 'Zero amount',
};

const airnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

let deployer, metaAdmin, newMetaAdmin, admin, alice, bobClient, carolClient, unknown;

describe('Api3TokenLock', async () => {
  beforeEach(async () => {
    [deployer, metaAdmin, newMetaAdmin, admin, alice, bobClient, carolClient, unknown] = await ethers.getSigners();

    api3TokenLockFactory = await ethers.getContractFactory('Api3TokenLock', deployer);
  });

  describe('constructor', async () => {
    context('successful deployment', async () => {
      it('initialises correctly', async () => {
        // when:
        const api3TokenLock = await api3TokenLockFactory.deploy(metaAdmin.address, ONE_MINUTE_IN_SECONDS, LOCK_AMOUNT);
        // then:

        expect(await api3TokenLock.metaAdmin()).to.equal(metaAdmin.address);
        expect(await api3TokenLock.minimumLockingTime()).to.equal(ONE_MINUTE_IN_SECONDS);
        expect(await api3TokenLock.lockAmount()).to.equal(LOCK_AMOUNT);
      });
    });

    context('Meta Admin is zero address', async () => {
      it('reverts', async () => {
        await expect(
          api3TokenLockFactory.deploy(ethers.constants.AddressZero, ONE_MINUTE_IN_SECONDS, LOCK_AMOUNT)
        ).to.revertedWith(Errors.ZeroAddress);
      });
    });

    context('Lock Amount is zero', async () => {
      it('reverts', async () => {
        await expect(api3TokenLockFactory.deploy(metaAdmin.address, ONE_MINUTE_IN_SECONDS, 0)).to.revertedWith(
          Errors.ZeroAmount
        );
      });
    });
  });

  describe('post deployment', async () => {
    let api3TokenLock;
    let api3RequesterRrpAuthorizer;
    let api3Token;

    beforeEach(async () => {
      // deploy Api3TokenLock
      api3TokenLock = await api3TokenLockFactory.deploy(metaAdmin.address, ONE_MINUTE_IN_SECONDS, LOCK_AMOUNT);

      const api3RequesterRrpAuthorizerFactory = await ethers.getContractFactory('Api3RequesterRrpAuthorizer', deployer);
      // deploy Api3RequesterRrpAuthorizer
      api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(metaAdmin.address);

      const api3TokenFactory = await ethers.getContractFactory('Api3Token', deployer);
      // deploy Api3Token
      api3Token = await api3TokenFactory.deploy(deployer.address, alice.address);

      // set Api3TokenLock as admin
      await api3RequesterRrpAuthorizer
        .connect(metaAdmin)
        .setRank(adminnedId, api3TokenLock.address, AdminStatus.SuperAdmin);
    });

    describe('setMetaAdmin', async () => {
      context('caller is meta admin', async () => {
        context('address to be set', async () => {
          it('is set', async () => {
            // when:
            await api3TokenLock.connect(metaAdmin).setMetaAdmin(newMetaAdmin.address);

            // then:
            expect(await api3TokenLock.metaAdmin()).to.equal(newMetaAdmin.address);
          });

          it('emits event', async () => {
            await expect(api3TokenLock.connect(metaAdmin).setMetaAdmin(newMetaAdmin.address))
              .to.emit(api3TokenLock, 'SetMetaAdmin')
              .withArgs(newMetaAdmin.address);
          });
        });

        context('new meta admin is zero address', async () => {
          it('reverts', async () => {
            await expect(api3TokenLock.connect(metaAdmin).setMetaAdmin(ethers.constants.AddressZero)).to.revertedWith(
              Errors.ZeroAddress
            );
          });
        });
      });

      context('caller is not meta admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setMetaAdmin(newMetaAdmin.address)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setAdminStatus', async () => {
      context('caller is meta admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);
          // then:
          expect(await api3TokenLock.adminStatuses(admin.address)).to.equal(AdminStatus.Admin);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin))
            .to.emit(api3TokenLock, 'SetAdminStatus')
            .withArgs(admin.address, AdminStatus.Admin);
        });
      });

      context('caller is not meta admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setAdminStatus(admin.address, AdminStatus.Admin)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setApi3RequesterRrpAuthorizer', async () => {
      beforeEach(async () => {
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);
      });

      context('caller is admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);
          // then:
          expect(await api3TokenLock.api3RequesterRrpAuthorizer()).to.equal(api3RequesterRrpAuthorizer.address);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address))
            .to.emit(api3TokenLock, 'SetApi3RequesterRrpAuthorizer')
            .withArgs(api3RequesterRrpAuthorizer.address);
        });

        context('Api3RequesterRrpAuthorizer is zero address', async () => {
          it('reverts', async () => {
            await expect(
              api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(ethers.constants.AddressZero)
            ).to.revertedWith(Errors.ZeroAddress);
          });
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLock.connect(unknown).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address)
          ).to.revertedWith(Errors.Unauthorized);
        });
      });
    });

    describe('setApi3Token', async () => {
      beforeEach(async () => {
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);
      });

      context('caller is admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(admin).setApi3Token(api3Token.address);
          // then:
          expect(await api3TokenLock.api3Token()).to.equal(api3Token.address);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(admin).setApi3Token(api3Token.address))
            .to.emit(api3TokenLock, 'SetApi3Token')
            .withArgs(api3Token.address);
        });

        context('Api3Token is zero address', async () => {
          it('reverts', async () => {
            await expect(api3TokenLock.connect(admin).setApi3Token(ethers.constants.AddressZero)).to.revertedWith(
              Errors.ZeroAddress
            );
          });
        });

        context('Api3Token does not implement IApi3Token interface', async () => {
          it('reverts', async () => {
            await expect(api3TokenLock.connect(admin).setApi3Token(unknown.address)).to.reverted;
          });
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setApi3Token(api3Token.address)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setMinimumLockingTime', async () => {
      const NEW_MINIMUM_LOCKING_TIME = 2 * ONE_MINUTE_IN_SECONDS;

      context('caller is admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);
          // then:
          expect(await api3TokenLock.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLock, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME)).to.revertedWith(
            'caller is not the owner'
          );
        });
      });
    });

    describe('setLockAmount', async () => {
      const NEW_LOCK_AMOUNT = 2 * LOCK_AMOUNT;

      context('caller is admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.setLockAmount(NEW_LOCK_AMOUNT);
          // then:
          expect(await api3TokenLock.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.setLockAmount(NEW_LOCK_AMOUNT))
            .to.emit(api3TokenLock, 'SetLockAmount')
            .withArgs(NEW_LOCK_AMOUNT);
        });

        context('new lock amount is zero', async () => {
          it('reverts', async () => {
            await expect(api3TokenLock.setLockAmount(0)).to.revertedWith(Errors.ZeroAmount);
          });
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setLockAmount(NEW_LOCK_AMOUNT)).to.revertedWith(
            'caller is not the owner'
          );
        });
      });
    });

    describe('setBlacklistStatus', async () => {
      context('caller is owner', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
          // then:
          expect(await api3TokenLock.clientAddressToBlacklistStatus(bobClient.address)).to.equal(true);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.setBlacklistStatus(bobClient.address, true))
            .to.emit(api3TokenLock, 'SetBlacklistStatus')
            .withArgs(bobClient.address, true, deployer.address);
        });
      });
      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setBlacklistStatus(bobClient.address, true)).to.revertedWith(
            'caller is not the owner'
          );
        });
      });
    });

    describe('lock', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 authorizer
        await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);

        // set api3 token
        await api3TokenLock.connect(admin).setApi3Token(api3Token.address);
      });

      context('caller is first time locking', async () => {
        beforeEach(async () => {
          // given:
          await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(alice.address);
          // when:
          await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
          // then:
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(alice.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address)).to.equal(
            expectedUnlockTime
          );
          expect(await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address)).to.equal(LOCK_AMOUNT);
          expect(await api3TokenLock.tokenLocks(airnodeId, bobClient.address)).to.equal(1);

          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, bobClient.address))
              .expirationTimestamp
          ).to.equal(ethers.BigNumber.from('0xffffffffffffffff'));
        });

        it('emits event', async () => {
          // then:
          await expect(api3TokenLock.connect(alice).lock(airnodeId, bobClient.address))
            .to.emit(api3TokenLock, 'Lock')
            .withArgs(airnodeId, bobClient.address, alice.address, LOCK_AMOUNT);
        });
      });

      context('caller has already locked', async () => {
        it('reverts', async () => {
          // given:
          await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
          await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
          // then:
          await expect(api3TokenLock.connect(alice).lock(airnodeId, bobClient.address)).to.revertedWith(
            'Already locked'
          );
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
          // then:
          await expect(api3TokenLock.connect(alice).lock(airnodeId, bobClient.address)).to.revertedWith(
            Errors.ClientBlacklisted
          );
        });
      });
    });

    describe('unlock', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 authorizer
        await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);

        // set api3 token
        await api3TokenLock.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        // Lock:
        await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
      });

      context('caller is unlocking successfully', async () => {
        beforeEach(async () => {
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(alice.address);
          // when:
          await api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address);
          // then:
          const afterBalance = await api3Token.balanceOf(alice.address);
          expect(afterBalance).to.equal(beforeBalance.add(LOCK_AMOUNT));
          expect(await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          expect(await api3TokenLock.tokenLocks(airnodeId, bobClient.address)).to.equal(0);
        });

        it('emits event', async () => {
          // then:
          await expect(api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address))
            .to.emit(api3TokenLock, 'Unlock')
            .withArgs(airnodeId, bobClient.address, alice.address, LOCK_AMOUNT);
        });
      });

      context('caller period not expired', async () => {
        it('reverts', async () => {
          // then:
          await expect(api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address)).to.revertedWith(
            Errors.LockPeriodNotExpired
          );
        });
      });

      context('already unlocked', async () => {
        it('reverts', async () => {
          // given:
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
          await api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address);
          // then:
          await expect(api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address)).to.revertedWith(
            'No amount locked'
          );
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
          // then:
          await expect(api3TokenLock.connect(alice).unlock(airnodeId, bobClient.address)).to.revertedWith(
            Errors.ClientBlacklisted
          );
        });
      });
    });

    describe('withdraw', async () => {
      const NEW_LOCK_AMOUNT = LOCK_AMOUNT / 2;
      const expectedWithdrawnAmount = LOCK_AMOUNT - NEW_LOCK_AMOUNT;

      beforeEach(async () => {
        // set admin
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 authorizer
        await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);

        // set api3 token
        await api3TokenLock.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        // Lock:
        await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
      });

      context('successful withdraws amount if it is set to a lower one', async () => {
        beforeEach(async () => {
          await api3TokenLock.setLockAmount(NEW_LOCK_AMOUNT);
        });

        it('withdraws', async () => {
          const beforeBalance = await api3Token.balanceOf(alice.address);
          // when:
          await api3TokenLock.connect(alice).withdraw(airnodeId, bobClient.address);
          // then:
          const afterBalance = await api3Token.balanceOf(alice.address);
          expect(afterBalance).to.equal(beforeBalance.add(expectedWithdrawnAmount));
          expect(await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address)).to.equal(
            NEW_LOCK_AMOUNT
          );
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(alice).withdraw(airnodeId, bobClient.address))
            .to.emit(api3TokenLock, 'Withdraw')
            .withArgs(airnodeId, bobClient.address, alice.address, expectedWithdrawnAmount);
        });
      });

      context('client address is blacklisted', async () => {
        beforeEach(async () => {
          await api3TokenLock.setLockAmount(NEW_LOCK_AMOUNT);
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
        });

        it('reverts', async () => {
          // then:
          await expect(api3TokenLock.connect(alice).withdraw(airnodeId, bobClient.address)).to.revertedWith(
            Errors.ClientBlacklisted
          );
        });
      });

      context('locked amount is not reduced', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(alice).withdraw(airnodeId, bobClient.address)).to.revertedWith(
            'Insufficient amount'
          );
        });
      });
    });

    describe('transfer', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 authorizer
        await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);

        // set api3 token
        await api3TokenLock.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());

        // Lock:
        await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
      });

      context('from one client to another', async () => {
        it('is set', async () => {
          const lockPeriod = await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address);
          const beforeBobWhitelistCount = await api3TokenLock.tokenLocks(airnodeId, bobClient.address);
          const beforeCarolWhitelistCount = await api3TokenLock.tokenLocks(airnodeId, carolClient.address);

          // when:
          await api3TokenLock.connect(alice).transfer(airnodeId, bobClient.address, carolClient.address);
          // then:
          expect(await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          expect(await api3TokenLock.tokenLocks(airnodeId, bobClient.address)).to.equal(beforeBobWhitelistCount - 1);
          // and:
          expect(await api3TokenLock.canUnlockAt(airnodeId, carolClient.address, alice.address)).to.equal(lockPeriod);
          expect(await api3TokenLock.lockAmountAt(airnodeId, carolClient.address, alice.address)).to.equal(lockAmount);
          expect(await api3TokenLock.tokenLocks(airnodeId, carolClient.address)).to.equal(
            beforeCarolWhitelistCount + 1
          );
          // and:
          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, bobClient.address))
              .expirationTimestamp
          ).to.equal(0);
          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, carolClient.address))
              .expirationTimestamp
          ).to.equal(ethers.BigNumber.from('0xffffffffffffffff'));
        });

        it('emits event', async () => {
          const lockPeriod = await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address);
          // then:
          await expect(api3TokenLock.connect(alice).transfer(airnodeId, bobClient.address, carolClient.address))
            .to.emit(api3TokenLock, 'Transfer')
            .withArgs(airnodeId, bobClient.address, carolClient.address, alice.address, lockAmount, lockPeriod);
        });
      });

      context('caller has not locked amounts', async () => {
        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLock.connect(unknown).transfer(airnodeId, bobClient.address, carolClient.address)
          ).to.revertedWith('locked amount must be != 0');
        });
      });

      context('caller toClientAddress has existing locked amount', async () => {
        it('reverts', async () => {
          // given:
          await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
          await api3TokenLock.connect(alice).lock(airnodeId, carolClient.address);
          // then:
          await expect(
            api3TokenLock.connect(alice).transfer(airnodeId, bobClient.address, carolClient.address)
          ).to.revertedWith('locked amount must be 0');
        });
      });

      context('fromClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
          // then:
          await expect(
            api3TokenLock.connect(alice).transfer(airnodeId, bobClient.address, carolClient.address)
          ).to.revertedWith(Errors.FromClientBlacklisted);
        });
      });

      context('toClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.setBlacklistStatus(carolClient.address, true);
          // then:
          await expect(
            api3TokenLock.connect(alice).transfer(airnodeId, bobClient.address, carolClient.address)
          ).to.revertedWith(Errors.ToClientBlacklisted);
        });
      });
    });

    describe('burn', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLock.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 authorizer
        await api3TokenLock.connect(admin).setApi3RequesterRrpAuthorizer(api3RequesterRrpAuthorizer.address);

        // set api3 token
        await api3TokenLock.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token.connect(alice).approve(api3TokenLock.address, await api3TokenLock.lockAmount());

        // Lock:
        await api3TokenLock.connect(alice).lock(airnodeId, bobClient.address);
      });

      context('successful burn of blacklisted client', async () => {
        beforeEach(async () => {
          await api3TokenLock.setBlacklistStatus(bobClient.address, true);
        });

        it('burns tokens', async () => {
          const beforeTotalSupply = await api3Token.totalSupply();
          const beforeTokenLockBalance = await api3Token.balanceOf(api3TokenLock.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address);
          const beforeWhitelistCount = await api3TokenLock.tokenLocks(airnodeId, bobClient.address);

          // when:
          await api3TokenLock.burn(airnodeId, bobClient.address, alice.address);

          // then:
          expect(await api3TokenLock.canUnlockAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, bobClient.address, alice.address)).to.equal(0);
          // and:
          expect(await api3Token.balanceOf(api3TokenLock.address)).to.equal(beforeTokenLockBalance.sub(lockAmount));
          expect(await api3Token.totalSupply()).to.equal(beforeTotalSupply.sub(lockAmount));
          expect(await api3TokenLock.tokenLocks(airnodeId, bobClient.address)).to.equal(beforeWhitelistCount.sub(1));
        });

        it('emits event', async () => {
          await expect(api3TokenLock.burn(airnodeId, bobClient.address, alice.address))
            .to.emit(api3TokenLock, 'Burn')
            .withArgs(airnodeId, bobClient.address, alice.address);
        });
      });

      context('burn target has zero locked amount', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.burn(airnodeId, bobClient.address, unknown.address)).to.revertedWith(
            Errors.ZeroAmount
          );
        });
      });

      context('client address is not blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.setBlacklistStatus(bobClient.address, false);
          // then:
          await expect(api3TokenLock.burn(airnodeId, bobClient.address, alice.address)).to.revertedWith(
            Errors.ClientNotBlacklisted
          );
        });
      });
    });
  });
});
