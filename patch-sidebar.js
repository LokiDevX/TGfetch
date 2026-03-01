const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const replacementActive = `              {/* Active background with subtle animation */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-xl bg-white/[0.04]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Left glowing bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-accent-blue rounded-r-full shadow-glow-blue"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}`;

content = content.replace(/\{\/\* Active background with subtle animation \*\/\}(.|\n)*?(?=\{\/\* Icon \*\/)/, replacementActive + '\n\n              ');

fs.writeFileSync('src/components/Sidebar.tsx', content);
