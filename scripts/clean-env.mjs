#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// Default unnecessary keys: Vercel system/git metadata, deactivated keys, redundant runtime keys
const DEFAULT_UNNECESSARY_KEYS = {
  // Vercel build & git metadata (auto-injected by Vercel CLI)
  NX_DAEMON: "Vercel / Nx build metadata (unused)",
  TURBO_CACHE: "Turborepo cache config (unused)",
  TURBO_DOWNLOAD_LOCAL_ENABLED: "Turborepo cache config (unused)",
  TURBO_REMOTE_ONLY: "Turborepo cache config (unused)",
  TURBO_RUN_SUMMARY: "Turborepo cache config (unused)",
  VERCEL: "Vercel platform boolean flag (unused)",
  VERCEL_GIT_COMMIT_AUTHOR_LOGIN: "Vercel git metadata (unused)",
  VERCEL_GIT_COMMIT_AUTHOR_NAME: "Vercel git metadata (unused)",
  VERCEL_GIT_COMMIT_MESSAGE: "Vercel git metadata (unused)",
  VERCEL_GIT_COMMIT_REF: "Vercel git metadata (unused)",
  VERCEL_GIT_COMMIT_SHA: "Vercel git metadata (unused)",
  VERCEL_GIT_PREVIOUS_SHA: "Vercel git metadata (unused)",
  VERCEL_GIT_PROVIDER: "Vercel git metadata (unused)",
  VERCEL_GIT_PULL_REQUEST_ID: "Vercel git metadata (unused)",
  VERCEL_GIT_REPO_ID: "Vercel git metadata (unused)",
  VERCEL_GIT_REPO_OWNER: "Vercel git metadata (unused)",
  VERCEL_GIT_REPO_SLUG: "Vercel git metadata (unused)",
  VERCEL_OIDC_TOKEN: "Vercel OIDC auth token (unused)",
  VERCEL_TARGET_ENV: "Vercel deployment target indicator (unused)",

  // Misnamed / deactivated keys (code references different names)
  X_AIRSTACK_API_KEY: "Deactivated / unreferenced (code uses AIRSTACK_API_KEY)",
  X_FRAME_HUB_HTTP_URL: "Deactivated / unreferenced (code uses FRAME_HUB_HTTP_URL)",

  // Redundant Vercel runtime variables (automatically provided in cloud)
  VERCEL_ENV: "Vercel runtime environment (automatically provided in Vercel)",
  VERCEL_URL: "Vercel runtime deployment URL (automatically provided in Vercel)",
};

