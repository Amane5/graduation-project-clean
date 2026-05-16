// import * as fs from 'fs';
// import * as readline from 'readline';

// async function extractSubset() {
//   const input = fs.createReadStream('D:/eli5-dataset/ELI5.jsonl');

//   const rl = readline.createInterface({
//     input,
//     crlfDelay: Infinity,
//   });

//   const output: any[] = [];
//   let count = 0;
//   const LIMIT = 10000;

//   for await (const line of rl) {
//     if (!line.trim()) continue;

//     const parsed = JSON.parse(line);

//     let answer = '';

//     const raw = parsed.answers?.text || parsed.answers;

//     if (Array.isArray(raw)) {
//       answer = raw[0]; 
//     } else if (typeof raw === 'string') {
//       answer = raw; 
//     } else if (Array.isArray(parsed.answers)) {
//       answer = parsed.answers[0]?.text || '';
//     }

//     output.push({
//       question: parsed.title || parsed.question,
//       answer: answer,
//     });

//     if (count < 5) {
//       console.log('Q:', parsed.title || parsed.question);
//       console.log('A:', answer);
//       console.log('------------------------');
//     }

//     count++;

//     if (count >= LIMIT) break;
//   }

//   fs.writeFileSync(
//     'D:/eli5-dataset/eli5-small.json',
//     JSON.stringify(output, null, 2)
//   );

//   console.log(' Done:', count);
// }

// extractSubset();