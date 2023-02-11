import jsdom from "jsdom";

import * as Bot from "../index";

import { MessageSegment } from "~/src";

import puppeteer, { Page } from "puppeteer";

export type TypeOrPromise <T> = T | Promise<T>;

export namespace BrowserRender {
    export type RenderCallBack = ($: JQueryStatic, window: jsdom.DOMWindow, document: Document, page: Page) => void | Promise<void>;
    export type JSDOMCallback = ($: JQueryStatic, window: jsdom.DOMWindow, document: Document, dom: jsdom.JSDOM) => void | Promise<void>;


    export async function render (callback: RenderCallBack | string): Promise<Bot.ImageElement> {
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

    export async function createJSDOM (callback: JSDOMCallback = (...args) => {}) {
        let dom = new jsdom.JSDOM;
        let window = dom.window;
        let document = dom.window.document;
        let $ = (await import("jquery"))["default"](window) as any as JQueryStatic;
        callback($, window, document, dom);
        return {dom, window, document, $, callback};
    }
}


