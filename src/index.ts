import { StarWorldBot } from "./bot";
import config from "./config";

import path from "path";

export const Bot = new StarWorldBot(config);

export * from "./bot";
export * from "./utils";

export const botPath =  path.resolve(__dirname, "../");

export { default as config } from "./config";

Bot.init().then(
    i => Bot.client.logger.info("初始化完毕")
);
