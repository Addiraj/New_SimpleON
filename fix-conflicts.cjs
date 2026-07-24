const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to match the entire conflict block
  const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> .*\r?\n?/g;
  
  if (conflictRegex.test(content)) {
    content = content.replace(conflictRegex, '$1\n');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (!['.png', '.jpg', '.jpeg', '.gif', '.ico', '.lock'].includes(ext)) {
        try {
          processFile(fullPath);
        } catch (e) {
          console.error(`Error processing ${fullPath}:`, e);
        }
      }
    }
  }
}

walkDir(__dirname);
