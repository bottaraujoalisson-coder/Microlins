import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ActiveNpsInvitation,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  INITIAL_STUDENT_RECORDS,
  PORTAL_APOSTILA_BY_CONTRATO,
  PORTAL_AUTH_LINKS_BY_CONTRATO,
  PORTAL_METADATA,
  StudentPerformanceRecord,
} from './src/data/microlinsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend-only Portal do Aluno Microlins credentials (never exposed to frontend, cards, or logs)
const PORTAL_MICROLINS_LOGIN = process.env.PORTAL_MICROLINS_LOGIN || 'a116882';
const PORTAL_MICROLINS_PASSWORD = process.env.PORTAL_MICROLINS_PASSWORD || 'Joao@2025';
const PORTAL_MICROLINS_ESCOLA = process.env.PORTAL_MICROLINS_ESCOLA || '1875';

// Backend-only Indecx NPS credentials (never exposed to frontend, cards, or logs)
const INDECX_NPS_LOGIN =
  process.env.INDECX_NPS_LOGIN || 'presidenteprudente@microlins.com.br';
const INDECX_NPS_PASSWORD = process.env.INDECX_NPS_PASSWORD || 'Prudente@26';
const INDECX_DEFAULT_COMPANY_ID = '624464ee5314e75c907b920c';
const INDECX_DEFAULT_GROUP_ID = '625f1c105afd9b2f276dd44a';

interface PortalSessionState {
  cookies: Map<string, string>;
  expiresAt: number;
  cachedRecords: StudentPerformanceRecord[];
  cachedMetadata: typeof PORTAL_METADATA;
  authLinksCache: Record<string, string>;
  lastFetchedAt: number;
}

const portalSession: PortalSessionState = {
  cookies: new Map<string, string>(),
  expiresAt: 0,
  cachedRecords: INITIAL_STUDENT_RECORDS,
  cachedMetadata: { ...PORTAL_METADATA },
  authLinksCache: { ...PORTAL_AUTH_LINKS_BY_CONTRATO },
  lastFetchedAt: 0,
};

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

function getBrasiliaDayOfWeek(date: Date): { semanaCode: string; diaLabel: string } {
  const map: Record<string, { semanaCode: string; diaLabel: string }> = {
    Sun: { semanaCode: '7', diaLabel: 'Domingo' },
    Mon: { semanaCode: '1', diaLabel: 'Segunda-feira' },
    Tue: { semanaCode: '2', diaLabel: 'Terça-feira' },
    Wed: { semanaCode: '3', diaLabel: 'Quarta-feira' },
    Thu: { semanaCode: '4', diaLabel: 'Quinta-feira' },
    Fri: { semanaCode: '5', diaLabel: 'Sexta-feira' },
    Sat: { semanaCode: '6', diaLabel: 'Sábado' },
  };
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
    }).format(date);
    return map[weekday] || { semanaCode: '5', diaLabel: 'Sexta-feira' };
  } catch {
    return { semanaCode: '5', diaLabel: 'Sexta-feira' };
  }
}

