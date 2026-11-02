import { createClient } from '@supabase/supabase-js';
import {
  StudentPerformanceRecord,
  ActiveNpsInvitation,
} from '../data/microlinsData';
import { createDefaultSchoolsRegistry, RegisteredSchool } from './authRegistry';

const supabaseUrl = 'https://hkonvuytinqlakerpara.supabase.co';
const supabasePublishableKey = 'sb_publishable_oxvIOy_33Z4vD0VN8a6PaQ_VX1QtJ9J';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Busca estrita e exclusiva de registros de alunos no Supabase (sem fallbacks locais).
 */
export async function fetchStudentRecords(): Promise<StudentPerformanceRecord[]> {
  const { data, error } = await supabase.from('student_records').select('*');
  if (error || !data) {
    throw new Error(error?.message || 'Falha ao buscar registros de alunos no Supabase.');
  }
  return data.map((r: any) => ({
    id: r.id,
    contrato: r.contrato,
    aulaId: r.aula_id || r.aulaId,
    nomeCompleto: r.nome_completo || r.nomeCompleto,
    nomeCurto: r.nome_curto || r.nomeCurto,
    telefoneAluno: r.telefone_aluno || r.telefoneAluno,
    whatsappAlunoUrl: r.whatsapp_aluno_url || r.whatsappAlunoUrl,
    nomeResponsavel: r.nome_responsavel || r.nomeResponsavel,
    telefoneResponsavel: r.telefone_responsavel || r.telefoneResponsavel,
    whatsappResponsavelUrl: r.whatsapp_responsavel_url || r.whatsappResponsavelUrl,
    formacao: r.formacao,
    curso: r.curso,
    aulaInfo: r.aula_info || r.aulaInfo,
    aulaNumero: r.aula_numero ?? r.aulaNumero,
    tipoMaterial: r.tipo_material || r.tipoMaterial,
    possuiApostila: r.possui_apostila ?? r.possuiApostila,
    horario: r.horario,
    horaInicio: r.hora_inicio || r.horaInicio,
    horaFim: r.hora_fim || r.horaFim,
    turno: r.turno,
    sala: r.sala,
    modalidade: r.modalidade,
    inicio: r.inicio,
    fim: r.fim,
    nota: r.nota,
    notaId: r.nota_id || r.notaId,
    infoAula: r.info_aula || r.infoAula,
    status: r.status,
    presencaOuFalta: r.presenca_ou_falta || r.presencaOuFalta,
    statusSistema: r.status_sistema || r.statusSistema,
    inadimplente: r.inadimplente,
    parcelasAtrasadas: r.parcelas_atrasadas ?? r.parcelasAtrasadas,
    notaAulaNumero: r.nota_aula_numero ?? r.notaAulaNumero,
    diaSemana: r.dia_semana || r.diaSemana,
    semanaCode: r.semana_code || r.semanaCode,
    email: r.email,
    linkLoginUrl: r.link_login_url || r.linkLoginUrl,
    cadId: r.cad_id || r.cadId,
    cadNome: r.cad_nome || r.cadNome,
    unidade: r.unidade,
    municipio: r.municipio,
    educador: r.educador,
    educadorCachedAt: r.educador_cached_at || r.educadorCachedAt,
  })) as StudentPerformanceRecord[];
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
    controlId: inv.control_id || inv.controlId,
    studentName: inv.student_name || inv.studentName,
    contrato: inv.contrato,
    codigoPessoa: inv.codigo_pessoa || inv.codigoPessoa,
    email: inv.email,
    phone: inv.phone,
    actionName: inv.action_name || inv.actionName,
    pontoJornada: inv.ponto_jornada || inv.pontoJornada,
    origem: inv.origem,
    channel: inv.channel,
    invitationStatus: inv.invitation_status || inv.invitationStatus,
    answered: inv.answered,
    createdAt: inv.created_at || inv.createdAt,
    sentAt: inv.sent_at || inv.sentAt,
    answeredAt: inv.answered_at || inv.answeredAt,
    attemptsCount: inv.attempts_count ?? inv.attemptsCount,
    surveyUrl: inv.survey_url || inv.surveyUrl,
  })) as ActiveNpsInvitation[];
}

