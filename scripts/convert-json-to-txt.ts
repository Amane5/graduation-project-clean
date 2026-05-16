import * as fs from "fs";

const data = JSON.parse(
  fs.readFileSync("eli5-small.json", "utf-8")
);

let output = "";

for (const item of data) {
  output += `Question: ${item.question}\n`;
  output += `Answer: ${item.answer}\n\n`;
}

fs.writeFileSync("data.txt", output);

console.log("✅ data.txt created");