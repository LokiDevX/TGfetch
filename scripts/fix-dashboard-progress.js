const fs = require('fs');
let s = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
s = s.replace("onDismiss={() => setProgress({ status: 'idle' })}", "onDismiss={() => useDownloadStore.getState().setProgress({ status: 'idle' })}");
fs.writeFileSync('src/pages/Dashboard.tsx', s);
