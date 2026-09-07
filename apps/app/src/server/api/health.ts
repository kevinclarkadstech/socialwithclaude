import { defineHandler } from "nitro";
import { serverConfig } from "../plugins/loadServerConfig";

export default defineHandler(() => {

    console.log(serverConfig.DATABASE_URL)
    return { message: "Hello Nitro!" };
});