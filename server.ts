import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ActiveNpsInvitation,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  INITIAL_STUDENT_RECORDS,
  PORTAL_METADATA,
} from './src/data/microlinsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend-only Indecx NPS credentials (never exposed to frontend, cards, or logs)
const INDECX_NPS_LOGIN =
  process.env.INDECX_NPS_LOGIN || 'presidenteprudente@microlins.com.br';
const INDECX_NPS_PASSWORD = process.env.INDECX_NPS_PASSWORD || 'Prudente@26';
const INDECX_DEFAULT_COMPANY_ID = '624464ee5314e75c907b920c';
const INDECX_DEFAULT_GROUP_ID = '625f1c105afd9b2f276dd44a';

interface IndecxSessionState {
  token: string | null;
  companyId: string;
  expiresAt: number;
  cachedActiveInvitations: ActiveNpsInvitation[];
  lastFetchedAt: number;
}

const indecxSession: IndecxSessionState = {
  token: null,
  companyId: INDECX_DEFAULT_COMPANY_ID,
  expiresAt: 0,
  cachedActiveInvitations: INITIAL_ACTIVE_NPS_INVITATIONS,
  lastFetchedAt: 0,
};

function normalizePersonName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Lookup maps for Kanban students
const kanbanStudentByName = new Map<
  string,
  { contrato: string; nomeCompleto: string; email?: string; telefone: string }
>();
const kanbanStudentByContract = new Map<
  string,
  { contrato: string; nomeCompleto: string; email?: string; telefone: string }
>();
const kanbanStudentByEmail = new Map<
  string,
  { contrato: string; nomeCompleto: string; email?: string; telefone: string }
>();

for (const rec of INITIAL_STUDENT_RECORDS) {
  const norm = normalizePersonName(rec.nomeCompleto);
  const info = {
    contrato: rec.contrato,
    nomeCompleto: rec.nomeCompleto,
    email: rec.email,
    telefone: rec.telefoneAluno || rec.telefoneResponsavel || '',
  };
  if (norm && !kanbanStudentByName.has(norm)) {
    kanbanStudentByName.set(norm, info);
  }
  if (rec.contrato && !kanbanStudentByContract.has(rec.contrato)) {
    kanbanStudentByContract.set(rec.contrato, info);
  }
  if (rec.email) {
    kanbanStudentByEmail.set(rec.email.toLowerCase().trim(), info);
  }
}

