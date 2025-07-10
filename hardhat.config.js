require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

const INFURA_NODO = vars.get("INFURA_NODO"); //ESCRIBIR EN LA BLOCKCHAIN
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY"); //EL QUE PAGA EL GAS
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY"); //VERIFICAR EL CONTRATO

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: INFURA_NODO,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
};
