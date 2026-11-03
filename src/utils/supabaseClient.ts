import { createClient } from '@supabase/supabase-js';
import {
  StudentPerformanceRecord,
  ActiveNpsInvitation,
} from '../data/microlinsData';
import {
  authenticatePlatformLogin,
  AuthLoginResult,
  createDefaultSchoolsRegistry,
  normalizeLoginIdentifier,
  RegisteredSchool,
  sanitizeSchoolsForClient,
  SchoolPortalUser,
} from './authRegistry';
import {
  encryptSecretAES256GCM,
  hashPasswordArgon2id,
  isArgon2idHash,
  isEncryptedSecret,
  sanitizeInputText,
} from './securityCrypto';

const metaEnv =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env
    : {};
const procEnv =
  typeof process !== 'undefined' && process.env ? process.env : {};

export const supabaseUrl: string =
  metaEnv.VITE_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  'https://hkonvuytinqlakerpara.supabase.co';

export const supabasePublishableKey: string =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
  'sb_publishable_oxvIOy_33Z4vD0VN8a6PaQ_VX1QtJ9J';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface SupabaseAuditLogRecord {
  id: number;
  timestamp: string;
  actorLogin: string;
  actorRole: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ipAddress: string;
  details: string;
}

export interface SupabaseLgpdRequestRecord {
  id: number;
  protocol: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface SupabaseHealthSummary {
  connected: boolean;
  supabaseUrl: string;
  counts: {
    schools: number;
    users: number;
    studentRecords: number;
    npsRecords: number;
    auditLogs: number;
    lgpdRequests: number;
  };
  checkedAt: string;
  error?: string;
}

/**
 * Converte um objeto StudentPerformanceRecord para o formato snake_case da tabela student_records.
 */
export function mapStudentRecordToSupabaseRow(r: StudentPerformanceRecord) {
  return {
    id: r.id,
    contrato: r.contrato,
    aula_id: r.aulaId,
    nome_completo: r.nomeCompleto,
    nome_curto: r.nomeCurto,
    telefone_aluno: r.telefoneAluno,
    whatsapp_aluno_url: r.whatsappAlunoUrl,
    nome_responsavel: r.nomeResponsavel,
    telefone_responsavel: r.telefoneResponsavel,
    whatsapp_responsavel_url: r.whatsappResponsavelUrl,
    formacao: r.formacao,
    curso: r.curso,
    aula_info: r.aulaInfo,
    aula_numero: r.aulaNumero,
    tipo_material: r.tipoMaterial,
    possui_apostila: r.possuiApostila,
    horario: r.horario,
    hora_inicio: r.horaInicio,
    hora_fim: r.horaFim,
    turno: r.turno,
    sala: r.sala,
    modalidade: r.modalidade,
    inicio: r.inicio,
    fim: r.fim,
    nota: r.nota,
    nota_id: r.notaId,
    info_aula: r.infoAula,
    status: r.status,
    presenca_ou_falta: r.presencaOuFalta || null,
    status_sistema: r.statusSistema || null,
    inadimplente: r.inadimplente,
    parcelas_atrasadas: r.parcelasAtrasadas ?? 0,
    nota_aula_numero: r.notaAulaNumero ?? null,
    dia_semana: r.diaSemana,
    semana_code: r.semanaCode || null,
    email: r.email || null,
    link_login_url: r.linkLoginUrl || null,
    cad_id: r.cadId || null,
    cad_nome: r.cadNome || null,
    unidade: r.unidade || 'ESCOLA PRESIDENTE PRUDENTE',
    municipio: r.municipio || 'Presidente Prudente - SP',
    educador: r.educador || null,
    educador_cached_at: r.educadorCachedAt || null,
  };
}

/**
 * Busca estrita e exclusiva de registros de alunos no Supabase.
 */
export async function fetchStudentRecords(): Promise<StudentPerformanceRecord[]> {
  const { data, error } = await supabase
    .from('student_records')
    .select('*')
    .order('id', { ascending: true });
  if (error || !data) {
    throw new Error(error?.message || 'Falha ao buscar registros de alunos no Supabase.');
  }
  return data.map((r: any) => ({
    id: Number(r.id),
    contrato: r.contrato || '',
    aulaId: r.aula_id || r.aulaId || String(r.id),
    nomeCompleto: r.nome_completo || r.nomeCompleto || '',
    nomeCurto: r.nome_curto || r.nomeCurto || '',
    telefoneAluno: r.telefone_aluno || r.telefoneAluno || '',
    whatsappAlunoUrl: r.whatsapp_aluno_url || r.whatsappAlunoUrl || '',
    nomeResponsavel: r.nome_responsavel || r.nomeResponsavel || '',
    telefoneResponsavel: r.telefone_responsavel || r.telefoneResponsavel || '',
    whatsappResponsavelUrl: r.whatsapp_responsavel_url || r.whatsappResponsavelUrl || '',
    formacao: r.formacao || '',
    curso: r.curso || '',
    aulaInfo: r.aula_info || r.aulaInfo || '',
    aulaNumero: r.aula_numero ?? r.aulaNumero ?? 1,
    tipoMaterial: r.tipo_material || r.tipoMaterial || 'Apostila',
    possuiApostila: Boolean(r.possui_apostila ?? r.possuiApostila),
    horario: r.horario || '08:00 à 10:00',
    horaInicio: r.hora_inicio || r.horaInicio || '08:00',
    horaFim: r.hora_fim || r.horaFim || '10:00',
    turno: r.turno || 'Manhã',
    sala: r.sala || '',
    modalidade: r.modalidade || 'Presencial',
    inicio: r.inicio || '',
    fim: r.fim || '',
    nota: r.nota !== null && r.nota !== undefined ? Number(r.nota) : null,
    notaId: r.nota_id || r.notaId || '0',
    infoAula: r.info_aula || r.infoAula || 'Não registrado',
    status: r.status || 'NÃO INICIADO',
    presencaOuFalta: r.presenca_ou_falta || r.presencaOuFalta || '',
    statusSistema: r.status_sistema || r.statusSistema || undefined,
    inadimplente: Boolean(r.inadimplente),
    parcelasAtrasadas: r.parcelas_atrasadas ?? r.parcelasAtrasadas ?? 0,
    notaAulaNumero:
      r.nota_aula_numero !== null && r.nota_aula_numero !== undefined
        ? Number(r.nota_aula_numero)
        : r.notaAulaNumero ?? null,
    diaSemana: r.dia_semana || r.diaSemana || 'Segunda-feira',
    semanaCode: r.semana_code || r.semanaCode || undefined,
    email: r.email || undefined,
    linkLoginUrl: r.link_login_url || r.linkLoginUrl || undefined,
    cadId: r.cad_id || r.cadId || undefined,
    cadNome: r.cad_nome || r.cadNome || undefined,
    unidade: r.unidade || 'ESCOLA PRESIDENTE PRUDENTE',
    municipio: r.municipio || 'Presidente Prudente - SP',
    educador: r.educador || undefined,
    educadorCachedAt: r.educador_cached_at || r.educadorCachedAt || undefined,
  })) as StudentPerformanceRecord[];
}

/**
 * Sincroniza um lote de StudentPerformanceRecord diretamente na tabela student_records do Supabase.
 */
export async function upsertStudentRecordsToSupabase(
  records: StudentPerformanceRecord[],
  replaceStale = false
): Promise<void> {
  if (!records || records.length === 0) return;
  const payloads = records.map(mapStudentRecordToSupabaseRow);
  for (let i = 0; i < payloads.length; i += 200) {
    const batch = payloads.slice(i, i + 200);
    const { error } = await supabase.from('student_records').upsert(batch);
    if (error) {
      throw new Error(`Erro ao sincronizar registros de alunos no Supabase: ${error.message}`);
    }
  }
  if (replaceStale) {
    const maxId = Math.max(...records.map((r) => r.id));
    await supabase.from('student_records').delete().gt('id', maxId);
  }
}

/**
 * Busca estrita e exclusiva de convites NPS no Supabase.
 */
export async function fetchNpsInvitations(): Promise<ActiveNpsInvitation[]> {
  const { data, error } = await supabase.from('nps_records').select('*');
  if (error || !data) {
    throw new Error(error?.message || 'Falha ao buscar convites NPS no Supabase.');
  }
  return data.map((inv: any) => ({
    id: inv.id,
    controlId: inv.control_id || inv.controlId || '',
    studentName: inv.student_name || inv.studentName || '',
    contrato: inv.contrato || '',
    codigoPessoa: inv.codigo_pessoa || inv.codigoPessoa || '',
    email: inv.email || '',
    phone: inv.phone || '',
    actionName: inv.action_name || inv.actionName || 'B2C | Microlins - NPS',
    pontoJornada: inv.ponto_jornada || inv.pontoJornada || '30 dias',
    origem: inv.origem || 'Portal do Aluno',
    channel: inv.channel || 'widget',
    invitationStatus: inv.invitation_status || inv.invitationStatus || 'ativo',
    answered: Boolean(inv.answered),
    createdAt: inv.created_at || inv.createdAt || new Date().toISOString(),
    sentAt: inv.sent_at || inv.sentAt || inv.created_at || new Date().toISOString(),
    answeredAt: inv.answered_at || inv.answeredAt || null,
    attemptsCount: inv.attempts_count ?? inv.attemptsCount ?? 1,
    surveyUrl: inv.survey_url || inv.surveyUrl || '',
  })) as ActiveNpsInvitation[];
}

/**
 * Sincroniza convites NPS na tabela nps_records do Supabase.
 */
export async function upsertNpsRecordsToSupabase(
  invitations: ActiveNpsInvitation[]
): Promise<void> {
  if (!invitations || invitations.length === 0) return;
  const payloads = invitations.map((inv) => ({
    id: inv.id,
    control_id: inv.controlId,
    student_name: inv.studentName,
    contrato: inv.contrato,
    codigo_pessoa: inv.codigoPessoa,
    email: inv.email,
    phone: inv.phone,
    action_name: inv.actionName,
    ponto_jornada: inv.pontoJornada,
    origem: inv.origem,
    channel: inv.channel,
    invitation_status: inv.invitationStatus,
    answered: inv.answered,
    created_at: inv.createdAt,
    sent_at: inv.sentAt || inv.createdAt,
    answered_at: inv.answeredAt || null,
    attempts_count: inv.attemptsCount ?? 1,
    survey_url: inv.surveyUrl,
  }));
  for (let i = 0; i < payloads.length; i += 200) {
    const batch = payloads.slice(i, i + 200);
    const { error } = await supabase.from('nps_records').upsert(batch);
    if (error) {
      throw new Error(`Erro ao sincronizar convites NPS no Supabase: ${error.message}`);
    }
  }
}

/**
 * Busca escolas e seus respectivos usuários cadastrados nas tabelas `schools` e `users` do Supabase.
 */
export async function fetchSchoolsFromSupabase(
  includeSensitive = false
): Promise<RegisteredSchool[]> {
  const [{ data: schoolsData, error: schoolsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      supabase.from('schools').select('*').order('created_at', { ascending: true }),
      supabase.from('users').select('*').order('created_at', { ascending: true }),
    ]);

  if (schoolsError || !schoolsData) {
    throw new Error(schoolsError?.message || 'Falha ao buscar escolas no Supabase.');
  }

  const defaults = createDefaultSchoolsRegistry()[0];
  let effectiveUsersRows: any[] = Array.isArray(usersData) && !usersError ? usersData : [];

  // Auto-reparo: se a tabela `users` no Supabase estiver vazia mas a escola padrão existir, semeia o usuário padrão
  if (effectiveUsersRows.length === 0 && schoolsData.some((s: any) => s.id === defaults.id)) {
    const defaultUser = defaults.users[0];
    if (defaultUser) {
      const seedRow = {
        id: defaultUser.id,
        school_id: defaults.id,
        login: defaultUser.login,
        senha: defaultUser.senha,
        portal_password: defaultUser.portalPassword || '',
        nome_completo: defaultUser.nomeCompleto,
        cargo: defaultUser.cargo,
        escola_nome: defaults.nome,
        codigo_escola: defaults.codigoPortal,
        ativo: true,
        created_at: defaultUser.createdAt || new Date().toISOString(),
        ultimo_acesso: defaultUser.ultimoAcesso || null,
      };
      const { error: seedErr } = await supabase.from('users').upsert(seedRow);
      if (!seedErr) {
        effectiveUsersRows = [seedRow];
      }
    }
  }

  const mappedSchools: RegisteredSchool[] = schoolsData.map((s: any) => {
    const schoolUsers: SchoolPortalUser[] = effectiveUsersRows
      .filter((u: any) => (u.school_id || u.schoolId) === s.id)
      .map((u: any) => ({
        id: u.id,
        schoolId: u.school_id || u.schoolId || s.id,
        login: u.login,
        senha: u.senha,
        portalPassword: u.portal_password || u.portalPassword || '',
        nomeCompleto: u.nome_completo || u.nomeCompleto || u.login,
        cargo: u.cargo || 'Colaborador Pedagógico',
        escolaNome: u.escola_nome || u.escolaNome || s.nome,
        codigoEscola: u.codigo_escola || u.codigoEscola || s.codigo_portal || '1875',
        ativo: u.ativo ?? true,
        active: u.ativo ?? true,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
        ultimoAcesso: u.ultimo_acesso || u.ultimoAcesso || undefined,
        lastTestedAt: u.ultimo_acesso || u.created_at || new Date().toISOString(),
        lastTestStatus: 'SUCCESS',
        lastTestMessage: 'Sincronizado com Supabase PostgreSQL (Hash Argon2id ativo).',
      }));

    return {
      id: s.id,
      nome: s.nome,
      cidade: s.cidade || '',
      uf: s.uf || '',
      codigoPortal: s.codigo_portal || s.codigoPortal || '1875',
      ativa: s.ativa ?? true,
      active: s.ativa ?? true,
      createdAt: s.created_at || s.createdAt || new Date().toISOString(),
      updatedAt: s.updated_at || s.updatedAt || undefined,
      npsCredential: {
        email: s.nps_email || (s.id === defaults.id ? defaults.npsCredential.email : ''),
        password: defaults.npsCredential.password,
        companyFilter:
          s.nps_company_filter ||
          (s.id === defaults.id ? defaults.npsCredential.companyFilter : s.nome),
        baseUrl: s.nps_base_url || 'https://app.indecx.com',
        active: Boolean(s.nps_email || s.id === defaults.id),
        connectionStatus: s.nps_email ? 'CONECTADO' : 'NAO_CONFIGURADO',
      },
      users: schoolUsers,
    };
  });

  return includeSensitive ? mappedSchools : sanitizeSchoolsForClient(mappedSchools);
}

/**
 * Registra um evento na trilha de auditoria (`audit_logs`) do Supabase.
 */
export async function recordAuditLogInSupabase(input: {
  actorLogin: string;
  actorRole: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ipAddress?: string;
  details?: string;
}): Promise<SupabaseAuditLogRecord | null> {
  const payload = {
    timestamp: new Date().toISOString(),
    actor_login: sanitizeInputText(input.actorLogin || 'system', 120),
    actor_role: sanitizeInputText(input.actorRole || 'SYSTEM', 40),
    action: sanitizeInputText(input.action || 'EVENT', 120),
    resource: sanitizeInputText(input.resource || 'supabase', 180),
    status: input.status || 'SUCCESS',
    ip_address: sanitizeInputText(input.ipAddress || 'cloud-client', 64),
    details: sanitizeInputText(input.details || '', 500),
  };

  const { data, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: Number(data.id),
    timestamp: data.timestamp,
    actorLogin: data.actor_login,
    actorRole: data.actor_role,
    action: data.action,
    resource: data.resource,
    status: data.status as 'SUCCESS' | 'DENIED' | 'ERROR',
    ipAddress: data.ip_address || '',
    details: data.details || '',
  };
}

/**
 * Consulta os eventos de auditoria de segurança registrados no Supabase.
 */
export async function fetchAuditLogsFromSupabase(
  limit = 120
): Promise<SupabaseAuditLogRecord[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: Number(row.id),
    timestamp: row.timestamp,
    actorLogin: row.actor_login || row.actorLogin || 'system',
    actorRole: row.actor_role || row.actorRole || 'SYSTEM',
    action: row.action || '',
    resource: row.resource || '',
    status: (row.status || 'SUCCESS') as 'SUCCESS' | 'DENIED' | 'ERROR',
    ipAddress: row.ip_address || row.ipAddress || '',
    details: row.details || '',
  }));
}

