// import 'dotenv/config';
// import * as fs from 'fs';
// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// type Item = {
//   question: string;
//   answer: string;
//   embedding?: number[];
// };

// const data: Item[] = JSON.parse(
//   fs.readFileSync('D:/eli5-dataset/eli5-small.json', 'utf-8')
// );
// const OUTPUT_PATH = 'D:/eli5-dataset/eli5-embedded.json';

// async function getEmbedding(text: string) {
//     const res = await openai.embeddings.create({
//       model: 'text-embedding-3-small',
//       input: text,
//     });
//     return res.data[0].embedding;
//   }
  
// async function run() {
//   let result: Item[] = [];
//   if (fs.existsSync(OUTPUT_PATH)) {
//     result = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
//   }

//   for (let i = result.length; i < 1000; i++) { 
//     try {
//         const item = data[i];
  
//         const embedding = await getEmbedding(item.question);
  
//         result.push({
//           ...item,
//           embedding,
//         });
  
//         fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  
//         console.log(`Processed ${i + 1}`);
  
//         await new Promise(r => setTimeout(r, 300));
//       } catch (err) {
//         console.log('Error at:', i);
//         break;
//       }
//   }

//   fs.writeFileSync(
//     'D:/eli5-dataset/eli5-embedded.json',
//     JSON.stringify(result, null, 2)
//   );

//   console.log('DONE');
// }

// run();