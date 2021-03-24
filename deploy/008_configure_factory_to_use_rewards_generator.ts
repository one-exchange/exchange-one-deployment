import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const rewardsGenerator = await deployments.get('RewardsGenerator');

  log(`\nConfiguring UniswapV2Factory to use RewardsGenerator for feeTo ...`);
  await execute(
    'UniswapV2Factory',
    {from: deployer, log: true},
    'setFeeTo',
    rewardsGenerator.address
  );
  const feeTo = await read('UniswapV2Factory', 'feeTo');
  log(`FeeTo address for UniswapV2Factory is now ${feeTo} ...`);
};
export default func;
