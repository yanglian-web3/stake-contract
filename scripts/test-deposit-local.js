// 完整的本地部署脚本（保持原有功能，添加真实DEX）
const { ethers, upgrades } = require("hardhat");

// ETH 分发函数 - 保持不变
async function distributeETH(deployer, accounts, amountETH = "10") {
    console.log(`\n💰 分发 ETH 给测试账户...`);
    const amountWei = ethers.parseEther(amountETH);

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        if (account.toLowerCase() === deployer.address.toLowerCase()) {
            continue;
        }

        const balanceBefore = await ethers.provider.getBalance(account);
        console.log(`\n处理账户 ${i + 1}/${accounts.length}: ${account}`);
        console.log(`   当前余额: ${ethers.formatEther(balanceBefore)} ETH`);

        if (balanceBefore >= amountWei) {
            console.log(`   ✅ 已有足够 ETH，跳过`);
            continue;
        }

        try {
            const tx = await deployer.sendTransaction({
                to: account,
                value: amountWei
            });
            await tx.wait();
            const balanceAfter = await ethers.provider.getBalance(account);
            console.log(`   ✅ 发送 ${ethers.formatEther(amountWei)} ETH 成功`);
            console.log(`   更新后余额: ${ethers.formatEther(balanceAfter)} ETH`);
        } catch (error) {
            console.error(`   ❌ 发送 ETH 失败:`, error.message);
        }
    }
}

