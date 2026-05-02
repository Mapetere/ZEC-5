const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// All border-radius to 0
css = css.replace(/border-radius:\s*[^;]+;/g, 'border-radius: 0;');

// All bold weights to normal
css = css.replace(/font-weight:\s*(500|600|700|800|900)\b/g, 'font-weight: 400');

// Replace Orbitron with Inter
css = css.replace(/--font-mono:\s*'Orbitron',\s*monospace/g, "--font-mono: 'Inter', system-ui, sans-serif");

fs.writeFileSync('src/index.css', css);
console.log('CSS overhaul complete');
