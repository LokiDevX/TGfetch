const fs = require('fs');

let content = fs.readFileSync('src/components/ActivityLog.tsx', 'utf8');

// Change colors: info should be 'text-accent-blue' or something 'text-blue-400'
content = content.replace("info: 'text-white/60',", "info: 'text-blue-400',");
content = content.replace("info: <Info className=\"w-3 h-3 text-accent-cyan shrink-0\" />,", "info: <Info className=\"w-3 h-3 text-blue-400 shrink-0\" />,");

// Change auto-scroll to bottom
content = content.replace("scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })", "scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })");

// Also, the animation fade-in is nice but let's change initial x to maybe come from bottom optionally.
content = content.replace("initial={{ opacity: 0, x: 12, height: 0 }}", "initial={{ opacity: 0, x: 0, y: 12, height: 0 }}");
content = content.replace("animate={{ opacity: 1, x: 0, height: 'auto' }}", "animate={{ opacity: 1, x: 0, y: 0, height: 'auto' }}");

fs.writeFileSync('src/components/ActivityLog.tsx', content);
