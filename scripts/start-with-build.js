#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const cwd = process.cwd();
const distDir = process.env.NEXT_DIST_DIR ?? '.next';
const buildIdPath = path.join(cwd, distDir, 'BUILD_ID');
const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ?? '3016';
const skipBuild = process.env.SKIP_BUILD === '1';
const forceBuild = process.env.FORCE_BUILD === '1' || process.env.BUILD_FIRST === '1';

const nextBin = require.resolve('next/dist/bin/next');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: options.env ?? process.env,
      cwd: options.cwd ?? cwd,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const envWithDist = { ...process.env, NEXT_DIST_DIR: distDir };
  const buildExists = existsSync(buildIdPath);
  const needsBuild = !skipBuild && (forceBuild || !buildExists);

  if (needsBuild) {
    process.stdout.write(`Building Next.js app into ${distDir}...\n`);
    await run('node', [nextBin, 'build'], { env: envWithDist });
  } else if (!buildExists) {
    process.stderr.write(`No build found in ${distDir}, but build skipped via SKIP_BUILD=1.\n`);
  }

  process.stdout.write(`Starting Next.js server on ${host}:${port} using ${distDir}...\n`);
  await run('node', [nextBin, 'start', '--hostname', host, '--port', String(port)], {
    env: { ...envWithDist, PORT: String(port), HOST: host },
  });
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
