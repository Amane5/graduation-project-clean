import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function main() {
    const vs= openai.vectorStores.create({
        name:"kids-data"
    })

  console.log("VECTOR STORE ID:");
  console.log((await vs).id);
}
main()