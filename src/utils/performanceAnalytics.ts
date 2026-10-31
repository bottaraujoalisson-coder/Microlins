import {
  ActiveNpsInvitation,
  ClassStatus,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  ModalityType,
  NpsOrigemType,
  PORTAL_APOSTILA_BY_CONTRATO,
  PORTAL_AUTH_LINKS_BY_CONTRATO,
  PORTAL_METADATA,
  ShiftType,
  StudentPerformanceRecord,
} from '../data/microlinsData';

export type AttendanceStatus = 'Não iniciado' | 'Presença' | 'Falta';
export type QuickCardFilter = 'TODOS' | AttendanceStatus | 'EVASAO';

export const WEEKDAY_CHRONOLOGICAL_ORDER: readonly string[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export function normalizeStudentName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAvailableWeekdays(records: StudentPerformanceRecord[]): string[] {
  const present = new Set<string>();
  for (const r of records) {
    const day = (r.diaSemana || PORTAL_METADATA.diaSemana || '').trim();
    if (day) present.add(day);
  }
  return Array.from(present).sort((a, b) => {
    const idxA = WEEKDAY_CHRONOLOGICAL_ORDER.indexOf(a);
    const idxB = WEEKDAY_CHRONOLOGICAL_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'pt-BR');
  });
}

export interface EvaluatedStudentRecord extends StudentPerformanceRecord {
  professor: string;
  diaSemana: string;
  hourKey: string;
  moduloAtual: string;
  aulaAtualLabel: string;
  possuiApostila: boolean;
  linkAcessoDireto: string;
  whatsappResponsavelContactUrl: string;
  whatsappAlunoLoginUrl: string;
  attendanceStatus: AttendanceStatus;
  scheduledStartMinutes: number;
  toleranceEndMinutes: number;
  toleranceWindowLabel: string; // e.g. "14:00 às 14:15"
  isWithinTolerance: boolean;
  minutesRemainingInTolerance: number | null;
  presenceRegisteredAt: string;
  isEvasao: boolean;
  evasaoSummary: string | null;
  hasActiveNps: boolean;
  npsInvitation: ActiveNpsInvitation | null;
  npsOrigemFormatada: 'Portal do Aluno' | 'E-mail' | null;
  whatsappNpsUrl: string;
}

export interface EnrichedActiveNpsEntry {
  invitation: ActiveNpsInvitation;
  matchedInKanban: boolean;
  contrato: string | null;
  studentName: string;
  sala: string | null;
  modalidade: ModalityType | null;
  cursos: string[];
  agendamentosCount: number;
  agendamentosHorarios: string[];
  firstStudentRecordId: number | null;
  whatsappNpsUrl: string;
}

export interface FilterCriteria {
  search: string;
  professor?: string;
  sala?: string;
  diaSemana?: string;
  status: 'TODOS' | ClassStatus;
  attendanceFilter: QuickCardFilter;
  modalidade: 'TODAS' | ModalityType;
  turno: 'TODOS' | ShiftType;
  curso: string;
  horario: string;
  notaFilter: 'TODOS' | 'COM_NOTA' | 'SEM_NOTA' | 'NOTA_ALTA' | 'ATENCAO';
  apenasInadimplentes: boolean;
  sortBy: 'id' | 'nomeCompleto' | 'curso' | 'horario' | 'nota' | 'status';
  sortDir: 'asc' | 'desc';
}

export interface PerformanceKPIs {
  total: number;
  totalAgendamentos: number;
  totalAlunosUnicos: number;
  evasaoCount: number;
  npsAtivosCount: number;
  iniciados: number;
  naoIniciados: number;
  finalizados: number;
  presencaCount: number;
  faltaCount: number;
  aguardandoCount: number;
  mediaFrequencia: number;
  inadimplentes: number;
  presencialCount: number;
  onlineCount: number;
  comNotaCount: number;
  semNotaCount: number;
  mediaGeralNotas: number;
  taxaConclusao: number;
  taxaPresencaAtiva: number;
  notaMaxima: number;
  notaMinima: number;
  alunosNota10: number;
  alunosAbaixo7: number;
}

export interface CourseSummary {
  curso: string;
  formacao: string;
  totalAlunos: number;
  finalizados: number;
  iniciados: number;
  naoIniciados: number;
  mediaNota: number | null;
  avaliadosCount: number;
  taxaConclusao: number;
}

export interface ScheduleSummary {
  horario: string;
  turno: ShiftType;
  total: number;
  finalizados: number;
  iniciados: number;
  naoIniciados: number;
  presencial: number;
  online: number;
  mediaNota: number | null;
}

export type KanbanHourMode = 'AGENDADO' | 'EFETIVO' | 'APENAS_INICIADOS_CHECKIN';

export interface HourKanbanColumn {
  hourKey: string; // e.g. "14h"
  hourNumber: number; // e.g. 14
  label: string; // e.g. "14h · Início às 14:00"
  toleranceLabel: string; // e.g. "Tolerância até 14:15"
  turno: ShiftType;
  isCurrentHour: boolean;
  isPastHour: boolean;
  isFutureHour: boolean;
  students: EvaluatedStudentRecord[];
  total: number;
  totalAgendamentos: number;
  totalAlunosUnicos: number;
  evasaoCount: number;
  npsAtivosCount: number;
  presencaCount: number;
  faltaCount: number;
  naoIniciadoCount: number;
  mediaFrequencia: number;
  finalizados: number;
  iniciados: number;
  naoIniciados: number;
  presencial: number;
  online: number;
  mediaNota: number | null;
  schedulesIncluded: string[]; // e.g. ["14:00 à 15:00"]
}

export type ExportColumnKey =
  | 'contrato'
  | 'nomeCompleto'
  | 'formacao'
  | 'curso'
  | 'aulaInfo'
  | 'horario'
  | 'turno'
  | 'modalidade'
  | 'sala'
  | 'attendanceStatus'
  | 'status'
  | 'nota'
  | 'inicio'
  | 'fim'
  | 'infoAula'
  | 'telefoneAluno'
  | 'nomeResponsavel'
  | 'telefoneResponsavel'
  | 'inadimplente'
  | 'observacao';

export interface ExportColumnDef {
  key: ExportColumnKey;
  label: string;
  defaultEnabled: boolean;
}

