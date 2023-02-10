import { Adapter } from "swbot";

export class StarWorldBotClient {

    public readonly client: Adapter.Client;

    constructor (client: Adapter.Client) {
        this.client = client;
    }

    getFriends () { return Array.from(this.client.getFriendList().values()); }
    getGroups () { return Array.from(this.client.getGroupList().values()); }
    getStrengths () { return Array.from(this.client.getStrangerList().values()); }

}
