const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MetaNodeStakeModule", (m) => {
    const metaNodeStake = m.contract("MetaNodeStake");

    return { metaNodeStake };
});