import { StarWorldBot, StarWorldBotClient } from "./bot";
import config from "./config";

import path from "path";

export const Bot = new StarWorldBot(config);
export const Client = new StarWorldBotClient(Bot.client);

export const client = Bot.client;
export const logger = client.logger;

export * from "./bot";
export * from "./utils";

export const botPath =  path.resolve(__dirname, "../");

export { default as config } from "./config";

Bot.init().then(
    i => Bot.client.logger.info("初始化完毕")
);
