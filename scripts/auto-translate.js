const fs = require('fs');
const path = require('path');
const { translate } = require('@vitalets/google-translate-api');

const messagesDir = path.resolve(__dirname, '../messages');
const enDir = path.join(messagesDir, 'en');
const languages = {
  de: 'de',
  es: 'es',
  it: 'it',
  zh: 'zh-CN',
};

const placeholderRegex = /{[^}]+}/g;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const protectPlaceholders = (text) => {
  const placeholders = [];
  const replaced = text.replace(placeholderRegex, (match) => {
    const token = `__PH_${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  return { replaced, placeholders };
};

const restorePlaceholders = (text, placeholders) => {
  let result = text;
  for (const { token, value } of placeholders) {
    result = result.split(token).join(value);
  }
  return result;
};

const cache = Object.fromEntries(Object.keys(languages).map((lang) => [lang, new Map()]));
let lastRequest = 0;
const minDelay = 250;

async function translateString(source, lang) {
  const trimmed = source.trim();
  if (!trimmed) return source;

  const langCache = cache[lang];
  if (langCache.has(source)) {
    return langCache.get(source);
  }

  const { replaced, placeholders } = protectPlaceholders(source);

  let translated;
  while (true) {
    const now = Date.now();
    const wait = Math.max(0, minDelay - (now - lastRequest));
    if (wait > 0) {
      await sleep(wait);
    }
    lastRequest = Date.now();

    try {
      const res = await translate(replaced, { from: 'en', to: languages[lang] });
      translated = res.text;
      break;
    } catch (err) {
      const message = err?.message ?? '';
      if (message.includes('Too Many Requests') || message.includes('429')) {
        await sleep(3000);
        continue;
      }
      throw err;
    }
  }

  translated = restorePlaceholders(translated, placeholders);
  langCache.set(source, translated);
  return translated;
}

async function translateNode(enNode, existingNode, lang) {
  if (typeof enNode === 'string') {
    const existing = typeof existingNode === 'string' ? existingNode : undefined;
    if (existing && existing.trim() && existing.trim() !== enNode.trim()) {
      return existing;
    }
    return translateString(enNode, lang);
  }

  if (enNode && typeof enNode === 'object') {
    if (Array.isArray(enNode)) {
      const result = [];
      for (let i = 0; i < enNode.length; i += 1) {
        result[i] = await translateNode(
          enNode[i],
          existingNode ? existingNode[i] : undefined,
          lang,
        );
      }
      return result;
    }

    const result = {};
    for (const key of Object.keys(enNode)) {
      result[key] = await translateNode(
        enNode[key],
        existingNode && Object.prototype.hasOwnProperty.call(existingNode, key)
          ? existingNode[key]
          : undefined,
        lang,
      );
    }

    if (existingNode && typeof existingNode === 'object' && !Array.isArray(existingNode)) {
      for (const key of Object.keys(existingNode)) {
        if (!Object.prototype.hasOwnProperty.call(result, key)) {
          result[key] = existingNode[key];
        }
      }
    }

    return result;
  }

  return enNode;
}

async function main() {
  const enFiles = fs
    .readdirSync(enDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const lang of Object.keys(languages)) {
    const langDir = path.join(messagesDir, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }
    process.stdout.write(`Translating ${lang}...\n`);
    let aggregate = {};
    const aggregatePath = path.join(messagesDir, `${lang}.json`);
    if (fs.existsSync(aggregatePath)) {
      aggregate = JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));
    }

    for (const file of enFiles) {
      const base = path.basename(file, '.json');
      const enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
      let existingContent = {};
      const perFilePath = path.join(langDir, file);
      if (fs.existsSync(perFilePath)) {
        existingContent = JSON.parse(fs.readFileSync(perFilePath, 'utf8'));
      } else if (aggregate && Object.prototype.hasOwnProperty.call(aggregate, base)) {
        existingContent = aggregate[base];
      }

      const translated = await translateNode(enContent, existingContent, lang);
      fs.writeFileSync(perFilePath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
    }
  }
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