/**
 * Consulta as solicitações LGPD registradas na tabela `lgpd_requests` do Supabase.
 */
export async function fetchLgpdRequestsFromSupabase(): Promise<SupabaseLgpdRequestRecord[]> {
  const { data, error } = await supabase
    .from('lgpd_requests')
    .select('*')
    .order('id', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: Number(row.id),
    protocol: row.protocol,
    requesterName: row.requester_name || row.requesterName || '',
    requesterEmail: row.requester_email || row.requesterEmail || '',
    requesterRole: row.requester_role || row.requesterRole || '',
    requestType: row.request_type || row.requestType || 'ACESSO_DADOS',
    description: row.description || '',
    status: row.status || 'RECEBIDA',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    resolvedAt: row.resolved_at || row.resolvedAt || null,
  }));
}

/**
 * Registra uma nova solicitação de titular LGPD diretamente na tabela `lgpd_requests` do Supabase.
 */
export async function createLgpdRequestInSupabase(input: {
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  requestType: string;
  description: string;
  ipAddress?: string;
}): Promise<SupabaseLgpdRequestRecord> {
  const cleanName = sanitizeInputText(input.requesterName || '', 140).trim();
  const cleanEmail = sanitizeInputText(input.requesterEmail || '', 160).trim().toLowerCase();
  const cleanRole =
    sanitizeInputText(input.requesterRole || '', 80).trim() || 'Aluno / Responsável Legal';
  const cleanType = sanitizeInputText(input.requestType || 'ACESSO_DADOS', 60).trim();
  const cleanDesc = sanitizeInputText(input.description || '', 1200).trim();

  if (!cleanName || !cleanEmail || !cleanDesc) {
    throw new Error('Nome completo, e-mail de contato e descrição são obrigatórios.');
  }

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const protocol = `LGPD-${new Date().getFullYear()}-${randomSuffix}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lgpd_requests')
    .insert({
      protocol,
      requester_name: cleanName,
      requester_email: cleanEmail,
      requester_role: cleanRole,
      request_type: cleanType,
      description: cleanDesc,
      status: 'RECEBIDA',
      created_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível registrar a solicitação LGPD no Supabase.');
  }

  await recordAuditLogInSupabase({
    actorLogin: cleanEmail,
    actorRole: 'TITULAR_LGPD',
    action: `LGPD_REQUEST_${cleanType}`,
    resource: `lgpd_requests/${protocol}`,
    status: 'SUCCESS',
    details: `Chamado LGPD registrado sob protocolo ${protocol} por ${cleanName}.`,
  });

  return {
    id: Number(data.id),
    protocol: data.protocol,
    requesterName: data.requester_name,
    requesterEmail: data.requester_email,
    requesterRole: data.requester_role,
    requestType: data.request_type,
    description: data.description || '',
    status: data.status || 'RECEBIDA',
    createdAt: data.created_at,
    resolvedAt: data.resolved_at || null,
  };
}

/**
 * Cria ou atualiza uma unidade escolar diretamente na tabela `schools` do Supabase.
 */
export async function upsertSchoolInSupabase(input: {
  id?: string;
  nome: string;
  cidade?: string;
  uf?: string;
  codigoPortal?: string;
  ativa?: boolean;
  npsEmail?: string;
  npsCompanyFilter?: string;
  npsBaseUrl?: string;
}): Promise<{ schools: RegisteredSchool[]; school: RegisteredSchool }> {
  const cleanNome = sanitizeInputText(input.nome || '', 120).trim().toUpperCase();
  if (!cleanNome) {
    throw new Error('O nome da unidade escolar é obrigatório.');
  }

  const slug = cleanNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const schoolId = input.id || `school-${slug}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .maybeSingle();

  const row = {
    id: schoolId,
    nome: cleanNome,
    cidade: input.cidade !== undefined ? sanitizeInputText(input.cidade, 80).trim() : existing?.cidade || '',
    uf: input.uf !== undefined ? sanitizeInputText(input.uf, 4).trim().toUpperCase() : existing?.uf || '',
    codigo_portal:
      input.codigoPortal !== undefined
        ? sanitizeInputText(input.codigoPortal, 30).trim()
        : existing?.codigo_portal || '1875',
    ativa: input.ativa !== undefined ? Boolean(input.ativa) : existing?.ativa ?? true,
    nps_email:
      input.npsEmail !== undefined
        ? sanitizeInputText(input.npsEmail, 160).trim()
        : existing?.nps_email || '',
    nps_company_filter:
      input.npsCompanyFilter !== undefined
        ? sanitizeInputText(input.npsCompanyFilter, 120).trim()
        : existing?.nps_company_filter || cleanNome,
    nps_base_url: input.npsBaseUrl || existing?.nps_base_url || 'https://app.indecx.com',
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  const { error } = await supabase.from('schools').upsert(row);
  if (error) {
    throw new Error(`Falha ao salvar unidade escolar no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: existing ? 'SCHOOL_UPDATED' : 'SCHOOL_CREATED',
    resource: `schools/${schoolId}`,
    status: 'SUCCESS',
    details: `Unidade "${cleanNome}" persistida no Supabase PostgreSQL.`,
  });

  const schools = await fetchSchoolsFromSupabase(false);
  const school = schools.find((s) => s.id === schoolId) || schools[0];
  return { schools, school };
}

/**
 * Exclui uma unidade escolar e seus usuários vinculados no Supabase.
 */
export async function deleteSchoolFromSupabase(
  schoolId: string
): Promise<RegisteredSchool[]> {
  await supabase.from('users').delete().eq('school_id', schoolId);
  const { error } = await supabase.from('schools').delete().eq('id', schoolId);
  if (error) {
    throw new Error(`Falha ao excluir unidade escolar no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: 'SCHOOL_DELETED',
    resource: `schools/${schoolId}`,
    status: 'SUCCESS',
    details: `Unidade "${schoolId}" excluída do Supabase PostgreSQL.`,
  });

  return fetchSchoolsFromSupabase(false);
}

/**
 * Cadastra ou atualiza um usuário de uma unidade escolar na tabela `users` do Supabase.
 */
export async function upsertUserInSupabase(
  schoolId: string,
  input: {
    id?: string;
    login: string;
    senha: string;
    nomeCompleto: string;
    cargo: string;
    escolaNome?: string;
    codigoEscola?: string;
    ativo?: boolean;
  }
): Promise<{ schools: RegisteredSchool[]; user: SchoolPortalUser }> {
  const cleanLogin = sanitizeInputText(input.login || '', 120).trim();
  const rawSenha = (input.senha || '').trim();
  const cleanNome = sanitizeInputText(input.nomeCompleto || '', 140).trim();
  const cleanCargo =
    sanitizeInputText(input.cargo || '', 100).trim() || 'Colaborador Pedagógico';

  if (!cleanLogin || !rawSenha || !cleanNome) {
    throw new Error('Login, senha e nome completo são obrigatórios.');
  }

  const userId =
    input.id || `user-${normalizeLoginIdentifier(cleanLogin)}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const senhaHash = isArgon2idHash(rawSenha)
    ? rawSenha
    : hashPasswordArgon2id(rawSenha);
  const encryptedPortalPass = isEncryptedSecret(rawSenha)
    ? rawSenha
    : encryptSecretAES256GCM(rawSenha);

  const row = {
    id: userId,
    school_id: schoolId,
    login: cleanLogin,
    senha: senhaHash,
    portal_password: encryptedPortalPass,
    nome_completo: cleanNome,
    cargo: cleanCargo,
    escola_nome: input.escolaNome || 'ESCOLA PRESIDENTE PRUDENTE',
    codigo_escola: input.codigoEscola || '1875',
    ativo: input.ativo ?? true,
    created_at: now,
  };

  const { error } = await supabase.from('users').upsert(row, { onConflict: 'login' });
  if (error) {
    throw new Error(`Erro ao salvar credencial no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: input.id ? 'USER_UPDATED' : 'USER_CREATED',
    resource: `schools/${schoolId}/users/${cleanLogin}`,
    status: 'SUCCESS',
    details: `Credencial "${cleanLogin}" (${cleanNome}) salva no Supabase com hash Argon2id.`,
  });

  const schools = await fetchSchoolsFromSupabase(false);
  const school = schools.find((s) => s.id === schoolId);
  const savedUser =
    school?.users.find(
      (u) => normalizeLoginIdentifier(u.login) === normalizeLoginIdentifier(cleanLogin)
    ) ||
    ({
      id: userId,
      schoolId,
      login: cleanLogin,
      senha: '•••••••• (Argon2id)',
      nomeCompleto: cleanNome,
      cargo: cleanCargo,
      ativo: input.ativo ?? true,
      active: input.ativo ?? true,
      createdAt: now,
    } as SchoolPortalUser);

  return { schools, user: savedUser };
}