const LEGACY_REDIS_KEYS = {
  REDIS_API_TOKEN: "Legacy Upstash Redis token (migrated to PostgreSQL)",
  REDIS_API_URL: "Legacy Upstash Redis URL (migrated to PostgreSQL)",
};

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function printHelp() {
  console.log(`
${colors.bold}Usage:${colors.reset}
  node scripts/clean-env.mjs <file_path> [options]
  pnpm clean-env <file_path> [options]

${colors.bold}Description:${colors.reset}
  Removes unnecessary, dead, and redundant environment variable keys from any env file.

${colors.bold}Options:${colors.reset}
  ${colors.cyan}-d, --dry-run${colors.reset}              Preview which keys will be removed without changing the file
  ${colors.cyan}-o, --output <path>${colors.reset}        Write output to a different file instead of modifying in-place
  ${colors.cyan}--remove-redis${colors.reset}             Also remove legacy Redis keys (REDIS_API_URL, REDIS_API_TOKEN)
  ${colors.cyan}--keep-vercel-runtime${colors.reset}      Do not remove VERCEL_ENV and VERCEL_URL
  ${colors.cyan}--no-backup${colors.reset}                Skip creating a backup (.bak) file
  ${colors.cyan}--add-key <KEY>${colors.reset}            Specify additional key(s) to remove (can be used multiple times)
  ${colors.cyan}-h, --help${colors.reset}                 Show this help message

${colors.bold}Examples:${colors.reset}
  node scripts/clean-env.mjs .env.all_keys --dry-run
  node scripts/clean-env.mjs .env.all_keys
  node scripts/clean-env.mjs .env.all_keys --remove-redis -o .env.cleaned
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    filePath: null,
    outputPath: null,
    dryRun: false,
    removeRedis: false,
    keepVercelRuntime: false,
    backup: true,
    extraKeys: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-d" || arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-backup") {
      options.backup = false;
    } else if (arg === "--remove-redis") {
      options.removeRedis = true;
    } else if (arg === "--keep-vercel-runtime") {
      options.keepVercelRuntime = true;
    } else if (arg === "-o" || arg === "--output") {
      options.outputPath = args[++i];
    } else if (arg === "--add-key") {
      options.extraKeys.push(args[++i]);
    } else if (!arg.startsWith("-") && !options.filePath) {
      options.filePath = arg;
    } else {
      console.error(`${colors.red}Unknown argument:${colors.reset} ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return options;
}

function main() {
  const options = parseArgs();

  if (!options.filePath) {
    console.error(`${colors.red}Error:${colors.reset} Please provide a target env file path.`);
    printHelp();
    process.exit(1);
  }

  const resolvedInputPath = path.resolve(process.cwd(), options.filePath);
  if (!fs.existsSync(resolvedInputPath)) {
    console.error(`${colors.red}Error:${colors.reset} File not found: ${resolvedInputPath}`);
    process.exit(1);
  }

  const keysToRemove = { ...DEFAULT_UNNECESSARY_KEYS };

  if (options.keepVercelRuntime) {
    delete keysToRemove.VERCEL_ENV;
    delete keysToRemove.VERCEL_URL;
  }

  if (options.removeRedis) {
    Object.assign(keysToRemove, LEGACY_REDIS_KEYS);
  }

  for (const extraKey of options.extraKeys) {
    keysToRemove[extraKey] = "Custom specified key";
  }

  const content = fs.readFileSync(resolvedInputPath, "utf-8");
  const lines = content.split(/\r?\n/);

  const keptLines = [];
  const removedEntries = [];
  const keptKeys = [];

  // Match: KEY=..., export KEY=..., or standalone KEY
  const keyRegex = /^(?:export\s+)?([A-Za-z0-9_]+)(?:\s*=|$)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines or comments from key checking, but keep them in file
    if (!trimmed || trimmed.startsWith("#")) {
      keptLines.push(line);
      continue;
    }

    const match = trimmed.match(keyRegex);
    if (match) {
      const keyName = match[1];
      if (keyName in keysToRemove) {
        removedEntries.push({ key: keyName, reason: keysToRemove[keyName], line: i + 1 });
        continue;
      } else {
        keptKeys.push(keyName);
      }
    }

    keptLines.push(line);
  }

  console.log(`\n${colors.bold}=== Env Cleaner ===${colors.reset}`);
  console.log(`Target file: ${colors.cyan}${resolvedInputPath}${colors.reset}`);
  if (options.dryRun) {
    console.log(`${colors.yellow}${colors.bold}[DRY RUN MODE - No files will be modified]${colors.reset}`);
  }

  console.log(`\n${colors.bold}Keys to Remove (${removedEntries.length}):${colors.reset}`);
  if (removedEntries.length === 0) {
    console.log(`  ${colors.dim}No unnecessary keys found.${colors.reset}`);
  } else {
    for (const item of removedEntries) {
      console.log(`  ${colors.red}✗${colors.reset} ${colors.bold}${item.key}${colors.reset} ${colors.dim}(Line ${item.line}: ${item.reason})${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}Keys Kept (${keptKeys.length}):${colors.reset}`);
  console.log(`  ${colors.green}✓${colors.reset} ${keptKeys.join(", ")}`);

  if (options.dryRun) {
    console.log(`\n${colors.cyan}Dry run complete.${colors.reset} To apply changes, run without ${colors.bold}--dry-run${colors.reset}.\n`);
    return;
  }

  if (removedEntries.length === 0) {
    console.log(`\n${colors.green}File is already clean.${colors.reset}\n`);
    return;
  }

  const outputPath = options.outputPath
    ? path.resolve(process.cwd(), options.outputPath)
    : resolvedInputPath;

  // Create backup if modifying in-place and backup is enabled
  if (options.backup && outputPath === resolvedInputPath) {
    const backupPath = `${resolvedInputPath}.bak`;
    fs.copyFileSync(resolvedInputPath, backupPath);
    console.log(`\n${colors.yellow}Backup created:${colors.reset} ${backupPath}`);
  }

  // Normalize trailing newline
  let newContent = keptLines.join("\n");
  if (!newContent.endsWith("\n")) {
    newContent += "\n";
  }

  fs.writeFileSync(outputPath, newContent, "utf-8");
  console.log(`\n${colors.green}${colors.bold}Success!${colors.reset} Saved cleaned file to: ${colors.cyan}${outputPath}${colors.reset}\n`);
}

main();
