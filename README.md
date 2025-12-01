# MetaNode stake contract

操作流程以及命令

## 拉取项目

```
git clone https://github.com/ProjectsTask/MetaNode-stake-contract
```

## 安装依赖

```
npm install
```

## 编译

```
npx hardhat compile
```

## 部署 MetaNode token

```
npx hardhat ignition deploy ./ignition/modules/MetaNode.js
```

部署之后在 terminal 拿到合约地址,比如: `0x264e0349deEeb6e8000D40213Daf18f8b3dF02c3`

## 部署完 MetaNode Token,拿以上地址作为 MetaNodeStake 合约的初始化参数,在 MetaNodeStake 中设置

```
const MetaNodeToken = "0x264e0349deEeb6e8000D40213Daf18f8b3dF02c3";
```

## 将 stake 合约部署到 sepolia 上

```
npx hardhat run scripts/MetaNodeStake.js --network sepolia
```


获取钱包地址
````textmate

npx hardhat console --network sepolia
> const [signer] = await ethers.getSigners();
> console.log("完整地址:", signer.address);
> .exit
````

运行这个命令检查精确余额
````textmate
npx hardhat console --network sepolia
> const [signer] = await ethers.getSigners();
> const balance = await ethers.provider.getBalance(signer.address);
> console.log("地址:", signer.address);
> console.log("精确余额:", ethers.formatEther(balance), "ETH");
> .exit
````

哈希0x6d353dde958c3e076141c14aaf90bfe0743390226e684bdba50b75776e02f714