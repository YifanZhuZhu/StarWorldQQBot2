import * as Bot from "swbot";
import ADMZip from "adm-zip";
import path from "path";
import fs from "fs";
import axios from "axios";
import crypto from "crypto";

import { TypeOrPromise } from "~/src";

export async function sleep (delay: number): Promise<NodeJS.Timeout> {
    return await new Promise<NodeJS.Timeout>(
        (resolve) => {
            let timeout = setTimeout(
                () => {
                    resolve(timeout);
                },
                delay
            );
        }
    );
}

export namespace Utils {

    export const commands: Command[] = [];
    export class Command {

        public name: string;
        public help?: string;
        public description?: string;
        public showInHelp?: boolean;
        public data?: any;

        public static commands: Command[] = [];

        constructor (name: string, help?: string, description?: string, showInHelp?: boolean, data?: any) {
            this.name = name;
            this.help = help;
            this.description = description;
            this.showInHelp = showInHelp;
            this.data = data;
        }

        handle (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): boolean | Promise<boolean> {
            return false;
        }
    }

    export function onCommand (name: string, help?: string, description?: string, showInHelp?: boolean, data?: any) {
        return <T extends typeof Command> (target: T) => {
            // eslint-disable-next-line new-cap
            let command = new target(name, help, description, showInHelp, data);
            commands.push(command);
            target.commands.push(command);
            Bot.Command.register(command.name, command.handle.bind(command), command.help, command.description, command.showInHelp, command.data);
            return target;
        };
    }
}

export async function zip (buffer: Buffer): Promise<Buffer> {
    let result = new ADMZip();
    result.addFile("__file__", buffer);
    return await result.toBufferPromise();
}

export async function unzip (buffer: Buffer): Promise<Buffer> {
    return new ADMZip(buffer).readFile("__file__",) as Buffer;
}

export type Encoder = (buffer: Buffer, fromURL: string, targetFile: string) => TypeOrPromise<Buffer>;


export const memoryCache: { [index: string]: Buffer } = {};
export const memoryLocalCache: { [index: string]: Buffer } = {};
export const cachePath: string = path.resolve(__dirname, "../../data/caches/");


export async function cacheStaticFile (url: string, encoder: Encoder = (buffer: Buffer) => buffer, decoder: Encoder = (buffer: Buffer) => buffer, memory = true): Promise<[string, Buffer]> {
    let md5 = generateMD5(url);
    let dir = cachePath;
    let filePath = path.join(dir, md5);
    fs.mkdirSync(dir, {recursive: true});
    if (memory && md5 in memoryCache) return [filePath, await decoder(memoryCache[md5], url, filePath)];
    if (fs.existsSync(filePath)) {
        let buffer = await decoder(fs.readFileSync(filePath), url, filePath);
        memoryCache[md5] = buffer;
        return [filePath, buffer];
    }
    else {
        let buffer = await encoder(Buffer.from((await axios.get(url, {responseType: "arraybuffer"})).data), url, filePath);
        memoryCache[md5] = buffer;
        fs.writeFileSync(filePath, buffer);
        return [filePath, buffer];
    }
}

export async function cacheStaticFileGetBuffer (url: string, encoder: Encoder = (buffer: Buffer) => buffer, decoder: Encoder = (buffer: Buffer) => buffer, memory = true): Promise<Buffer> {
    return (await cacheStaticFile(url, encoder, decoder, memory))[1];
}

export async function cacheStaticFileGetFilePath (url: string, encoder: Encoder = (buffer: Buffer) => buffer, decoder: Encoder = (buffer: Buffer) => buffer, memory=true): Promise<string> {
    return (await cacheStaticFile(url, encoder, decoder, memory))[0];
}

export function generateMD5 (content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
}

export function cacheLocalFile (path: string): Buffer {
    if (!(path in memoryLocalCache)) memoryLocalCache[path] = fs.readFileSync(path);
    return memoryLocalCache[path];
}
