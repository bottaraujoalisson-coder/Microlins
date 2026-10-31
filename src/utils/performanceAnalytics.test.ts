import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_ACTIVE_NPS_INVITATIONS,
  INITIAL_STUDENT_RECORDS,
  PORTAL_METADATA,
  StudentPerformanceRecord,
} from '../data/microlinsData';
import {
  computeNpsSummaryKPIs,
  computePerformanceKPIs,
  evaluateAllStudentsAttendance,
  evaluateStudentAttendance,
  filterAndSortRecords,
  filterNpsRecords,
  generateCsvContent,
  generateWhatsAppSummary,
  groupByHourKanban,
  groupByNpsHourKanban,
  parseTimeToMinutes,
  FilterCriteria,
} from './performanceAnalytics';

const defaultCriteria: FilterCriteria = {
  search: '',
  status: 'TODOS',
  attendanceFilter: 'TODOS',
  modalidade: 'TODAS',
  turno: 'TODOS',
  curso: 'TODOS',
  horario: 'TODOS',
  notaFilter: 'TODOS',
  apenasInadimplentes: false,
  sortBy: 'id',
  sortDir: 'asc',
};

test('PORTAL_METADATA and INITIAL_STUDENT_RECORDS match live Microlins portal dashboard (114 agendamentos, 71 presenças, 43 faltas)', () => {
  assert.equal(PORTAL_METADATA.usuarioNomeCompleto, 'João Pedro Pereira França');
  assert.equal(PORTAL_METADATA.usuarioCargo, 'Auxiliar Pedagógico');
  assert.equal(PORTAL_METADATA.diaSemana, 'Sexta-feira');

  // Ground truth: 114 total agendamentos on the live portal dashboard
  assert.equal(INITIAL_STUDENT_RECORDS.length, 114);

  const evaluatedAt2030 = evaluateAllStudentsAttendance(
    INITIAL_STUDENT_RECORDS,
    parseTimeToMinutes('20:30')
  );
  assert.equal(evaluatedAt2030.length, 114);

  const kpis = computePerformanceKPIs(evaluatedAt2030, parseTimeToMinutes('20:30'));
  assert.equal(kpis.totalAgendamentos, 114);

  // 71 presenças (62 FINALIZADO + 9 INICIADO)
  assert.equal(kpis.presencaCount, 71);
  assert.equal(kpis.finalizados, 62);
  assert.equal(kpis.iniciados, 9);

  // 43 faltas (aulas que NÃO iniciaram e cujo horário + 15 min de tolerância já expirou)
  assert.equal(kpis.faltaCount, 43);
  assert.equal(kpis.aguardandoCount, 0);

  // Soma consistente: 71 + 43 + 0 = 114
  assert.equal(
    kpis.totalAgendamentos,
    kpis.presencaCount + kpis.faltaCount + kpis.aguardandoCount
  );

  // Média de frequência: 71 / 114 = 62.3%
  assert.equal(kpis.mediaFrequencia, 62.3);
});

test('Presence priority rule: initiated or finalized class ALWAYS receives Presença, never overridden by clock time', () => {
  const baseSample = INITIAL_STUDENT_RECORDS[0];
  const afternoonCompletedStudent: StudentPerformanceRecord = {
    ...baseSample,
    id: 991,
    contrato: '991001',
    nomeCompleto: 'Aluno Presenca Tarde',
    horario: '16:00 à 17:00',
    horaInicio: '16:00',
    horaFim: '17:00',
    inicio: '30/10/26 13:30',
    fim: '30/10/26 14:20',
    status: 'FINALIZADO',
  };

  // Even if evaluated at 08:00 (before 16:00), the student already initiated/finished the class: PRESENÇA!
  const evalAt08 = evaluateStudentAttendance(
    afternoonCompletedStudent,
    parseTimeToMinutes('08:00')
  );
  assert.equal(evalAt08.attendanceStatus, 'Presença');

  // Even if evaluated at 14:00, PRESENÇA!
  const evalAt14 = evaluateStudentAttendance(
    afternoonCompletedStudent,
    parseTimeToMinutes('14:00')
  );
  assert.equal(evalAt14.attendanceStatus, 'Presença');
});

