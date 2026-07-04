import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

const METRICS_PATH = path.join(process.cwd(), 'data', 'usage-metrics.json');
const ONLINE_TTL_MS = 2 * 60 * 1000;
const SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type UsageStore = {
  totalUsers: number;
  sessions: Record<string, number>;
};

let writeQueue: Promise<UsageStore> = Promise.resolve({ totalUsers: 0, sessions: {} });
let memoryStore: UsageStore = { totalUsers: 0, sessions: {} };

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(METRICS_PATH), { recursive: true });
  try {
    await fs.access(METRICS_PATH);
  } catch {
    await fs.writeFile(METRICS_PATH, JSON.stringify({ totalUsers: 0, sessions: {} }, null, 2), 'utf8');
  }
}

function cloneStore(store: UsageStore): UsageStore {
  return {
    totalUsers: store.totalUsers,
    sessions: { ...store.sessions },
  };
}

async function readStore(): Promise<UsageStore> {
  try {
    await ensureStoreFile();
    const raw = await fs.readFile(METRICS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<UsageStore>;
    const store = {
      totalUsers: typeof parsed.totalUsers === 'number' ? parsed.totalUsers : 0,
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    };
    memoryStore = cloneStore(store);
    return store;
  } catch {
    return cloneStore(memoryStore);
  }
}

function pruneSessions(store: UsageStore, now: number) {
  const sessions = Object.fromEntries(
    Object.entries(store.sessions).filter(([, lastSeen]) => now - lastSeen <= SESSION_RETENTION_MS),
  );

  return {
    totalUsers: store.totalUsers,
    sessions,
  };
}

async function writeStore(store: UsageStore) {
  memoryStore = cloneStore(store);
  try {
    await ensureStoreFile();
    await fs.writeFile(METRICS_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Serverless/read-only fallback: keep the latest snapshot in memory for this runtime instance.
  }
}

function toResponse(store: UsageStore, now: number) {
  const onlineUsers = Object.values(store.sessions).filter((lastSeen) => now - lastSeen <= ONLINE_TTL_MS).length;
  return {
    onlineUsers,
    totalUsers: store.totalUsers,
    updatedAt: new Date(now).toISOString(),
  };
}

async function mutateStore(sessionId?: string) {
  writeQueue = writeQueue.then(async () => {
    const now = Date.now();
    const current = pruneSessions(await readStore(), now);

    if (sessionId) {
      const isNewSession = !(sessionId in current.sessions);
      current.sessions[sessionId] = now;
      if (isNewSession) {
        current.totalUsers += 1;
      }
    }

    await writeStore(current);
    return current;
  });

  return writeQueue;
}

export async function GET() {
  const now = Date.now();
  const current = pruneSessions(await mutateStore(), now);

  return NextResponse.json(toResponse(current, now), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  let sessionId = '';

  try {
    const raw = await req.text();
    const body = raw ? (JSON.parse(raw) as { sessionId?: string }) : {};
    sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const now = Date.now();
  const current = await mutateStore(sessionId);

  return NextResponse.json(toResponse(current, now), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
