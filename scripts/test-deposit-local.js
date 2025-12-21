// 修改后的部署脚本
const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 开始本地测试（多代币版本）...");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 代币配置
    const tokenConfigs = [
        {
            name: "MetaNode Token",
            symbol: "MNT",
            initialSupply: ethers.parseEther("1000000"), // 100万
            color: "neon"
        },
        {
            name: "Test USDC",
            symbol: "USDC",
            initialSupply: ethers.parseEther("500000"), // 50万
            decimals: 6, // 模拟真实USDC
            color: "blue"
        },
        {
            name: "Test DAI",
            symbol: "DAI",
            initialSupply: ethers.parseEther("200000"), // 20万
            color: "green"
        },
        {
            name: "Test LINK",
            symbol: "LINK",
            initialSupply: ethers.parseEther("100000"), // 10万
            color: "purple"
        }
    ];

    const deployedTokens = {};

    // 1. 部署多个测试代币
    console.log("\n1. 部署多个测试代币...");
    for (const config of tokenConfigs) {
        const Token = await ethers.getContractFactory("ERC20Mock");
        const token = await Token.deploy(
            config.name,
            config.symbol,
            deployer.address,
            config.initialSupply
        );
        await token.waitForDeployment();

        const tokenAddress = await token.getAddress();
        deployedTokens[config.symbol] = {
            address: tokenAddress,
            name: config.name,
            symbol: config.symbol,
            decimals: config.decimals || 18,
            initialSupply: config.initialSupply.toString(),
            color: config.color
        };

        console.log(`✅ ${config.symbol}: ${tokenAddress}`);

        // 如果是6位小数的代币，需要额外设置
        if (config.decimals === 6) {
            console.log(`   ⚙️  ${config.symbol} 为6位小数（模拟USDC）`);
        }
    }

    // 2. 部署质押合约（可选）
    console.log("\n2. 部署质押合约...");
    const Stake = await ethers.getContractFactory("MetaNodeStake");
    const startBlock = (await ethers.provider.getBlockNumber()) + 10;
    const endBlock = startBlock + 100000;
    const metaNodePerBlock = ethers.parseEther("0.02");

    const stakeContract = await upgrades.deployProxy(
        Stake,
        [
            deployedTokens["MNT"].address, // 使用MNT作为奖励代币
            startBlock,
            endBlock,
            metaNodePerBlock
        ],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const stakeAddress = await stakeContract.getAddress();
    console.log("质押合约地址:", stakeAddress);

    // 3. 初始化质押池
    console.log("\n3. 初始化质押池...");

    // ETH 池
    await stakeContract.addPool(
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("0.001"),
        100,
        false
    );

    // 为每个代币添加质押池（除了MNT自己）
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        if (symbol !== "MNT") {
            console.log(`添加 ${symbol} 质押池...`);
            await stakeContract.addPool(
                token.address,
                ethers.parseEther("5"), // 权重
                ethers.parseEther("10"), // 最小存款10个代币
                50, // 解锁区块
                false
            );
        }
    }

    // 4. 转入奖励代币
    console.log("\n4. 准备奖励代币...");
    const rewardAmount = ethers.parseEther("10000");
    const mntToken = await ethers.getContractAt("ERC20Mock", deployedTokens["MNT"].address);
    await mntToken.transfer(stakeAddress, rewardAmount);
    console.log("转入MNT奖励:", ethers.formatEther(rewardAmount));

    // 5. 为测试账户分配代币
    console.log("\n5. 分配测试代币...");
    const testAccounts = [
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    ];

    for (const [symbol, token] of Object.entries(deployedTokens)) {
        const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);

        for (const account of testAccounts) {
            const amount = ethers.parseEther("1000"); // 每个账户1000个
            await tokenContract.transfer(account, amount);
            console.log(`  转账 ${symbol} 1000 到 ${account.slice(0, 8)}...`);
        }
    }

    // 6. 输出最终配置
    console.log("\n🎉 部署完成！配置信息:");
    console.log("=" .repeat(50));

    console.log("\n📊 代币列表:");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        console.log(`   ${symbol}:`);
        console.log(`     地址: ${token.address}`);
        console.log(`     名称: ${token.name}`);
        console.log(`     小数: ${token.decimals}`);
        console.log(`     初始供应: ${ethers.formatEther(token.initialSupply)}`);
    }

    console.log("\n👥 测试账户余额:");
    for (const account of [deployer.address, ...testAccounts]) {
        console.log(`   ${account.slice(0, 8)}...`);
    }

    console.log("\n📋 前端配置代码:");
    console.log(`
// 复制到前端 constants/test-tokens.ts
export const HARDHAT_TOKENS = ${JSON.stringify(deployedTokens, null, 4)}
    `);

    return { deployedTokens, stakeAddress };
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});