function collectResponseCookies(res: Response, jar: Map<string, string>) {
  const headersAny = res.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headersAny.getSetCookie ? headersAny.getSetCookie() : [];
  for (const cookieStr of setCookies) {
    const [pair] = cookieStr.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) {
      jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
}

function serializeCookieJar(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function authenticatePortalSession(forceRenew = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRenew && portalSession.cookies.size > 0 && now < portalSession.expiresAt) {
    return true;
  }

  const jar = new Map<string, string>();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const r1 = await fetch('https://portaldoaluno.microlins.com.br/login/', {
      signal: controller.signal,
    });
    collectResponseCookies(r1, jar);

    const r2 = await fetch(
      'https://portaldoaluno.microlins.com.br//login/validarCadastroPerfil',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: serializeCookieJar(jar),
        },
        body: new URLSearchParams({
          login: PORTAL_MICROLINS_LOGIN,
          senha: PORTAL_MICROLINS_PASSWORD,
          email: '',
        }).toString(),
        signal: controller.signal,
      }
    );
    collectResponseCookies(r2, jar);
    if (!r2.ok) return false;

    const valData = (await r2.json()) as { status?: string; info?: string };
    if (!valData || !valData.info) return false;

    try {
      const decoded = JSON.parse(
        Buffer.from(valData.info, 'base64').toString('utf8')
      ) as { Nome?: string; NomeCargo?: string; login?: string };
      if (decoded.Nome) {
        portalSession.cachedMetadata.usuarioNomeCompleto = decoded.Nome;
      }
      if (decoded.NomeCargo) {
        portalSession.cachedMetadata.usuarioCargo = decoded.NomeCargo;
      }
    } catch {
      // Keep default metadata if decoding fails
    }

    const r3 = await fetch('https://portaldoaluno.microlins.com.br/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: serializeCookieJar(jar),
      },
      body: new URLSearchParams({
        'userdata[login]': PORTAL_MICROLINS_LOGIN,
        'userdata[senha]': PORTAL_MICROLINS_PASSWORD,
        'userdata[app]': 'N',
        'userdata[contrato]': '',
        'userdata[info]': valData.info,
      }).toString(),
      signal: controller.signal,
    });
    collectResponseCookies(r3, jar);
    if (!r3.ok) return false;

    portalSession.cookies = jar;
    portalSession.expiresAt = now + 25 * 60 * 1000;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncLivePortalRecords(): Promise<{
  records: StudentPerformanceRecord[];
  source: 'PORTAL_LIVE_VERIFIED' | 'LOCAL_CACHE_SYNC';
}> {
  const now = Date.now();
  if (
    portalSession.lastFetchedAt > 0 &&
    now - portalSession.lastFetchedAt < 45_000 &&
    portalSession.cachedRecords.length > 0
  ) {
    return {
      records: portalSession.cachedRecords,
      source: 'PORTAL_LIVE_VERIFIED',
    };
  }

  let loggedIn = await authenticatePortalSession(false);
  if (!loggedIn) {
    return {
      records: portalSession.cachedRecords,
      source: 'LOCAL_CACHE_SYNC',
    };
  }

  const { semanaCode, diaLabel } = getBrasiliaDayOfWeek(new Date());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);

  try {
    const cookieHeader = serializeCookieJar(portalSession.cookies);
    const [rAlunos, rNotas] = await Promise.all([
      fetch('https://portaldoaluno.microlins.com.br//dashboard/dadosAlunosAula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: cookieHeader,
        },
        body: new URLSearchParams({
          tipoPesq: 'aluno',
          nome: '',
          escola: PORTAL_MICROLINS_ESCOLA,
          horaInicio: '',
          horaFim: '',
          semana: semanaCode,
          sala: '',
        }).toString(),
        signal: controller.signal,
      }),
      fetch(
        'https://portaldoaluno.microlins.com.br//dashboard/getUltimaNotaContrato',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            Cookie: cookieHeader,
          },
          body: new URLSearchParams({
            CodigoContratoCursoMateria: '0',
            semana: semanaCode,
          }).toString(),
          signal: controller.signal,
        }
      ),
    ]);

    if (!rAlunos.ok) {
      loggedIn = await authenticatePortalSession(true);
      if (!loggedIn) {
        return {
          records: portalSession.cachedRecords,
          source: 'LOCAL_CACHE_SYNC',
        };
      }
    }

    const dados = (await rAlunos.json()) as { listaAlunos?: Array<Record<string, unknown>> };
    const notasDict = rNotas.ok
      ? ((await rNotas.json()) as Record<string, { Aula?: string; UltimaNota?: string }>)
      : {};

    if (!dados || !Array.isArray(dados.listaAlunos) || dados.listaAlunos.length === 0) {
      return {
        records: portalSession.cachedRecords,
        source: 'LOCAL_CACHE_SYNC',
      };
    }

    const mappedRecords: StudentPerformanceRecord[] = dados.listaAlunos.map(
      (item, idx) => {
        const contrato = String(item.CodigoContrato || '');
        const nomeCompleto = String(item.NomeAluno || '').trim();
        const nomeCurto =
          nomeCompleto.length > 15 ? `${nomeCompleto.slice(0, 12)}...` : nomeCompleto;
        const rawPhone = String(item.CelularAluno || '').trim();
        const telefoneAluno = rawPhone ? (rawPhone.startsWith('+55') ? rawPhone : `+55${rawPhone}`) : '';
        const whatsappAlunoUrl = telefoneAluno
          ? `https://api.whatsapp.com/send?phone=${telefoneAluno}&text=${encodeURIComponent(`Olá ${nomeCompleto}`)}`
          : '';
        const nomeResponsavel = String(item.NomeResponsavel || '').trim();
        const rawRespPhone = String(item.TelefoneResponsavel || '').trim();
        const telefoneResponsavel = rawRespPhone
          ? rawRespPhone.startsWith('+55')
            ? rawRespPhone
            : `+55${rawRespPhone}`
          : '';
        const whatsappResponsavelUrl = telefoneResponsavel
          ? `https://api.whatsapp.com/send?phone=${telefoneResponsavel}&text=${encodeURIComponent(`Olá ${nomeResponsavel || nomeCompleto}`)}`
          : '';
        const horaInicio = String(item.HoraInicio || '').slice(0, 5);
        const horaFim = String(item.HoraFim || '').slice(0, 5);
        const horario = `${horaInicio} à ${horaFim}`;
        const startH = parseInt(horaInicio.split(':')[0] || '8', 10);
        const turno = startH < 12 ? 'Manhã' : startH < 18 ? 'Tarde' : 'Noite';
        const modalidade = String(item.Modalidade || '')
          .toUpperCase()
          .includes('PRESENCIAL')
          ? 'Presencial'
          : 'Online';
        const inicio = String(item.AulaInicio || item.AulaInicioAula || '').trim();
        const fim = String(item.AulaFim || item.AulaFimAula || '').trim();
        const status = fim ? 'FINALIZADO' : inicio ? 'INICIADO' : 'NÃO INICIADO';
        const cccm = String(item.CodigoContratoCursoMateria || '');
        const notaObj = notasDict[cccm];
        const nota =
          notaObj && notaObj.UltimaNota !== undefined && notaObj.UltimaNota !== ''
            ? Number(notaObj.UltimaNota)
            : null;
        const aulaNum = Number(item.Aula || (notaObj ? notaObj.Aula : 0) || 0);
        const possuiApostila =
          Boolean(item.idcodigoapostila || item.CodigoApostila) ||
          Boolean(PORTAL_APOSTILA_BY_CONTRATO[contrato]);
        const infoAula =
          item.AulaInicio && item.CodigoAulasRealizadas
            ? 'Portal do Aluno'
            : item.PresencaOuFalta === 'P' && item.CodigoPresencaFalta
            ? 'Sistema Acadêmico'
            : 'Não registrado';

        return {
          id: idx + 1,
          contrato,
          aulaId: String(
            item.CodigoAulasRealizadas || item.CodigoPresencaFalta || cccm || idx + 1
          ),
          nomeCompleto,
          nomeCurto,
          telefoneAluno,
          whatsappAlunoUrl,
          nomeResponsavel,
          telefoneResponsavel,
          whatsappResponsavelUrl,
          formacao: String(item.Formacao || '').trim(),
          curso: String(item.MateriaAtual || '').trim(),
          aulaInfo: `Aula ${aulaNum} - Apostila`,
          aulaNumero: aulaNum,
          tipoMaterial: 'Apostila',
          possuiApostila,
          horario,
          horaInicio,
          horaFim,
          turno,
          sala: String(item.Sala || '').trim(),
          modalidade,
          inicio,
          fim,
          nota,
          notaId: cccm,
          infoAula,
          status,
          inadimplente: Number(item.Inadimplente || 0) > 0,
          diaSemana: diaLabel,
          linkLoginUrl: portalSession.authLinksCache[contrato] || '',
        };
      }
    );

    portalSession.cachedRecords = mappedRecords;
    portalSession.lastFetchedAt = now;
    return {
      records: mappedRecords,
      source: 'PORTAL_LIVE_VERIFIED',
    };
  } catch {
    return {
      records: portalSession.cachedRecords,
      source: 'LOCAL_CACHE_SYNC',
    };
  } finally {
    clearTimeout(timeout);
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

/**
 * Maps and deduplicates Indecx invitations against current Kanban students.
 * IMPORTANT RULE:
 * Indecx returns invitations sorted newest-first (`createdAt` desc).
 * A student may have closed an earlier widget popup (leaving an old invite with `answered: false`)
 * and then answered a newer popup 4 minutes later (`answered: true`).
 * Therefore, we MUST find each Kanban student's MOST RECENT invitation first,
 * and include the student ONLY if their most recent invitation has:
 * `invitationStatus === 'ativo' && answered === false`.
 */
function mapAndDeduplicateActiveInvitations(
  rawList: RawIndecxClientItem[],
  currentKanbanRecords: StudentPerformanceRecord[]
): ActiveNpsInvitation[] {
  const kanbanByName = new Map<
    string,
    { contrato: string; nomeCompleto: string; email?: string; telefone: string }
  >();
  const kanbanByContract = new Map<
    string,
    { contrato: string; nomeCompleto: string; email?: string; telefone: string }
  >();

  for (const rec of currentKanbanRecords) {
    const norm = normalizePersonName(rec.nomeCompleto);
    const info = {
      contrato: rec.contrato,
      nomeCompleto: rec.nomeCompleto,
      email: rec.email,
      telefone: rec.telefoneAluno || rec.telefoneResponsavel || '',
    };
    if (norm && !kanbanByName.has(norm)) {
      kanbanByName.set(norm, info);
    }
    if (rec.contrato && !kanbanByContract.has(rec.contrato)) {
      kanbanByContract.set(rec.contrato, info);
    }
  }

  // Track which contracts have already had their most-recent Indecx invite inspected
  const seenMostRecentByContrato = new Set<string>();
  const activeByContrato = new Map<string, ActiveNpsInvitation>();

  for (const item of rawList) {
    const rawName = (item.name || '').trim();
    const identifiers = Array.isArray(item.identifiers) ? item.identifiers : [];
    const indicators = Array.isArray(item.indicators) ? item.indicators : [];
    const allMeta = [...indicators, ...identifiers];

    const findMeta = (colName: string) =>
      allMeta.find(
        (m) =>
          (m.column || '').toLowerCase() === colName.toLowerCase() ||
          (m.key || '').toLowerCase() === colName.toLowerCase()
      )?.value || '';

    const rawContrato = findMeta('contrato');

    const matchedStudent =
      (rawContrato && kanbanByContract.get(rawContrato)) ||
      (rawName && kanbanByName.get(normalizePersonName(rawName))) ||
      null;

    // Only consider students linked in the main Kanban
    if (!matchedStudent) {
      continue;
    }

    // If we already inspected a newer invitation for this student, skip older ones
    if (seenMostRecentByContrato.has(matchedStudent.contrato)) {
      continue;
    }
    seenMostRecentByContrato.add(matchedStudent.contrato);

    const statusLower = String(item.invitationStatus || '').toLowerCase();
    const isAnswered = Boolean(item.answered);

    // Only include if their MOST RECENT invitation is active and unanswered
    if (statusLower !== 'ativo' || isAnswered) {
      continue;
    }

    const codigoPessoa = findMeta('codigopessoa');
    const pontoJornadaRaw = findMeta('pontojornada');
    const pontoJornada = pontoJornadaRaw
      ? pontoJornadaRaw.toLowerCase().includes('dia')
        ? pontoJornadaRaw
        : `${pontoJornadaRaw} dias`
      : '30 dias';

    const controlId = (item.controlId || '').trim();
    const actionLabel =
      item.actionId?.name || item.actionName || 'B2C | Microlins - NPS';
    const origemMeta = findMeta('origem').toLowerCase();

    const isPortalWidget =
      actionLabel.toLowerCase().includes('widget') ||
      origemMeta.includes('portal') ||
      item.channel === 'widget';

    const origem: 'Portal do Aluno' | 'E-mail' = isPortalWidget
      ? 'Portal do Aluno'
      : 'E-mail';

    activeByContrato.set(matchedStudent.contrato, {
      id: String(item._id || controlId || matchedStudent.contrato),
      controlId,
      studentName: matchedStudent.nomeCompleto,
      contrato: matchedStudent.contrato,
      codigoPessoa,
      email: (item.email || matchedStudent.email || '').toLowerCase().trim(),
      phone: (item.phone || matchedStudent.telefone || '').trim(),
      actionName: actionLabel.trim(),
      pontoJornada,
      origem,
      channel: isPortalWidget ? 'widget' : 'email',
      invitationStatus: 'ativo',
      answered: false,
      createdAt: item.createdAt || new Date().toISOString(),
      surveyUrl: controlId
        ? `https://indecx.com/s/${controlId}`
        : 'https://v3.app-indecx.com/dashboard/customerlist',
    });
  }

  return Array.from(activeByContrato.values());
}

async function syncActiveIndecxNpsInvitations(
  currentKanbanRecords: StudentPerformanceRecord[]
): Promise<{
  invitations: ActiveNpsInvitation[];
  source: 'INDECX_LIVE_VERIFIED' | 'LOCAL_CACHE_SYNC';
}> {
  const now = Date.now();
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

  const fetchClientsPage = async (bearerToken: string, page: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    try {
      const url = `https://indecx.com/v2/clients/list?page=${page}&limit=500&totalSize=0&startDate=2025-01-01&endDate=2026-12-31&metric=nps-0-10&groupId=${INDECX_DEFAULT_GROUP_ID}&indicatorRange=%7B%22start%22%3Anull%2C%22end%22%3Anull%2C%22selected%22%3Anull%7D&customFilters=%7B%7D&companyId=${indecxSession.companyId}&lang=br&systemLanguage=br`;
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
    let response1 = await fetchClientsPage(token, 1);
    if (response1.status === 401 || response1.status === 403) {
      token = await authenticateIndecxSession(true);
      if (token) {
        response1 = await fetchClientsPage(token, 1);
      }
    }

    if (response1.ok && token) {
      const [payload1, res2, res3] = await Promise.all([
        response1.json() as Promise<{ items?: RawIndecxClientItem[]; list?: RawIndecxClientItem[] }>,
        fetchClientsPage(token, 2).catch(() => null),
        fetchClientsPage(token, 3).catch(() => null),
      ]);
      const payload2 =
        res2 && res2.ok
          ? ((await res2.json()) as { items?: RawIndecxClientItem[]; list?: RawIndecxClientItem[] })
          : {};
      const payload3 =
        res3 && res3.ok
          ? ((await res3.json()) as { items?: RawIndecxClientItem[]; list?: RawIndecxClientItem[] })
          : {};

      const allRawItems: RawIndecxClientItem[] = [
        ...(Array.isArray(payload1.items)
          ? payload1.items
          : Array.isArray(payload1.list)
          ? payload1.list
          : []),
        ...(Array.isArray(payload2.items)
          ? payload2.items
          : Array.isArray(payload2.list)
          ? payload2.list
          : []),
        ...(Array.isArray(payload3.items)
          ? payload3.items
          : Array.isArray(payload3.list)
          ? payload3.list
          : []),
      ];

      if (allRawItems.length > 0) {
        const mapped = mapAndDeduplicateActiveInvitations(
          allRawItems,
          currentKanbanRecords
        );
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
      const portalResult = await syncLivePortalRecords();
      const npsResult = await syncActiveIndecxNpsInvitations(portalResult.records);

      res.json({
        ok: true,
        source: portalResult.source,
        npsSource: npsResult.source,
        syncedAt: syncTime.timeStr,
        syncedDate: syncTime.dateStr,
        syncedFormatted: syncTime.formatted,
        intervalSeconds: 60,
        metadata: {
          ...portalSession.cachedMetadata,
          dataReferencia: syncTime.dateStr,
          horaExtracao: syncTime.timeStr,
        },
        records: portalResult.records,
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
          ...portalSession.cachedMetadata,
          dataReferencia: syncTime.dateStr,
          horaExtracao: syncTime.timeStr,
        },
        records: portalSession.cachedRecords,
        activeNpsInvitations: indecxSession.cachedActiveInvitations,
      });
    }
  });

  // Dedicated endpoint for active NPS invitations (sanitized, no credentials or tokens ever exposed)
  app.get('/api/nps/active', async (_req, res) => {
    const syncTime = formatBrasiliaSyncTimestamp(new Date());
    const npsResult = await syncActiveIndecxNpsInvitations(
      portalSession.cachedRecords
    );
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
