import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";
import "@nomicfoundation/hardhat-ethers";
import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
    // rskMainnet: {
    //   url: `${process.env.RSK_MAINNET_RPC_URL}/${process.env.ROOTSTOCK_MAINNET_PRIVATE_KEY}`,
    //   chainId: 30,
    //   gasPrice: 60000000,
    //   accounts: [`${process.env.ROOTSTOCK_MAINNET_PRIVATE_KEY}`]
    // },
    // rskTestnet: {
    //   url: `${process.env.RSK_TESTNET_RPC_URL}/${process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY}`,
    //   chainId: 31,
    //   gasPrice: 60000000,
    //   accounts: [`${process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY}`]
    // }
  },
  defaultNetwork: 'localhost',
};

export default config;