export const EXPORT_COLUMNS: ExportColumnDef[] = [
  { key: 'contrato', label: 'Contrato / Matrícula', defaultEnabled: true },
  { key: 'nomeCompleto', label: 'Nome Completo do Aluno', defaultEnabled: true },
  { key: 'curso', label: 'Curso Atual', defaultEnabled: true },
  { key: 'aulaInfo', label: 'Aula & Material', defaultEnabled: true },
  { key: 'formacao', label: 'Formação', defaultEnabled: true },
  { key: 'horario', label: 'Horário Agendado', defaultEnabled: true },
  { key: 'turno', label: 'Turno', defaultEnabled: true },
  { key: 'modalidade', label: 'Modalidade', defaultEnabled: true },
  { key: 'attendanceStatus', label: 'Status de Presença (Tolerância 15m)', defaultEnabled: true },
  { key: 'status', label: 'Status no Portal', defaultEnabled: true },
  { key: 'nota', label: 'Última Nota', defaultEnabled: true },
  { key: 'inicio', label: 'Check-in (Início)', defaultEnabled: true },
  { key: 'fim', label: 'Check-out (Fim)', defaultEnabled: true },
  { key: 'infoAula', label: 'Origem do Acesso', defaultEnabled: true },
  { key: 'telefoneAluno', label: 'Telefone Aluno', defaultEnabled: true },
  { key: 'nomeResponsavel', label: 'Nome Responsável', defaultEnabled: false },
  { key: 'telefoneResponsavel', label: 'Telefone Responsável', defaultEnabled: false },
  { key: 'sala', label: 'Sala', defaultEnabled: false },
  { key: 'inadimplente', label: 'Alerta Financeiro', defaultEnabled: false },
  { key: 'observacao', label: 'Observação Pedagógica', defaultEnabled: true },
];

