import * as oicq from "oicq";
import * as Bot from "../index";

export namespace MessageSegment {

    export const Image = oicq.segment.image;
    export const Text = (text: string): string => text;
    export const Face = oicq.segment.face;
    export const SFace = oicq.segment.sface;
    export const Share = oicq.segment.share;
    export const BFace = oicq.segment.bface;
    export const RPS = oicq.segment.rps;
    export const Dice = oicq.segment.dice;
    export const At = oicq.segment.at;
    export const Flash = oicq.segment.flash;
    export const Record = oicq.segment.record;
    export const Video = oicq.segment.video;
    export const JSON = oicq.segment.json;
    export const XML = oicq.segment.xml;
    export const Mirai = oicq.segment.mirai;
    export const Location = oicq.segment.location;
    export const Poke = oicq.segment.poke;

    export const CQCode = ("fromCqcode" in oicq.segment) ? oicq.segment["fromCqcode"] : (str: string): oicq.MessageElem[] => [];
}

export namespace BotMessage {

    export async function makeFakeGroupForward (groupId: number, context: FakeGroupForwardMessage[]) {
        let result = [];
        for (let i of context) {
            let name: string;
            try {
                name = ( await Bot.Bot.client.getGroupMemberInfo(groupId, i.user_id) ).nickname;
            } catch {
                try {
                    name = ( await Bot.Bot.client.pickUser(i.user_id).getSimpleInfo() ).nickname;
                } catch {
                    name = String(i.user_id);
                }
            }
            result.push(
                {
                    nickname: name,
                    ...i
                }
            );
        }
        return Bot.Bot.client.makeForwardMsg(result);
    }

    export interface FakeGroupForwardMessage {
        user_id: number;
        message: oicq.Sendable;
        time?: number;
        nickname?: string;
    }

    export function sendMessageSync (groupId: number, ...messages: ( string | oicq.MessageElem )[]) {
        Bot.Bot.client.sendGroupMsg(groupId, messages).then();
    }

}




