const fs = require('fs');
let content = fs.readFileSync('electron/main.ts', 'utf8');

// Add totalBytes tracking
content = content.replace("let downloadedFiles = 0", "let downloadedFiles = 0\n    let totalDownloadedBytes = 0");

// Update total bytes and file processing
content = content.replace("fs.writeFileSync(filePath, buffer)", "fs.writeFileSync(filePath, buffer)\n            totalDownloadedBytes += buffer.length");

// Update appendHistory
content = content.replace("totalFiles,", "totalFiles,\n        totalDownloadedBytes,");

// Update onComplete event
const completeEventReplacement = `const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
      const averageSpeed = durationMs > 0 ? (totalDownloadedBytes / (durationMs / 1000)) : 0

      sendProgress('download:complete', {
        downloaded: downloadedFiles,
        total: totalFiles,
        errors: errorCount,
        status,
        totalSize: totalDownloadedBytes,
        durationMs,
        averageSpeed
      })`;
content = content.replace(/sendProgress\('download:complete', \{[\s\S]*?\}\)/, completeEventReplacement);

fs.writeFileSync('electron/main.ts', content);