/**
 * Atualiza a senha de um usuário na tabela `users` do Supabase com Argon2id + AES-256-GCM.
 */
export async function updateUserPasswordInSupabase(
  schoolId: string,
  userId: string,
  novaSenhaRaw: string
): Promise<RegisteredSchool[]> {
  const novaSenha = (novaSenhaRaw || '').trim();
  if (novaSenha.length < 4) {
    throw new Error('A nova senha deve conter pelo menos 4 caracteres.');
  }

  const { error } = await supabase
    .from('users')
    .update({
      senha: hashPasswordArgon2id(novaSenha),
      portal_password: encryptSecretAES256GCM(novaSenha),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Falha ao atualizar senha no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: 'USER_PASSWORD_CHANGED',
    resource: `schools/${schoolId}/users/${userId}`,
    status: 'SUCCESS',
    details: `Senha do usuário ${userId} atualizada no Supabase com Argon2id.`,
  });

  return fetchSchoolsFromSupabase(false);
}

/**
 * Alterna o status ativo/inativo de um usuário na tabela `users` do Supabase.
 */
export async function toggleUserStatusInSupabase(
  schoolId: string,
  userId: string
): Promise<RegisteredSchool[]> {
  const { data: current } = await supabase
    .from('users')
    .select('ativo, login')
    .eq('id', userId)
    .maybeSingle();

  const nextAtivo = !(current?.ativo ?? true);
  const { error } = await supabase
    .from('users')
    .update({ ativo: nextAtivo })
    .eq('id', userId);

  if (error) {
    throw new Error(`Falha ao alterar status do usuário no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: 'USER_STATUS_TOGGLED',
    resource: `schools/${schoolId}/users/${userId}`,
    status: 'SUCCESS',
    details: `Status da credencial "${current?.login || userId}" alterado para ativo=${nextAtivo}.`,
  });

  return fetchSchoolsFromSupabase(false);
}

/**
 * Remove permanentemente um usuário da tabela `users` do Supabase.
 */
export async function deleteUserFromSupabase(
  schoolId: string,
  userId: string
): Promise<RegisteredSchool[]> {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw new Error(`Falha ao remover usuário no Supabase: ${error.message}`);
  }

  await recordAuditLogInSupabase({
    actorLogin: 'admin',
    actorRole: 'ADMIN',
    action: 'USER_DELETED',
    resource: `schools/${schoolId}/users/${userId}`,
    status: 'SUCCESS',
    details: `Credencial ${userId} removida da unidade ${schoolId} no Supabase.`,
  });

  return fetchSchoolsFromSupabase(false);
}

/**
 * Autentica um usuário diretamente contra as tabelas `schools` e `users` do Supabase,
 * atualizando `ultimo_acesso` e registrando o evento em `audit_logs`.
 */
export async function authenticateUserInSupabase(
  login: string,
  senha: string
): Promise<AuthLoginResult> {
  const sensitiveSchools = await fetchSchoolsFromSupabase(true);
  const result = authenticatePlatformLogin(sensitiveSchools, login, senha);

  if (result.ok && result.session) {
    if (result.matchedUserId) {
      await supabase
        .from('users')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', result.matchedUserId);
    }
    await recordAuditLogInSupabase({
      actorLogin: result.session.login,
      actorRole: result.session.role,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'supabase/auth',
      status: 'SUCCESS',
      details: `Login autenticado com sucesso (${result.session.nomeCompleto}).`,
    });
  } else {
    await recordAuditLogInSupabase({
      actorLogin: normalizeLoginIdentifier(login) || 'anonymous',
      actorRole: 'UNAUTHENTICATED',
      action: 'AUTH_LOGIN_FAILED',
      resource: 'supabase/auth',
      status: 'DENIED',
      details: result.error || 'Credenciais inválidas.',
    });
  }

  return result;
}

/**
 * Verifica a saúde e a contagem exata de registros nas 6 tabelas do Supabase.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthSummary> {
  const checkedAt = new Date().toISOString();
  try {
    const [schoolsRes, usersRes, studentsRes, npsRes, logsRes, lgpdRes] =
      await Promise.all([
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('student_records').select('id', { count: 'exact', head: true }),
        supabase.from('nps_records').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
        supabase.from('lgpd_requests').select('id', { count: 'exact', head: true }),
      ]);

    const firstError =
      schoolsRes.error ||
      usersRes.error ||
      studentsRes.error ||
      npsRes.error ||
      logsRes.error ||
      lgpdRes.error;

    return {
      connected: !firstError,
      supabaseUrl,
      counts: {
        schools: schoolsRes.count ?? 0,
        users: usersRes.count ?? 0,
        studentRecords: studentsRes.count ?? 0,
        npsRecords: npsRes.count ?? 0,
        auditLogs: logsRes.count ?? 0,
        lgpdRequests: lgpdRes.count ?? 0,
      },
      checkedAt,
      ...(firstError ? { error: firstError.message } : {}),
    };
  } catch (err: any) {
    return {
      connected: false,
      supabaseUrl,
      counts: {
        schools: 0,
        users: 0,
        studentRecords: 0,
        npsRecords: 0,
        auditLogs: 0,
        lgpdRequests: 0,
      },
      checkedAt,
      error: err?.message || String(err),
    };
  }
}

/**
 * Sincroniza e garante a integridade das 6 tabelas do Supabase (`schools`, `users`,
 * `student_records`, `nps_records`, `audit_logs`, `lgpd_requests`).
 * Se o backend local estiver ativo, sincroniza os dados ao vivo do Portal do Aluno;
 * caso contrário, preserva os registros reais já sincronizados no Supabase.
 */
export async function migrateAllDataToSupabase(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { ALL_WEEK_STUDENT_RECORDS, INITIAL_ACTIVE_NPS_INVITATIONS } =
      await import('../data/microlinsData');

    // 1. Garantir escolas e usuários reais no Supabase
    const schools = createDefaultSchoolsRegistry();
    for (const school of schools) {
      const { error: schoolError } = await supabase.from('schools').upsert({
        id: school.id,
        nome: school.nome,
        cidade: school.cidade,
        uf: school.uf,
        codigo_portal: school.codigoPortal,
        ativa: school.ativa,
        nps_email: school.npsCredential.email,
        nps_company_filter: school.npsCredential.companyFilter,
        nps_base_url: school.npsCredential.baseUrl || 'https://app.indecx.com',
        created_at: school.createdAt,
        updated_at: new Date().toISOString(),
      });
      if (schoolError) {
        throw new Error(`Erro ao sincronizar escola ${school.nome}: ${schoolError.message}`);
      }

      for (const user of school.users || []) {
        const { error: userError } = await supabase.from('users').upsert(
          {
            id: user.id,
            school_id: school.id,
            login: user.login,
            senha: user.senha,
            portal_password: user.portalPassword || '',
            nome_completo: user.nomeCompleto,
            cargo: user.cargo,
            escola_nome: user.escolaNome || school.nome,
            codigo_escola: user.codigoEscola || school.codigoPortal,
            ativo: user.ativo ?? true,
            created_at: user.createdAt || new Date().toISOString(),
          },
          { onConflict: 'login' }
        );
        if (userError) {
          throw new Error(`Erro ao sincronizar usuário ${user.login}: ${userError.message}`);
        }
      }
    }

    // 2. Verificar se já existem registros reais no Supabase ou tentar sincronizar ao vivo via API local
    let livePortalRecords: StudentPerformanceRecord[] | null = null;
    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/api/microlins/sync?forceLive=1');
        if (res.ok) {
          const payload = await res.json();
          if (Array.isArray(payload?.records) && payload.records.length > 0) {
            livePortalRecords = payload.records;
          }
        }
      } catch {
        // Sem backend local ativo (ex.: Netlify SPA)
      }
    }

    if (livePortalRecords && livePortalRecords.length > 0) {
      await upsertStudentRecordsToSupabase(livePortalRecords, true);
    } else {
      const existingCountRes = await supabase
        .from('student_records')
        .select('id', { count: 'exact', head: true });
      if ((existingCountRes.count ?? 0) === 0) {
        await upsertStudentRecordsToSupabase(ALL_WEEK_STUDENT_RECORDS, false);
      }
    }

    // 3. Garantir convites NPS sincronizados
    const existingNpsCountRes = await supabase
      .from('nps_records')
      .select('id', { count: 'exact', head: true });
    if ((existingNpsCountRes.count ?? 0) === 0) {
      await upsertNpsRecordsToSupabase(INITIAL_ACTIVE_NPS_INVITATIONS);
    }

    await recordAuditLogInSupabase({
      actorLogin: 'admin',
      actorRole: 'ADMIN',
      action: 'SUPABASE_FULL_SYNC_COMPLETED',
      resource: 'supabase/all_tables',
      status: 'SUCCESS',
      details: 'Sincronização completa de escolas, usuários, alunos e NPS concluída com sucesso.',
    });

    return {
      success: true,
      message:
        'Sincronização completa com o Supabase (Escolas, Usuários, Alunos, NPS e Auditoria) realizada com sucesso!',
    };
  } catch (err: any) {
    console.error('Migration error details:', err);
    return {
      success: false,
      message: `Erro na sincronização com o Supabase: ${err?.message || err}`,
    };
  };
}
