const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!content.includes('import { DownloadSummary }')) {
  content = content.replace("import { ProgressBar } from '../components/ProgressBar'", "import { ProgressBar } from '../components/ProgressBar'\nimport { DownloadSummary } from '../components/DownloadSummary'");
}

const progressReplace = `{/* ── Progress card (visible when not idle) ────────────────────── */}
      {progress.status !== 'idle' && progress.status !== 'completed' && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-card border border-white/10 rounded-2xl p-5"
        >
          <ProgressBar
            percent={progress.percent}
            downloaded={progress.downloaded}
            total={progress.total}
            status={progress.status}
            statusMessage={progress.statusMessage}
            currentFile={progress.currentFile}
            currentFileSize={progress.currentFileSize}
            currentFileDownloaded={progress.currentFileDownloaded}
            speed={progress.speed}
            eta={progress.eta}
          />
        </motion.section>
      )}

      {/* ── Summary Card ──────────────────────────────────────────────── */}
      {progress.status === 'completed' && (
        <DownloadSummary
          totalFiles={progress.total}
          totalSize={progress.totalSize}
          durationMs={progress.durationMs}
          averageSpeed={progress.averageSpeed}
          onDismiss={() => setProgress({ status: 'idle' })}
        />
      )}`;

content = content.replace(/\{\/\* ── Progress card \(visible when not idle\) ────────────────────── \*\/\}(.|\n)*?(?=\{\/\* ── Primary action button ─────────────────────────────────────── \*\/)/, progressReplace + '\n\n      ');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
