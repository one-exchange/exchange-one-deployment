import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {bytecode} from '@exchange-one/core/build/UniswapV2Pair.json';
import {keccak256} from '@ethersproject/solidity';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, log} = deployments;

  const factory = await deployments.get('UniswapV2Factory');
  const router = await deployments.get('UniswapV2Router02');
  const onexToken = await deployments.get('OneX');
  const rewardsGenerator = await deployments.get('RewardsGenerator');
  const rewardsDistributor = await deployments.get('RewardsDistributor');
  const xOnexStaking = await deployments.get('XOneXStaking');

  log('\nUniswap Core contracts:');
  log('--------------------');
  log(`UniswapV2Factory: ${factory.address}`);
  const computedInitCodeHash = keccak256(['bytes'], [`0x${bytecode}`]);
  log(`Init code hash for UniswapV2Pair is: ${computedInitCodeHash}`);
  const feeTo = await read('UniswapV2Factory', 'feeTo');
  log(`FeeTo address for UniswapV2Factory is: ${feeTo}`);
  log('\n');

  log('\nUniswap Periphery contracts:');
  log('--------------------');
  log(`UniswapV2Router02: ${router.address}`);
  log('\n');

  log('\nToken contracts:');
  log('--------------------');
  log(`OneX token: ${onexToken.address}`);
  log('\n');

  log('\nRewards contracts:');
  log('--------------------');
  log(`Rewards Generator: ${rewardsGenerator.address}`);
  log(`Rewards Distributor: ${rewardsDistributor.address}`);
  log(`xOnexStaking: ${xOnexStaking.address}`);
  log('\n');
};
export default func;
func.runAtTheEnd = true;
