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

let deployer, metaAdmin, newMetaAdmin, admin, sponsor, requester, carolClient, unknown, anotherSponsor;

describe('Api3TokenLock', async () => {
  beforeEach(async () => {
    [deployer, metaAdmin, newMetaAdmin, admin, sponsor, requester, carolClient, unknown, anotherSponsor] =
      await ethers.getSigners();

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
      api3Token = await api3TokenFactory.deploy(deployer.address, sponsor.address);

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

        it('sets the burner status', async () => {
          expect(await api3Token.getBurnerStatus(api3TokenLock.address)).to.equal(false);
          await api3TokenLock.connect(admin).setApi3Token(api3Token.address);
          expect(await api3Token.getBurnerStatus(api3TokenLock.address)).to.equal(true);
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

      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);
          // then:
          expect(await api3TokenLock.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLock, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setLockAmount', async () => {
      const NEW_LOCK_AMOUNT = 2 * LOCK_AMOUNT;

      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
          // then:
          expect(await api3TokenLock.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT))
            .to.emit(api3TokenLock, 'SetLockAmount')
            .withArgs(NEW_LOCK_AMOUNT);
        });

        context('new lock amount is zero', async () => {
          it('reverts', async () => {
            await expect(api3TokenLock.connect(metaAdmin).setLockAmount(0)).to.revertedWith(Errors.ZeroAmount);
          });
        });
      });

      context('caller is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setLockAmount(NEW_LOCK_AMOUNT)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setBlacklistStatus', async () => {
      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          expect(await api3TokenLock.requesterToBlacklistStatus(requester.address)).to.equal(true);
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true))
            .to.emit(api3TokenLock, 'SetBlacklistStatus')
            .withArgs(requester.address, true, metaAdmin.address);
        });
      });
      context('caller is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(unknown).setBlacklistStatus(requester.address, true)).to.revertedWith(
            Errors.Unauthorized
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
          await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
          // then:
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(sponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address)).to.equal(
            expectedUnlockTime
          );
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address)).to.equal(LOCK_AMOUNT);
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(1);

          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, requester.address))
              .expirationTimestamp
          ).to.equal(ethers.BigNumber.from('0xffffffffffffffff'));
        });

        it('emits event', async () => {
          // then:
          await expect(api3TokenLock.connect(sponsor).lock(airnodeId, requester.address))
            .to.emit(api3TokenLock, 'Lock')
            .withArgs(airnodeId, requester.address, sponsor.address, LOCK_AMOUNT);
        });
      });

      context('caller has already locked', async () => {
        it('is set for different sponser', async () => {
          await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT * 2);
          await api3Token.connect(anotherSponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
          const beforeBalance = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLock.connect(anotherSponsor).lock(airnodeId, requester.address);
          // then:
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(anotherSponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, anotherSponsor.address)).to.equal(
            expectedUnlockTime
          );
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, anotherSponsor.address)).to.equal(
            LOCK_AMOUNT
          );
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(1);

          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, requester.address))
              .expirationTimestamp
          ).to.equal(ethers.BigNumber.from('0xffffffffffffffff'));
        });

        it('reverts for the same sponser', async () => {
          // given:
          await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
          await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
          // then:
          await expect(api3TokenLock.connect(sponsor).lock(airnodeId, requester.address)).to.revertedWith(
            'Already locked'
          );
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          await expect(api3TokenLock.connect(sponsor).lock(airnodeId, requester.address)).to.revertedWith(
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

        await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT);

        // approve Api3TokenLock:
        await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        await api3Token.connect(anotherSponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        // Lock:
        await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
        await api3TokenLock.connect(anotherSponsor).lock(airnodeId, requester.address);
      });

      context('caller is unlocking successfully', async () => {
        beforeEach(async () => {
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address);
          // then:
          const afterBalance = await api3Token.balanceOf(sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(LOCK_AMOUNT));
          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          console.log(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address));
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(1);

          const beforeBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLock.connect(anotherSponsor).unlock(airnodeId, requester.address);
          // then:
          const afterBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(LOCK_AMOUNT));
          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, anotherSponsor.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, anotherSponsor.address)).to.equal(0);
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(0);
        });

        it('emits event', async () => {
          // then:
          await expect(api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address))
            .to.emit(api3TokenLock, 'Unlock')
            .withArgs(airnodeId, requester.address, sponsor.address, LOCK_AMOUNT);
        });
      });

      context('caller period not expired', async () => {
        it('reverts', async () => {
          // then:
          await expect(api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address)).to.revertedWith(
            Errors.LockPeriodNotExpired
          );
        });
      });

      context('already unlocked', async () => {
        it('reverts', async () => {
          // given:
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
          await api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address);
          // then:
          await expect(api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address)).to.revertedWith(
            'No amount locked'
          );
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
          // then:
          await expect(api3TokenLock.connect(sponsor).unlock(airnodeId, requester.address)).to.revertedWith(
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

        await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT);

        // approve Api3TokenLock:
        await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        await api3Token.connect(anotherSponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
        // Lock:
        await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
        await api3TokenLock.connect(anotherSponsor).lock(airnodeId, requester.address);
      });

      context('successful withdraws amount if it is set to a lower one', async () => {
        beforeEach(async () => {
          await api3TokenLock.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
        });

        it('withdraws', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLock.connect(sponsor).withdraw(airnodeId, requester.address);
          // then:
          const afterBalance = await api3Token.balanceOf(sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(expectedWithdrawnAmount));
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address)).to.equal(
            NEW_LOCK_AMOUNT
          );

          const beforeBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLock.connect(anotherSponsor).withdraw(airnodeId, requester.address);
          // then:
          const afterBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(expectedWithdrawnAmount));
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, anotherSponsor.address)).to.equal(
            NEW_LOCK_AMOUNT
          );
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(sponsor).withdraw(airnodeId, requester.address))
            .to.emit(api3TokenLock, 'Withdraw')
            .withArgs(airnodeId, requester.address, sponsor.address, expectedWithdrawnAmount);
        });
      });

      context('client address is blacklisted', async () => {
        beforeEach(async () => {
          await api3TokenLock.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
        });

        it('reverts', async () => {
          // then:
          await expect(api3TokenLock.connect(sponsor).withdraw(airnodeId, requester.address)).to.revertedWith(
            Errors.ClientBlacklisted
          );
        });
      });

      context('locked amount is not reduced', async () => {
        it('reverts', async () => {
          await expect(api3TokenLock.connect(sponsor).withdraw(airnodeId, requester.address)).to.revertedWith(
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
        await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());

        // Lock:
        await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
      });

      context('from one client to another', async () => {
        it('is set', async () => {
          const lockPeriod = await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address);
          const beforeBobWhitelistCount = await api3TokenLock.airnodeToRequesterToTokenLocks(
            airnodeId,
            requester.address
          );
          const beforeCarolWhitelistCount = await api3TokenLock.airnodeToRequesterToTokenLocks(
            airnodeId,
            carolClient.address
          );

          // when:
          await api3TokenLock.connect(sponsor).transfer(airnodeId, requester.address, carolClient.address);
          // then:
          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(
            beforeBobWhitelistCount - 1
          );
          // and:
          expect(await api3TokenLock.canUnlockAt(airnodeId, carolClient.address, sponsor.address)).to.equal(lockPeriod);
          expect(await api3TokenLock.lockAmountAt(airnodeId, carolClient.address, sponsor.address)).to.equal(
            lockAmount
          );
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, carolClient.address)).to.equal(
            beforeCarolWhitelistCount + 1
          );
          // and:
          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, requester.address))
              .expirationTimestamp
          ).to.equal(0);
          expect(
            (await api3RequesterRrpAuthorizer.serviceIdToUserToWhitelistStatus(airnodeId, carolClient.address))
              .expirationTimestamp
          ).to.equal(ethers.BigNumber.from('0xffffffffffffffff'));
        });

        it('emits event', async () => {
          const lockPeriod = await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address);
          // then:
          await expect(api3TokenLock.connect(sponsor).transfer(airnodeId, requester.address, carolClient.address))
            .to.emit(api3TokenLock, 'Transfer')
            .withArgs(airnodeId, requester.address, carolClient.address, sponsor.address, lockAmount, lockPeriod);
        });
      });

      context('caller has not locked amounts', async () => {
        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLock.connect(unknown).transfer(airnodeId, requester.address, carolClient.address)
          ).to.revertedWith('locked amount must be != 0');
        });
      });

      context('caller toClientAddress has existing locked amount', async () => {
        it('reverts', async () => {
          // given:
          await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());
          await api3TokenLock.connect(sponsor).lock(airnodeId, carolClient.address);
          // then:
          await expect(
            api3TokenLock.connect(sponsor).transfer(airnodeId, requester.address, carolClient.address)
          ).to.revertedWith('locked amount must be 0');
        });
      });

      context('fromClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          await expect(
            api3TokenLock.connect(sponsor).transfer(airnodeId, requester.address, carolClient.address)
          ).to.revertedWith(Errors.FromClientBlacklisted);
        });
      });

      context('toClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(carolClient.address, true);
          // then:
          await expect(
            api3TokenLock.connect(sponsor).transfer(airnodeId, requester.address, carolClient.address)
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
        await api3Token.connect(sponsor).approve(api3TokenLock.address, await api3TokenLock.lockAmount());

        // Lock:
        await api3TokenLock.connect(sponsor).lock(airnodeId, requester.address);
      });

      context('successful burn of blacklisted client', async () => {
        beforeEach(async () => {
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, true);
        });

        it('burns tokens', async () => {
          const beforeTotalSupply = await api3Token.totalSupply();
          const beforeTokenLockBalance = await api3Token.balanceOf(api3TokenLock.address);
          const lockAmount = await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address);
          const beforeWhitelistCount = await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address);

          // when:
          await api3TokenLock.connect(metaAdmin).burn(airnodeId, requester.address, sponsor.address);

          // then:
          expect(await api3TokenLock.canUnlockAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          expect(await api3TokenLock.lockAmountAt(airnodeId, requester.address, sponsor.address)).to.equal(0);
          // and:
          expect(await api3Token.balanceOf(api3TokenLock.address)).to.equal(beforeTokenLockBalance.sub(lockAmount));
          expect(await api3Token.totalSupply()).to.equal(beforeTotalSupply.sub(lockAmount));
          expect(await api3TokenLock.airnodeToRequesterToTokenLocks(airnodeId, requester.address)).to.equal(
            beforeWhitelistCount.sub(1)
          );
        });

        it('emits event', async () => {
          await expect(api3TokenLock.connect(metaAdmin).burn(airnodeId, requester.address, sponsor.address))
            .to.emit(api3TokenLock, 'Burn')
            .withArgs(airnodeId, requester.address, sponsor.address);
        });
      });

      context('burn target has zero locked amount', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLock.connect(metaAdmin).burn(airnodeId, requester.address, unknown.address)
          ).to.revertedWith(Errors.ZeroAmount);
        });
      });

      context('client address is not blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLock.connect(metaAdmin).setBlacklistStatus(requester.address, false);
          // then:
          await expect(
            api3TokenLock.connect(metaAdmin).burn(airnodeId, requester.address, sponsor.address)
          ).to.revertedWith(Errors.ClientNotBlacklisted);
        });
      });
    });
  });
});
