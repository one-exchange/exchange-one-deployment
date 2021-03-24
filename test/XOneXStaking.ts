import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

import {deployOneX} from './shared/deploy';

describe('XOneXStaking', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  let XOneXStaking: ContractFactory;
  let govToken: Contract;
  let xOneXStaking: Contract;

  before(async function () {
    XOneXStaking = await ethers.getContractFactory('XOneXStaking');
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
    carol = signers[2];
  });

  beforeEach(async () => {
    govToken = await deployOneX(alice);

    await govToken.mint(alice.address, '100');
    await govToken.mint(bob.address, '100');
    await govToken.mint(carol.address, '100');

    xOneXStaking = await XOneXStaking.deploy(govToken.address);
  });

  it('should have correct values for: name, symbol, decimals, totalSupply, balanceOf', async () => {
    const name = await xOneXStaking.name();
    expect(name).to.eq('xONExStaking');
    expect(await xOneXStaking.symbol()).to.eq('xONEx');
    expect(await xOneXStaking.decimals()).to.eq(18);
    expect(await xOneXStaking.totalSupply()).to.eq(0);
    expect(await xOneXStaking.balanceOf(alice.address)).to.eq(0);
  });

  it('should not allow enter if not enough approve', async function () {
    await expect(xOneXStaking.enter('100')).to.be.revertedWith(
      'ERC20: transfer amount exceeds allowance'
    );
    await govToken.approve(xOneXStaking.address, '50');
    await expect(xOneXStaking.enter('100')).to.be.revertedWith(
      'ERC20: transfer amount exceeds allowance'
    );
    await govToken.approve(xOneXStaking.address, '100');
    await xOneXStaking.enter('100');
    expect(await xOneXStaking.balanceOf(alice.address)).to.equal('100');
  });

  it('should not allow withraw more than what you have', async function () {
    await govToken.approve(xOneXStaking.address, '100');
    await xOneXStaking.enter('100');
    await expect(xOneXStaking.leave('200')).to.be.revertedWith(
      'ERC20: burn amount exceeds balance'
    );
  });

  it('should work with more than one participant', async function () {
    await govToken.approve(xOneXStaking.address, '100');
    await govToken.connect(bob).approve(xOneXStaking.address, '100');
    // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
    await xOneXStaking.enter('20');
    await xOneXStaking.connect(bob).enter('10');
    expect(await xOneXStaking.balanceOf(alice.address)).to.equal('20');
    expect(await xOneXStaking.balanceOf(bob.address)).to.equal('10');
    expect(await govToken.balanceOf(xOneXStaking.address)).to.equal('30');
    // XOneXStaking get 20 more OneXs from an external source.
    await govToken.connect(carol).transfer(xOneXStaking.address, '20');
    // Alice deposits 10 more OneXs. She should receive 10*30/50 = 6 shares.
    await xOneXStaking.enter('10');
    expect(await xOneXStaking.balanceOf(alice.address)).to.equal('26');
    expect(await xOneXStaking.balanceOf(bob.address)).to.equal('10');
    // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
    await xOneXStaking.connect(bob).leave('5');
    expect(await xOneXStaking.balanceOf(alice.address)).to.equal('26');
    expect(await xOneXStaking.balanceOf(bob.address)).to.equal('5');
    expect(await govToken.balanceOf(xOneXStaking.address)).to.equal('52');
    expect(await govToken.balanceOf(alice.address)).to.equal('70');
    expect(await govToken.balanceOf(bob.address)).to.equal('98');
  });
});
