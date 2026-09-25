import { defineHandler } from "nitro";
import { serverConfig } from "../config";

export default defineHandler(() => {
    console.log(serverConfig.DATABASE_URL)
    return { message: "Hello Nitro!" };
});