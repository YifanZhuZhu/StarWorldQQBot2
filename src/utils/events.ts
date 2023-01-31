import { Adapter } from "../index";

import { ParseResult } from "../bot";

export interface CommandSender {
    userId: number;
    nickname: string;
    card: string;
    sex: Adapter.Gender;
    age: number;
    area: string;
    level: number;
    role: Adapter.GroupRole;
    title: string;
}

export class GroupCommandEvent {

    // 指令名称
    public readonly commandName: string;
    // 原参数字符串
    public readonly rawArgs: string;
    // 去除左右空格后的参数字符串
    public readonly trimmedArgs: string;
    // 解析后的指令参数，如果解析错误则为空列表
    public readonly parsedArgs: ParseResult;

    // OICQ群消息事件
    public readonly rawEvent: Adapter.GroupMessageEvent;

    // 群号
    public readonly groupId: number;
    public readonly sender: CommandSender;

    constructor (event: Adapter.GroupMessageEvent, commandName: string, commandArgs: ParseResult) {
        this.commandName = commandName;

        this.rawArgs = event.raw_message.slice(commandName.length);
        this.trimmedArgs = this.rawArgs.trim();
        this.parsedArgs = commandArgs;

        this.rawEvent = event;

        // noinspection JSDeprecatedSymbols
        this.sender = {
            userId: event.sender.user_id,
            nickname: event.sender.nickname,
            card: event.sender.card,
            sex: event.sender.sex,
            age: event.sender.age,
            area: event.sender.area,
            level: event.sender.level,
            role: event.sender.role,
            title: event.sender.title,
        };
        this.groupId = event.group_id;
    }

    async reply (content: Adapter.Sendable, quote?: boolean) {
        await this.rawEvent.reply(content, quote);
    }

}
