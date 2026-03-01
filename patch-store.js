const fs = require('fs');
let content = fs.readFileSync('src/store/downloadStore.ts', 'utf8');

const interfaceReplacement = `export interface DownloadProgress {
  total: number
  downloaded: number
  currentFile: string
  currentFilePercent: number
  currentFileSize: number
  currentFileDownloaded: number
  speed: number
  eta: number
  percent: number
  status: DownloadStatus
  statusMessage: string
  
  // Summary stats
  totalSize?: number
  durationMs?: number
  averageSpeed?: number
}`;

content = content.replace(/export interface DownloadProgress \{[\s\S]*?statusMessage: string\n\}/, interfaceReplacement);

fs.writeFileSync('src/store/downloadStore.ts', content);
