import hre from 'hardhat';
import {bytecode} from '@exchange-one/core/build/UniswapV2Pair.json';
import {keccak256} from '@ethersproject/solidity';

async function main() {
  const {deployments} = hre;
  const {read, log} = deployments;

  const factory = await deployments.get('UniswapV2Factory');
  const router = await deployments.get('UniswapV2Router02');
  const onexToken = await deployments.get('OneX');
  const rewardsGenerator = await deployments.get('RewardsGenerator');
  const rewardsDistributor = await deployments.get('RewardsDistributor');
  const xOnexStaking = await deployments.get('XOneXStaking');

  console.log('\nUniswap Core contracts:');
  console.log('--------------------');
  console.log(`UniswapV2Factory: ${factory.address}`);
  const computedInitCodeHash = keccak256(['bytes'], [`0x${bytecode}`]);
  console.log(`Init code hash for UniswapV2Pair is: ${computedInitCodeHash}`);
  const feeTo = await read('UniswapV2Factory', 'feeTo');
  console.log(`FeeTo address for UniswapV2Factory is: ${feeTo}`);
  console.log('\n');

  console.log('\nUniswap Periphery contracts:');
  console.log('--------------------');
  console.log(`UniswapV2Router02: ${router.address}`);
  console.log('\n');

  console.log('\nToken contracts:');
  console.log('--------------------');
  console.log(`OneX token: ${onexToken.address}`);
  console.log('\n');

  console.log('\nRewards contracts:');
  console.log('--------------------');
  console.log(`Rewards Generator: ${rewardsGenerator.address}`);
  console.log(`Rewards Distributor: ${rewardsDistributor.address}`);
  console.log(`xOnexStaking: ${xOnexStaking.address}`);
  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