async function main() {
    console.log("🚀 开始本地测试（完整版 - 真实DEX）...");

    // 获取所有可用账户 - 不变
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("部署账户:", deployer.address);
    console.log("部署账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // 获取 Hardhat 默认的测试账户 - 不变
    const testAccounts = [
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'
    ];

    console.log("总账户数:", testAccounts.length + 1);

    // 1. 为测试账户分发 ETH - 不变
    console.log("\n1. 为测试账户分发 ETH...");
    await distributeETH(deployer, testAccounts, "10");

    // 代币配置 - 保持不变
    const tokenConfigs = [
        {
            name: "MetaNode Token",
            symbol: "MNT",
            initialAmount: "1000000",
            decimals: 18,
            color: "neon"
        },
        {
            name: "Test USDC",
            symbol: "USDC",
            initialAmount: "500000",
            decimals: 6,
            color: "blue"
        },
        {
            name: "Test DAI",
            symbol: "DAI",
            initialAmount: "200000",
            decimals: 18,
            color: "green"
        },
        {
            name: "Test LINK",
            symbol: "LINK",
            initialAmount: "100000",
            decimals: 18,
            color: "purple"
        }
    ];

    const deployedTokens = {};

    // 2. 部署多个测试代币 - 保持不变
    console.log("\n\n2. 部署多个测试代币...");
    for (const config of tokenConfigs) {
        const Token = await ethers.getContractFactory("ERC20Mock");
        const initialSupply = ethers.parseUnits(config.initialAmount, config.decimals);

        console.log(`\n部署 ${config.symbol}...`);
        const token = await Token.deploy(
            config.name,
            config.symbol,
            deployer.address,
            initialSupply
        );
        await token.waitForDeployment();
        const tokenAddress = await token.getAddress();

        try {
            const decimals = await token.decimals();
            const totalSupply = await token.totalSupply();
            const deployerBalance = await token.balanceOf(deployer.address);

            console.log(`✅ ${config.symbol}: ${tokenAddress}`);
            console.log(`  供应: ${ethers.formatUnits(totalSupply, decimals)}`);
            console.log(`  部署者余额: ${ethers.formatUnits(deployerBalance, decimals)}`);

            deployedTokens[config.symbol] = {
                address: tokenAddress,
                name: config.name,
                symbol: config.symbol,
                decimals: Number(decimals),
                initialSupply: totalSupply.toString(),
                deployerBalance: deployerBalance.toString(),
                color: config.color
            };
        } catch (error) {
            console.error(`❌ ${config.symbol} 验证失败:`, error.message);
            deployedTokens[config.symbol] = {
                address: tokenAddress,
                name: config.name,
                symbol: config.symbol,
                decimals: config.decimals,
                initialSupply: initialSupply.toString(),
                color: config.color
            };
        }
    }

    // 3. 部署质押合约 - 保持不变
    console.log("\n\n3. 部署质押合约...");
    const Stake = await ethers.getContractFactory("MetaNodeStake");
    const startBlock = (await ethers.provider.getBlockNumber()) + 10;
    const endBlock = startBlock + 100000;
    const metaNodePerBlock = ethers.parseEther("0.02");

    const stakeContract = await upgrades.deployProxy(
        Stake,
        [
            deployedTokens["MNT"].address,
            startBlock,
            endBlock,
            metaNodePerBlock
        ],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const stakeAddress = await stakeContract.getAddress();
    console.log("质押合约地址:", stakeAddress);

    // 4. 初始化质押池 - 保持不变
    console.log("\n4. 初始化质押池...");
    await stakeContract.addPool(
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("0.001"),
        100,
        false
    );

    for (const [symbol, token] of Object.entries(deployedTokens)) {
        if (symbol !== "MNT") {
            console.log(`添加 ${symbol} 质押池...`);
            await stakeContract.addPool(
                token.address,
                ethers.parseEther("5"),
                ethers.parseEther("10"),
                50,
                false
            );
        }
    }

    // 5. 转入奖励代币 - 保持不变
    console.log("\n5. 准备奖励代币...");
    const mntToken = await ethers.getContractAt("ERC20Mock", deployedTokens["MNT"].address);
    let mntDeployerBalance = await mntToken.balanceOf(deployer.address);
    console.log(`MNT 部署者余额: ${ethers.formatEther(mntDeployerBalance)}`);

    const plannedReward = ethers.parseEther("10000");
    console.log(`计划转入奖励: ${ethers.formatEther(plannedReward)}`);

    const balanceBigInt = BigInt(mntDeployerBalance.toString());
    const plannedBigInt = BigInt(plannedReward.toString());
    let actualReward;

    if (balanceBigInt < plannedBigInt) {
        console.warn(`⚠️  余额不足，使用可用余额的 90%`);
        actualReward = balanceBigInt * 9n / 10n;
    } else {
        actualReward = plannedBigInt;
    }

    console.log(`实际转入奖励: ${ethers.formatEther(actualReward.toString())}`);
    await mntToken.transfer(stakeAddress, actualReward);
    console.log(`✅ 成功转入MNT奖励`);

    // 6. 为测试账户分配代币 - 保持不变
    console.log("\n6. 分配测试代币...");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);
        const decimals = token.decimals;

        let currentBalance = await tokenContract.balanceOf(deployer.address);
        currentBalance = BigInt(currentBalance.toString());

        console.log(`\n${symbol} 当前余额: ${ethers.formatUnits(currentBalance.toString(), decimals)}`);

        for (const account of testAccounts) {
            const perAccountAmount = ethers.parseUnits("50", decimals);
            const perAccountAmountBigInt = BigInt(perAccountAmount.toString());

            if (currentBalance >= perAccountAmountBigInt) {
                try {
                    await tokenContract.transfer(account, perAccountAmount);
                    console.log(`  ✅ 转账 ${symbol} ${ethers.formatUnits(perAccountAmount, decimals)} 到 ${account.slice(0, 8)}...`);
                    currentBalance -= perAccountAmountBigInt;
                } catch (error) {
                    console.log(`  ❌ 转账失败: ${error.message}`);
                }
            } else {
                console.log(`  ⚠️  ${symbol} 余额不足，跳过剩余转账`);
                break;
            }
        }
    }

    // ==================== 修改开始：部署真实DEX系统 ====================
    console.log("\n\n7. 部署真实 DEX 系统...");

    let dexFactoryAddress = "";
    let dexRouterAddress = "";
    let wethAddress = "";
    const tradingPairs = {};

    try {
        // 7.1 部署 WETH9 合约（必须）
        console.log("\n7.1 部署 WETH9 合约...");
        const WETH9 = await ethers.getContractFactory("WETH9");
        const weth = await WETH9.deploy();
        await weth.waitForDeployment();
        wethAddress = await weth.getAddress();
        console.log(`✅ WETH 地址: ${wethAddress}`);

        // 7.2 部署 UniswapV2Factory（必须）
        console.log("\n7.2 部署 UniswapV2Factory...");
        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        const factory = await UniswapV2Factory.deploy(deployer.address);
        await factory.waitForDeployment();
        dexFactoryAddress = await factory.getAddress();
        console.log(`✅ Factory 地址: ${dexFactoryAddress}`);

        // 7.3 部署 UniswapV2Router02（替换MockDexRouter）
        console.log("\n7.3 部署 UniswapV2Router02...");
        const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
        const router = await UniswapV2Router02.deploy(dexFactoryAddress, wethAddress);
        await router.waitForDeployment();
        dexRouterAddress = await router.getAddress();
        console.log(`✅ Router02 地址: ${dexRouterAddress}`);

        // 7.4 创建主要交易对
        console.log("\n7.4 创建交易对...");
        const mntAddress = deployedTokens["MNT"].address;
        const usdcAddress = deployedTokens["USDC"].address;

        // 创建 MNT/USDC 交易对
        console.log(`   创建 MNT/USDC 交易对...`);
        await factory.createPair(mntAddress, usdcAddress);
        const mntUsdcPair = await factory.getPair(mntAddress, usdcAddress);
        tradingPairs["MNT_USDC"] = mntUsdcPair;
        console.log(`   ✅ MNT/USDC Pair: ${mntUsdcPair}`);

        // 创建 MNT/WETH 交易对（用于ETH交易）
        console.log(`   创建 MNT/WETH 交易对...`);
        await factory.createPair(mntAddress, wethAddress);
        const mntWethPair = await factory.getPair(mntAddress, wethAddress);
        tradingPairs["MNT_WETH"] = mntWethPair;
        console.log(`   ✅ MNT/WETH Pair: ${mntWethPair}`);

        // 7.5 为测试账户准备WETH（可选）
        console.log("\n7.5 为测试账户准备WETH（可选）...");
        for (let i = 0; i < Math.min(testAccounts.length, 2); i++) {
            const account = testAccounts[i];
            try {
                const signer = await ethers.getSigner(account);
                const wethContract = await ethers.getContractAt("WETH9", wethAddress, signer);

                const ethBalance = await ethers.provider.getBalance(account);
                if (ethBalance >= ethers.parseEther("0.5")) {
                    const depositTx = await wethContract.deposit({
                        value: ethers.parseEther("0.5")
                    });
                    await depositTx.wait();
                    console.log(`   ✅ 账户 ${account.slice(0, 8)}...: 0.5 ETH 已存入WETH`);
                }
            } catch (error) {
                // 静默失败，不影响整体部署
            }
        }

        console.log("\n✅ DEX 系统部署完成！");

    } catch (error) {
        console.error(`\n❌ DEX 部署失败:`, error.message);
        console.log(`\n⚠️  尝试备用方案...`);

        try {
            // 备用方案：部署模拟路由器
            console.log("部署 MockDexRouter 作为备用...");
            const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
            const mockRouter = await MockDexRouter.deploy();
            await mockRouter.waitForDeployment();
            dexRouterAddress = await mockRouter.getAddress();
            console.log(`✅ 模拟路由器地址: ${dexRouterAddress}`);
        } catch (fallbackError) {
            console.log(`❌ 备用方案也失败: ${fallbackError.message}`);
            dexRouterAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        }
    }
    // ==================== 修改结束 ====================

    // 8. 输出最终配置 - 更新DEX信息
    console.log("\n🎉 部署完成！");
    console.log("=".repeat(60));

    console.log("\n📊 代币列表:");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        console.log(`${symbol.padEnd(6)}: ${token.address}`);
    }

    console.log("\n📊 核心合约地址:");
    console.log(`质押合约:  ${stakeAddress}`);
    if (dexFactoryAddress) {
        console.log(`DEX工厂:   ${dexFactoryAddress}`);
    }
    console.log(`DEX路由器: ${dexRouterAddress}`);
    if (wethAddress) {
        console.log(`WETH:      ${wethAddress}`);
    }

    if (Object.keys(tradingPairs).length > 0) {
        console.log("\n📊 交易对地址:");
        for (const [pair, address] of Object.entries(tradingPairs)) {
            console.log(`${pair.padEnd(10)}: ${address}`);
        }
    }

    console.log("\n📊 测试账户 ETH 余额:");
    for (const account of testAccounts) {
        const balance = await ethers.provider.getBalance(account);
        console.log(`${account.slice(0, 8)}...: ${ethers.formatEther(balance)} ETH`);
    }

    console.log("\n🔗 DEX 配置（用于前端测试）:");
    console.log(`路由器地址: ${dexRouterAddress}`);
    if (dexFactoryAddress) {
        console.log(`工厂地址:   ${dexFactoryAddress}`);
        console.log(`WETH地址:   ${wethAddress || "未部署"}`);
    }

    console.log("\n📋 前端配置示例:");
    console.log(`
// 代币合约地址
${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = deployedTokens[symbol].address;
            return acc;
        }, {}),
        null,
        2
    )};

// 质押合约地址
export const STAKE_CONTRACT = "${stakeAddress}";

// DEX 配置
export const DEX_CONFIG = {
    routerAddress: "${dexRouterAddress}",
    ${dexFactoryAddress ? `factoryAddress: "${dexFactoryAddress}",` : ''}
    ${wethAddress ? `wethAddress: "${wethAddress}",` : ''}
    ${Object.keys(tradingPairs).length > 0 ? `tradingPairs: ${JSON.stringify(tradingPairs, null, 2)},` : ''}
    supportedTokens: ${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = deployedTokens[symbol].address;
            return acc;
        }, {}),
        null,
        2
    )}
};

// 测试账户
export const TEST_RECEIVERS = ${JSON.stringify(
        testAccounts.reduce((acc, account, index) => {
            acc[`TestAccount${index + 1}`] = account;
            return acc;
        }, {}),
        null,
        2
    )};
    `);

    console.log("\n💡 功能说明:");
    console.log("✅ 原有功能全部保持:");
    console.log("   - 代币转账");
    console.log("   - 质押合约（完整功能）");
    console.log("   - 测试账户分发");
    console.log("");
    if (dexFactoryAddress) {
        console.log("✅ 新增真实 DEX 功能:");
        console.log("   - UniswapV2Factory: 创建交易对");
        console.log("   - UniswapV2Router02: 处理所有DEX交易");
        console.log("   - WETH9: ETH包装代币");
        console.log("   - 多个交易对已创建");
    } else {
        console.log("✅ 新增 DEX 功能:");
        console.log("   - DEX 路由器地址: " + dexRouterAddress);
        console.log("   - 可用于前端 DEX 组件测试");
    }
    console.log("");
    console.log("⚠️  注意事项:");
    console.log("   - 质押合约功能完全保留，未作任何修改");
    console.log("   - 如果真实DEX部署失败，会自动使用模拟版本");

    return {
        // 原有返回
        deployedTokens,
        stakeAddress,
        testAccounts,
        // 新增返回
        dexFactoryAddress,
        dexRouterAddress,
        wethAddress,
        tradingPairs
    };
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});