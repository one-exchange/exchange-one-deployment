import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const feeToSetter = deployer;

  const factory = await deployments.getOrNull('UniswapV2Factory');
  if (!factory) {
    await deploy('UniswapV2Factory', {
      args: [feeToSetter],
      from: deployer,
      log: true,
    });
  }
};
export default func;
