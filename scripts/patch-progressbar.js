const fs = require('fs');

let content = fs.readFileSync('src/components/ProgressBar.tsx', 'utf8');

const replacementProps = `interface ProgressBarProps {
  percent: number
  downloaded: number
  total: number
  status: DownloadStatus
  statusMessage: string
  currentFile: string
  currentFileSize?: number
  currentFileDownloaded?: number
  speed?: number
  eta?: number
}`;

content = content.replace(/interface ProgressBarProps \{[\s\S]*?\}/, replacementProps);

const replacementDestructure = `export function ProgressBar({
  percent,
  downloaded,
  total,
  status,
  statusMessage,
  currentFile,
  currentFileSize = 0,
  currentFileDownloaded = 0,
  speed = 0,
  eta = 0,
}: ProgressBarProps): JSX.Element {`;

content = content.replace(/export function ProgressBar\(\{[\s\S]*?\}\: ProgressBarProps\): JSX\.Element \{/, replacementDestructure);

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

const STATUS_CONFIG: Record<
`;
content = content.replace(/const STATUS_CONFIG: Record</, helpers);

// Update current file text
const newCurrentFileText = `{/* ── Current file text ─────────────────────────────────────── */}
      {currentFile && isRunning && (
        <motion.div
          key={currentFile}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1 mt-1"
        >
          <div className="flex items-center gap-1.5 break-all">
            <span className="text-[12px] font-medium text-white/80 line-clamp-1">
              Downloading: {currentFile}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40 font-mono tracking-tight">
            <span>
              {formatBytes(currentFileDownloaded)} / {formatBytes(currentFileSize)}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/80">
              {formatBytes(speed)}/s
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              {formatTime(eta)} remaining
            </span>
          </div>
        </motion.div>
      )}`;

content = content.replace(/\{\/\* ── Current file text ─────────────────────────────────────── \*\/\}.*?(?=\{\/\* ── Completion animation ──────────────────────────────────── \*\/\})/s, newCurrentFileText + '\n\n      ');

fs.writeFileSync('src/components/ProgressBar.tsx', content);
console.log('Progress Bar Patched');
