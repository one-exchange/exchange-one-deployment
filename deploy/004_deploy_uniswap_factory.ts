import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {bytecode} from '@exchange-one/core/build/UniswapV2Pair.json';
import {keccak256} from '@ethersproject/solidity';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const feeToSetter = deployer;

  const computedInitCodeHash = keccak256(['bytes'], [`0x${bytecode}`]);
  log(`Init code hash for UniswapV2Pair is: ${computedInitCodeHash}`);

  const factory = await deployments.getOrNull('UniswapV2Factory');
  if (!factory) {
    await deploy('UniswapV2Factory', {
      args: [feeToSetter],
      from: deployer,
      log: true,
    });
  }
};
func.tags = ['Uniswap'];
export default func;
