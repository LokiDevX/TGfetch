const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const replacement = `  // ── Register IPC download listeners ──────────────────────────────────────
  useEffect(() => {
    const activeFiles = new Map<string, { downloaded: number; total: number }>();
    let lastTotalBytes = 0;

    const speedInterval = setInterval(() => {
      let currentTotalBytes = 0;
      let currentTotalSize = 0;
      activeFiles.forEach(({ downloaded, total }) => {
        currentTotalBytes += downloaded;
        currentTotalSize += total;
      });

      const diff = currentTotalBytes - lastTotalBytes;
      if (lastTotalBytes !== 0 && diff >= 0) {
        const speed = diff; // bytes per second
        
        // Calculate ETA based on remaining bytes of currently active files
        const remainingBytes = currentTotalSize - currentTotalBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        useDownloadStore.getState().setProgress({ speed, eta });
      }
      lastTotalBytes = currentTotalBytes;
    }, 1000);

    const unsubStatus = window.tgfetch.download.onStatus(({ status, message }) => {
      if (status) setProgress({ status: status as DownloadStatus });
      if (message) {
        setProgress({ statusMessage: message });
        addLog({ type: 'info', message });
      }
    });

    const unsubTotal = window.tgfetch.download.onTotal(({ total }) => {
      setProgress({ total });
      addLog({ type: 'info', message: \`Found \${total.toLocaleString()} media files.\` });
    });

    const unsubFileStart = window.tgfetch.download.onFileStart(({ fileName }) => {
      activeFiles.set(fileName, { downloaded: 0, total: 0 });
      setProgress({ currentFile: fileName, currentFilePercent: 0, currentFileDownloaded: 0, currentFileSize: 0 });
    });

    const unsubFileProgress = window.tgfetch.download.onFileProgress(({ fileName, percent, downloadedBytes, totalBytes }) => {
      activeFiles.set(fileName, { downloaded: downloadedBytes, total: totalBytes });
      setProgress({ 
        currentFile: fileName,
        currentFilePercent: percent,
        currentFileDownloaded: downloadedBytes,
        currentFileSize: totalBytes
      });
    });

    const unsubFileComplete = window.tgfetch.download.onFileComplete(({ fileName, downloaded, total, percent }) => {
      activeFiles.delete(fileName);
      setProgress({ downloaded, percent, currentFile: '' });
      addLog({ type: 'success', fileName, message: \`Downloaded successfully\` });
      void total; // suppress unused warning
    });

    const unsubFileError = window.tgfetch.download.onFileError(({ fileName, error }) => {
      activeFiles.delete(fileName);
      addLog({ type: 'error', fileName, message: error });
    });

    const unsubComplete = window.tgfetch.download.onComplete(({ downloaded, total, errors, status }) => {
      activeFiles.clear();
      lastTotalBytes = 0;
      setProgress({ status: status as DownloadStatus, downloaded, total, percent: 100, statusMessage: '' });
      if (status === 'completed') {
        toast.success(\`Downloaded \${downloaded.toLocaleString()} files successfully!\`);
        addLog({ type: 'success', message: \`All \${downloaded.toLocaleString()} files downloaded!\` });
      } else {
        toast(
          \`Finished with \${errors} error\${errors !== 1 ? 's' : ''}. \${downloaded} / \${total} downloaded.\`,
          { icon: '⚠️' }
        );
      }
    });

    const unsubError = window.tgfetch.download.onError(({ error }) => {
      activeFiles.clear();
      lastTotalBytes = 0;
      setProgress({ status: 'error', statusMessage: error });
      toast.error(\`Download failed: \${error}\`);
      addLog({ type: 'error', message: \`Download failed: \${error}\` });
    });

    return () => {
      clearInterval(speedInterval);
      unsubStatus();`;

const newContent = content.replace(/\/\/ ── Register IPC download listeners(.*?)(?=unsubStatus\(\))/s, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', newContent);
console.log('Patched');
