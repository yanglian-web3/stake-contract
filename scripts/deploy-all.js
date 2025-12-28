// 一键部署入口

// #!/usr/bin/env node

const main = require("./deploy/main");

async function runDeployment() {
    console.log("=".repeat(60));
    console.log("🚀 Web3 项目一键部署");
    console.log("包含: 质押系统 + DEX 系统");
    console.log("=".repeat(60));

    try {
        const startTime = Date.now();

        // 运行部署
        const result = await main();

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log("\n" + "=".repeat(60));
        console.log(`✅ 部署成功完成！耗时: ${duration.toFixed(2)} 秒`);
        console.log("=".repeat(60));

        console.log("\n📋 快速开始:");
        console.log("1. 启动前端: npm run dev");
        console.log("2. 访问质押页面: /stake");
        console.log("3. 访问 DEX 页面: /dex-swap");
        console.log("4. 使用测试账户进行测试");

        process.exit(0);

    } catch (error) {
        console.error("\n❌ 部署失败:", error.message);
        console.log("\n💡 排查建议:");
        console.log("1. 确保 Hardhat 节点正在运行");
        console.log("2. 检查合约代码是否有编译错误");
        console.log("3. 查看详细错误信息");

        process.exit(1);
    }
}

runDeployment();