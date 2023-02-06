<div style="text-align: center;">
<a href="https://nodejs.org" rel="nofollow">
    <img src="https://img.shields.io/badge/Node-%3E%3D19.4.0-blue" alt="node">
</a>
<a>
    <img src="https://img.shields.io/badge/License-MIT-red" alt="license">
</a>
</div>
<br/>
<h1 style="text-align: center;">StarWorld QQBot 2</h1>

安装

```shell
npm install
yarn install
```

运行
```shell
npm start
yarn start
```

配置
```typescript
// 在项目的 src 下创建config.ts，内如如下 ↓
import { StarWorldBotConfig } from "./bot";

import * as Adapter from "oicq";

import path from "path";

export const config: StarWorldBotConfig = {
    uin: 你的机器人QQ号,
    password: "你的机器人QQ密码",
    superUsers: [ ...管理员QQ号 ],
    platform: Adapter.Platform.iPad /* 登录设备，推荐 Adapter.Platform.iPad */,
    name: "机器人名称",
    pluginPathList: [
        path.resolve(__dirname, "../plugins/"),
        path.resolve(__dirname, "../core/mods/"),
        ...(你的插件路径)
    ],
    help: true /* 是否启用指令帮助，建议true */,
    helpAt: true /* 是否在@机器人时发送帮助信息，建议true */,
    defaultId: "默认物品ID前缀",
};

export default config;

```
