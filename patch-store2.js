const fs = require('fs');
let content = fs.readFileSync('src/store/downloadStore.ts', 'utf8');

content = content.replace("statusMessage: string\n}", "statusMessage: string\n  totalSize?: number\n  durationMs?: number\n  averageSpeed?: number\n}");

fs.writeFileSync('src/store/downloadStore.ts', content);
