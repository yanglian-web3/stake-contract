// scripts/dex/test-simple-dex.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 测试 SimpleDEX\n");

    // 加载配置
    const config = require("../../simple-dex-config.json");

    const [user] = await ethers.getSigners();
    console.log(`测试账户: ${user.address}`);

    // 加载合约
    const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
    const dex = SimpleDEX.attach(config.simpleDex);

    // 加载代币合约
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const tokenA = SimpleToken.attach(config.tokens[0].address);
    const tokenB = SimpleToken.attach(config.tokens[1].address);

    console.log("📋 DEX 信息:");
    console.log(`   DEX 地址: ${config.simpleDex}`);
    console.log(`   Token A: ${await tokenA.symbol()} (${tokenA.target})`);
    console.log(`   Token B: ${await tokenB.symbol()} (${tokenB.target})`);

    // 1. 检查余额
    console.log("\n1. 账户余额:");
    const balanceA = await tokenA.balanceOf(user.address);
    const balanceB = await tokenB.balanceOf(user.address);

    console.log(`   ${await tokenA.symbol()}: ${ethers.formatEther(balanceA)}`);
    console.log(`   ${await tokenB.symbol()}: ${ethers.formatUnits(balanceB, 6)}`);

    // 2. 检查流动性池
    console.log("\n2. 流动性池状态:");
    const [reserveA, reserveB] = await dex.getReserves();
    const price = await dex.getPrice();
    const priceNum = Number(ethers.formatUnits(price, 6));

    console.log(`   ${await tokenA.symbol()} 储备: ${ethers.formatEther(reserveA)}`);
    console.log(`   ${await tokenB.symbol()} 储备: ${ethers.formatUnits(reserveB, 6)}`);
    console.log(`   当前价格: 1 ${await tokenA.symbol()} = ${priceNum.toFixed(6)} ${await tokenB.symbol()}`);

    // 3. 测试价格计算
    console.log("\n3. 价格计算测试:");

    // A -> B
    console.log(`   ${await tokenA.symbol()} -> ${await tokenB.symbol()}:`);
    const amountsToTest = [
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("5")
    ];

    for (const amount of amountsToTest) {
        try {
            const amountOut = await dex.getAmountOut(amount, tokenA.target);
            console.log(`     ${ethers.formatEther(amount)} ${await tokenA.symbol()} → ${ethers.formatUnits(amountOut, 6)} ${await tokenB.symbol()}`);
        } catch (error) {
            console.log(`     ${ethers.formatEther(amount)} ${await tokenA.symbol()}: ${error.message}`);
        }
    }

    // B -> A
    console.log(`\n   ${await tokenB.symbol()} -> ${await tokenA.symbol()}:`);
    const amountsToTestB = [
        ethers.parseUnits("0.1", 6),
        ethers.parseUnits("1", 6),
        ethers.parseUnits("5", 6)
    ];

    for (const amount of amountsToTestB) {
        try {
            const amountOut = await dex.getAmountOut(amount, tokenB.target);
            console.log(`     ${ethers.formatUnits(amount, 6)} ${await tokenB.symbol()} → ${ethers.formatEther(amountOut)} ${await tokenA.symbol()}`);
        } catch (error) {
            console.log(`     ${ethers.formatUnits(amount, 6)} ${await tokenB.symbol()}: ${error.message}`);
        }
    }

    // 4. 测试代币兑换
    console.log("\n4. 测试代币兑换:");

    if (balanceA > ethers.parseEther("0.5")) {
        console.log(`   测试 ${await tokenA.symbol()} → ${await tokenB.symbol()} 兑换...`);

        const swapAmount = ethers.parseEther("0.5");
        const minAmountOut = 0; // 为了测试，设置为0

        try {
            // 兑换前余额
            const beforeBalanceA = await tokenA.balanceOf(user.address);
            const beforeBalanceB = await tokenB.balanceOf(user.address);

            // 检查授权
            const allowance = await tokenA.allowance(user.address, dex.target);
            if (allowance < swapAmount) {
                console.log("   正在授权代币...");
                const approveTx = await tokenA.approve(dex.target, swapAmount);
                await approveTx.wait();
            }

            // 执行兑换
            console.log("   执行兑换...");
            const swapTx = await dex.swap(swapAmount, tokenA.target, minAmountOut);
            await swapTx.wait();

            // 兑换后余额
            const afterBalanceA = await tokenA.balanceOf(user.address);
            const afterBalanceB = await tokenB.balanceOf(user.address);

            const spent = Number(ethers.formatEther(beforeBalanceA - afterBalanceA));
            const received = Number(ethers.formatUnits(afterBalanceB - beforeBalanceB, 6));

            console.log(`   ✅ 兑换成功！`);
            console.log(`     花费: ${spent.toFixed(6)} ${await tokenA.symbol()}`);
            console.log(`     收到: ${received.toFixed(6)} ${await tokenB.symbol()}`);
            console.log(`     实际汇率: 1 ${await tokenA.symbol()} = ${(received / spent).toFixed(6)} ${await tokenB.symbol()}`);
            console.log(`     交易哈希: ${swapTx.hash}`);

        } catch (error) {
            console.log(`   ❌ 兑换失败: ${error.message}`);
        }
    } else {
        console.log(`   ⚠️  ${await tokenA.symbol()} 余额不足，跳过兑换测试`);
    }

    // 5. 测试添加流动性
    console.log("\n5. 测试添加流动性:");

    if (balanceA > ethers.parseEther("10") && balanceB > ethers.parseUnits("5", 6)) {
        console.log("   添加额外流动性...");

        const addAmountA = ethers.parseEther("10");
        const addAmountB = ethers.parseUnits("5", 6);

        try {
            // 检查授权
            const allowanceA = await tokenA.allowance(user.address, dex.target);
            const allowanceB = await tokenB.allowance(user.address, dex.target);

            if (allowanceA < addAmountA) {
                console.log("   正在授权 Token A...");
                await tokenA.approve(dex.target, addAmountA);
            }
            if (allowanceB < addAmountB) {
                console.log("   正在授权 Token B...");
                await tokenB.approve(dex.target, addAmountB);
            }

            // 等待授权确认
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 添加流动性
            console.log("   添加流动性...");
            const addTx = await dex.addLiquidity(addAmountA, addAmountB);
            await addTx.wait();

            console.log(`   ✅ 流动性添加成功！`);
            console.log(`     添加 ${ethers.formatEther(addAmountA)} ${await tokenA.symbol()}`);
            console.log(`     添加 ${ethers.formatUnits(addAmountB, 6)} ${await tokenB.symbol()}`);
            console.log(`     交易哈希: ${addTx.hash}`);

            // 更新储备量显示
            const [newReserveA, newReserveB] = await dex.getReserves();
            const newPrice = await dex.getPrice();
            const newPriceNum = Number(ethers.formatUnits(newPrice, 6));

            console.log(`\n   📊 更新后的流动性池:`);
            console.log(`     ${await tokenA.symbol()} 储备: ${ethers.formatEther(newReserveA)}`);
            console.log(`     ${await tokenB.symbol()} 储备: ${ethers.formatUnits(newReserveB, 6)}`);
            console.log(`     新价格: 1 ${await tokenA.symbol()} = ${newPriceNum.toFixed(6)} ${await tokenB.symbol()}`);

        } catch (error) {
            console.log(`   ❌ 添加流动性失败: ${error.message}`);
        }
    } else {
        console.log("   ⚠️  余额不足，跳过添加流动性测试");
    }

    console.log("\n🎉 SimpleDEX 测试完成！");
}

main().catch(console.error);