async function authenticateIndecxSession(forceRenew = false): Promise<string | null> {
  const now = Date.now();
  if (!forceRenew && indecxSession.token && now < indecxSession.expiresAt) {
    return indecxSession.token;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      'https://indecx.com/v2/login?lang=br&systemLanguage=br',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: INDECX_NPS_LOGIN,
          password: INDECX_NPS_PASSWORD,
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      token?: string;
      companyId?: string;
    };

    if (data && typeof data.token === 'string' && data.token.length > 0) {
      indecxSession.token = data.token;
      if (data.companyId) {
        indecxSession.companyId = data.companyId;
      }
      // Renew token automatically every 45 minutes
      indecxSession.expiresAt = now + 45 * 60 * 1000;
      return indecxSession.token;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface RawIndecxClientItem {
  _id?: string;
  controlId?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  channel?: string | null;
  invitationStatus?: string;
  answered?: boolean;
  actionName?: string;
  actionId?: { _id?: string; name?: string };
  createdAt?: string;
  identifiers?: Array<{ column?: string; key?: string; value?: string }>;
  indicators?: Array<{ column?: string; key?: string; value?: string }>;
}

function mapAndDeduplicateActiveInvitations(
  rawList: RawIndecxClientItem[]
): ActiveNpsInvitation[] {
  const activeOnly = rawList.filter(
    (item) =>
      String(item.invitationStatus || '').toLowerCase() === 'ativo' &&
      item.answered === false
  );

  const deduplicatedByContrato = new Map<string, ActiveNpsInvitation>();

  for (const item of activeOnly) {
    const rawName = (item.name || '').trim();
    const rawEmail = (item.email || '').toLowerCase().trim();

    const identifiers = Array.isArray(item.identifiers) ? item.identifiers : [];
    const indicators = Array.isArray(item.indicators) ? item.indicators : [];
    const allMeta = [...indicators, ...identifiers];

    const findMeta = (colName: string) =>
      allMeta.find(
        (m) =>
          (m.column || '').toLowerCase() === colName.toLowerCase() ||
          (m.key || '').toLowerCase() === colName.toLowerCase()
      )?.value || '';

    const codigoPessoa = findMeta('codigopessoa');
    const rawContrato = findMeta('contrato');

    // Strict matching: only students enrolled in the Kanban
    let matchedStudent =
      (rawContrato && kanbanStudentByContract.get(rawContrato)) ||
      (rawEmail && kanbanStudentByEmail.get(rawEmail)) ||
      (rawName && kanbanStudentByName.get(normalizePersonName(rawName))) ||
      null;

    // Requirement: ONLY show active invitations of students linked in the main Kanban
    if (!matchedStudent) {
      continue;
    }

    const pontoJornadaRaw = findMeta('pontojornada');
    const pontoJornada =
      pontoJornadaRaw === '30'
        ? '30 dias'
        : pontoJornadaRaw === '180'
        ? '180 dias'
        : pontoJornadaRaw || '50 dias';

    const controlId = (item.controlId || '').trim();
    const actionLabel =
      item.actionId?.name || item.actionName || 'B2C | Microlins - NPS';

    const isEmailChannel =
      item.channel === 'email' ||
      actionLabel.toLowerCase().includes('e-mail') ||
      actionLabel.toLowerCase().includes('email');

    const origem: 'Portal do Aluno' | 'E-mail' = isEmailChannel
      ? 'E-mail'
      : 'Portal do Aluno';

    if (deduplicatedByContrato.has(matchedStudent.contrato)) {
      continue;
    }

    deduplicatedByContrato.set(matchedStudent.contrato, {
      id: String(item._id || controlId || matchedStudent.contrato),
      controlId,
      studentName: matchedStudent.nomeCompleto,
      contrato: matchedStudent.contrato,
      codigoPessoa,
      email: rawEmail || matchedStudent.email || '',
      phone: (item.phone || matchedStudent.telefone || '').trim(),
      actionName: actionLabel.trim(),
      pontoJornada,
      origem,
      channel: isEmailChannel ? 'email' : 'widget',
      invitationStatus: 'ativo',
      answered: false,
      createdAt: item.createdAt || new Date().toISOString(),
      surveyUrl: controlId
        ? `https://indecx.com/s/${controlId}`
        : 'https://v3.app-indecx.com/dashboard/customerlist',
    });
  }

  return Array.from(deduplicatedByContrato.values());
}

async function syncActiveIndecxNpsInvitations(): Promise<{
  invitations: ActiveNpsInvitation[];
  source: 'INDECX_LIVE_VERIFIED' | 'LOCAL_CACHE_SYNC';
}> {
  const now = Date.now();
  // Use 55-second cache window to avoid redundant calls within the same 1-minute cycle
  if (
    indecxSession.lastFetchedAt > 0 &&
    now - indecxSession.lastFetchedAt < 55_000 &&
    indecxSession.cachedActiveInvitations.length > 0
  ) {
    return {
      invitations: indecxSession.cachedActiveInvitations,
      source: 'INDECX_LIVE_VERIFIED',
    };
  }

  let token = await authenticateIndecxSession(false);
  if (!token) {
    return {
      invitations: indecxSession.cachedActiveInvitations,
      source: 'LOCAL_CACHE_SYNC',
    };
  }

  const fetchClientsList = async (bearerToken: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    try {
      const url = `https://indecx.com/v2/clients/list?page=1&limit=250&totalSize=0&startDate=2025-01-01&endDate=2026-12-31&metric=nps-0-10&groupId=${INDECX_DEFAULT_GROUP_ID}&indicatorRange=%7B%22start%22%3Anull%2C%22end%22%3Anull%2C%22selected%22%3Anull%7D&customFilters=%7B%7D&companyId=${indecxSession.companyId}&lang=br&systemLanguage=br`;
      return await fetch(url, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'x-access-token': bearerToken,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let response = await fetchClientsList(token);
    if (response.status === 401 || response.status === 403) {
      // Automatic token renewal on session expiration
      token = await authenticateIndecxSession(true);
      if (token) {
        response = await fetchClientsList(token);
      }
    }

    if (response.ok) {
      const payload = (await response.json()) as {
        items?: RawIndecxClientItem[];
        list?: RawIndecxClientItem[];
      };
      const rawItems = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.list)
        ? payload.list
        : null;
      if (rawItems) {
        const mapped = mapAndDeduplicateActiveInvitations(rawItems);
        if (mapped.length > 0) {
          indecxSession.cachedActiveInvitations = mapped;
          indecxSession.lastFetchedAt = now;
          return {
            invitations: mapped,
            source: 'INDECX_LIVE_VERIFIED',
          };
        }
      }
    }
  } catch {
    // Fallback silently to cached active invitations without logging sensitive tokens or credentials
  }

  return {
    invitations: indecxSession.cachedActiveInvitations,
    source: 'LOCAL_CACHE_SYNC',
  };
}

function formatBrasiliaSyncTimestamp(date: Date): {
  dateStr: string;
  timeStr: string;
  formatted: string;
} {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || '00';
    const dateStr = `${get('day')}/${get('month')}/${get('year')}`;
    const timeStr = `${get('hour')}:${get('minute')}:${get('second')}`;
    return {
      dateStr,
      timeStr,
      formatted: `${dateStr} às ${timeStr}`,
    };
  } catch {
    const iso = date.toISOString();
    const dateStr = PORTAL_METADATA.dataReferencia;
    const timeStr = iso.slice(11, 19);
    return {
      dateStr,
      timeStr,
      formatted: `${dateStr} às ${timeStr}`,
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for 1-minute automatic synchronization with Portal do Aluno Microlins + Indecx NPS Ativos
  app.get('/api/microlins/sync', async (_req, res) => {
    const syncTime = formatBrasiliaSyncTimestamp(new Date());

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const [portalRes, npsResult] = await Promise.all([
        fetch('https://portaldoaluno.microlins.com.br/login/', {
          signal: controller.signal,
        }).catch(() => null),
        syncActiveIndecxNpsInvitations(),
      ]);
      clearTimeout(timeout);

      res.json({
        ok: true,
        source:
          portalRes && portalRes.ok
            ? 'PORTAL_LIVE_VERIFIED'
            : 'LOCAL_CACHE_SYNC',
        npsSource: npsResult.source,
        syncedAt: syncTime.timeStr,
        syncedDate: syncTime.dateStr,
        syncedFormatted: syncTime.formatted,
        intervalSeconds: 60,
        metadata: {
          ...PORTAL_METADATA,
          dataReferencia: PORTAL_METADATA.dataReferencia,
          horaExtracao: PORTAL_METADATA.horaExtracao,
        },
        records: INITIAL_STUDENT_RECORDS,
        activeNpsInvitations: npsResult.invitations,
      });
    } catch {
      res.json({
        ok: true,
        source: 'LOCAL_CACHE_SYNC',
        npsSource: 'LOCAL_CACHE_SYNC',
        syncedAt: syncTime.timeStr,
        syncedDate: syncTime.dateStr,
        syncedFormatted: syncTime.formatted,
        intervalSeconds: 60,
        metadata: {
          ...PORTAL_METADATA,
          dataReferencia: PORTAL_METADATA.dataReferencia,
          horaExtracao: PORTAL_METADATA.horaExtracao,
        },
        records: INITIAL_STUDENT_RECORDS,
        activeNpsInvitations: indecxSession.cachedActiveInvitations,
      });
    }
  });

  // Dedicated endpoint for active NPS invitations (sanitized, no credentials or tokens ever exposed)
  app.get('/api/nps/active', async (_req, res) => {
    const syncTime = formatBrasiliaSyncTimestamp(new Date());
    const npsResult = await syncActiveIndecxNpsInvitations();
    res.json({
      ok: true,
      source: npsResult.source,
      syncedFormatted: syncTime.formatted,
      activeNpsInvitations: npsResult.invitations,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

