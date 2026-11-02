import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ActiveNpsInvitation,
  ALL_WEEK_STUDENT_RECORDS,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  OFFICIAL_PORTAL_LOGIN_URL,
  StudentPerformanceRecord,
} from '../data/microlinsData';
import {
  buildConsolidatedExportMatrix,
  buildInitialCadDatabases,
  buildMultiLevelGroups,
  buildSynchronizedNpsStudentCards,
  buildWhatsAppNpsUrl,
  calculateSaidaAntecipada,
  calculateTempoPermanencia,
  collectAllGroupKeys,
  computeDashboardAnalytics,
  computeDashboardSummaryMetricsFromStudents,
  computeGroupSubtotals,
  computeNpsSummaryKPIs,
  computePerformanceKPIs,
  consolidateMultipleCads,
  CONSOLIDATED_TABLE_COLUMNS,
  DEFAULT_CAD_ID,
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMN_IDS,
  evaluateAllStudentsAttendance,
  evaluateStudentAttendance,
  extractColumnDistinctValues,
  filterAndDeduplicateAnnualNpsInvitations,
  filterAndSortRecords,
  filterDashboardStudentsByCardSelection,
  filterDashboardStudentsByCardSelections,
  formatFullSalaName,
  formatModuleDisplay,
  generateConsolidatedXlsxWorkbook,
  getBrasiliaCurrentMinutes,
  getUnassociatedNpsInvitations,
  GROUPABLE_FIELDS,
  groupByHourKanban,
  groupByNpsHourKanban,
  groupConsolidatedStudentsByCapacitacao,
  groupConsolidatedStudentsByFormacao,
  isDuplicateNpsInvitation,
  matchesMultiValueColumnFilters,
  parseImportedCadRecords,
  reorderColumnList,
  resolveEffectiveTableColumns,
  resolveNotaContexto,
  resolveRealNpsDeliveryTracking,
  resolveStudentCategory,
  resolveStudentLoginLink,
  sortConsolidatedStudents,
  toggleColumnPinState,
  toggleDashboardCardSelection,
} from './performanceAnalytics';
import {
  authenticatePlatformLogin,
  createDefaultSchoolsRegistry,
  upsertSchoolInRegistry,
  upsertUserInSchoolRegistry,
} from './authRegistry';

function makeStudentRecord(
  overrides: Partial<StudentPerformanceRecord> = {}
): StudentPerformanceRecord {
  return {
    id: 1001,
    contrato: '5100752',
    aulaId: 'AULA-1001',
    nomeCompleto: 'Isabela Pais Santana',
    nomeCurto: 'Isabela',
    telefoneAluno: '5518991147369',
    whatsappAlunoUrl: '',
    nomeResponsavel: 'Responsável Isabela',
    telefoneResponsavel: '5518991147369',
    whatsappResponsavelUrl: '',
    formacao: 'CAPACITAÇÃO - DINÂMICA',
    curso: 'INFORMÁTICA ESSENCIAL',
    aulaInfo: 'Aula 4 - Apostila',
    aulaNumero: 4,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '08:00 às 10:00',
    horaInicio: '08:00',
    horaFim: '10:00',
    turno: 'Manhã',
    sala: 'SALA 01',
    modalidade: 'Presencial',
    inicio: '',
    fim: '',
    nota: null,
    notaId: '0',
    infoAula: 'Portal do Aluno',
    status: 'NÃO INICIADO',
    inadimplente: false,
    diaSemana: 'Sábado',
    semanaCode: '6',
    ...overrides,
  };
}