/**
 * Busca estrita e exclusiva de escolas cadastradas no Supabase.
 */
export async function fetchSchoolsFromSupabase(): Promise<RegisteredSchool[]> {
  const { data, error } = await supabase.from('schools').select('*');
  if (error || !data) {
    throw new Error(error?.message || 'Falha ao buscar escolas no Supabase.');
  }
  const defaults = createDefaultSchoolsRegistry()[0];
  return data.map((s: any) => ({
    id: s.id,
    nome: s.nome,
    cidade: s.cidade || '',
    uf: s.uf || '',
    codigoPortal: s.codigo_portal || s.codigoPortal || '',
    ativa: s.ativa ?? true,
    active: s.ativa ?? true,
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
    updatedAt: s.updated_at || s.updatedAt || undefined,
    npsCredential: {
      email: s.nps_email || defaults.npsCredential.email,
      password: s.nps_password || defaults.npsCredential.password,
      companyFilter: s.nps_company_filter || defaults.npsCredential.companyFilter,
      active: true,
    },
    users: defaults.users,
  }));
}

/**
 * Realiza a migração completa dos dados locais para as tabelas do Supabase.
 */
export async function migrateAllDataToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    const { ALL_WEEK_STUDENT_RECORDS, INITIAL_ACTIVE_NPS_INVITATIONS } = await import('../data/microlinsData');
    
    // 1. Migrar escolas
    const schools = createDefaultSchoolsRegistry();
    for (const school of schools) {
      const { error } = await supabase.from('schools').upsert({
        id: school.id,
        nome: school.nome,
        cidade: school.cidade,
        uf: school.uf,
        codigo_portal: school.codigoPortal,
        ativa: school.ativa,
        nps_email: school.npsCredential.email,
        nps_company_filter: school.npsCredential.companyFilter,
        created_at: school.createdAt,
      });
      if (error) {
        throw new Error(`Erro ao migrar escola ${school.nome}: ${error.message}`);
      }
    }

    // 2. Migrar estudantes em lotes
    const studentRecords = ALL_WEEK_STUDENT_RECORDS;
    const studentPayloads = studentRecords.map((r) => ({
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
      presenca_ou_falta: r.presencaOuFalta,
      status_sistema: r.statusSistema,
      inadimplente: r.inadimplente,
      parcelas_atrasadas: r.parcelasAtrasadas,
      nota_aula_numero: r.notaAulaNumero,
      dia_semana: r.diaSemana,
      semana_code: r.semanaCode,
      email: r.email,
      link_login_url: r.linkLoginUrl,
      cad_id: r.cadId,
      cad_nome: r.cadNome,
      unidade: r.unidade,
      municipio: r.municipio,
      educador: r.educador,
      educador_cached_at: r.educadorCachedAt,
    }));

    for (let i = 0; i < studentPayloads.length; i += 200) {
      const batch = studentPayloads.slice(i, i + 200);
      const { error } = await supabase.from('student_records').upsert(batch);
      if (error) {
        throw new Error(`Erro ao migrar lote de estudantes: ${error.message}`);
      }
    }

    // 3. Migrar convites NPS
    const npsRecords = INITIAL_ACTIVE_NPS_INVITATIONS;
    const npsPayloads = npsRecords.map((inv) => ({
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
      sent_at: inv.sentAt,
      answered_at: inv.answeredAt,
      attempts_count: inv.attemptsCount,
      survey_url: inv.surveyUrl,
    }));

    for (let i = 0; i < npsPayloads.length; i += 200) {
      const batch = npsPayloads.slice(i, i + 200);
      const { error } = await supabase.from('nps_records').upsert(batch);
      if (error) {
        throw new Error(`Erro ao migrar lote de NPS: ${error.message}`);
      }
    }

    return { success: true, message: 'Migração completa realizada com sucesso!' };
  } catch (err: any) {
    console.error('Migration error details:', err);
    return { success: false, message: `Erro na migração: ${err?.message || err}` };
  }
}