test('Absence tolerance rule: supports both :00 and :30 schedules with exact 15-minute tolerance', () => {
  const baseSample = INITIAL_STUDENT_RECORDS[0];
  const class1830: StudentPerformanceRecord = {
    ...baseSample,
    id: 992,
    contrato: '991002',
    nomeCompleto: 'Aluno Aula 18h30',
    horario: '18:30 à 19:30',
    horaInicio: '18:30',
    horaFim: '19:30',
    inicio: '',
    fim: '',
    status: 'NÃO INICIADO',
  };

  // At 18:20 (before 18:30 class) -> Não iniciado
  const beforeClass = evaluateStudentAttendance(
    class1830,
    parseTimeToMinutes('18:20')
  );
  assert.equal(beforeClass.attendanceStatus, 'Não iniciado');
  assert.equal(beforeClass.hourKey, '18h');
  assert.equal(beforeClass.toleranceWindowLabel, '18:30 às 18:45');

  // At 18:40 (within 18:30-18:45 tolerance) -> Não iniciado (aguardando)
  const duringTolerance = evaluateStudentAttendance(
    class1830,
    parseTimeToMinutes('18:40')
  );
  assert.equal(duringTolerance.attendanceStatus, 'Não iniciado');
  assert.equal(duringTolerance.isWithinTolerance, true);

  // At 18:45 (tolerance expired without start) -> Falta!
  const afterTolerance = evaluateStudentAttendance(
    class1830,
    parseTimeToMinutes('18:45')
  );
  assert.equal(afterTolerance.attendanceStatus, 'Falta');
  assert.equal(afterTolerance.isWithinTolerance, false);
});

test('Evasão rule: identified when student has > 2 schedules, 1 presence, and faltas in all others, and preserved across filters', () => {
  const allEvaluated = evaluateAllStudentsAttendance(
    INITIAL_STUDENT_RECORDS,
    parseTimeToMinutes('20:30')
  );

  const kpis = computePerformanceKPIs(allEvaluated, parseTimeToMinutes('20:30'));
  // Edson Antonio Fernandes Machado (#5049187) and Maria Lucia de Macêdo Souza (#5122561) both have 3 schedules with 1 presença and 2 faltas
  assert.equal(kpis.evasaoCount, 2);

  const edson = allEvaluated.find((r) => r.contrato === '5049187');
  assert.ok(edson);
  assert.equal(edson.isEvasao, true);
  assert.ok(edson.evasaoSummary?.includes('1 presença e 2 faltas'));

  const mariaLucia = allEvaluated.find((r) => r.contrato === '5122561');
  assert.ok(mariaLucia);
  assert.equal(mariaLucia.isEvasao, true);
  assert.ok(mariaLucia.evasaoSummary?.includes('1 presença e 2 faltas'));

  // Filtering by a single hour (15h) must preserve Maria Lucia's Evasão status
  const filtered15h = filterAndSortRecords(
    allEvaluated,
    { ...defaultCriteria, horario: '15h' },
    parseTimeToMinutes('20:30')
  );
  const kpis15h = computePerformanceKPIs(filtered15h, parseTimeToMinutes('20:30'));
  assert.equal(kpis15h.evasaoCount, 1);
});

