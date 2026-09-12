import { defineHandler } from "nitro";
import { getServerConfig } from "../config";

export default defineHandler(() => {
    const serverConfig = getServerConfig();
    console.log(serverConfig.DATABASE_URL)
    return { message: "Hello Nitro!" };
});