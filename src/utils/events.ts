import { Adapter, MessageSegment } from "swbot";

import { ParseResult } from "swbot";

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
    public rawArgs: string;
    // 去除左右空格后的参数字符串
    public trimmedArgs: string;
    // 解析后的指令参数，如果解析错误则为空列表
    public readonly parsedArgs: ParseResult;

    // OICQ群消息事件
    public readonly rawEvent: Adapter.GroupMessageEvent;

    // 群号
    public readonly groupId: number;
    // 群名称
    public readonly groupName: string;
    // 群
    public readonly group: Adapter.Group;

    // 发送者
    public readonly sender: CommandSender;
    // 发送者（成员）
    public readonly member: Adapter.Member;


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
        this.groupName = event.group_name;
        this.group = event.group;
        this.member = event.member;
    }

    async reply (content: Adapter.Sendable, quote?: boolean) {
        return await this.rawEvent.reply(content, quote);
    }

    async replyAt (content: Adapter.Sendable, quote?: boolean) {
        if (Array.isArray(content)) return await this.rawEvent.reply([MessageSegment.At(this.sender.userId), ...content], quote);
        else return await this.rawEvent.reply([MessageSegment.At(this.sender.userId), content], quote);
    }

    async reCall () {
        return await this.rawEvent.recall();
    }

}
