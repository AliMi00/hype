#!/usr/bin/env node
// Serve a composition over http for live preview in a normal browser.
//
//   node preview.mjs <composition-dir> [--port 4173]

import { resolve } from 'node:path';
import { die, parseArgs, serveDir } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) die('usage: node preview.mjs <composition-dir>');
const { url } = await serveDir(resolve(args._[0]), Number(args.port) || 0);
console.log(`previewing ${args._[0]} at ${url}/  (space = play/pause, ←/→ = step, Ctrl+C to stop)`);