export function parseTimeToMinutes(timeStr: string): number {
  const clean = (timeStr || '08:00').trim();
  const [hStr = '8', mStr = '0'] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return (Number.isNaN(h) ? 8 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function extractRecordStartHour(
  record: StudentPerformanceRecord,
  mode: KanbanHourMode = 'AGENDADO'
): number | null {
  if (mode === 'EFETIVO' || mode === 'APENAS_INICIADOS_CHECKIN') {
    if (record.inicio) {
      const parts = record.inicio.trim().split(/\s+/);
      const timePart = parts[parts.length - 1] || '';
      const hourStr = timePart.split(':')[0];
      const parsed = parseInt(hourStr, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        return parsed;
      }
    }
    if (mode === 'APENAS_INICIADOS_CHECKIN') {
      return null;
    }
  }

  const schedHourStr = (record.horaInicio || '08:00').split(':')[0];
  const schedHour = parseInt(schedHourStr, 10);
  return Number.isNaN(schedHour) ? 8 : schedHour;
}

export function resolveRecordProfessor(record: StudentPerformanceRecord): string {
  if (record.sala === 'INGLÊS') {
    return 'Lucas Almeida';
  }
  const cursoUpper = (record.curso || '').toUpperCase();
  if (
    cursoUpper.includes('ADMINISTRATIVO') ||
    cursoUpper.includes('RECURSOS HUMANOS') ||
    cursoUpper.includes('MARKETING') ||
    cursoUpper.includes('FARMÁCIA') ||
    cursoUpper.includes('CONTÁBIL') ||
    cursoUpper.includes('CONTABIL') ||
    cursoUpper.includes('FISCAL') ||
    cursoUpper.includes('LIDERANÇA') ||
    cursoUpper.includes('VENDAS')
  ) {
    return 'Camila Ferreira';
  }
  return 'João Silva';
}

const CONTRACTS_WITHOUT_APOSTILA = new Set(['5012361', '4782770', '5104218', '5089112']);

export function resolvePossuiApostila(record: StudentPerformanceRecord): boolean {
  if (typeof record.possuiApostila === 'boolean') {
    return record.possuiApostila;
  }
  if (record.contrato in PORTAL_APOSTILA_BY_CONTRATO) {
    return PORTAL_APOSTILA_BY_CONTRATO[record.contrato];
  }
  if (CONTRACTS_WITHOUT_APOSTILA.has(record.contrato)) {
    return false;
  }
  const mat = (record.tipoMaterial || record.aulaInfo || '').toLowerCase();
  return mat.includes('apostila');
}

/**
 * Matches a student schedule record against active NPS invitations using:
 * 1. Exact contract number (`contrato`)
 * 2. Exact email (`email`)
 * 3. Normalized full name (`nomeCompleto`)
 * Only considers invitations with `invitationStatus === "ativo"` and `answered === false`.
 */
export function matchActiveNpsInvitationForStudent(
  record: Pick<StudentPerformanceRecord, 'contrato' | 'nomeCompleto'> & { email?: string },
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): ActiveNpsInvitation | null {
  const normRecordName = normalizeStudentName(record.nomeCompleto);
  const recEmail = record.email ? record.email.toLowerCase().trim() : '';

  for (const inv of activeNpsInvitations) {
    if (inv.invitationStatus !== 'ativo' || inv.answered) continue;
    if (inv.contrato && inv.contrato === record.contrato) {
      return inv;
    }
    if (recEmail && inv.email && inv.email.toLowerCase().trim() === recEmail) {
      return inv;
    }
    if (normRecordName && normalizeStudentName(inv.studentName) === normRecordName) {
      return inv;
    }
  }
  return null;
}

/**
 * Builds the WhatsApp URL to send the active NPS survey link to the student.
 */
export function buildWhatsAppNpsUrl(
  studentName: string,
  phone: string,
  surveyUrl: string,
  pontoJornada?: string
): string {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const jornadaLabel = pontoJornada ? ` (${pontoJornada})` : '';
  const msg = `Olá ${studentName}, sua pesquisa de satisfação NPS da Microlins (${PORTAL_METADATA.unidade})${jornadaLabel} está ativa! Responda rapidinho pelo seu link exclusivo:\n${surveyUrl}`;
  return `https://api.whatsapp.com/send?${
    cleanPhone ? `phone=${cleanPhone}&` : ''
  }text=${encodeURIComponent(msg)}`;
}

/**
 * Evaluates a single scheduled class record ("agendamento") independently according to the 3 rules:
 * 1. "Não iniciado": Class scheduled start time has not arrived yet, OR is currently within
 *    the 15-minute tolerance window (HH:00 to HH:14) and presence has not been confirmed yet.
 * 2. "Presença": Student attended and had presence registered in this schedule.
 * 3. "Falta": Scheduled start time + 15 minutes tolerance has passed (currentTime >= start + 15m)
 *    and there is no registered presence in this schedule.
 */
export function evaluateStudentAttendance(
  record: StudentPerformanceRecord,
  currentTimeMinutes: number,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {},
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): EvaluatedStudentRecord {
  const startHour = extractRecordStartHour(record, 'AGENDADO') ?? 8;
  const scheduledStartMinutes = parseTimeToMinutes(record.horaInicio || `${String(startHour).padStart(2, '0')}:00`);
  const toleranceEndMinutes = scheduledStartMinutes + 15;
  const paddedHour = String(startHour).padStart(2, '0');
  const hourKey = `${paddedHour}h`;
  const toleranceWindowLabel = `${formatMinutesToHHMM(scheduledStartMinutes)} às ${formatMinutesToHHMM(toleranceEndMinutes)}`;

  const isWithinTolerance =
    currentTimeMinutes >= scheduledStartMinutes && currentTimeMinutes < toleranceEndMinutes;
  const minutesRemainingInTolerance = isWithinTolerance
    ? toleranceEndMinutes - currentTimeMinutes
    : null;

  const manualOverride = manualAttendanceOverrides[record.id];
  const hasPortalPresence =
    record.status === 'FINALIZADO' ||
    record.status === 'INICIADO' ||
    Boolean(record.inicio && record.inicio.trim() !== '') ||
    Boolean(record.fim && record.fim.trim() !== '');

  let attendanceStatus: AttendanceStatus;

  if (manualOverride) {
    attendanceStatus = manualOverride;
  } else if (hasPortalPresence) {
    // 1. Presença: Aluno que iniciou ou finalizou a aula no portal
    attendanceStatus = 'Presença';
  } else if (currentTimeMinutes >= toleranceEndMinutes) {
    // 2. Falta: Aluno não iniciou e o horário da aula + 15 min de tolerância já expirou
    attendanceStatus = 'Falta';
  } else {
    // 3. Não iniciado: A aula ainda não chegou ao horário ou está dentro dos 15 minutos de tolerância sem início ainda
    attendanceStatus = 'Não iniciado';
  }

  const presenceRegisteredAt =
    record.inicio ||
    (attendanceStatus === 'Presença' ? `${paddedHour}:05` : '');

  const linkAcessoDireto =
    record.linkLoginUrl ||
    PORTAL_AUTH_LINKS_BY_CONTRATO[record.contrato] ||
    `https://portaldoaluno.microlins.com.br/autenticacao/tokenAluno/${record.contrato}`;
  const cleanAlunoPhone = (record.telefoneAluno || '').replace(/\D/g, '');
  const cleanRespPhone = (record.telefoneResponsavel || record.telefoneAluno || '').replace(
    /\D/g,
    ''
  );

  const loginMessage = `Olá ${record.nomeCompleto}, acesse sua aula na Microlins (Contrato #${record.contrato} · ${record.curso}) diretamente pelo seu link individual de acesso:\n${linkAcessoDireto}`;
  const whatsappAlunoLoginUrl = `https://api.whatsapp.com/send?${
    cleanAlunoPhone ? `phone=${cleanAlunoPhone}&` : ''
  }text=${encodeURIComponent(loginMessage)}`;

  const respGreeting = record.nomeResponsavel
    ? `Olá ${record.nomeResponsavel}`
    : `Olá Responsável por ${record.nomeCompleto}`;
  const respMessage = `${respGreeting}, entramos em contato da ${PORTAL_METADATA.unidade} referente ao acompanhamento da aula do(a) aluno(a) ${record.nomeCompleto} (Contrato #${record.contrato} · ${record.curso}).`;
  const whatsappResponsavelContactUrl = `https://api.whatsapp.com/send?${
    cleanRespPhone ? `phone=${cleanRespPhone}&` : ''
  }text=${encodeURIComponent(respMessage)}`;

  const maybeEvaluated = record as Partial<EvaluatedStudentRecord>;
  const matchedNps =
    maybeEvaluated.npsInvitation !== undefined
      ? maybeEvaluated.npsInvitation
      : matchActiveNpsInvitationForStudent(record, activeNpsInvitations);
  const hasActiveNps = Boolean(matchedNps);
  const whatsappNpsUrl = matchedNps
    ? buildWhatsAppNpsUrl(
        record.nomeCompleto,
        record.telefoneAluno || matchedNps.phone || record.telefoneResponsavel,
        matchedNps.surveyUrl,
        matchedNps.pontoJornada
      )
    : '';

  return {
    ...record,
    professor: resolveRecordProfessor(record),
    diaSemana: record.diaSemana || PORTAL_METADATA.diaSemana,
    hourKey,
    moduloAtual: record.curso,
    aulaAtualLabel: `Aula ${record.aulaNumero}`,
    possuiApostila: resolvePossuiApostila(record),
    linkAcessoDireto,
    whatsappResponsavelContactUrl,
    whatsappAlunoLoginUrl,
    attendanceStatus,
    scheduledStartMinutes,
    toleranceEndMinutes,
    toleranceWindowLabel,
    isWithinTolerance,
    minutesRemainingInTolerance,
    presenceRegisteredAt,
    isEvasao: false,
    evasaoSummary: null,
    hasActiveNps,
    npsInvitation: matchedNps,
    npsOrigemFormatada: matchedNps ? (matchedNps.origem as 'Portal do Aluno' | 'E-mail') : null,
    whatsappNpsUrl,
  };
}

/**
 * Regra de identificação de evasão (a partir dos agendamentos individuais do aluno no mesmo dia):
 * Um aluno é identificado como evasão quando atende simultaneamente às seguintes condições no mesmo dia:
 * 1. Possuir mais de dois (> 2, ou seja, >= 3) agendamentos no mesmo dia.
 * 2. Ter presença registrada em pelo menos um desses agendamentos (1 agendamento com Presença).
 * 3. Ter falta registrada em todos os demais agendamentos daquele dia (faltas === totalAgendamentosDia - 1 >= 2).
 * 4. Nenhum dos agendamentos naquele dia pode estar "Não iniciado" (agendamentos ainda não finalizados
 *    não são classificados antecipadamente como falta ou evasão).
 */
export function evaluateDayScheduleEvasao(dayRecords: EvaluatedStudentRecord[]): {
  isEvasao: boolean;
  summary: string | null;
} {
  const totalAgendamentosDia = dayRecords.length;
  if (totalAgendamentosDia <= 2) {
    return { isEvasao: false, summary: null };
  }

  let presencaCount = 0;
  let faltaCount = 0;
  let naoIniciadoCount = 0;

  for (const r of dayRecords) {
    if (r.attendanceStatus === 'Presença') presencaCount++;
    else if (r.attendanceStatus === 'Falta') faltaCount++;
    else naoIniciadoCount++;
  }

  // Agendamentos ainda não iniciados não devem ser classificados antecipadamente como evasão
  if (naoIniciadoCount > 0) {
    return { isEvasao: false, summary: null };
  }

  // Presença em pelo menos um agendamento (1 presença) e falta em todos os demais agendamentos do dia (>= 2 faltas)
  if (presencaCount >= 1 && faltaCount >= 1 && presencaCount === 1 && faltaCount === totalAgendamentosDia - 1) {
    const dia = dayRecords[0]?.diaSemana || PORTAL_METADATA.diaSemana;
    return {
      isEvasao: true,
      summary: `${presencaCount} presença e ${faltaCount} faltas em ${totalAgendamentosDia} agendamentos (${dia})`,
    };
  }

  return { isEvasao: false, summary: null };
}

export function evaluateAllStudentsAttendance(
  records: StudentPerformanceRecord[],
  currentTimeMinutes: number,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {},
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): EvaluatedStudentRecord[] {
  // Cada agendamento (horário agendado por um aluno) é um registro independente
  const seenIds = new Set<number>();
  const uniqueSchedules: EvaluatedStudentRecord[] = [];
  const preservedEvasaoById = new Map<
    number,
    { isEvasao: boolean; evasaoSummary: string | null }
  >();

  for (const r of records) {
    if (seenIds.has(r.id)) continue;
    seenIds.add(r.id);
    const maybeEvaluated = r as Partial<EvaluatedStudentRecord>;
    if (typeof maybeEvaluated.isEvasao === 'boolean') {
      preservedEvasaoById.set(r.id, {
        isEvasao: maybeEvaluated.isEvasao,
        evasaoSummary: maybeEvaluated.evasaoSummary ?? null,
      });
    }
    uniqueSchedules.push(
      evaluateStudentAttendance(
        r,
        currentTimeMinutes,
        manualAttendanceOverrides,
        activeNpsInvitations
      )
    );
  }

  // Agrupar por (diaSemana, contrato) para avaliar a regra de evasão do aluno no dia
  const dayContractGroups = new Map<string, EvaluatedStudentRecord[]>();
  for (const rec of uniqueSchedules) {
    if (preservedEvasaoById.has(rec.id)) continue;
    const key = `${rec.diaSemana}::${rec.contrato}`;
    const list = dayContractGroups.get(key) ?? [];
    list.push(rec);
    dayContractGroups.set(key, list);
  }

  for (const group of dayContractGroups.values()) {
    const result = evaluateDayScheduleEvasao(group);
    if (result.isEvasao) {
      for (const rec of group) {
        rec.isEvasao = true;
        rec.evasaoSummary = result.summary;
      }
    }
  }

  // Preservar estado de evasão caso o agendamento já tenha sido avaliado na agenda completa do dia antes de um filtro de horário/sala/status
  for (const rec of uniqueSchedules) {
    const preserved = preservedEvasaoById.get(rec.id);
    if (preserved !== undefined) {
      rec.isEvasao = preserved.isEvasao;
      rec.evasaoSummary = preserved.evasaoSummary;
    }
  }

  return uniqueSchedules;
}

/**
 * Retorna a lista de convites NPS ativos cruzada com os agendamentos do Kanban,
 * SEM duplicar convites NPS ativos quando o aluno possui múltiplos agendamentos no Kanban.
 */
export function getDeduplicatedActiveNpsList(
  activeNpsInvitations: ActiveNpsInvitation[],
  evaluatedRecords: EvaluatedStudentRecord[]
): EnrichedActiveNpsEntry[] {
  const deduplicatedInvitations = new Map<string, ActiveNpsInvitation>();
  for (const inv of activeNpsInvitations) {
    if (inv.invitationStatus !== 'ativo' || inv.answered) continue;
    const key =
      inv.contrato || inv.codigoPessoa || normalizeStudentName(inv.studentName);
    if (!key || deduplicatedInvitations.has(key)) continue;
    deduplicatedInvitations.set(key, inv);
  }

  const entries: EnrichedActiveNpsEntry[] = [];

  for (const inv of deduplicatedInvitations.values()) {
    const normInvName = normalizeStudentName(inv.studentName);
    const matchedSchedules = evaluatedRecords.filter(
      (r) =>
        (inv.contrato && r.contrato === inv.contrato) ||
        normalizeStudentName(r.nomeCompleto) === normInvName
    );

    const firstMatch = matchedSchedules[0] ?? null;
    const contrato = inv.contrato || firstMatch?.contrato || null;
    const phone =
      firstMatch?.telefoneAluno ||
      inv.phone ||
      firstMatch?.telefoneResponsavel ||
      '';
    const cursos = Array.from(
      new Set(matchedSchedules.map((m) => m.curso))
    );
    const agendamentosHorarios = matchedSchedules.map(
      (m) => `${m.diaSemana} · ${m.hourKey} (${m.attendanceStatus})`
    );

    entries.push({
      invitation: inv,
      matchedInKanban: matchedSchedules.length > 0,
      contrato,
      studentName: firstMatch?.nomeCompleto || inv.studentName,
      sala: firstMatch?.sala ?? null,
      modalidade: firstMatch?.modalidade ?? null,
      cursos,
      agendamentosCount: matchedSchedules.length,
      agendamentosHorarios,
      firstStudentRecordId: firstMatch?.id ?? null,
      whatsappNpsUrl: buildWhatsAppNpsUrl(
        firstMatch?.nomeCompleto || inv.studentName,
        phone,
        inv.surveyUrl,
        inv.pontoJornada
      ),
    });
  }

  // Sort matched in Kanban first, then by creation date descending
  return entries.sort((a, b) => {
    if (a.matchedInKanban !== b.matchedInKanban) {
      return a.matchedInKanban ? -1 : 1;
    }
    return b.invitation.createdAt.localeCompare(a.invitation.createdAt);
  });
}

export function filterAndSortRecords(
  records: StudentPerformanceRecord[],
  criteria: Partial<FilterCriteria> & {
    search: string;
    status: 'TODOS' | ClassStatus;
    modalidade: 'TODAS' | ModalityType;
    turno: 'TODOS' | ShiftType;
    curso: string;
    horario: string;
    notaFilter: 'TODOS' | 'COM_NOTA' | 'SEM_NOTA' | 'NOTA_ALTA' | 'ATENCAO';
    apenasInadimplentes: boolean;
    sortBy: 'id' | 'nomeCompleto' | 'curso' | 'horario' | 'nota' | 'status';
    sortDir: 'asc' | 'desc';
  },
  currentTimeMinutes = 14 * 60 + 20,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {},
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): EvaluatedStudentRecord[] {
  const evaluated = evaluateAllStudentsAttendance(
    records,
    currentTimeMinutes,
    manualAttendanceOverrides,
    activeNpsInvitations
  );
  const q = criteria.search.trim().toLowerCase();
  const attendanceFilter = criteria.attendanceFilter ?? 'TODOS';
  const professorFilter = criteria.professor ?? 'TODOS';
  const salaFilter = criteria.sala ?? 'TODAS';
  const diaFilter = criteria.diaSemana ?? 'TODOS';

  const filtered = evaluated.filter((rec) => {
    if (professorFilter !== 'TODOS' && rec.professor !== professorFilter) {
      return false;
    }
    if (salaFilter !== 'TODAS' && salaFilter !== 'TODOS' && rec.sala !== salaFilter) {
      return false;
    }
    if (diaFilter !== 'TODOS' && diaFilter !== 'TODAS' && rec.diaSemana !== diaFilter) {
      return false;
    }
    if (criteria.status !== 'TODOS' && rec.status !== criteria.status) {
      return false;
    }
    if (attendanceFilter === 'EVASAO') {
      if (!rec.isEvasao) return false;
    } else if (attendanceFilter !== 'TODOS' && rec.attendanceStatus !== attendanceFilter) {
      return false;
    }
    if (criteria.modalidade !== 'TODAS' && rec.modalidade !== criteria.modalidade) {
      return false;
    }
    if (criteria.turno !== 'TODOS' && rec.turno !== criteria.turno) {
      return false;
    }
    if (criteria.curso && criteria.curso !== 'TODOS' && rec.curso !== criteria.curso) {
      return false;
    }
    if (
      criteria.horario &&
      criteria.horario !== 'TODOS' &&
      rec.horario !== criteria.horario &&
      rec.hourKey !== criteria.horario
    ) {
      return false;
    }
    if (criteria.apenasInadimplentes && !rec.inadimplente) {
      return false;
    }

    if (criteria.notaFilter === 'COM_NOTA' && rec.nota === null) return false;
    if (criteria.notaFilter === 'SEM_NOTA' && rec.nota !== null) return false;
    if (criteria.notaFilter === 'NOTA_ALTA' && (rec.nota === null || rec.nota < 9)) return false;
    if (criteria.notaFilter === 'ATENCAO' && (rec.nota === null || rec.nota >= 7.5)) return false;

    if (q) {
      const haystack = [
        rec.contrato,
        rec.nomeCompleto,
        rec.nomeCurto,
        rec.curso,
        rec.aulaAtualLabel,
        rec.formacao,
        rec.horario,
        rec.hourKey,
        rec.diaSemana,
        rec.professor,
        rec.sala,
        rec.modalidade,
        rec.nomeResponsavel,
        rec.telefoneAluno,
        rec.infoAula,
        rec.attendanceStatus,
        rec.isEvasao ? 'evasao evasão' : '',
        rec.hasActiveNps ? 'nps ativo convite nps' : '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const dir = criteria.sortDir === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    switch (criteria.sortBy) {
      case 'nomeCompleto':
        return a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR') * dir;
      case 'curso':
        return a.curso.localeCompare(b.curso, 'pt-BR') * dir;
      case 'horario':
        return a.horaInicio.localeCompare(b.horaInicio, 'pt-BR') * dir;
      case 'status':
        return a.attendanceStatus.localeCompare(b.attendanceStatus, 'pt-BR') * dir;
      case 'nota': {
        const na = a.nota ?? -1;
        const nb = b.nota ?? -1;
        return (na - nb) * dir;
      }
      case 'id':
      default:
        return (a.id - b.id) * dir;
    }
  });
}

/**
 * Calcula todos os indicadores utilizando SEMPRE o agendamento como unidade de contagem:
 * - Total de agendamentos (`totalAgendamentos` / `total`): soma total de horários agendados exibidos no Kanban.
 * - Presenças (`presencaCount`): total de agendamentos com presença registrada.
 * - Faltas (`faltaCount`): total de agendamentos com falta registrada.
 * - Não iniciado (`aguardandoCount`): total de agendamentos ainda não iniciados.
 * - Média de frequência (`mediaFrequencia`): `presencaCount / (presencaCount + faltaCount) * 100` (não iniciados não entram).
 * - Evasão (`evasaoCount`): única exceção onde a contagem é por aluno único (`contrato`), sem duplicar o mesmo aluno.
 */
export function computePerformanceKPIs(
  records: StudentPerformanceRecord[],
  currentTimeMinutes = 14 * 60 + 20,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {},
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): PerformanceKPIs {
  const evaluated = evaluateAllStudentsAttendance(
    records,
    currentTimeMinutes,
    manualAttendanceOverrides,
    activeNpsInvitations
  );

  // Unidade principal de contagem: cada agendamento é um registro independente
  const totalAgendamentos = evaluated.length;
  const total = totalAgendamentos;

  const uniqueContracts = new Set<string>();
  // Evasão: única exceção onde a contagem é por aluno único (sem duplicar o mesmo aluno)
  const evasaoContracts = new Set<string>();
  const activeNpsContracts = new Set<string>();

  for (const r of evaluated) {
    uniqueContracts.add(r.contrato);
    if (r.isEvasao) {
      evasaoContracts.add(r.contrato);
    }
    if (r.hasActiveNps) {
      activeNpsContracts.add(r.contrato);
    }
  }

  const totalAlunosUnicos = uniqueContracts.size;
  const evasaoCount = evasaoContracts.size;
  const npsAtivosCount = activeNpsContracts.size;

  const iniciados = evaluated.filter((r) => r.status === 'INICIADO').length;
  const naoIniciados = evaluated.filter((r) => r.status === 'NÃO INICIADO').length;
  const finalizados = evaluated.filter((r) => r.status === 'FINALIZADO').length;

  const presencaCount = evaluated.filter((r) => r.attendanceStatus === 'Presença').length;
  const faltaCount = evaluated.filter((r) => r.attendanceStatus === 'Falta').length;
  const aguardandoCount = evaluated.filter((r) => r.attendanceStatus === 'Não iniciado').length;

  // Média de frequência: agendamentos com presença / (agendamentos com presença + agendamentos com falta)
  // Agendamentos não iniciados não entram no cálculo
  const baseFrequencia = presencaCount + faltaCount;
  const mediaFrequencia =
    baseFrequencia > 0
      ? Number(((presencaCount / baseFrequencia) * 100).toFixed(1))
      : 0;

  const inadimplentes = evaluated.filter((r) => r.inadimplente).length;
  const presencialCount = evaluated.filter((r) => r.modalidade === 'Presencial').length;
  const onlineCount = evaluated.filter((r) => r.modalidade === 'Online').length;

  const graded = evaluated.filter(
    (r): r is EvaluatedStudentRecord & { nota: number } => r.nota !== null
  );
  const comNotaCount = graded.length;
  const semNotaCount = totalAgendamentos - comNotaCount;

  const sumNotas = graded.reduce((acc, r) => acc + r.nota, 0);
  const mediaGeralNotas = comNotaCount > 0 ? Number((sumNotas / comNotaCount).toFixed(2)) : 0;

  const notaMaxima = comNotaCount > 0 ? Math.max(...graded.map((r) => r.nota)) : 0;
  const notaMinima = comNotaCount > 0 ? Math.min(...graded.map((r) => r.nota)) : 0;
  const alunosNota10 = graded.filter((r) => r.nota === 10).length;
  const alunosAbaixo7 = graded.filter((r) => r.nota < 7).length;

  const taxaConclusao =
    totalAgendamentos > 0
      ? Number(((finalizados / totalAgendamentos) * 100).toFixed(1))
      : 0;
  const taxaPresencaAtiva =
    totalAgendamentos > 0
      ? Number(((presencaCount / totalAgendamentos) * 100).toFixed(1))
      : 0;

  return {
    total,
    totalAgendamentos,
    totalAlunosUnicos,
    evasaoCount,
    npsAtivosCount,
    iniciados,
    naoIniciados,
    finalizados,
    presencaCount,
    faltaCount,
    aguardandoCount,
    mediaFrequencia,
    inadimplentes,
    presencialCount,
    onlineCount,
    comNotaCount,
    semNotaCount,
    mediaGeralNotas,
    taxaConclusao,
    taxaPresencaAtiva,
    notaMaxima,
    notaMinima,
    alunosNota10,
    alunosAbaixo7,
  };
}

export function groupByCourse(records: StudentPerformanceRecord[]): CourseSummary[] {
  const map = new Map<string, StudentPerformanceRecord[]>();
  for (const r of records) {
    const list = map.get(r.curso) ?? [];
    list.push(r);
    map.set(r.curso, list);
  }

  const summaries: CourseSummary[] = [];
  for (const [curso, list] of map.entries()) {
    const totalAlunos = list.length;
    const finalizados = list.filter((r) => r.status === 'FINALIZADO').length;
    const iniciados = list.filter((r) => r.status === 'INICIADO').length;
    const naoIniciados = list.filter((r) => r.status === 'NÃO INICIADO').length;
    const graded = list.filter(
      (r): r is StudentPerformanceRecord & { nota: number } => r.nota !== null
    );
    const mediaNota =
      graded.length > 0
        ? Number((graded.reduce((a, b) => a + b.nota, 0) / graded.length).toFixed(2))
        : null;
    summaries.push({
      curso,
      formacao: list[0]?.formacao || 'CAPACITAÇÃO - DINÂMICA',
      totalAlunos,
      finalizados,
      iniciados,
      naoIniciados,
      mediaNota,
      avaliadosCount: graded.length,
      taxaConclusao: totalAlunos > 0 ? Number(((finalizados / totalAlunos) * 100).toFixed(1)) : 0,
    });
  }

  return summaries.sort(
    (a, b) => b.totalAlunos - a.totalAlunos || a.curso.localeCompare(b.curso, 'pt-BR')
  );
}

export function groupBySchedule(records: StudentPerformanceRecord[]): ScheduleSummary[] {
  const map = new Map<string, StudentPerformanceRecord[]>();
  for (const r of records) {
    const key = r.horario || 'Sem horário';
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }

  const summaries: ScheduleSummary[] = [];
  for (const [horario, list] of map.entries()) {
    const graded = list.filter(
      (r): r is StudentPerformanceRecord & { nota: number } => r.nota !== null
    );
    const mediaNota =
      graded.length > 0
        ? Number((graded.reduce((a, b) => a + b.nota, 0) / graded.length).toFixed(2))
        : null;
    summaries.push({
      horario,
      turno: list[0]?.turno || 'Manhã',
      total: list.length,
      finalizados: list.filter((r) => r.status === 'FINALIZADO').length,
      iniciados: list.filter((r) => r.status === 'INICIADO').length,
      naoIniciados: list.filter((r) => r.status === 'NÃO INICIADO').length,
      presencial: list.filter((r) => r.modalidade === 'Presencial').length,
      online: list.filter((r) => r.modalidade === 'Online').length,
      mediaNota,
    });
  }

  return summaries.sort((a, b) => a.horario.localeCompare(b.horario, 'pt-BR'));
}

/**
 * Organiza os agendamentos em colunas únicas do Kanban por horário de início (sem duplicar colunas do mesmo horário).
 * Cada agendamento gera seu próprio card independente na coluna correspondente ao seu horário,
 * exibindo exclusivamente o status daquele agendamento.
 */
export function groupByHourKanban(
  records: StudentPerformanceRecord[],
  mode: KanbanHourMode = 'AGENDADO',
  currentTimeMinutes: number = 14 * 60 + 20,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {},
  activeNpsInvitations: ActiveNpsInvitation[] = INITIAL_ACTIVE_NPS_INVITATIONS
): HourKanbanColumn[] {
  const evaluatedRecords = evaluateAllStudentsAttendance(
    records,
    currentTimeMinutes,
    manualAttendanceOverrides,
    activeNpsInvitations
  );

  // Deduplicated map by start hour (1 column per hour, never duplicated)
  const map = new Map<number, EvaluatedStudentRecord[]>();

  for (const r of evaluatedRecords) {
    const h = extractRecordStartHour(r, mode);
    if (h === null) continue;
    const list = map.get(h) ?? [];
    list.push(r);
    map.set(h, list);
  }

  const currentHour = Math.floor(currentTimeMinutes / 60);

  const attendancePriority: Record<AttendanceStatus, number> = {
    Presença: 0,
    'Não iniciado': 1,
    Falta: 2,
  };

  const columns: HourKanbanColumn[] = [];
  for (const [hourNumber, list] of map.entries()) {
    const padded = String(hourNumber).padStart(2, '0');
    const hourKey = `${padded}h`;
    const turno: ShiftType =
      hourNumber < 12 ? 'Manhã' : hourNumber < 18 ? 'Tarde' : 'Noite';

    const sortedStudents = [...list].sort((a, b) => {
      const ap =
        attendancePriority[a.attendanceStatus] - attendancePriority[b.attendanceStatus];
      if (ap !== 0) return ap;
      return a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR');
    });

    const graded = list.filter(
      (r): r is EvaluatedStudentRecord & { nota: number } => r.nota !== null
    );
    const mediaNota =
      graded.length > 0
        ? Number((graded.reduce((acc, r) => acc + r.nota, 0) / graded.length).toFixed(2))
        : null;

    const schedulesIncluded = Array.from(new Set(list.map((r) => r.horario))).sort();

    // Strictly identify the real current hour. Never transfer isCurrentHour to another column when filtered.
    const isCurrentHour = hourNumber === currentHour;
    const isPastHour = hourNumber < currentHour;
    const isFutureHour = hourNumber > currentHour;

    const presencaCount = list.filter((r) => r.attendanceStatus === 'Presença').length;
    const faltaCount = list.filter((r) => r.attendanceStatus === 'Falta').length;
    const naoIniciadoCount = list.filter((r) => r.attendanceStatus === 'Não iniciado').length;
    const baseFreq = presencaCount + faltaCount;
    const mediaFrequencia =
      baseFreq > 0 ? Number(((presencaCount / baseFreq) * 100).toFixed(1)) : 0;

    const uniqueColContracts = new Set(list.map((r) => r.contrato));
    const evasaoColContracts = new Set(
      list.filter((r) => r.isEvasao).map((r) => r.contrato)
    );
    const npsAtivosCount = list.filter((r) => r.hasActiveNps).length;

    columns.push({
      hourKey,
      hourNumber,
      label: `${padded}h · Início às ${padded}:00`,
      toleranceLabel: `Tolerância: ${padded}:00 às ${padded}:15`,
      turno,
      isCurrentHour,
      isPastHour,
      isFutureHour,
      students: sortedStudents,
      total: list.length,
      totalAgendamentos: list.length,
      totalAlunosUnicos: uniqueColContracts.size,
      evasaoCount: evasaoColContracts.size,
      npsAtivosCount,
      presencaCount,
      faltaCount,
      naoIniciadoCount,
      mediaFrequencia,
      finalizados: list.filter((r) => r.status === 'FINALIZADO').length,
      iniciados: list.filter((r) => r.status === 'INICIADO').length,
      naoIniciados: list.filter((r) => r.status === 'NÃO INICIADO').length,
      presencial: list.filter((r) => r.modalidade === 'Presencial').length,
      online: list.filter((r) => r.modalidade === 'Online').length,
      mediaNota,
      schedulesIncluded,
    });
  }

  // Sort columns starting from the real currentHour (index 0 when present),
  // followed by subsequent hours (hourNumber > currentHour) in ascending order,
  // and then earlier hours of the day (hourNumber < currentHour) in ascending order.
  return columns.sort((a, b) => {
    const offsetA =
      a.hourNumber >= currentHour ? a.hourNumber - currentHour : a.hourNumber + 24 - currentHour;
    const offsetB =
      b.hourNumber >= currentHour ? b.hourNumber - currentHour : b.hourNumber + 24 - currentHour;
    return offsetA - offsetB;
  });
}

export interface NpsSummaryKPIs {
  totalConvitesAtivos: number;
  portalDoAlunoCount: number;
  emailCount: number;
  jornada30Count: number;
  jornada50Count: number;
  totalAgendamentosVinculados: number;
}

export function computeNpsSummaryKPIs(
  npsEvaluatedRecords: EvaluatedStudentRecord[]
): NpsSummaryKPIs {
  const uniqueByContract = new Map<string, EvaluatedStudentRecord>();
  for (const r of npsEvaluatedRecords) {
    if (!uniqueByContract.has(r.contrato)) {
      uniqueByContract.set(r.contrato, r);
    }
  }

  const uniqueList = Array.from(uniqueByContract.values());
  const totalConvitesAtivos = uniqueList.length;

  const portalDoAlunoCount = uniqueList.filter(
    (r) => r.npsOrigemFormatada === 'Portal do Aluno'
  ).length;

  const emailCount = uniqueList.filter(
    (r) => r.npsOrigemFormatada === 'E-mail'
  ).length;

  const jornada30Count = uniqueList.filter((r) => {
    const p = (r.npsInvitation?.pontoJornada || '').toLowerCase();
    return p.includes('30');
  }).length;

  const jornada50Count = uniqueList.filter((r) => {
    const p = (r.npsInvitation?.pontoJornada || '').toLowerCase();
    return p.includes('50') || p.includes('70') || (!p.includes('30') && p.length > 0);
  }).length;

  const totalAgendamentosVinculados = npsEvaluatedRecords.length;

  return {
    totalConvitesAtivos,
    portalDoAlunoCount,
    emailCount,
    jornada30Count,
    jornada50Count,
    totalAgendamentosVinculados,
  };
}

export interface NpsFilterCriteria {
  search: string;
  origem: 'TODAS' | NpsOrigemType;
  pontoJornada: 'TODOS' | '30 dias' | '50 dias' | '70 dias' | '50+ dias';
  horario: string;
  diaSemana: string;
}

export function filterNpsRecords(
  records: EvaluatedStudentRecord[],
  criteria: NpsFilterCriteria
): EvaluatedStudentRecord[] {
  // Only records belonging to students with an active NPS invitation
  const npsOnly = records.filter((r) => r.hasActiveNps && r.npsInvitation !== null);

  const q = (criteria.search || '').trim().toLowerCase();
  const origemFilter = criteria.origem || 'TODAS';
  const pontoFilter = criteria.pontoJornada || 'TODOS';
  const horarioFilter = criteria.horario || 'TODOS';
  const diaFilter = criteria.diaSemana || 'TODOS';

  return npsOnly.filter((r) => {
    if (origemFilter !== 'TODAS' && r.npsOrigemFormatada !== origemFilter) {
      return false;
    }
    if (pontoFilter !== 'TODOS') {
      const p = (r.npsInvitation?.pontoJornada || '').toLowerCase();
      if (pontoFilter === '50+ dias') {
        if (!p.includes('50') && !p.includes('70')) {
          return false;
        }
      } else {
        const targetDays = pontoFilter.replace(' dias', '');
        if (!p.includes(targetDays)) {
          return false;
        }
      }
    }
    if (
      horarioFilter !== 'TODOS' &&
      horarioFilter !== 'TODAS' &&
      r.horario !== horarioFilter &&
      r.hourKey !== horarioFilter
    ) {
      return false;
    }
    if (
      diaFilter !== 'TODOS' &&
      diaFilter !== 'TODAS' &&
      r.diaSemana !== diaFilter
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        r.contrato,
        r.nomeCompleto,
        r.curso,
        r.horario,
        r.hourKey,
        r.diaSemana,
        r.sala,
        r.npsOrigemFormatada || '',
        r.npsInvitation?.pontoJornada || '',
        r.npsInvitation?.controlId || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export interface NpsHourKanbanColumn {
  hourKey: string;
  hourNumber: number;
  label: string;
  turno: ShiftType;
  isCurrentHour: boolean;
  isPastHour: boolean;
  isFutureHour: boolean;
  students: EvaluatedStudentRecord[];
  totalAgendamentos: number;
  totalConvitesUnicos: number;
  portalCount: number;
  emailCount: number;
  jornada30Count: number;
  jornada50Count: number;
}

export function groupByNpsHourKanban(
  npsRecords: EvaluatedStudentRecord[],
  currentTimeMinutes: number = 14 * 60 + 20
): NpsHourKanbanColumn[] {
  const map = new Map<number, EvaluatedStudentRecord[]>();

  for (const r of npsRecords) {
    const h = extractRecordStartHour(r, 'AGENDADO');
    if (h === null) continue;
    const list = map.get(h) ?? [];
    list.push(r);
    map.set(h, list);
  }

  const currentHour = Math.floor(currentTimeMinutes / 60);

  const columns: NpsHourKanbanColumn[] = [];
  for (const [hourNumber, list] of map.entries()) {
    const padded = String(hourNumber).padStart(2, '0');
    const hourKey = `${padded}h`;
    const turno: ShiftType =
      hourNumber < 12 ? 'Manhã' : hourNumber < 18 ? 'Tarde' : 'Noite';

    const sortedStudents = [...list].sort((a, b) =>
      a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')
    );

    const isCurrentHour = hourNumber === currentHour;
    const isPastHour = hourNumber < currentHour;
    const isFutureHour = hourNumber > currentHour;

    const uniqueContracts = new Set(list.map((r) => r.contrato));
    const portalCount = list.filter((r) => r.npsOrigemFormatada === 'Portal do Aluno').length;
    const emailCount = list.filter((r) => r.npsOrigemFormatada === 'E-mail').length;
    const jornada30Count = list.filter((r) =>
      (r.npsInvitation?.pontoJornada || '').includes('30')
    ).length;
    const jornada50Count = list.filter((r) => {
      const p = r.npsInvitation?.pontoJornada || '';
      return p.includes('50') || p.includes('70');
    }).length;

    columns.push({
      hourKey,
      hourNumber,
      label: `${padded}h · Início às ${padded}:00`,
      turno,
      isCurrentHour,
      isPastHour,
      isFutureHour,
      students: sortedStudents,
      totalAgendamentos: list.length,
      totalConvitesUnicos: uniqueContracts.size,
      portalCount,
      emailCount,
      jornada30Count,
      jornada50Count,
    });
  }

  // Sort columns starting from currentHour (fixed on left)
  return columns.sort((a, b) => {
    const offsetA =
      a.hourNumber >= currentHour ? a.hourNumber - currentHour : a.hourNumber + 24 - currentHour;
    const offsetB =
      b.hourNumber >= currentHour ? b.hourNumber - currentHour : b.hourNumber + 24 - currentHour;
    return offsetA - offsetB;
  });
}

function escapeCsvCell(value: string | number | null | undefined, delimiter: string): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvContent(
  records: StudentPerformanceRecord[],
  selectedColumns: ExportColumnKey[],
  notesByContract: Record<string, string> = {},
  delimiter: ';' | ',' = ';',
  currentTimeMinutes = 14 * 60 + 20,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {}
): string {
  const evaluated = evaluateAllStudentsAttendance(
    records,
    currentTimeMinutes,
    manualAttendanceOverrides
  );
  const activeCols = EXPORT_COLUMNS.filter((c) => selectedColumns.includes(c.key));
  const headerRow = activeCols.map((c) => escapeCsvCell(c.label, delimiter)).join(delimiter);

  const dataRows = evaluated.map((r) => {
    return activeCols
      .map((col) => {
        switch (col.key) {
          case 'nota':
            return escapeCsvCell(
              r.nota !== null ? r.nota.toFixed(2).replace('.', ',') : 'Sem nota',
              delimiter
            );
          case 'attendanceStatus':
            return escapeCsvCell(r.attendanceStatus, delimiter);
          case 'inadimplente':
            return escapeCsvCell(r.inadimplente ? 'Inadimplente' : 'Regular', delimiter);
          case 'observacao':
            return escapeCsvCell(notesByContract[r.contrato] || '', delimiter);
          default:
            return escapeCsvCell(r[col.key], delimiter);
        }
      })
      .join(delimiter);
  });

  return [headerRow, ...dataRows].join('\r\n');
}

export function generateWhatsAppSummary(
  records: StudentPerformanceRecord[],
  unidade = 'ESCOLA PRESIDENTE PRUDENTE',
  dataRef = '30/10/2026',
  currentTimeMinutes = 14 * 60 + 20,
  manualAttendanceOverrides: Record<number, AttendanceStatus> = {}
): string {
  const kpis = computePerformanceKPIs(records, currentTimeMinutes, manualAttendanceOverrides);
  const bySchedule = groupBySchedule(records);
  const topCourses = groupByCourse(records).slice(0, 5);

  const lines: string[] = [
    `*RELATÓRIO DE DESEMPENHO ACADÊMICO & PRESENÇA — MICROLINS*`,
    `Unidade: ${unidade}`,
    `Data: ${dataRef} | Horário Ref.: ${formatMinutesToHHMM(currentTimeMinutes)} | Total de agendamentos: ${kpis.totalAgendamentos}`,
    ``,
    `*1. CONTROLE DE PRESENÇA POR AGENDAMENTO (TOLERÂNCIA 15 MIN)*`,
    `- Presença confirmada: ${kpis.presencaCount} (${kpis.taxaPresencaAtiva}%)`,
    `- Falta (após 15 min de tolerância): ${kpis.faltaCount}`,
    `- Não iniciado (previsto / aguardando horário): ${kpis.aguardandoCount}`,
    `- Presencial: ${kpis.presencialCount} | Online: ${kpis.onlineCount}`,
    ``,
    `*2. INDICADORES DE NOTAS E APROVEITAMENTO*`,
    `- Agendamentos com nota registrada: ${kpis.comNotaCount}/${kpis.totalAgendamentos}`,
    `- Média geral da turma: ${kpis.mediaGeralNotas.toFixed(2)}`,
    `- Nota 10: ${kpis.alunosNota10}`,
    `- Alerta de nota (< 7.0): ${kpis.alunosAbaixo7}`,
    ``,
    `*3. DISTRIBUIÇÃO POR HORÁRIO*`,
    ...bySchedule.map(
      (s) =>
        `• ${s.horario}: ${s.total} agendamentos (${s.finalizados} fin. / ${s.iniciados} inic. / ${s.naoIniciados} pend.)`
    ),
    ``,
    `*4. PRINCIPAIS CURSOS DO DIA*`,
    ...topCourses.map(
      (c) =>
        `• ${c.curso}: ${c.totalAlunos} agendamentos | Média: ${
          c.mediaNota !== null ? c.mediaNota.toFixed(2) : 'S/N'
        }`
    ),
  ];

  return lines.join('\n');
}

