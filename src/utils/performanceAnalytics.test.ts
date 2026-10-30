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
  evaluateStudentAttendance,
  extractRecordStartHour,
  filterAndSortRecords,
  filterNpsRecords,
  generateCsvContent,
  generateWhatsAppSummary,
  groupByCourse,
  groupByHourKanban,
  groupByNpsHourKanban,
  groupBySchedule,
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

test('PORTAL_METADATA and INITIAL_STUDENT_RECORDS match authentic Microlins portal dashboard (84 agendamentos, 20 presenças, 9 faltas, 55 não iniciados)', () => {
  assert.equal(PORTAL_METADATA.usuarioNomeCompleto, 'João Pedro Pereira França');
  assert.equal(PORTAL_METADATA.usuarioCargo, 'Educador');
  assert.equal(PORTAL_METADATA.diaSemana, 'Sexta-feira');

  // Ground truth: 84 total agendamentos on the portal dashboard
  assert.equal(INITIAL_STUDENT_RECORDS.length, 84);

  const evaluatedAt1405 = filterAndSortRecords(
    INITIAL_STUDENT_RECORDS,
    defaultCriteria,
    parseTimeToMinutes('14:05')
  );
  assert.equal(evaluatedAt1405.length, 84);

  const kpis = computePerformanceKPIs(evaluatedAt1405, parseTimeToMinutes('14:05'));
  assert.equal(kpis.totalAgendamentos, 84);

  // 20 presenças (17 FINALIZADO + 3 INICIADO)
  assert.equal(kpis.presencaCount, 20);
  assert.equal(kpis.finalizados, 17);
  assert.equal(kpis.iniciados, 3);

  // 9 faltas (aulas da manhã às 08h, 10h, 11h, 12h que NÃO iniciaram e cujo horário já passou)
  assert.equal(kpis.faltaCount, 9);

  // 55 não iniciados (7 às 14h dentro da tolerância + 48 aulas da tarde e noite)
  assert.equal(kpis.aguardandoCount, 55);

  // Soma consistente: 20 + 9 + 55 = 84
  assert.equal(kpis.totalAgendamentos, kpis.presencaCount + kpis.faltaCount + kpis.aguardandoCount);

  // Média de frequência: 20 / (20 + 9) = 69.0%
  assert.equal(kpis.mediaFrequencia, 69.0);
});

test('Presence priority rule: initiated class ALWAYS receives Presença, never overridden by clock time', () => {
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
  const evalAt08 = evaluateStudentAttendance(afternoonCompletedStudent, parseTimeToMinutes('08:00'));
  assert.equal(evalAt08.attendanceStatus, 'Presença');

  // Even if evaluated at 14:00, PRESENÇA!
  const evalAt14 = evaluateStudentAttendance(afternoonCompletedStudent, parseTimeToMinutes('14:00'));
  assert.equal(evalAt14.attendanceStatus, 'Presença');
});

test('Absence tolerance rule: uninitiated class receives Falta only after 15 min tolerance', () => {
  const baseSample = INITIAL_STUDENT_RECORDS[0];
  const class14h: StudentPerformanceRecord = {
    ...baseSample,
    id: 992,
    contrato: '991002',
    nomeCompleto: 'Aluno Aula 14h',
    horario: '14:00 à 15:00',
    horaInicio: '14:00',
    horaFim: '15:00',
    inicio: '',
    fim: '',
    status: 'NÃO INICIADO',
  };

  // At 13:50 (before class) -> Não iniciado
  const beforeClass = evaluateStudentAttendance(class14h, parseTimeToMinutes('13:50'));
  assert.equal(beforeClass.attendanceStatus, 'Não iniciado');

  // At 14:10 (within 15 min tolerance) -> Não iniciado (aguardando)
  const duringTolerance = evaluateStudentAttendance(class14h, parseTimeToMinutes('14:10'));
  assert.equal(duringTolerance.attendanceStatus, 'Não iniciado');
  assert.equal(duringTolerance.isWithinTolerance, true);

  // At 14:15 (tolerance expired without start) -> Falta!
  const afterTolerance = evaluateStudentAttendance(class14h, parseTimeToMinutes('14:15'));
  assert.equal(afterTolerance.attendanceStatus, 'Falta');
  assert.equal(afterTolerance.isWithinTolerance, false);
});