test('Strict NPS linking: 6 active unanswered invitations linked to Kanban students (excluding students who already answered newer invites)', () => {
  assert.equal(INITIAL_ACTIVE_NPS_INVITATIONS.length, 6);

  const kanbanContracts = new Set(INITIAL_STUDENT_RECORDS.map((r) => r.contrato));
  for (const inv of INITIAL_ACTIVE_NPS_INVITATIONS) {
    assert.equal(inv.invitationStatus, 'ativo');
    assert.equal(inv.answered, false);
    assert.ok(
      kanbanContracts.has(inv.contrato),
      `Expected invitation ${inv.controlId} for ${inv.studentName} to be enrolled in Kanban`
    );
  }

  // Verify students who already answered newer invites (5113645, 5120391, 5108237) are NOT in active invitations
  assert.equal(
    INITIAL_ACTIVE_NPS_INVITATIONS.some((i) => i.contrato === '5113645'),
    false
  );
  assert.equal(
    INITIAL_ACTIVE_NPS_INVITATIONS.some((i) => i.contrato === '5120391'),
    false
  );
  assert.equal(
    INITIAL_ACTIVE_NPS_INVITATIONS.some((i) => i.contrato === '5108237'),
    false
  );
});

test('NPS tab exclusive KPIs: 6 convites únicos (5 Portal, 1 E-mail; 3 Jornada 30d, 3 Jornada 50+d) and 17 agendamentos vinculados', () => {
  const allEvaluated = evaluateAllStudentsAttendance(
    INITIAL_STUDENT_RECORDS,
    parseTimeToMinutes('20:30')
  );

  const allNpsRecords = filterNpsRecords(allEvaluated, {
    search: '',
    origem: 'TODAS',
    pontoJornada: 'TODOS',
    horario: 'TODOS',
    diaSemana: 'TODOS',
  });

  const kpis = computeNpsSummaryKPIs(allNpsRecords);
  assert.equal(kpis.totalConvitesAtivos, 6);
  assert.equal(kpis.portalDoAlunoCount, 5);
  assert.equal(kpis.emailCount, 1);
  assert.equal(kpis.jornada30Count, 3);
  assert.equal(kpis.jornada50Count, 3);
  assert.equal(kpis.totalAgendamentosVinculados, 17);
});

test('Kanban Current Hour rule: only the real current hour has isCurrentHour=true, never transferred when filtered out', () => {
  const allEvaluated = evaluateAllStudentsAttendance(
    INITIAL_STUDENT_RECORDS,
    parseTimeToMinutes('14:05')
  );

  const colsAt14 = groupByHourKanban(
    allEvaluated,
    'AGENDADO',
    parseTimeToMinutes('14:05')
  );
  assert.equal(colsAt14[0].hourKey, '14h');
  assert.equal(colsAt14[0].isCurrentHour, true);

  // Filter to only 16h while current time is still 14:05 -> 16h must NOT become isCurrentHour
  const only16h = filterAndSortRecords(
    allEvaluated,
    { ...defaultCriteria, horario: '16h' },
    parseTimeToMinutes('14:05')
  );
  const colsFiltered = groupByHourKanban(
    only16h,
    'AGENDADO',
    parseTimeToMinutes('14:05')
  );
  assert.equal(colsFiltered.length, 1);
  assert.equal(colsFiltered[0].hourKey, '16h');
  assert.equal(colsFiltered[0].isCurrentHour, false);
});

test('generateCsvContent and generateWhatsAppSummary format exports properly', () => {
  const sample = INITIAL_STUDENT_RECORDS.slice(0, 3);
  const csv = generateCsvContent(
    sample,
    ['contrato', 'nomeCompleto', 'curso', 'attendanceStatus', 'nota', 'observacao'],
    { [sample[0].contrato]: 'Excelente participação' },
    ';',
    parseTimeToMinutes('20:30')
  );

  const lines = csv.split('\r\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[0].includes('Contrato / Matrícula'));
  assert.ok(lines[1].includes('Excelente participação'));

  const summary = generateWhatsAppSummary(
    INITIAL_STUDENT_RECORDS,
    'ESCOLA PRESIDENTE PRUDENTE',
    '30/10/2026',
    parseTimeToMinutes('20:30')
  );
  assert.ok(summary.includes('RELATÓRIO DE DESEMPENHO ACADÊMICO'));
  assert.ok(summary.includes('Total de agendamentos: 114'));
});
