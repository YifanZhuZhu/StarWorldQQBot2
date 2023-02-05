import jsdom from "jsdom";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import ADMZip from "adm-zip";

import * as Bot from "../index";

import { MessageSegment } from "./message";

import puppeteer, { Page } from "puppeteer";
import axios from "axios";

export type TypeOrPromise <T> = T | Promise<T>;

export namespace BrowserRender {
    export type RenderCallBack = ($: JQueryStatic, window: jsdom.DOMWindow, document: Document, page: Page) => void | Promise<void>;
    export async function render (callback: RenderCallBack | string): Promise<Bot.Elements.ImageElement> {
        return MessageSegment.Image(await renderAsBuffer(callback));
    }
    export async function renderAsBuffer (callback: RenderCallBack | string): Promise<Buffer> {
        let dom = new jsdom.JSDOM;
        let window = dom.window;
        let document = dom.window.document;
        let $ = (await import("jquery"))["default"](window) as any as JQueryStatic;
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        if (typeof callback == "string") {
            await page.evaluate(callback);
        } else {
            await callback($, window, document, page);
        }
        await page.setContent($(document.body).prop("outerHTML"));
        let screenShot = await page.screenshot();
        await page.close();
        await browser.close();
        return screenShot as Buffer;
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
    fs.mkdirSync(dir,{recursive: true});
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
