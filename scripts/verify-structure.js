// # 在项目根目录创建验证脚本
// cat > scripts/verify-structure.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log("📁 验证合约目录结构...\n");

const requiredFiles = [
    'contracts/WETH9.sol',
    'contracts/SimplePriceOracle.sol',
    'contracts/DexFactory.sol',
    'contracts/mocks/ERC20Mock.sol',
    'contracts/mocks/MockDexRouter.sol'
];

let allExist = true;

requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allExist = false;
});

console.log("\n" + (allExist ? "✅ 所有必需文件都存在！" : "❌ 缺少一些文件"));
console.log("\n运行以下命令编译合约：");
console.log("npx hardhat compile");
// EOF

// # 运行验证
// node scripts/verify-structure.js