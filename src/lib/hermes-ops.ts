import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { IntelligenceContext } from '@/lib/ai-engine';

export type HermesExecutionMode = 'hermes' | 'fallback';

export interface HermesRuntimeStatus {
  available: boolean;
  command: string | null;
  runtime: 'hermes-cli' | 'aegis-fallback';
  mode: 'hermes-live' | 'hybrid-fallback';
  reason?: string;
  detectedAt: string;
}

export interface HermesRunResult {
  mode: HermesExecutionMode;
  available: boolean;
  commandTried: string;
  output: string;
  metadata: {
    runtime: 'hermes-cli' | 'aegis-fallback';
    reason?: string;
    durationMs?: number;
  };
}

const DEFAULT_HERMES_COMMANDS = [
  process.env.HERMES_CLI_PATH?.trim(),
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'hermes', 'hermes-agent', 'hermes') : null,
  process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local', 'hermes', 'hermes-agent', 'hermes') : null,
  'hermes.cmd',
  'hermes',
].filter((value): value is string => Boolean(value && value.length > 0));

function summarizeContext(context: IntelligenceContext): string {
  const lines: string[] = [];
  lines.push(`Timestamp: ${context.timestamp}`);
  lines.push(`Earthquakes: ${context.earthquakes.length}`);
  lines.push(`News items: ${context.news.length}`);
  lines.push(`Threat events: ${context.threats.length}`);
  lines.push(`Cyber alerts: ${context.cyberAlerts.length}`);

  const topEarthquakes = context.earthquakes
    .slice()
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 5)
    .map((eq) => `- M${eq.magnitude.toFixed(1)} | ${eq.location} | ${eq.timestamp}`);

  const topThreats = context.threats
    .slice(0, 5)
    .map((event) => `- ${event.severity} ${event.type} | ${event.title} | ${event.region}`);

  const topNews = context.news
    .slice()
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5)
    .map((item) => `- risk ${item.risk_score}/10 | ${item.source} | ${item.title}`);

  if (topEarthquakes.length > 0) {
    lines.push('Top earthquakes:');
    lines.push(...topEarthquakes);
  }

  if (topThreats.length > 0) {
    lines.push('Top threats:');
    lines.push(...topThreats);
  }

  if (topNews.length > 0) {
    lines.push('Top news:');
    lines.push(...topNews);
  }

  return lines.join('\n');
}

export function buildHermesPrompt(query: string, context: IntelligenceContext): string {
  return [
    'You are Hermes embedded inside AEGIS, a real-time intelligence command surface.',
    'Work as an autonomous operator-grade analyst.',
    'Be direct, high-signal, and avoid generic chatbot phrasing.',
    'If the user asks for action, provide an operator plan and the next best autonomous moves.',
    '',
    '## CURRENT AEGIS CONTEXT',
    summarizeContext(context),
    '',
    '## USER TASK',
    query.trim(),
    '',
    '## REQUIRED OUTPUT',
    'Respond in concise Markdown with these sections when relevant:',
    '- BLUF',
    '- LIVE SIGNALS',
    '- OPERATOR JUDGMENT',
    '- AUTONOMOUS NEXT MOVES',
    '- RISKS / GAPS',
  ].join('\n');
}

async function canAccessExecutable(command: string): Promise<boolean> {
  if (!command.includes('/') && !command.includes('\\') && !command.includes(':')) {
    const pathEntries = (process.env.PATH || '').split(delimiter).filter(Boolean);
    const candidates = process.platform === 'win32'
      ? [command, `${command}.cmd`, `${command}.exe`, `${command}.bat`]
      : [command];

    for (const directory of pathEntries) {
      for (const candidate of candidates) {
        try {
          await access(join(directory, candidate), fsConstants.F_OK);
          return true;
        } catch {
          // try next candidate
        }
      }
    }

    return false;
  }

  try {
    await access(command, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveHermesCommand(): Promise<string | null> {
  for (const command of DEFAULT_HERMES_COMMANDS) {
    if (await canAccessExecutable(command)) {
      return command;
    }
  }
  return null;
}

function spawnHermes(command: string, prompt: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const isPythonLauncher = command.endsWith(`${process.platform === 'win32' ? '\\' : '/'}hermes`) || command.endsWith('/hermes') || command.endsWith('\\hermes');
    const executable = isPythonLauncher ? (process.env.PYTHON || 'python') : command;
    const args = isPythonLauncher ? [command, 'chat', '-q', prompt, '-Q'] : ['chat', '-q', prompt, '-Q'];
    const child = spawn(executable, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: command.endsWith('.cmd') || command.endsWith('.bat'),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ stdout, stderr, exitCode }));
  });
}

export async function getHermesRuntimeStatus(): Promise<HermesRuntimeStatus> {
  const command = await resolveHermesCommand();

  if (!command) {
    return {
      available: false,
      command: null,
      runtime: 'aegis-fallback',
      mode: 'hybrid-fallback',
      reason: 'Hermes CLI not detected on this runtime. AEGIS will use operator-grade fallback analysis.',
      detectedAt: new Date().toISOString(),
    };
  }

  return {
    available: true,
    command,
    runtime: 'hermes-cli',
    mode: 'hermes-live',
    detectedAt: new Date().toISOString(),
  };
}

export async function runHermesPrompt(query: string, context: IntelligenceContext): Promise<HermesRunResult> {
  const command = await resolveHermesCommand();

  if (!command) {
    return {
      mode: 'fallback',
      available: false,
      commandTried: DEFAULT_HERMES_COMMANDS.join(', ') || 'hermes',
      output: '',
      metadata: {
        runtime: 'aegis-fallback',
        reason: 'Hermes CLI not available in runtime. Set HERMES_CLI_PATH or install Hermes on the host.',
      },
    };
  }

  const prompt = buildHermesPrompt(query, context);
  const startedAt = Date.now();
  const { stdout, stderr, exitCode } = await spawnHermes(command, prompt);
  const durationMs = Date.now() - startedAt;
  const output = stdout.trim();

  if (exitCode !== 0 || !output) {
    return {
      mode: 'fallback',
      available: true,
      commandTried: command,
      output: '',
      metadata: {
        runtime: 'aegis-fallback',
        reason: stderr.trim() || `Hermes CLI exited with code ${exitCode ?? 'unknown'}`,
        durationMs,
      },
    };
  }

  return {
    mode: 'hermes',
    available: true,
    commandTried: command,
    output,
    metadata: {
      runtime: 'hermes-cli',
      durationMs,
    },
  };
}
