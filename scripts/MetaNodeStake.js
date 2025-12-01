const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("开始部署可升级的 MetaNodeStake 合约...");

    // 获取当前区块高度
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("当前区块高度:", currentBlock);

    // 部署参数
    const MetaNodeToken = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 替换为您的地址
    const startBlock = currentBlock + 10; // 10个区块后开始
    const endBlock = startBlock + (30 * 7200); // 30天，7200块/天
    const MetaNodePerBlock = "20000000000000000"; // 0.02 META per block

    console.log("部署参数:");
    console.log("- MetaNodeToken:", MetaNodeToken);
    console.log("- 开始区块:", startBlock);
    console.log("- 结束区块:", endBlock);
    console.log("- 每区块奖励:", MetaNodePerBlock);

    const Stake = await ethers.getContractFactory("MetaNodeStake");
    console.log("正在部署可升级合约...");

    const stakeContract = await upgrades.deployProxy(
        Stake,
        [MetaNodeToken, startBlock, endBlock, MetaNodePerBlock],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const contractAddress = await stakeContract.getAddress();

    console.log("✅ 可升级 MetaNodeStake 部署成功!");
    console.log("合约地址:", contractAddress);
    console.log("代理合约部署完成，未来可以升级合约逻辑");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });