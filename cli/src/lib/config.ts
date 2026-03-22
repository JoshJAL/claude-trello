import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".config", "taskpilot");
const LEGACY_CONFIG_DIR = join(homedir(), ".config", "claude-trello");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  serverUrl?: string;
  sessionCookie?: string;
  userEmail?: string;
  userName?: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfig(): Config {
  ensureDir();
  if (!existsSync(CONFIG_FILE)) {
    // Migrate from legacy config directory if it exists
    const legacyFile = join(LEGACY_CONFIG_DIR, "config.json");
    if (existsSync(legacyFile)) {
      try {
        const legacyConfig = readFileSync(legacyFile, "utf-8");
        writeFileSync(CONFIG_FILE, legacyConfig, { mode: 0o600 });
        return JSON.parse(legacyConfig) as Config;
      } catch {
        return {};
      }
    }
    return {};
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(update: Partial<Config>): void {
  ensureDir();
  const current = getConfig();
  const merged = { ...current, ...update };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }
}

export function getServerUrl(): string {
  const config = getConfig();
  return (
    config.serverUrl ||
    process.env.TASKPILOT_URL ||
    process.env.CLAUDE_TRELLO_URL ||
    "https://ct.joshualevine.me"
  );
}

export function getSessionCookie(): string | undefined {
  return getConfig().sessionCookie;
}

export function isLoggedIn(): boolean {
  return !!getSessionCookie();
}
