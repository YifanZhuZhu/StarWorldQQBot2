import * as oicq from "oicq";
import * as esprima from "esprima";
import * as api from "../utils";

import * as Bot from "../index";

import config from "../config";

import _ from "lodash";

export type Awaitable<T> = T | Promise<T>;

export type CommandExecute =
    | ((event: api.GroupCommandEvent, ...args: ParseResult) => Awaitable<boolean>)
    | ((event: api.GroupCommandEvent) => Awaitable<boolean>)
    | ((...args: [api.GroupCommandEvent, ...ParseResult]) => Awaitable<boolean>)
    | (() => Awaitable<boolean>);

export interface Token<V> {
    type: V;
    value: string;
}

export interface ArgumentStruct<V, T = string> {
    type: T;
    value: V
}

export interface ArgumentToken <T> extends ArgumentStruct<Token<T>> {
    type: "Token",
}
export interface ArgumentSpecial <T> extends ArgumentStruct<T> {
    type: "Special",
}

export type ArgumentType = ArgumentToken<string> | ArgumentSpecial<Bot.Element>;

export type ParseResult = ArgumentType[];


export class CommandParser {

    public raw: oicq.GroupMessageEvent;

    constructor (raw: oicq.GroupMessageEvent) {
        this.raw = raw;
    }

    parse (offset = 0): ParseResult {
        let result: ParseResult = [];
        let index = 0;
        for (let i of this.raw.message) {
            if (i.type === "text") {
                if (index == 0) this.token(i, result, offset);
                else this.token(i, result);
            } else {
                this.code(i, result);
            }
            index ++;
        }
        return result;
    }

    token (msg: oicq.MessageElem, result: ParseResult, offset = 0) {
        if (msg.type !== "text") return;
        let tokenGroup = esprima.tokenize(msg.text.slice(offset));
        for (let token of tokenGroup) {
            result.push(
                {
                    type: "Token",
                    value: token
                }
            );
        }
    }

    code (msg: oicq.MessageElem, result: ParseResult) {
        result.push(
            {
                type: "Special", value: msg
            }
        );
    }
}

export namespace Command {

    export interface Command {
        help?: string;
        description?: string;
        name: string;
        execute: CommandExecute;
        showInHelp: boolean;
        data?: any;
    }

    export const commandPrefix = {
        Normal: "!",
        Super: "&",
        Debug: "%",
    };

    export const allCommands: Command[] = [];
    export const allMessageHandlers: CommandExecute[] = [];

    export async function * executeMessage (event: oicq.GroupMessageEvent) {
        for (let i of Command.allMessageHandlers) {
            let result = Command.parse(event);
            try {
                let commandEvent = new api.GroupCommandEvent(event, i.name, result);
                let executeReturn = await i(commandEvent, ...result);
                yield {command: i, result: executeReturn, event: commandEvent};
            } catch (e) {
                Bot.Bot.client.logger.error(`消息处理识别 ${i.name}`);
                Bot.Bot.client.logger.error(e);
            }
        }
    }

    export function onMessage (handler: CommandExecute) {
        allMessageHandlers.push(handler);
    }

    export async function* execute (event: oicq.GroupMessageEvent) {
        for (let i of Command.allCommands) {
            let result = Command.parse(event, i.name.length);
            if (event.raw_message.startsWith(i.name)) {
                try {
                    let commandEvent = new api.GroupCommandEvent(event, i.name, result);
                    let executeReturn = await i.execute(commandEvent, ...result);
                    yield { command: i, result: executeReturn, event: commandEvent };
                    if (executeReturn) break;
                } catch (e) {
                    Bot.Bot.client.logger.error(`命令执行失败 ${i.name}`);
                    Bot.Bot.client.logger.error(e);
                }
            }
        }
    }

    export function parse (event: oicq.GroupMessageEvent, offset = 0) {
        try {
            return new CommandParser(event).parse(offset);
        } catch {
            return [];
        }
    }

    export function register (name: string, execute: CommandExecute, help?: string, description?: string, showInHelp = true, data?: any) {
        allCommands.push(
            {
                name, execute, help, description, showInHelp, data
            }
        );
    }

    export function registerTemplate (name: string, help?: string, description?: string, showInHelp = true, data?: any) {
        return (execute: CommandExecute) => {
            allCommands.push(
                {
                    name, execute, help, description, showInHelp, data
                }
            );
            return execute;
        };
    }

}

export default Command;

if (config.help) Command.register(
    `${Command.commandPrefix.Normal}帮助`,
    onHelp,
    [
        `${Command.commandPrefix.Normal}帮助`,
        `${Command.commandPrefix.Normal}帮助 [指令名]`
    ].join("\n"),
    "查询指令信息"
);

export async function onHelp (event: Bot.GroupCommandEvent): Promise<boolean> {
    let result = "";
    let status = false;
    let rawArgs = event.trimmedArgs;
    if (rawArgs.length <= 0) {
        result += `帮助 —— ${Bot.config.name}\n`;
        let superCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Super));
        let debugCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Debug));
        let normalCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Normal));
        let commands = [...superCommands, ...debugCommands, ...normalCommands];
        for (let i of commands) {
            if (i.showInHelp) result += `\n${i.name}: ${i.description}`;
        }
        result += `\n\n[${Command.commandPrefix.Normal}] 普通指令 | [${Command.commandPrefix.Debug}] 调试指令 | [${Command.commandPrefix.Super}] 管理员指令`;
        status = true;
    } else {
        for (let i of Command.allCommands) {
            if (i.name.trim() != rawArgs) continue;
            result += `${i.name}: ${i.description}\n\n${i.help}\n\n`;
        }
        if (result.trim()) status = true;
        else return false;
    }
    await event.reply(result.trim() || "无结果");
    return status;
}
