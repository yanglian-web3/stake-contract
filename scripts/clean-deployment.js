// scripts/clean-deployment.js
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🧹 清理部署配置...");

    const configDir = 'deployed-configs';

    if (fs.existsSync(configDir)) {
        // 删除所有配置文件
        const files = fs.readdirSync(configDir);

        console.log(`找到 ${files.length} 个配置文件:`);
        for (const file of files) {
            const filePath = path.join(configDir, file);
            fs.unlinkSync(filePath);
            console.log(`  已删除: ${file}`);
        }

        // 删除目录
        fs.rmdirSync(configDir);
        console.log(`✅ 已删除目录: ${configDir}`);
    } else {
        console.log(`⚠️  目录 ${configDir} 不存在`);
    }

    console.log("\n现在可以重新运行部署:");
    console.log("  npm run deploy:all");
    console.log("  或分步部署:");
    console.log("  npm run deploy:tokens");
    console.log("  npm run deploy:stake");
    console.log("  npm run deploy:dex");
}

main().catch(console.error);