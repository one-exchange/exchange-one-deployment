import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';

import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-solhint';
import '@nomiclabs/hardhat-waffle';

import 'hardhat-abi-exporter';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-spdx-license-identifier';
import 'hardhat-typechain';
import 'hardhat-watcher';
import 'solidity-coverage';
import {removeConsoleLog} from 'hardhat-preprocessor';

let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  mnemonic = 'test test test test test test test test test test test junk';
}
const mnemonicAccounts = {
  mnemonic,
};

const accounts = {
  Localnet: [String(process.env.LOCALNET_PRIVATE_KEY)],
  Testnet: [String(process.env.TESTNET_PRIVATE_KEY)],
  Mainnet: [String(process.env.MAINNET_PRIVATE_KEY)],
};

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  paths: {
    artifacts: 'artifacts',
    cache: 'cache',
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports',
    sources: 'contracts',
    tests: 'test',
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    // only: [],
    // except: []
  },
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    coverage: {
      url: 'http://localhost:5458',
      accounts: mnemonicAccounts,
    },
    hardhat: {
      accounts: mnemonicAccounts,
    },
    localhost: {
      url: 'http://localhost:8545',
      accounts: mnemonicAccounts,
    },
    localnet: {
      url: 'http://localhost:9500',
      chainId: 1666700000,
      accounts: accounts.Localnet,
    },
    testnet: {
      url: 'https://api.s0.b.hmny.io',
      chainId: 1666700000,
      accounts: accounts.Testnet,
    },
    mainnet: {
      url: 'https://api.s0.t.hmny.io',
      chainId: 1666600000,
      accounts: accounts.Mainnet,
    },
  },
  external: {
    contracts: [
      {artifacts: 'node_modules/@exchange-one/core/build'},
      {artifacts: 'node_modules/@exchange-one/periphery/build'},
    ],
    deployments: {},
  },
  mocha: {
    timeout: 20000,
  },
  preprocess: {
    eachLine: removeConsoleLog(
      (bre) =>
        bre.network.name !== 'hardhat' && bre.network.name !== 'localhost'
    ),
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts'],
      verbose: true,
    },
  },
};

export default config;
