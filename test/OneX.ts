import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

import {
  expandTo18Decimals,
  advanceBlockTo,
  latestBlock,
} from './shared/utilities';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

const TOTAL_SUPPLY = expandTo18Decimals(1000000);
const REGULAR_MINT_AMOUNT = expandTo18Decimals(20000);
const NO_MANUAL_MINTED = 0;
const MANUAL_MINT_AMOUNT = expandTo18Decimals(999);
const TEST_AMOUNT = expandTo18Decimals(10);

const TOTAL_CAP = expandTo18Decimals(21000000);
const MANUAL_MINT_LIMIT = expandTo18Decimals(2100);
const LOCK_FROM_BLOCK = 100;
const LOCK_TO_BLOCK = 200;

describe('OneX', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let OneX: ContractFactory;
  let token: Contract;

  before(async function () {
    OneX = await ethers.getContractFactory('OneX');
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
  });

  beforeEach(async () => {
    const constructorArgs = [LOCK_FROM_BLOCK, LOCK_TO_BLOCK];
    token = await OneX.deploy(...constructorArgs);
    await token.mint(alice.address, TOTAL_SUPPLY);
  });

  it('should have correct values for: name, symbol, decimals, totalSupply, balanceOf', async () => {
    const name = await token.name();
    expect(name).to.eq('ExchangeOne');
    expect(await token.symbol()).to.eq('ONEx');
    expect(await token.decimals()).to.eq(18);
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY);
    expect(await token.balanceOf(alice.address)).to.eq(TOTAL_SUPPLY);
  });

  it('should have correct values for: cap, lockFromBlock, lockToBlock, manualMintLimit, manualMinted', async () => {
    expect(await token.cap()).to.eq(TOTAL_CAP);
    expect(await token.lockFromBlock()).to.eq(LOCK_FROM_BLOCK);
    expect(await token.lockToBlock()).to.eq(LOCK_TO_BLOCK);
    expect(await token.manualMintLimit()).to.eq(MANUAL_MINT_LIMIT);
    expect(await token.manualMinted()).to.eq(NO_MANUAL_MINTED);
  });

  it('the owner or an authorized user should be able to mint', async () => {
    await expect(token.mint(alice.address, REGULAR_MINT_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        alice.address,
        REGULAR_MINT_AMOUNT
      );
    expect(await token.balanceOf(alice.address)).to.eq(
      TOTAL_SUPPLY.add(REGULAR_MINT_AMOUNT)
    );
  });

  it('an unauthorized user should not be able to mint', async () => {
    await expect(token.connect(bob).mint(bob.address, MANUAL_MINT_AMOUNT)).to.be
      .reverted;
  });

  it('should be able to perform a manualMint', async () => {
    await expect(token.manualMint(alice.address, MANUAL_MINT_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        alice.address,
        MANUAL_MINT_AMOUNT
      );
    expect(await token.manualMinted()).to.eq(MANUAL_MINT_AMOUNT);
    expect(await token.balanceOf(alice.address)).to.eq(
      TOTAL_SUPPLY.add(MANUAL_MINT_AMOUNT)
    );
  });

  it('should fail if you try to manualMint with an invalid amount', async () => {
    await expect(
      token.manualMint(
        alice.address,
        MANUAL_MINT_AMOUNT.mul(expandTo18Decimals(2))
      )
    ).to.be.reverted;
    expect(await token.manualMinted()).to.eq(NO_MANUAL_MINTED);
  });

  it('should fail if you try to manualMint using a non-authorized alice', async () => {
    //await token.removeAuthorized(alice.address)
    await token.renounceOwnership();
    await expect(token.manualMint(alice.address, MANUAL_MINT_AMOUNT)).to.be
      .reverted;
    expect(await token.manualMinted()).to.eq(NO_MANUAL_MINTED);

    await expect(
      token.connect(bob).manualMint(alice.address, MANUAL_MINT_AMOUNT)
    ).to.be.reverted;
    expect(await token.manualMinted()).to.eq(NO_MANUAL_MINTED);
  });

  it('should have correct values for: capUpdate, lockFromUpdate, lockToUpdate', async () => {
    await token.capUpdate(TOTAL_CAP.mul(expandTo18Decimals(2)));
    expect(await token.cap()).to.eq(TOTAL_CAP.mul(expandTo18Decimals(2)));

    await token.lockFromUpdate(LOCK_FROM_BLOCK + 50);
    expect(await token.lockFromBlock()).to.eq(LOCK_FROM_BLOCK + 50);

    await token.lockToUpdate(LOCK_TO_BLOCK + 50);
    expect(await token.lockToBlock()).to.eq(LOCK_TO_BLOCK + 50);
  });

  it('should have correct values for: unlockedSupply, lockedSupply, circulatingSupply, totalLock', async () => {
    expect(await token.unlockedSupply()).to.eq(TOTAL_SUPPLY);
    expect(await token.lockedSupply()).to.eq(0);
    expect(await token.circulatingSupply()).to.eq(TOTAL_SUPPLY);
    expect(await token.totalLock()).to.eq(0);
  });

  it('should be able to addAuthorized for own address', async () => {
    await token.addAuthorized(alice.address);
    expect(await token.authorized(alice.address)).to.eq(true);
  });

  it('should be able to addAuthorized for anbob address', async () => {
    await token.addAuthorized(bob.address);
    expect(await token.authorized(bob.address)).to.eq(true);
  });

  it('should fail to remove authorization for the same address requesting removeAuthorized', async () => {
    await token.addAuthorized(alice.address);
    expect(await token.authorized(alice.address)).to.eq(true);
    await expect(token.removeAuthorized(alice.address)).to.be.reverted;
  });

  it('should succeed to remove authorization for anbob address', async () => {
    await token.addAuthorized(bob.address);
    expect(await token.authorized(bob.address)).to.eq(true);
    await token.removeAuthorized(bob.address);
    expect(await token.authorized(bob.address)).to.eq(false);
  });

  it('should be able to approve an address + balance', async () => {
    await expect(token.approve(bob.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(alice.address, bob.address, TEST_AMOUNT);
    expect(await token.allowance(alice.address, bob.address)).to.eq(
      TEST_AMOUNT
    );
  });

  it('should be able to transfer', async () => {
    await expect(token.transfer(bob.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(alice.address, bob.address, TEST_AMOUNT);
    expect(await token.balanceOf(alice.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.balanceOf(bob.address)).to.eq(TEST_AMOUNT);
  });

  it('transfer should fail', async () => {
    await expect(token.transfer(bob.address, TOTAL_SUPPLY.add(1))).to.be
      .reverted; // ds-math-sub-underflow
    await expect(token.connect(bob).transfer(alice.address, 1)).to.be.reverted; // ds-math-sub-underflow
  });

  it('should be able to transferFrom one address to anbob address', async () => {
    await token.approve(bob.address, TEST_AMOUNT);
    await expect(
      token.connect(bob).transferFrom(alice.address, bob.address, TEST_AMOUNT)
    )
      .to.emit(token, 'Transfer')
      .withArgs(alice.address, bob.address, TEST_AMOUNT);
    expect(await token.allowance(alice.address, bob.address)).to.eq(0);
    expect(await token.balanceOf(alice.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.balanceOf(bob.address)).to.eq(TEST_AMOUNT);
  });

  /*it('transferFrom:max', async () => {
    await token.approve(bob.address, MaxUint256)
    await expect(token.connect(bob).transferFrom(alice.address, bob.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(alice.address, bob.address, TEST_AMOUNT)
    expect(await token.allowance(alice.address, bob.address)).to.eq(MaxUint256)
    expect(await token.balanceOf(alice.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(bob.address)).to.eq(TEST_AMOUNT)
  })*/

  it('should be able to lock tokens', async () => {
    await expect(token.lock(alice.address, TEST_AMOUNT))
      .to.emit(token, 'Lock')
      .withArgs(alice.address, TEST_AMOUNT);
    expect(await token.lockOf(alice.address)).to.eq(TEST_AMOUNT);
    expect(await token.totalLock()).to.eq(TEST_AMOUNT);
  });

  it('should not be able to unlock without no prior locks set', async () => {
    await expect(token.unlock()).to.be.reverted;
  });

  it('should be able to unlock tokens after the final vesting block', async () => {
    await expect(token.lock(alice.address, TEST_AMOUNT))
      .to.emit(token, 'Lock')
      .withArgs(alice.address, TEST_AMOUNT);

    expect(await token.lockOf(alice.address)).to.eq(TEST_AMOUNT);
    expect(await token.totalLock()).to.eq(TEST_AMOUNT);

    // The alice should now have the previously minted total supply - the locked amount
    expect(await token.balanceOf(alice.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.totalBalanceOf(alice.address)).to.eq(TOTAL_SUPPLY);

    expect(await token.canUnlockAmount(alice.address)).to.eq(0);

    // Advance the blocks to 10 blocks past the final locking interval
    await advanceBlockTo(LOCK_TO_BLOCK + 10);

    expect(await token.canUnlockAmount(alice.address)).to.eq(TEST_AMOUNT);

    await expect(token.unlock())
      .to.emit(token, 'Transfer')
      .withArgs(token.address, alice.address, TEST_AMOUNT);

    const block = await latestBlock();
    const lastUnlockBlock = await token.lastUnlockBlock(alice.address);
    expect(lastUnlockBlock.toNumber()).to.lte(block.number);

    expect(await token.lockOf(alice.address)).to.eq(0);
    expect(await token.totalLock()).to.eq(0);

    expect(await token.balanceOf(alice.address)).to.eq(TOTAL_SUPPLY);
    expect(await token.totalBalanceOf(alice.address)).to.eq(TOTAL_SUPPLY);
  });
});