describe('Auditoria Obrigatória — Ajustes e Melhorias no Sistema Microlins', () => {
  it('Item 1: Correção do link de login — rejeita URLs quebradas com número de contrato puro e direciona para página de login oficial ou token criptografado válido', () => {
    // URL quebrada com número de contrato não criptografado deve ser substituída pela página oficial de login
    const fixedLink = resolveStudentLoginLink(
      '5099812',
      'https://portaldoaluno.microlins.com.br/autenticacao/tokenAluno/5099812'
    );
    assert.equal(fixedLink, OFFICIAL_PORTAL_LOGIN_URL);

    // Token criptografado real do Portal do Aluno deve ser mantido
    const validTokenUrl =
      'https://portaldoaluno.microlins.com.br/autenticacao/tokenAluno/4R3ZXCevrY4K4tC+D8XPGg==';
    assert.equal(
      resolveStudentLoginLink('5125624', validTokenUrl),
      validTokenUrl
    );

    // Verificar todos os registros reais (Presencial e Online, individuais e turmas)
    const evaluatedAll = evaluateAllStudentsAttendance(
      ALL_WEEK_STUDENT_RECORDS,
      getBrasiliaCurrentMinutes('09:00'),
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sábado'
    );
    let encryptedTokenLinksCount = 0;
    for (const st of evaluatedAll) {
      assert.ok(
        st.linkAcessoDireto.startsWith('https://portaldoaluno.microlins.com.br/'),
        `Link de aula inválido para contrato ${st.contrato}: ${st.linkAcessoDireto}`
      );
      assert.equal(
        /\/autenticacao\/tokenAluno\/\d+\/?$/i.test(st.linkAcessoDireto),
        false,
        `Contrato ${st.contrato} não pode ter link quebrado com número puro`
      );
      if (st.linkAcessoDireto.includes('/autenticacao/tokenAluno/4R3ZXCe')) {
        encryptedTokenLinksCount++;
      }
    }
    assert.ok(
      encryptedTokenLinksCount >= 850,
      `Mais de 850 dos ${evaluatedAll.length} agendamentos da semana devem possuir token criptografado real da aula (encontrados: ${encryptedTokenLinksCount})`
    );
  });

  it('Item 2: Regra de identificação de faltas e presenças com prioridade absoluta para o status do sistema e regra automática de 15 minutos', () => {
    // 1. Sistema informa PRESENÇA -> mantém Presença mesmo após vários horários ou dias
    const sysPresent = makeStudentRecord({
      id: 10,
      horaInicio: '08:00',
      horario: '08:00 às 10:00',
      diaSemana: 'Sexta-feira',
      status: 'FINALIZADO',
      inicio: '30/10/2026 08:02',
    });
    const evalPresent = evaluateStudentAttendance(
      sysPresent,
      16 * 60,
      {},
      [],
      'Sexta-feira'
    );
    assert.equal(evalPresent.attendanceStatus, 'Presença');

    // 2. Antes do horário da aula (08:00 para aula das 14:00) ou no início da semana no Domingo -> zera qualquer falta/presença e só contabiliza quando chegar a aula do aluno
    const sysFalta = makeStudentRecord({
      id: 11,
      horaInicio: '14:00',
      horario: '14:00 às 16:00',
      diaSemana: 'Sexta-feira',
      status: 'NÃO INICIADO',
      presencaOuFalta: 'F',
      inicio: '',
    });
    const evalSysFaltaBeforeHour = evaluateStudentAttendance(
      sysFalta,
      8 * 60, // 08:00 (antes das 14:00)
      {},
      [],
      'Sexta-feira'
    );
    assert.equal(
      evalSysFaltaBeforeHour.attendanceStatus,
      'Não iniciada',
      'Antes de chegar o horário da aula do aluno, qualquer falta ou presença deve ficar zerada (Não iniciada)'
    );

    const evalSysFaltaWhenArrived = evaluateStudentAttendance(
      sysFalta,
      14 * 60 + 5, // 14:05 (já chegou o horário da aula)
      {},
      [],
      'Sexta-feira'
    );
    assert.equal(
      evalSysFaltaWhenArrived.attendanceStatus,
      'Falta',
      'Assim que chega o horário da aula do aluno, se o sistema informar FALTA, contabiliza Falta'
    );

    // No início da semana no Domingo, todos os agendamentos de Segunda a Sábado devem iniciar 100% zerados (Não iniciada)
    const evalOnSundayReset = evaluateStudentAttendance(
      sysPresent,
      10 * 60,
      {},
      [],
      'Domingo'
    );
    assert.equal(
      evalOnSundayReset.attendanceStatus,
      'Não iniciada',
      'No Domingo (início da semana), todas as aulas de Segunda a Sábado devem estar resetadas como Não iniciada'
    );

    // 3. Não há presença nem falta registrada e ainda não passaram 15 minutos (antes do horário ou até +15m) -> Não iniciada
    const noSystemStatus = makeStudentRecord({
      id: 12,
      horaInicio: '10:00',
      horario: '10:00 às 12:00',
      diaSemana: 'Sexta-feira',
      status: 'NÃO INICIADO',
      inicio: '',
    });

    // Antes do horário (08:30)
    const evalBeforeStart = evaluateStudentAttendance(
      noSystemStatus,
      8 * 60 + 30,
      {},
      [],
      'Sexta-feira'
    );
    assert.equal(evalBeforeStart.attendanceStatus, 'Não iniciada');
    assert.equal(evalBeforeStart.scheduleStage, 'HORARIO_FUTURO');

    // Dentro dos 15 minutos (10:00, 10:08, 10:15)
    for (const minMark of [10 * 60, 10 * 60 + 8, 10 * 60 + 15]) {
      const evalTolerance = evaluateStudentAttendance(
        noSystemStatus,
        minMark,
        {},
        [],
        'Sexta-feira'
      );
      assert.equal(
        evalTolerance.attendanceStatus,
        'Não iniciada',
        `Minuto ${minMark} (até 15 min do início) deve ter status "Não iniciada"`
      );
      assert.equal(evalTolerance.isWithinTolerance, true);
    }

    // 4. Não há presença nem falta registrada e já passaram mais de 15 minutos (10:16, 15:00) -> Falta
    for (const minMark of [10 * 60 + 16, 15 * 60]) {
      const evalAfter15 = evaluateStudentAttendance(
        noSystemStatus,
        minMark,
        {},
        [],
        'Sexta-feira'
      );
      assert.equal(
        evalAfter15.attendanceStatus,
        'Falta',
        `Minuto ${minMark} (após 15 min sem presença nem falta) deve ter status "Falta"`
      );
      assert.equal(evalAfter15.isWithinTolerance, false);
    }
  });

  it('Item 3 & 5: Filtros de Apostila e Convite NPS + formatação limpa do Módulo', () => {
    assert.equal(
      formatModuleDisplay('Módulo: EXCEL AVANÇADO'),
      'EXCEL AVANÇADO'
    );
    assert.equal(formatModuleDisplay(''), 'Módulo não informado');

    const rComApostilaComNps = makeStudentRecord({
      id: 101,
      contrato: '5100752',
      nomeCompleto: 'Isabela Pais Santana',
      possuiApostila: true,
      diaSemana: 'Sábado',
    });
    const rSemApostilaSemNps = makeStudentRecord({
      id: 102,
      contrato: '9999991',
      nomeCompleto: 'Aluno Sem Material e Sem NPS',
      possuiApostila: false,
      diaSemana: 'Sábado',
    });

    const npsList: ActiveNpsInvitation[] = [
      {
        id: 'nps-101',
        controlId: 'CTRL101',
        studentName: 'Isabela Pais Santana',
        contrato: '5100752',
        codigoPessoa: '6993311',
        email: 'isabela@teste.com',
        phone: '5518991147369',
        actionName: 'B2C | Microlins - NPS',
        pontoJornada: '30 dias',
        origem: 'Portal do Aluno',
        channel: 'widget',
        invitationStatus: 'ativo',
        answered: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        sentAt: '2026-10-20T10:00:00.000Z',
        answeredAt: null,
        attemptsCount: 0,
        surveyUrl: 'https://indecx.com/s/CTRL101',
      },
    ];

    const baseCriteria = {
      search: '',
      diaSemana: 'Sábado',
      sala: 'TODAS',
      horario: 'TODOS',
      modalidade: 'TODAS' as const,
      status: 'TODOS' as const,
      attendanceFilter: 'TODOS' as const,
      turno: 'TODOS' as const,
      curso: 'TODOS',
      notaFilter: 'TODOS' as const,
      apenasInadimplentes: false,
      sortBy: 'id' as const,
      sortDir: 'asc' as const,
    };

    const comApostila = filterAndSortRecords(
      [rComApostilaComNps, rSemApostilaSemNps],
      { ...baseCriteria, apostilaFilter: 'COM_APOSTILA' },
      8 * 60,
      {},
      npsList,
      'Sábado'
    );
    assert.equal(comApostila.length, 1);
    assert.equal(comApostila[0].id, 101);

    const semApostila = filterAndSortRecords(
      [rComApostilaComNps, rSemApostilaSemNps],
      { ...baseCriteria, apostilaFilter: 'SEM_APOSTILA' },
      8 * 60,
      {},
      npsList,
      'Sábado'
    );
    assert.equal(semApostila.length, 1);
    assert.equal(semApostila[0].id, 102);

    const comNps = filterAndSortRecords(
      [rComApostilaComNps, rSemApostilaSemNps],
      { ...baseCriteria, npsFilter: 'COM_NPS' },
      8 * 60,
      {},
      npsList,
      'Sábado'
    );
    assert.equal(comNps.length, 1);
    assert.equal(comNps[0].id, 101);

    const semNps = filterAndSortRecords(
      [rComApostilaComNps, rSemApostilaSemNps],
      { ...baseCriteria, npsFilter: 'SEM_NPS' },
      8 * 60,
      {},
      npsList,
      'Sábado'
    );
    assert.equal(semNps.length, 1);
    assert.equal(semNps[0].id, 102);
  });

  it('Item 6: Validação de convites duplicados — considera simultaneamente Nome da pessoa + Jornada + Origem do convite', () => {
    const baseInvite: ActiveNpsInvitation = {
      id: 'inv-1',
      controlId: 'DUP01',
      studentName: 'Isabela Pais Santana',
      contrato: '5100752',
      codigoPessoa: '6993311',
      email: 'isabela@teste.com',
      phone: '5518991147369',
      actionName: 'B2C | Microlins - NPS',
      pontoJornada: '30 dias',
      origem: 'Portal do Aluno',
      channel: 'widget',
      invitationStatus: 'ativo',
      answered: false,
      createdAt: '2026-10-10T10:00:00.000Z',
      sentAt: '2026-10-10T10:00:00.000Z',
      answeredAt: null,
      attemptsCount: 0,
      surveyUrl: 'https://indecx.com/s/DUP01',
    };

    // Mesmo Nome + Mesma Jornada + Mesma Origem = DUPLICADO
    const exactThreeMatch: ActiveNpsInvitation = {
      ...baseInvite,
      id: 'inv-2',
      controlId: 'DUP02',
      createdAt: '2026-10-12T10:00:00.000Z',
      sentAt: '2026-10-12T10:00:00.000Z',
    };

    // Mesmo Nome + Mesma Jornada + Origem DIFERENTE = NÃO É DUPLICADO
    const diffOrigem: ActiveNpsInvitation = {
      ...baseInvite,
      id: 'inv-3',
      controlId: 'NODUP03',
      origem: 'E-mail',
      channel: 'email',
      createdAt: '2026-10-11T10:00:00.000Z',
      sentAt: '2026-10-11T10:00:00.000Z',
    };

    // Mesmo Nome + Jornada DIFERENTE + Mesma Origem = NÃO É DUPLICADO
    const diffJornada: ActiveNpsInvitation = {
      ...baseInvite,
      id: 'inv-4',
      controlId: 'NODUP04',
      pontoJornada: '50 dias',
      createdAt: '2026-10-13T10:00:00.000Z',
      sentAt: '2026-10-13T10:00:00.000Z',
    };

    assert.equal(isDuplicateNpsInvitation(baseInvite, exactThreeMatch), true);
    assert.equal(isDuplicateNpsInvitation(baseInvite, diffOrigem), false);
    assert.equal(isDuplicateNpsInvitation(baseInvite, diffJornada), false);

    const deduplicated = filterAndDeduplicateAnnualNpsInvitations(
      [baseInvite, exactThreeMatch, diffOrigem, diffJornada],
      2026
    );

    // Deve manter 3 convites (DUP02 que é o mais recente do par duplicado, NODUP03 com origem diferente, e NODUP04 com jornada diferente)
    assert.equal(deduplicated.length, 3);
    assert.deepEqual(
      deduplicated.map((d) => d.controlId),
      ['NODUP04', 'DUP02', 'NODUP03']
    );
  });

  it('Item 8: Fixação e identificação do horário atual funcionando nos dois Kanbans (Kanban de Alunos e Kanban NPS)', () => {
    const nineAm = getBrasiliaCurrentMinutes('09:10');
    const records: StudentPerformanceRecord[] = [
      makeStudentRecord({
        id: 201,
        contrato: '5100752',
        nomeCompleto: 'Isabela Pais Santana',
        horaInicio: '08:00',
        horario: '08:00 às 10:00',
        diaSemana: 'Sábado',
      }),
      makeStudentRecord({
        id: 202,
        contrato: '5100752',
        nomeCompleto: 'Isabela Pais Santana',
        horaInicio: '09:00',
        horario: '09:00 às 11:00',
        diaSemana: 'Sábado',
      }),
      makeStudentRecord({
        id: 203,
        contrato: '5100752',
        nomeCompleto: 'Isabela Pais Santana',
        horaInicio: '10:00',
        horario: '10:00 às 12:00',
        diaSemana: 'Sábado',
      }),
    ];

    const studentCols = groupByHourKanban(
      records,
      'AGENDADO',
      nineAm,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sábado'
    );
    const col08 = studentCols.find((c) => c.hourKey === '08h')!;
    const col09 = studentCols.find((c) => c.hourKey === '09h')!;
    const col10 = studentCols.find((c) => c.hourKey === '10h')!;

    assert.equal(col08.isPastHour, true);
    assert.equal(col09.isCurrentHour, true);
    assert.equal(col10.isFutureHour, true);

    const evaluated = evaluateAllStudentsAttendance(
      records,
      nineAm,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sábado'
    );
    const npsCards = buildSynchronizedNpsStudentCards(
      INITIAL_ACTIVE_NPS_INVITATIONS,
      evaluated,
      2026,
      'Sábado',
      nineAm
    );
    const npsCols = groupByNpsHourKanban(npsCards, nineAm, 'CURRENT_DAY');
    const npsCol09 = npsCols.find((c) => c.hourKey === '09h');
    assert.ok(npsCol09, 'Coluna 09h do Kanban NPS deve estar presente e sincronizada com o horário atual');
    assert.equal(npsCol09.isCurrentHour, true);
  });

  it('Item 1: Classifica todos os alunos em estritamente duas categorias (INGLÊS vs PROFISSIONALIZANTE) EXCLUSIVAMENTE pela formação do aluno (ignorando a sala e sem misturar formações distintas)', () => {
    const onlyEnglish = makeStudentRecord({
      formacao: 'Inglês Speed Multimídia',
      curso: 'BOOK 1',
      sala: 'PROFISSIONALIZANTE - Presencial',
    });
    const annualBookStudent = makeStudentRecord({
      formacao: 'Annual Book - Multimídia',
      curso: 'ANNUAL BOOK 2',
      sala: 'PROFISSIONALIZANTE - Online',
    });
    const vocationalStudentInEnglishRoom = makeStudentRecord({
      formacao: 'CAPACITAÇÃO - DINÂMICA',
      curso: 'EXCEL AVANÇADO E POWER BI',
      sala: 'INGLÊS',
    });

    assert.equal(resolveStudentCategory(onlyEnglish), 'INGLÊS');
    assert.equal(resolveStudentCategory(annualBookStudent), 'INGLÊS');
    assert.equal(
      resolveStudentCategory(vocationalStudentInEnglishRoom),
      'PROFISSIONALIZANTE',
      'A sala nunca deve alterar a decisão da categoria do curso; vale exclusivamente a formação do aluno'
    );

    // Se o mesmo aluno possuir um horário em Annual Book e outro em CAPACITAÇÃO - DINÂMICA, cada formação mantém sua categoria própria
    const mixedSchedules = evaluateAllStudentsAttendance([
      makeStudentRecord({
        id: 501,
        contrato: '9001',
        nomeCompleto: 'Aluno Teste Hibrido',
        formacao: 'Annual Book',
        curso: 'BOOK 1',
        sala: 'PROFISSIONALIZANTE',
        modalidade: 'Presencial',
      }),
      makeStudentRecord({
        id: 502,
        contrato: '9001',
        nomeCompleto: 'Aluno Teste Hibrido',
        formacao: 'CAPACITAÇÃO - DINÂMICA',
        curso: 'INFORMÁTICA ESSENCIAL',
        sala: 'INGLÊS',
        modalidade: 'Online',
      }),
    ]);

    assert.equal(mixedSchedules[0].categoriaCurso, 'INGLÊS');
    assert.equal(
      mixedSchedules[1].categoriaCurso,
      'PROFISSIONALIZANTE',
      'Formação CAPACITAÇÃO - DINÂMICA deve ser sempre PROFISSIONALIZANTE independentemente da sala ou de outro curso do aluno'
    );
    assert.equal(mixedSchedules[0].sala, 'PROFISSIONALIZANTE - Presencial');
    assert.equal(mixedSchedules[1].sala, 'INGLÊS');
    assert.equal(formatFullSalaName('PROFISSIONALIZANTE', 'Online'), 'PROFISSIONALIZANTE - Online');
  });

  it('Item 4: Enriquece convites NPS com o status real de envio/entrega da plataforma Indecx (Enviado, Entregue, Aberto, Não entregue)', () => {
    const deduplicated = filterAndDeduplicateAnnualNpsInvitations(
      INITIAL_ACTIVE_NPS_INVITATIONS,
      2026
    );
    assert.ok(deduplicated.length > 0);
    for (const inv of deduplicated) {
      assert.ok(
        inv.emailDeliveryStatus === 'Enviado' ||
          inv.emailDeliveryStatus === 'Entregue' ||
          inv.emailDeliveryStatus === 'Aberto' ||
          inv.emailDeliveryStatus === 'Não entregue',
        `Status real inválido: ${inv.emailDeliveryStatus}`
      );
      assert.ok(Array.isArray(inv.emailDeliveryEvents));
    }

    // Verifica convite específico com bounce real (Ex: controlId 24APGMU2 -> Não entregue)
    const bouncedSample = resolveRealNpsDeliveryTracking({
      controlId: '24APGMU2',
      origem: 'E-mail',
    });
    assert.equal(bouncedSample.emailDeliveryStatus, 'Não entregue');
    assert.ok(bouncedSample.emailBounceReason);
  });

  it('Itens 6, 7 e 8 + Separação por Formação do Aluno e Seleção de Multi-Cards: Dashboard Gerencial consolida registros e permite filtrar por múltiplos cards simultaneamente', () => {
    const allEvaluated = evaluateAllStudentsAttendance(
      ALL_WEEK_STUDENT_RECORDS,
      10 * 60,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sexta-feira'
    );

    const { metrics, filteredStudents } = computeDashboardAnalytics(allEvaluated, {
      aulaMin: null,
      aulaMax: null,
      situacaoFinanceira: 'TODOS',
      entregaApostila: 'TODOS',
      frequenciaSemanal: 'TODOS',
      diasSemana: [],
      categoriaCurso: 'TODOS',
      modalidade: 'AMBAS',
      horarios: [],
    });

    // 320 contratos únicos + 19 contratos que possuem 2 formações distintas = 339 registros consolidados por (Contrato + Formação)
    assert.equal(
      metrics.totalAlunos,
      339,
      'Deve consolidar exatamente 339 registros separados por Formação do Aluno + Contrato'
    );
    assert.equal(filteredStudents.length, 339);
    assert.equal(
      metrics.inglesCount + metrics.profissionalizanteCount,
      metrics.totalAlunos,
      'A soma de Inglês + Profissionalizante deve ser exatamente igual ao Total de Registros Consolidados'
    );
    assert.equal(
      metrics.apostilaEntregueCount + metrics.apostilaNaoEntregueCount,
      metrics.totalAlunos
    );
    assert.equal(
      metrics.financeiroEmDiaCount + metrics.financeiroEmAtrasoCount,
      metrics.totalAlunos
    );

    // Teste obrigatório: Alunos com mesmo contrato e formações diferentes devem aparecer separados
    const contrato4964823 = filteredStudents.filter((s) => s.contrato === '4964823');
    assert.equal(
      contrato4964823.length,
      2,
      'Contrato 4964823 (Sarah de Oliveira Justino) possui Annual Book e CAPACITAÇÃO - DINÂMICA e deve ser separado em 2 registros distintos'
    );
    assert.notEqual(
      contrato4964823[0].formacao,
      contrato4964823[1].formacao
    );

    // Teste obrigatório: Seleção de Múltiplos Cards (Multi-Card Selection)
    let activeCards = toggleDashboardCardSelection([], 'APOSTILA_PENDENTE');
    activeCards = toggleDashboardCardSelection(activeCards, 'FINANCEIRO_EM_DIA');
    assert.deepEqual(activeCards, ['APOSTILA_PENDENTE', 'FINANCEIRO_EM_DIA']);

    const multiFiltered = filterDashboardStudentsByCardSelections(
      filteredStudents,
      activeCards
    );
    assert.ok(multiFiltered.length > 0);
    for (const st of multiFiltered) {
      assert.equal(st.possuiApostila, false);
      assert.equal(st.inadimplente, false);
    }

    // Seleção combinada de alertas especiais (Ex: Evasão + 4ª Aula s/ Apostila)
    const specialCards = ['EVASAO', 'AULA_4_SEM_APOSTILA_FIN_EM_DIA'] as const;
    const specialFiltered = filterDashboardStudentsByCardSelections(
      filteredStudents,
      [...specialCards]
    );
    assert.ok(
      specialFiltered.length >=
        Math.max(metrics.evadidosCount, metrics.aula4SemApostilaFinEmDiaCount)
    );

    // Desmarcar card ao clicar novamente
    const afterToggleOff = toggleDashboardCardSelection(
      activeCards,
      'APOSTILA_PENDENTE'
    );
    assert.deepEqual(afterToggleOff, ['FINANCEIRO_EM_DIA']);

    // Agrupamento por Formação preserva 100% dos registros consolidados
    const groups = groupConsolidatedStudentsByFormacao(filteredStudents);
    assert.ok(groups.length >= 5, 'Deve agrupar os alunos nas diferentes formações');
    const sumGrouped = groups.reduce((acc, g) => acc + g.students.length, 0);
    assert.equal(sumGrouped, filteredStudents.length);

    // Alias de compatibilidade groupConsolidatedStudentsByCapacitacao
    const compatGroups = groupConsolidatedStudentsByCapacitacao(filteredStudents);
    assert.equal(compatGroups.length, groups.length);

    // Ordenação crescente e decrescente nas colunas da Tabela Consolidada
    const sortedByAulaDesc = sortConsolidatedStudents(filteredStudents, 'aulaAtual', 'desc');
    assert.ok(sortedByAulaDesc[0].aulaAtualPrincipal >= sortedByAulaDesc[sortedByAulaDesc.length - 1].aulaAtualPrincipal);

    const sortedByAulaAsc = sortConsolidatedStudents(filteredStudents, 'aulaAtual', 'asc');
    assert.ok(sortedByAulaAsc[0].aulaAtualPrincipal <= sortedByAulaAsc[sortedByAulaAsc.length - 1].aulaAtualPrincipal);
  });

  it('Configuração Limpa da Tabela Consolidada: Sem Presença/Falta na tabela (apenas Frequência), Sem CADs na tabela, Fixação de até 2 colunas pelo ícone de pino e Máximo de 3 opções de agrupamento relevantes', () => {
    // 1. Verificar que Presenças, Faltas e CAD não estão nas colunas da tabela consolidada e que Frequência está presente
    const colIds = CONSOLIDATED_TABLE_COLUMNS.map((c) => c.id);
    assert.equal(colIds.includes('presencas'), false, 'Coluna Presenças deve ser removida da tabela');
    assert.equal(colIds.includes('faltas'), false, 'Coluna Faltas deve ser removida da tabela');
    assert.equal(colIds.includes('cadNome'), false, 'Coluna CAD deve ser removida da tabela');
    assert.equal(colIds.includes('frequencia'), true, 'Coluna Frequência deve estar presente na tabela');

    // 2. Verificar que existem exatamente as 7 opções de agrupamento solicitadas no painel esquerdo
    assert.equal(
      GROUPABLE_FIELDS.length,
      7,
      'Deve ter as 7 opções de agrupamento nas colunas (Formação, Módulo, Dia da Aula, Horário, Sala, Modalidade e Categoria)'
    );
    assert.deepEqual(
      GROUPABLE_FIELDS.map((g) => g.field),
      ['formacao', 'modulo', 'diaSemana', 'horario', 'sala', 'modalidade', 'categoria']
    );

    // 3. Testar fixação de até 2 colunas pelo ícone de pino (toggleColumnPinState)
    let pins = toggleColumnPinState('nomeCompleto', 'nomeCompleto', 'contrato');
    assert.equal(pins.frozenCol1, 'contrato');
    assert.equal(pins.frozenCol2, null);

    pins = toggleColumnPinState('formacao', pins.frozenCol1, pins.frozenCol2);
    assert.equal(pins.frozenCol1, 'contrato');
    assert.equal(pins.frozenCol2, 'formacao');

    // Ao clicar em uma 3ª coluna quando já há 2 fixadas, mantém no máximo 2 colunas fixas
    pins = toggleColumnPinState('modulo', pins.frozenCol1, pins.frozenCol2);
    assert.equal(pins.frozenCol1, 'contrato');
    assert.equal(pins.frozenCol2, 'modulo');

    const effectiveCols = resolveEffectiveTableColumns(
      DEFAULT_COLUMN_ORDER,
      DEFAULT_VISIBLE_COLUMN_IDS,
      pins.frozenCol1,
      pins.frozenCol2
    );
    assert.equal(effectiveCols[0].id, 'contrato');
    assert.equal(effectiveCols[0].frozenSlot, 1);
    assert.equal(effectiveCols[1].id, 'modulo');
    assert.equal(effectiveCols[1].frozenSlot, 2);

    // 4. Testar matriz de exportação (.xlsx / .pdf) sem colunas de presença/falta
    const evaluatedAll = evaluateAllStudentsAttendance(
      ALL_WEEK_STUDENT_RECORDS,
      10 * 60,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sexta-feira'
    );
    const { filteredStudents } = computeDashboardAnalytics(evaluatedAll, {
      aulaMin: null,
      aulaMax: null,
      situacaoFinanceira: 'TODOS',
      entregaApostila: 'TODOS',
      frequenciaSemanal: 'TODOS',
      diasSemana: [],
      categoriaCurso: 'TODOS',
      modalidade: 'AMBAS',
      horarios: [],
    });
    const exportMatrix = buildConsolidatedExportMatrix(
      filteredStudents.slice(0, 10),
      effectiveCols,
      ['formacao'],
      true
    );
    assert.equal(exportMatrix.headers.includes('Frequência'), true);
    assert.equal(exportMatrix.headers.includes('Qtd. Presenças'), false);
    assert.equal(exportMatrix.headers.includes('Qtd. Faltas'), false);
    const wb = generateConsolidatedXlsxWorkbook(exportMatrix, 'Tabela Consolidada');
    assert.ok(wb.SheetNames.includes('Tabela Consolidada'));

    // 5. Testar atualização dinâmica dos cards (computeDashboardSummaryMetricsFromStudents) e expandir/recolher todos os grupos (collectAllGroupKeys)
    const englishOnly = filterDashboardStudentsByCardSelection(filteredStudents, 'CATEGORIA_INGLES');
    const dynamicMetrics = computeDashboardSummaryMetricsFromStudents(englishOnly);
    assert.equal(dynamicMetrics.totalAlunos, englishOnly.length);
    assert.equal(dynamicMetrics.inglesCount, englishOnly.length);
    assert.equal(dynamicMetrics.profissionalizanteCount, 0);

    const groupedTree = buildMultiLevelGroups(filteredStudents, ['formacao', 'modalidade']);
    const allGroupKeys = collectAllGroupKeys(groupedTree);
    assert.ok(allGroupKeys.length > groupedTree.length, 'collectAllGroupKeys deve coletar todas as chaves de grupos e subgrupos para expandir/recolher');

    // 6. Testar Desafio na Entrega de Apostila (Causa Pedagógica vs Causa Financeira), 3+ Aulas s/ Apostila e Reset de Domingo
    const fullMetrics = computeDashboardSummaryMetricsFromStudents(filteredStudents);
    assert.equal(
      fullMetrics.desafioApostilaPedagogicoCount + fullMetrics.desafioApostilaFinanceiroCount,
      fullMetrics.apostilaNaoEntregueCount,
      'A soma de Causa Pedagógica + Causa Financeira deve ser igual ao total de alunos sem apostila entregue'
    );

    const pedagogicoFiltered = filterDashboardStudentsByCardSelection(
      filteredStudents,
      'DESAFIO_APOSTILA_PEDAGOGICO'
    );
    assert.equal(pedagogicoFiltered.length, fullMetrics.desafioApostilaPedagogicoCount);
    for (const st of pedagogicoFiltered) {
      assert.equal(st.possuiApostila, false);
      assert.equal(st.inadimplente, false);
    }

    const financeiroFiltered = filterDashboardStudentsByCardSelection(
      filteredStudents,
      'DESAFIO_APOSTILA_FINANCEIRO'
    );
    assert.equal(financeiroFiltered.length, fullMetrics.desafioApostilaFinanceiroCount);
    for (const st of financeiroFiltered) {
      assert.equal(st.possuiApostila, false);
      assert.equal(st.inadimplente, true);
    }

    const aula3PlusFiltered = filterDashboardStudentsByCardSelection(
      filteredStudents,
      'AULA_4_SEM_APOSTILA_FIN_EM_DIA'
    );
    assert.equal(aula3PlusFiltered.length, fullMetrics.aula4SemApostilaFinEmDiaCount);
    for (const st of aula3PlusFiltered) {
      assert.ok(st.aulaAtualPrincipal >= 3 || st.schedules.some((s) => (s.aulaNumero || 1) >= 3));
      assert.equal(st.possuiApostila, false);
      assert.equal(st.inadimplente, false);
    }

    // Verificar reset completo na virada de semana no Domingo
    const evaluatedSunday = evaluateAllStudentsAttendance(
      ALL_WEEK_STUDENT_RECORDS,
      9 * 60,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Domingo'
    );
    const sundayKpis = computePerformanceKPIs(
      evaluatedSunday,
      9 * 60,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Domingo'
    );
    assert.equal(sundayKpis.presencaCount, 0, 'No Domingo (início de semana), Presenças deve zerar');
    assert.equal(sundayKpis.faltaCount, 0, 'No Domingo (início de semana), Faltas deve zerar');
    assert.equal(sundayKpis.evasaoCount, 0, 'No Domingo (início de semana), Evasões deve zerar');
  });

  it('Item 10: Painel de Login e Senha, Perfil Administrador e Perfil da Escola — bloqueia quem não tem credencial cadastrada e autentica usuários do Portal do Aluno', () => {
    const initialSchools = createDefaultSchoolsRegistry();

    // 1. Quem não tiver credenciais cadastradas no perfil do administrador NÃO pode ter acesso liberado
    const unauthorized = authenticatePlatformLogin(
      initialSchools,
      'usuario_nao_cadastrado',
      'senha123'
    );
    assert.equal(unauthorized.ok, false);
    assert.ok(unauthorized.error?.includes('Acesso negado'));

    // 2. Login do Administrador libera Perfil Administrador
    const adminAuth = authenticatePlatformLogin(
      initialSchools,
      'admin',
      'admin123'
    );
    assert.equal(adminAuth.ok, true);
    assert.equal(adminAuth.session?.role, 'ADMIN');

    // 3. Mesma credencial usada no Portal do Aluno para o usuário cadastrado libera o Perfil da Escola
    const defaultSchoolAuth = authenticatePlatformLogin(
      initialSchools,
      'a116882',
      'Joao@2025'
    );
    assert.equal(defaultSchoolAuth.ok, true);
    assert.equal(defaultSchoolAuth.session?.role, 'ESCOLA');
    assert.equal(
      defaultSchoolAuth.session?.schoolName,
      'ESCOLA PRESIDENTE PRUDENTE'
    );
    assert.equal(
      defaultSchoolAuth.session?.nomeCompleto,
      'João Pedro Pereira França'
    );
    assert.equal(defaultSchoolAuth.session?.cargo, 'Auxiliar Pedagógico');

    // 4. Administrador cadastra nova escola por nome + credencial do NPS + usuário da escola + credencial do Portal do Aluno
    const { schools: withNewSchool, school: mariliaSchool } =
      upsertSchoolInRegistry(initialSchools, {
        nome: 'ESCOLA MARÍLIA',
        codigoPortal: '1920',
        npsEmail: 'marilia@microlins.com.br',
        npsPassword: 'Nps@Marilia2026',
      });
    assert.equal(mariliaSchool.nome, 'ESCOLA MARÍLIA');
    assert.equal(mariliaSchool.npsCredential.email, 'marilia@microlins.com.br');

    const { schools: withNewUser } = upsertUserInSchoolRegistry(
      withNewSchool,
      mariliaSchool.id,
      {
        login: 'm998877',
        senha: 'Portal@2026',
        nomeCompleto: 'Ana Clara Souza',
        cargo: 'Coordenadora Pedagógica',
      }
    );

    // 5. Novo usuário cadastrado acessa a plataforma com a mesma credencial do Portal do Aluno
    const newSchoolUserAuth = authenticatePlatformLogin(
      withNewUser,
      'm998877',
      'Portal@2026'
    );
    assert.equal(newSchoolUserAuth.ok, true);
    assert.equal(newSchoolUserAuth.session?.role, 'ESCOLA');
    assert.equal(newSchoolUserAuth.session?.schoolName, 'ESCOLA MARÍLIA');
    assert.equal(newSchoolUserAuth.session?.nomeCompleto, 'Ana Clara Souza');
    assert.equal(newSchoolUserAuth.session?.cargo, 'Coordenadora Pedagógica');
  });

  it('Evolução 1.1, 1.2, 1.3 e 1.4: Inteligência Pedagógica — Parcelas Internas Discretas, Tempo Real de Permanência, Saída Antecipada c/ Recorrência e Contexto Cronológico da Nota', () => {
    // 1.1 Parcelas em Atraso: mantém quantidade exata internamente, mas apresenta label binária discreta na UI
    const stInadimplente = evaluateStudentAttendance(
      makeStudentRecord({
        id: 7001,
        contrato: '5190001',
        inadimplente: true,
        parcelasAtrasadas: 5,
      }),
      10 * 60,
      {},
      [],
      'Sábado'
    );
    assert.equal(stInadimplente.parcelasAtrasadas, 5);
    assert.equal(
      stInadimplente.situacaoFinanceiraLabel,
      'Em atraso',
      '1.1: O label pedagógico deve permanecer estritamente binário ("Em atraso") sem expor as 5 parcelas em sala'
    );

    // 1.2 Tempo Real de Permanência na Aula: (AulaFim - AulaInicio) / 60.000
    const perm19 = calculateTempoPermanencia(
      '30/10/2026 08:05:15',
      '30/10/2026 08:24:30',
      '08:00',
      '09:30'
    );
    assert.equal(perm19.tempoPermanenciaMinutos, 19);
    assert.equal(perm19.duracaoCurricularMinutos, 90);
    assert.equal(perm19.isTempoInsuficiente, true);

    // Exemplo da especificação: Excel Avançado / Photoshop (90 min), início 08:00 e fim 08:18 (18 min) -> Tempo Insuficiente
    const perm18 = calculateTempoPermanencia(
      '30/10/2026 08:00',
      '30/10/2026 08:18',
      '08:00',
      '09:30'
    );
    assert.equal(perm18.tempoPermanenciaMinutos, 18);
    assert.equal(perm18.isTempoInsuficiente, true);
    assert.ok(perm18.tempoPermanenciaLabel.toLowerCase().includes('tempo insuficiente'));

    // Sessão pausada em múltiplos dias (ex.: iniciou dia 28/10 e concluiu dia 30/10) não deve ser marcada como Tempo Insuficiente
    const permMultiDay = calculateTempoPermanencia(
      '28/10/2026 14:00',
      '30/10/2026 15:10',
      '14:00',
      '16:00'
    );
    assert.equal(permMultiDay.isSessaoMultiplosDias, true);
    assert.equal(permMultiDay.isTempoInsuficiente, false);

    // 1.3 Identificação de Saída Antecipada: HoraFim (10:00) - AulaFim (08:45) = 75 min (>= 30 min tolerância)
    const saida75 = calculateSaidaAntecipada(
      '30/10/2026 08:45',
      '10:00',
      '30/10/2026 08:02',
      30
    );
    assert.equal(saida75.saidaAntecipadaMinutos, 75);
    assert.equal(saida75.isSaidaAntecipada, true);
    assert.ok(saida75.saidaAntecipadaLabel?.includes('75 min antes'));

    // Recorrência de saída antecipada no mesmo contrato ao longo da semana
    const recRecords = evaluateAllStudentsAttendance(
      [
        makeStudentRecord({
          id: 7010,
          contrato: '5190010',
          diaSemana: 'Quarta-feira',
          horaInicio: '08:00',
          horaFim: '10:00',
          inicio: '28/10/2026 08:00',
          fim: '28/10/2026 08:50',
          status: 'FINALIZADO',
        }),
        makeStudentRecord({
          id: 7011,
          contrato: '5190010',
          diaSemana: 'Sexta-feira',
          horaInicio: '08:00',
          horaFim: '10:00',
          inicio: '30/10/2026 08:05',
          fim: '30/10/2026 08:45',
          status: 'FINALIZADO',
        }),
      ],
      11 * 60,
      {},
      [],
      'Sábado'
    );
    assert.equal(recRecords[0].isSaidaAntecipada, true);
    assert.equal(recRecords[1].isSaidaAntecipada, true);
    assert.equal(recRecords[0].recorrenciaSaidaAntecipadaCount, 2);
    assert.equal(recRecords[1].recorrenciaSaidaAntecipadaCount, 2);
    assert.equal(
      recRecords[0].isRiscoPreventivoEvasao,
      true,
      '1.3 & 7.6: Saída antecipada recorrente (>=2x na semana) deve acionar o alerta preventivo de retenção'
    );
    assert.ok(recRecords[0].riscoPreventivoEvasaoMotivos.length >= 1);

    // 1.4 Identificação da Aula em que a Nota foi Obtida: Nota 85 | Avaliação: Aula 16 | Módulo Anterior (quando aluno está na Aula 3)
    const notaModuloAnterior = resolveNotaContexto({
      nota: 85,
      aulaNumero: 3,
      notaAulaNumero: 16,
      curso: 'EXCEL AVANÇADO',
    });
    assert.equal(notaModuloAnterior.notaAulaNumero, 16);
    assert.equal(notaModuloAnterior.isNotaModuloAnterior, true);
    assert.equal(
      notaModuloAnterior.notaContextoLabel,
      'Nota: 85 | Avaliação: Aula 16 | Módulo Anterior'
    );

    const notaModuloAtual = resolveNotaContexto({
      nota: 9.5,
      aulaNumero: 5,
      notaAulaNumero: 4,
      curso: 'INFORMÁTICA ESSENCIAL',
    });
    assert.equal(notaModuloAtual.notaAulaNumero, 4);
    assert.equal(notaModuloAtual.isNotaModuloAnterior, false);
    assert.equal(
      notaModuloAtual.notaContextoLabel,
      'Nota: 9,5 | Avaliação: Aula 4'
    );
  });

  it('Evolução 2, 3 e 4: Hierarquia de Cruzamento NPS em 4 Níveis (Ouro, Prata, Bronze/Responsável, E-mail), Disparo Inteligente WhatsApp e Desambiguação de Irmãos na Mesma Unidade', () => {
    const evaluatedAll = evaluateAllStudentsAttendance(
      ALL_WEEK_STUDENT_RECORDS,
      10 * 60,
      {},
      INITIAL_ACTIVE_NPS_INVITATIONS,
      'Sábado'
    );

    const deduplicatedNps = filterAndDeduplicateAnnualNpsInvitations(
      INITIAL_ACTIVE_NPS_INVITATIONS,
      2026
    );

    // 1. Verificar recuperação de todos os convites enviados em nome do responsável (Nível 3 — Bronze)
    const allNpsCards = buildSynchronizedNpsStudentCards(
      deduplicatedNps,
      evaluatedAll,
      2026,
      'TODOS',
      10 * 60
    );

    // Cenário 1 (Responsável com 1 filho elegível): Ednéia Da Rosa -> Aghata Da Rosa Ribeiro (#5123002)
    const cardAghata = allNpsCards.find((c) => c.linkedContrato === '5123002');
    assert.ok(
      cardAghata,
      'Convite enviado para a responsável Ednéia Da Rosa deve ser vinculado à aluna Aghata Da Rosa Ribeiro (#5123002) via Nível 3 (Bronze)'
    );
    assert.equal(cardAghata.npsDestinatario, 'RESPONSAVEL');
    assert.equal(cardAghata.nivelCruzamento, 'NOME_RESPONSAVEL');
    assert.equal(cardAghata.isVinculoFamiliarAmbiguo, false);
    assert.ok(
      cardAghata.respondenteVinculoLabel.includes('Ednéia Da Rosa') &&
        cardAghata.respondenteVinculoLabel.includes('Aghata Da Rosa Ribeiro'),
      `Subtítulo de vínculo inesperado: ${cardAghata.respondenteVinculoLabel}`
    );

    // Cenário 2 (Irmãos na mesma unidade com mesmo responsável no ciclo): Elton Barbosa de Paulo -> Emili Vitoria (#5081421) e Lucas Gabriel (#5081445)
    const siblingCards = allNpsCards.filter((c) =>
      c.respondenteNome.toLowerCase().includes('elton barbosa de paulo')
    );
    assert.equal(
      siblingCards.length,
      1,
      '4.2 Regra de Proteção: Convites do mesmo responsável (Elton Barbosa de Paulo) com 2 filhos elegíveis no mesmo ciclo devem ser consolidados em 1 único card familiar'
    );
    const familyCard = siblingCards[0];
    assert.equal(familyCard.npsDestinatario, 'RESPONSAVEL');
    assert.equal(familyCard.isVinculoFamiliarAmbiguo, true);
    assert.equal(familyCard.alunosVinculadosFamilia.length, 2);
    assert.ok(familyCard.linkedContrato.includes('5081421'));
    assert.ok(familyCard.linkedContrato.includes('5081445'));

    // 3.3 Disparo Inteligente pelo WhatsApp: textos e telefones distintos para ALUNO vs RESPONSAVEL
    const urlAluno = buildWhatsAppNpsUrl(
      'Isabela Pais Santana',
      '5518991112222',
      'https://indecx.com/s/TESTE1',
      '30 dias',
      { npsDestinatario: 'ALUNO' }
    );
    const decodedAluno = decodeURIComponent(urlAluno);
    assert.ok(
      urlAluno.includes('phone=5518991112222'),
      `URL de ALUNO deve conter phone=5518991112222: ${urlAluno}`
    );
    assert.ok(
      decodedAluno.includes(
        'Olá, Isabela! Sua pesquisa de satisfação da Microlins está disponível.'
      ),
      `Mensagem de ALUNO incorreta: ${decodedAluno}`
    );

    const urlResponsavel = buildWhatsAppNpsUrl(
      'Aghata Da Rosa Ribeiro',
      '5518996420737',
      'https://indecx.com/s/TESTE2',
      '50 dias',
      {
        npsDestinatario: 'RESPONSAVEL',
        respondenteNome: 'Ednéia Da Rosa',
      }
    );
    const decodedResp = decodeURIComponent(urlResponsavel);
    assert.ok(
      urlResponsavel.includes('phone=5518996420737'),
      'Quando destinatário = RESPONSAVEL, deve utilizar o telefoneResponsavel'
    );
    assert.ok(
      decodedResp.includes(
        'Olá, Ednéia! Gostaríamos muito de conhecer sua opinião sobre o desenvolvimento de Aghata no curso da Microlins.'
      ),
      `Mensagem de RESPONSAVEL incorreta: ${decodedResp}`
    );

    // KPIs de resumo NPS incluem contagem por destinatário
    const npsKpis = computeNpsSummaryKPIs(allNpsCards);
    assert.equal(
      npsKpis.destinatarioAlunoCount + npsKpis.destinatarioResponsavelCount,
      npsKpis.totalConvites
    );
    assert.ok(
      npsKpis.destinatarioResponsavelCount >= 6,
      `Deve contabilizar pelo menos 6 cards vinculados via Responsável (encontrados: ${npsKpis.destinatarioResponsavelCount})`
    );
    assert.ok(npsKpis.familiasIrmaosCount >= 1);

    // 5.3 Orientação de Abordagem Presencial em Sala quando destinatário = RESPONSAVEL
    assert.ok(
      cardAghata.orientacaoAbordagemPresencial?.includes('Avise Aghata') &&
        cardAghata.orientacaoAbordagemPresencial?.includes('Ednéia Da Rosa'),
      `5.3 Orientação presencial de Aghata inesperada: ${cardAghata.orientacaoAbordagemPresencial}`
    );
    assert.ok(
      familyCard.orientacaoAbordagemPresencial?.includes('Elton Barbosa de Paulo'),
      `5.3 Orientação presencial familiar inesperada: ${familyCard.orientacaoAbordagemPresencial}`
    );

    // 6.4 Identificação explícita de convites não associados
    const unassociated = getUnassociatedNpsInvitations(
      deduplicatedNps,
      evaluatedAll,
      2026
    );
    assert.ok(Array.isArray(unassociated));
    for (const u of unassociated) {
      assert.equal(u.nivelCruzamento, 'NAO_ASSOCIADO');
    }
  });
});






