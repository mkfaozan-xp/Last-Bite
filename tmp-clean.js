const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  // Remove JSX block comments { /* ... */ } and standard multiline /* ... */
  newContent = newContent.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  newContent = newContent.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove line comments that start immediately or after whitespace (ignores http:// inside quotes)
  newContent = newContent.replace(/^\s*\/\/.*$/gm, '');
  
  // Remove empty lines at start of file
  newContent = newContent.replace(/^\s*\n/g, '');
  
  // Reduce 3+ newlines to max 2 newlines
  newContent = newContent.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

function traverse(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git'].includes(file)) {
        traverse(fullPath);
      }
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      cleanFile(fullPath);
    }
  }
}

traverse('e:/lastbite-project/src');
console.log('Cleanup script finished mapping all files.');
