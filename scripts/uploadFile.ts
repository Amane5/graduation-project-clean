import OpenAI from "openai";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

async function main() {
  const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID!;

  const file = await openai.files.create({
    file: fs.createReadStream("data.txt"),
    purpose: "assistants",
  });

  await openai.vectorStores.files.create(VECTOR_STORE_ID, {
    file_id: file.id,
  });

  console.log("File uploaded and linked!");
}

main();