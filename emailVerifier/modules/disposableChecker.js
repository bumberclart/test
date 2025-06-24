import fs from 'fs';
import path from 'path';

let disposableDomains = null;
try {
  const filePath = path.resolve('./data/disposable_domains.txt');
  if (fs.existsSync(filePath)) {
    disposableDomains = fs.readFileSync(
      filePath,
      'utf8'
    ).split('\n').map(d => d.trim().toLowerCase());
  } else {
    throw new Error('Disposable domains file not found at ' + filePath + '. Please ensure the file exists.');
  }
} catch (err) {
  console.error('Error loading disposable domains list:', err.message);
  // Explicit failure: don't allow the script to silently continue in this state
  throw err;
}

export function checkDisposable(email) {
  if (!disposableDomains) {
    throw new Error('Disposable domains list not loaded.');
  }
  const domain = email.split('@')[1].toLowerCase();
  return disposableDomains.includes(domain);
}