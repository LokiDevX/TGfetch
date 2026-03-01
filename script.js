const fs = require('fs');
let s = fs.readFileSync('src/components/DownloadSummary.tsx', 'utf8');
s = s.replace(/\\`/g, '`');
s = s.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/DownloadSummary.tsx', s);
