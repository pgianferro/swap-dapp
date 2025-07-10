// ignition/modules/SimpleSwap.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SimpleSwapModule = buildModule("SimpleSwapModule", (deployer) => {
  const tokenA = "0xd8A4f6679C57E5afe67fB495eEB7f7E1897e08ec"; 
  const tokenB = "0x0B3F610367fd1b7A85Bc83415fdB6A2674E22C0E";

  const swap = deployer.contract("SimpleSwap", [tokenA, tokenB]);

  return { swap };
});

module.exports = SimpleSwapModule;