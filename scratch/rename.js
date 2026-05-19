const fs = require('fs');
const path = require('path');

const dirsToScan = ['src', 'thesis', 'firmware', 'public'];
const filesToScan = ['index.html', 'smart_bridge.html', 'package.json', 'ZEC5_PROJECT_SUMMARY.md', 'ZEC5_REDESIGN_SUMMARY.md'];

const textReplacements = [
  { from: /Zimbabwean Energy Controller/g, to: 'Zimbabwean Energy Tracker' },
  { from: /ZEC-5/g, to: 'ZET-5' },
  { from: /ZEC5/g, to: 'ZET5' },
  { from: /zec5/g, to: 'zet5' },
  { from: /\bZEC\b/g, to: 'ZET' }
];

function processPath(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(targetPath);
    for (const file of files) {
      processPath(path.join(targetPath, file));
    }
  } else {
    // Only process text files (skip node_modules, binary, etc if any, but we restricted dirs)
    if (targetPath.includes('node_modules') || targetPath.includes('.git')) return;
    
    let content = fs.readFileSync(targetPath, 'utf8');
    let original = content;
    
    for (const r of textReplacements) {
      content = content.replace(r.from, r.to);
    }
    
    if (content !== original) {
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`Updated content: ${targetPath}`);
    }
  }

  // Rename logic
  const basename = path.basename(targetPath);
  let newBasename = basename;
  
  if (newBasename.includes('ZEC5')) newBasename = newBasename.replace(/ZEC5/g, 'ZET5');
  else if (newBasename.includes('ZEC-5')) newBasename = newBasename.replace(/ZEC-5/g, 'ZET-5');
  
  if (newBasename !== basename) {
    const newPath = path.join(path.dirname(targetPath), newBasename);
    fs.renameSync(targetPath, newPath);
    console.log(`Renamed: ${targetPath} -> ${newPath}`);
  }
}

for (const dir of dirsToScan) {
  processPath(path.join(__dirname, '..', dir));
}
for (const file of filesToScan) {
  processPath(path.join(__dirname, '..', file));
}
