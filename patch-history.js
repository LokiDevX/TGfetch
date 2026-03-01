const fs = require('fs');

let content = fs.readFileSync('src/pages/History.tsx', 'utf8');

const emptyStateReplace = `<motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-white/20 gap-5"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative relative flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border border-white/10"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <FolderOpen className="w-10 h-10 text-white/40" strokeWidth={1.5} />
              </motion.div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-background-card flex items-center justify-center border border-white/10">
                <HistoryIcon className="w-4 h-4 text-white/60" />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-base font-semibold text-white/70">No history yet</p>
              <p className="text-sm mt-1.5 text-white/40 max-w-xs mx-auto">Your download sessions will appear here.</p>
            </div>
          </motion.div>`;

content = content.replace(/<motion\.div\s+initial=\{\{ opacity: 0 \}\}\s+animate=\{\{ opacity: 1 \}\}\s+className="flex flex-col items-center justify-center py-24 text-white\/20 gap-4"(.|\n)*?<\/motion\.div>/, emptyStateReplace);

fs.writeFileSync('src/pages/History.tsx', content);
