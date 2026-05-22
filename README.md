# 追光体 · ZGT App

> 圈层化、流程感的代购拼团 App — Expo Router + React Native Web 构建,可一份代码同时跑 iOS / Android / Web。

## 🔗 在线 Demo (公网访问)

| 环境 | 地址 |
| --- | --- |
| Web 预览 | <https://zhuiguangti.vercel.app> |
| Repo | <https://github.com/MagicalAci/zhuiguangti> |

> 已通过 Vercel 部署 · 绑定 GitHub 仓库 · push `main` 自动重新部署。

## 📁 仓库结构

```
追光体APP/
├── docs/                需求 / 流程 / 设计文档 (markdown)
└── zgt-app/             Expo Router 项目主体
    ├── app/                 路由 (file-based)
    │   ├── (tabs)/          首页 / 我的 等 tabbar 页面
    │   ├── group/[id].tsx   拼团详情页
    │   ├── group/matrix.tsx 拼团情况矩阵 (SKU × 团员)
    │   ├── orders/          团长视角订单页
    │   ├── member/          团员视角订单页
    │   └── ...
    ├── src/
    │   ├── components/      复用组件
    │   ├── store/           Zustand 状态管理 (useStore / useRole / usePrefs ...)
    │   ├── types/           类型定义
    │   └── utils/           helpers / mockData
    └── package.json
```

## 🚀 本地开发

```bash
cd zgt-app
npm install
npm run web        # http://localhost:8081
# 或
npm run ios        # 需要 Xcode
npm run android    # 需要 Android Studio / 真机
```

## 🛠 技术栈

- **Expo SDK 54** + **Expo Router 6** (file-based routing)
- **React 19 / React Native 0.81** + **React Native Web 0.21**
- **Zustand** 状态管理 (`src/store/`)
- **Linear Gradient / Reanimated / Gesture Handler** 动效
- **TypeScript 5.9**

## 🌐 部署

Vercel 自动部署:每次 push 到 `main` 分支会自动 build + 发布到生产环境。

- **Build Command**:`npx expo export --platform web`
- **Output Directory**:`dist`
- **Root Directory**:`zgt-app`

## 📝 业务说明

完整业务流程、阶段定义、订单状态机参见 [`docs/flow-sequence.md`](./docs/flow-sequence.md)。

核心阶段(团 stage):

| stage | 中文 | 含义 |
| --- | --- | --- |
| `gathering` | 凑车中 | 团员下单 / 改单 · 不收款 |
| `deposit_collecting` | 收定金 | 团长已发起收款 |
| `final_collecting` | 收尾款 | 已收定金,等补尾款 |
| `shipping` | 发货中 | 已确认收货地址,可发起补邮费 |
| `closed` | 已截团 | 本团结束 |