test('Kanban colunas por horário: 14h é fixada como primeira coluna no horário de referência', () => {
  const evaluated = filterAndSortRecords(
    INITIAL_STUDENT_RECORDS,
    defaultCriteria,
    parseTimeToMinutes('14:05')
  );

  const cols = groupByHourKanban(evaluated, 'AGENDADO', parseTimeToMinutes('14:05'));
  assert.equal(cols.length, 11);

  // First column is 14h and isCurrentHour is true
  assert.equal(cols[0].hourKey, '14h');
  assert.equal(cols[0].isCurrentHour, true);
  assert.equal(cols[0].total, 7);

  // 14h has 7 não iniciados (starting now in tolerance)
  assert.equal(cols[0].naoIniciadoCount, 7);
  assert.equal(cols[0].presencaCount, 0);
  assert.equal(cols[0].faltaCount, 0);

  // Morning columns have their presenças and faltas
  const col08 = cols.find((c) => c.hourKey === '08h');
  assert.ok(col08);
  assert.equal(col08.presencaCount, 5);
  assert.equal(col08.faltaCount, 3);
  assert.equal(col08.naoIniciadoCount, 0);

  const col09 = cols.find((c) => c.hourKey === '09h');
  assert.ok(col09);
  assert.equal(col09.presencaCount, 7);
  assert.equal(col09.faltaCount, 0);
  assert.equal(col09.naoIniciadoCount, 0);
});

test('Evasão rule: identified when student has > 2 schedules, 1 presence, and faltas in all others', () => {
  const evaluated = filterAndSortRecords(
    INITIAL_STUDENT_RECORDS,
    defaultCriteria,
    parseTimeToMinutes('14:05')
  );

  const kpis = computePerformanceKPIs(evaluated, parseTimeToMinutes('14:05'));
  // Student Edson Antonio Fernandes Machado (5049187) has 3 morning schedules: 1 presença e 2 faltas -> Evasão
  assert.equal(kpis.evasaoCount, 1);

  const edson = evaluated.find((r) => r.contrato === '5049187');
  assert.ok(edson);
  assert.equal(edson.isEvasao, true);
  assert.ok(edson.evasaoSummary?.includes('1 presença e 2 faltas'));
});

test('Strict NPS linking: 6 active invitations linked to Kanban students with proper Origem and Jornada', () => {
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

  const roseane = INITIAL_ACTIVE_NPS_INVITATIONS.find((i) => i.contrato === '5127430');
  assert.ok(roseane);
  assert.equal(roseane.origem, 'E-mail');
  assert.equal(roseane.pontoJornada, '30 dias');

  const mariaLucia = INITIAL_ACTIVE_NPS_INVITATIONS.find((i) => i.contrato === '5122561');
  assert.ok(mariaLucia);
  assert.equal(mariaLucia.origem, 'Portal do Aluno');
  assert.equal(mariaLucia.pontoJornada, '50 dias');
});

test('NPS tab exclusive KPIs: 6 convites únicos, origens e agendamentos vinculados', () => {
  const allEvaluated = filterAndSortRecords(
    INITIAL_STUDENT_RECORDS,
    defaultCriteria,
    parseTimeToMinutes('14:05')
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
  assert.equal(kpis.totalAgendamentosVinculados, 12);
});

test('NPS Kanban grouping: columns organized by hours with current hour first', () => {
  const allEvaluated = filterAndSortRecords(
    INITIAL_STUDENT_RECORDS,
    defaultCriteria,
    parseTimeToMinutes('14:05')
  );

  const allNpsRecords = filterNpsRecords(allEvaluated, {
    search: '',
    origem: 'TODAS',
    pontoJornada: 'TODOS',
    horario: 'TODOS',
    diaSemana: 'TODOS',
  });

  const npsCols = groupByNpsHourKanban(allNpsRecords, parseTimeToMinutes('14:05'));
  assert.ok(npsCols.length > 0);

  // First column is 14h because Roseane and Izaque have class at 14h!
  assert.equal(npsCols[0].hourKey, '14h');
  assert.equal(npsCols[0].isCurrentHour, true);

  // Total agendamentos across all NPS columns equals 12
  const totalInCols = npsCols.reduce((acc, c) => acc + c.totalAgendamentos, 0);
  assert.equal(totalInCols, 12);
});

test('generateCsvContent and generateWhatsAppSummary format exports properly', () => {
  const sample = INITIAL_STUDENT_RECORDS.slice(0, 3);
  const csv = generateCsvContent(
    sample,
    ['contrato', 'nomeCompleto', 'curso', 'attendanceStatus', 'nota', 'observacao'],
    { '5108237': 'Contato realizado via WhatsApp' },
    ';',
    parseTimeToMinutes('14:05')
  );
  assert.ok(csv.includes('5108237;Leonice Conceição Prado'));

  const wa = generateWhatsAppSummary(INITIAL_STUDENT_RECORDS, 'ESCOLA PRESIDENTE PRUDENTE', '30/10/2026', parseTimeToMinutes('14:05'));
  assert.ok(wa.includes('ESCOLA PRESIDENTE PRUDENTE'));
  assert.ok(wa.includes('Presença confirmada: 20'));
  assert.ok(wa.includes('Falta (após 15 min de tolerância): 9'));
});
