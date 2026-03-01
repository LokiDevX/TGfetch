const fs = require('fs');
let s = fs.readFileSync('src/components/ProgressBar.tsx', 'utf8');

const regex = /(function formatBytes[\s\S]*?function formatTime[\s\S]*?\})\s*/g;
s = s.replace(regex, ""); // remove all of them

// Insert exactly one copy
const helpers = `
function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`
}

`;
s = s.replace('const STATUS_CONFIG', helpers + 'const STATUS_CONFIG');

fs.writeFileSync('src/components/ProgressBar.tsx', s);
