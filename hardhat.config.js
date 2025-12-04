require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      nativeCurrency: {
        name: "Hardhat Ether",
        symbol: "HETH", // 改为 HETH 而不是 ETH
        decimals: 18
      },
    },
    sepolia: {
      url:
        // "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
        "https://sepolia.infura.io/v3/" + process.env.INFURA_API_KEY,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 30000000000, // 30 Gwei
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
