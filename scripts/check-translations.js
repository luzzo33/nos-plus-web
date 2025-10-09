const glob = require('glob');
const fs = require('fs');
const path = require('path');

const files = glob.sync('app/**/*.{js,ts,jsx,tsx}', { nodir: true });
const combined = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const used = new Set();
const regex = /(?:\bt|tc)\(\s*['"`]([\w.]+)['"`]\s*\)/g;
let m;
while ((m = regex.exec(combined)) !== null) {
  used.add(m[1]);
}

const messagesPath = path.resolve(__dirname, '../messages/en.json');
let messages;

if (fs.existsSync(messagesPath)) {
  messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
} else {
  const partsDir = path.resolve(__dirname, '../messages/en');
  const files = fs.readdirSync(partsDir).filter((name) => name.endsWith('.json'));

  messages = Object.fromEntries(
    files.map((file) => {
      const key = path.basename(file, '.json');
      const content = JSON.parse(fs.readFileSync(path.join(partsDir, file), 'utf8'));
      return [key, content];
    }),
  );
}

const available = new Set();
function collect(obj, prefix = '') {
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      available.add(full);
    } else if (val && typeof val === 'object') {
      collect(val, full);
    }
  }
}
collect(messages);

const missing = [...used].filter((key) => !available.has(key));

if (missing.length) {
  process.stdout.write('\n✨ Missing translation keys:\n\n');
  missing.sort().forEach((k) => process.stdout.write(`  • ${k}\n`));
  process.stdout.write('\n');
  process.exit(1);
} else {
  process.stdout.write('✅ All translation keys are present!\n');
}
