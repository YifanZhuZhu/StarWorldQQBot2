import Command from "./command";

import * as BotAdapter from "oicq";

import path from "path";
import fs from "fs";

export interface StarWorldBotConfig {
    uin: number;
    password?: string;
    superUsers: number[];
    platform: BotAdapter.Platform;
    name: string;
    pluginPathList: string[];
    help: boolean;
}

export class StarWorldBot {

    public config: StarWorldBotConfig;
    public client: BotAdapter.Client;

    public plugins: typeof module[] = [];

    constructor (config: StarWorldBotConfig) {
        let that = this;
        this.config = config;
        this.client = new BotAdapter.Client(
            this.config.uin, {
                data_dir: path.resolve(__dirname, "../../data/bot"),
                platform: this.config.platform,
            }
        );
        this.client.login(this.config.password).then(this.onBeforeLogin.bind(this));
        this.client.on(
            "system.online", this.onLogin.bind(this)
        ).on(
            "system.offline", this.onOffline.bind(this)
        ).on(
            "message.group", this.onCommandGroup.bind(this)
        ).on(
            "system.login.qrcode", this.onQrCodeLogin.bind(this)
        ).on(
            "system.login.slider", this.onSliderLogin.bind(this)
        ).on("system.login.device", this.onDeviceLogin.bind(this));
    }

    public onSliderLogin () {
        let that = this;
        process.stdin.on(
            "data", (data: Buffer) => {
                process.stdin.pause();
                that.client.submitSlider(data.toString().trim());
            }
        );
    }

    public onQrCodeLogin () {
        let that = this;
        process.stdin.once("data", () => that.client.login());
    }

    public onDeviceLogin () {
        this.client.sendSmsCode();
    }

    public async onOffline () {
        this.client.logger.info("机器人已下线");
    }

    public async onBeforeLogin () {
        this.client.logger.info("登录中");
        await this.loadPlugins();
    }

    public async loadPlugins () {
        for (let i of this.config.pluginPathList) {
            await this.loadPluginsFromDirectory(i);
        }

    }

    public async loadPluginsFromDirectory(dirname: string): Promise<void> {
        this.client.logger.info("正在加载插件");
        let plugins = fs.readdirSync(path.resolve(__dirname, dirname));
        for (let _path of plugins) {
            let i = path.resolve(__dirname, dirname, _path);
            try {
                require(i);
                let result = [];
                for (let j of module.children) {
                    let modulePath = path.resolve(j.path, j.filename);
                    if (modulePath == require.resolve(i)) {
                        result.push(j);
                    }
                }
                this.plugins.push(...result);
                this.client.logger.info("插件加载成功: " + i);
            } catch (e) {
                this.client.logger.error(e);
                this.client.logger.error("加载失败: " + i);
            }
        }
    }

    public async onLogin () {
        this.client.logger.info("登录成功");
        return;
    }

    public async onCommandGroup (event: BotAdapter.GroupMessageEvent) {
        for await (let i of Command.execute(event)) {
            this.client.logger.info(
                `用户 ${event.sender.nickname} (${event.sender.user_id}) 执行了指令 ${i.result ? "" : "(未生效) "}${i.command.name} 参数 ${i.event.trimmedArgs}`
            );
        }
        return;
    }

}


export * from "./adapter";
export * from "./command";

export * as Adapter from "oicq";
