import * as oicq from "oicq";
import * as esprima from "esprima";

import Bot from "../index";

import config from "../config";
import _ from "lodash";


export type Awaitable <T> = T | Promise<T>;

export type CommandExecute =
    | ((event: Bot.GroupCommandEvent, ...args: ParseResult) => Awaitable<boolean>)
    | ((event: Bot.GroupCommandEvent) => Awaitable<boolean>)
    | ((...args: [Bot.GroupCommandEvent, ...ParseResult]) => Awaitable<boolean>)
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

export type ArgumentType = ArgumentToken<string> | ArgumentSpecial<Bot.MessageElement>;

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
    export const allMessageHandlers: {name: string; handler: CommandExecute}[] = [];

    export async function * executeMessage (event: oicq.GroupMessageEvent) {
        for (let i of Command.allMessageHandlers) {
            let result = Command.parse(event);
            try {
                let commandEvent = new Bot.GroupCommandEvent(event, i.name, result);
                let executeReturnRaw = i.handler(commandEvent, ...result);
                let executeReturn = await executeReturnRaw;
                yield {command: i, result: executeReturn, event: commandEvent, rawResult: executeReturnRaw};
            } catch (e) {
                Bot.Bot.client.logger.error(`?????????????????? ${i.name}`);
                Bot.Bot.client.logger.error(e);
            }
        }
    }

    // ????????????????????????
    export function onMessage (name: string, handler: CommandExecute) {
        allMessageHandlers.push({name, handler});
    }

    export async function* execute (event: oicq.GroupMessageEvent) {
        for (let i of Command.allCommands) {
            let result = Command.parse(event, i.name.length);
            if (event.raw_message.startsWith(i.name)) {
                try {
                    let commandEvent = new Bot.GroupCommandEvent(event, i.name, result);
                    let executeReturn = await i.execute(commandEvent, ...result);
                    yield { command: i, result: executeReturn, event: commandEvent };
                    if (executeReturn) break;
                } catch (e) {
                    Bot.Bot.client.logger.error(`?????????????????? ${i.name}`);
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

    /**
     * ??????????????????
     *
     * @param name - ????????????
     * @param execute - ????????????????????????
     * @param help - ????????????
     * @param description - ??????????????????
     * @param showInHelp - ??????????????????????????????
     * @param data - ???????????????
     *
     */
    export function register (name: string, execute: CommandExecute, help?: string, description?: string, showInHelp = true, data?: any) {
        Bot?.client?.logger?.mark(`??????????????????${name}`);
        allCommands.push(
            {
                name, execute, help: help?.replaceAll("{{command}}", name), description: description?.replaceAll("{{command}}", name), showInHelp, data
            }
        );
    }

    /**
     * ??????????????????
     *
     * @param name - ????????????
     * @param help - ????????????
     * @param description - ??????????????????
     * @param showInHelp - ??????????????????????????????
     * @param data - ???????????????
     * @returns [(execute: CommandExecute) => void] ???????????????
     *
     */
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
    `${Command.commandPrefix.Normal}??????`,
    onHelp,
    [
        `${Command.commandPrefix.Normal}??????`,
        `${Command.commandPrefix.Normal}?????? [?????????]`
    ].join("\n"),
    "??????????????????"
);

export async function onHelp (event: Bot.GroupCommandEvent): Promise<boolean> {
    let result = "";
    let status = false;
    let rawArgs = event.trimmedArgs.trim();
    if (rawArgs.length <= 0) {
        result += `?????? ?????? ${Bot.config.name}\n`;
        let superCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Super));
        let debugCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Debug));
        let normalCommands = _.cloneDeep(Command.allCommands).filter(i => i.name.startsWith(Command.commandPrefix.Normal));
        let commands: Command.Command[] = [];
        if (Bot.config.superUsers.includes(event.sender.userId)) commands.push(...superCommands);
        commands.push(...debugCommands);
        commands.push(...normalCommands);
        for (let i of commands) {
            if (i.showInHelp) result += `\n${i.name}: ${i.description}`;
        }
        result += `\n\n[${Command.commandPrefix.Normal}] ???????????? | [${Command.commandPrefix.Debug}] ???????????? | [${Command.commandPrefix.Super}] ???????????????`;
        status = true;
    } else {
        for (let i of Command.allCommands) {
            if (i.name.trim() != rawArgs) continue;
            result += `${i.name}: ${i.description}\n\n${i.help}\n\n`;
        }
        if (result.trim()) status = true;
        else return false;
    }
    await event.reply(result.trim() || "?????????");
    return status;
}
