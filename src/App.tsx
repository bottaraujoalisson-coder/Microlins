import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Globe,
  Kanban,
  Mail,
  Percent,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  ActiveNpsInvitation,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  INITIAL_STUDENT_RECORDS,
  ModalityType,
  NpsOrigemType,
  PORTAL_METADATA,
  StudentPerformanceRecord,
} from './data/microlinsData';
import {
  computeNpsSummaryKPIs,
  computePerformanceKPIs,
  extractRecordStartHour,
  filterAndSortRecords,
  filterNpsRecords,
  formatMinutesToHHMM,
  groupByHourKanban,
  groupByNpsHourKanban,
  NpsFilterCriteria,
  QuickCardFilter,
} from './utils/performanceAnalytics';
import { StudentDetailModal } from './components/StudentDetailModal';
import { HourKanbanBoard } from './components/HourKanbanBoard';
import { NpsHourKanbanBoard } from './components/NpsHourKanbanBoard';

const AUTO_SYNC_INTERVAL_MS = 60_000;

/**
 * Retorna o horário de referência correspondente à extração dos dados do Portal do Aluno.
 * A extração oficial ocorreu às 13:59:38, iniciando o bloco das 14h (14:00 às 14:15 de tolerância).
 */
function getPortalReferenceMinutes(horaExtracao = PORTAL_METADATA.horaExtracao): number {
  try {
    const [hStr = '14', mStr = '00'] = (horaExtracao || '14:00').split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    // 13:59:38 pertence ao bloco de início das aulas das 14h (14:05)
    if (h === 13 && m >= 45) {
      return 14 * 60 + 5;
    }
    return (Number.isNaN(h) ? 14 : h) * 60 + (Number.isNaN(m) ? 5 : m);
  } catch {
    return 14 * 60 + 5;
  }
}

function formatCurrentBrasiliaSyncTimestamp(): string {
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
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return `${PORTAL_METADATA.dataReferencia} às ${PORTAL_METADATA.horaExtracao}`;
  }
}

export default function App() {
  const [records, setRecords] = useState<StudentPerformanceRecord[]>(
    INITIAL_STUDENT_RECORDS
  );
  const [activeNpsInvitations, setActiveNpsInvitations] = useState<
    ActiveNpsInvitation[]
  >(INITIAL_ACTIVE_NPS_INVITATIONS);

  // Horário de referência oficial da agenda do portal (bloco das 14h)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() =>
    getPortalReferenceMinutes()
  );

  // Momento real da última sincronização com sucesso
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() =>
    formatCurrentBrasiliaSyncTimestamp()
  );

  // Navegação estrita entre os dois painéis padronizados
  const [activeTab, setActiveTab] = useState<'KANBAN_ALUNOS' | 'KANBAN_NPS'>(
    'KANBAN_ALUNOS'
  );

  // === Filtros auxiliares da aba KANBAN DE ALUNOS (exclusivamente Sala, Horário, Modalidade e Pesquisa) ===
  const [selectedSala, setSelectedSala] = useState<string>('TODAS');
  const [selectedHorario, setSelectedHorario] = useState<string>('TODOS');
  const [selectedModalidade, setSelectedModalidade] = useState<
    'TODAS' | ModalityType
  >('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<QuickCardFilter>('TODOS');

  // === Filtros exclusivos da aba KANBAN NPS (Origem, Ponto da Jornada, Horário e Pesquisa) ===
  const [npsOrigem, setNpsOrigem] = useState<'TODAS' | NpsOrigemType>('TODAS');
  const [npsPontoJornada, setNpsPontoJornada] = useState<
    'TODOS' | '30 dias' | '50 dias'
  >('TODOS');
  const [npsHorario, setNpsHorario] = useState<string>('TODOS');
  const [npsSearchQuery, setNpsSearchQuery] = useState<string>('');

  // Modal de detalhes do aluno
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Sincronização automática a cada 1 minuto (Portal do Aluno + Indecx NPS Ativos)
  const syncPortalData = useCallback(async () => {
    try {
      const res = await fetch('/api/microlins/sync');
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.records) && payload.records.length > 0) {
          setRecords(payload.records);
        }
        if (
          Array.isArray(payload.activeNpsInvitations) &&
          payload.activeNpsInvitations.length > 0
        ) {
          setActiveNpsInvitations(payload.activeNpsInvitations);
        }
        if (payload.metadata?.horaExtracao) {
          setCurrentTimeMinutes(getPortalReferenceMinutes(payload.metadata.horaExtracao));
        }
        if (payload.syncedFormatted) {
          setLastSyncTimestamp(payload.syncedFormatted);
        } else if (payload.syncedAt) {
          const datePart = payload.syncedDate || PORTAL_METADATA.dataReferencia;
          setLastSyncTimestamp(`${datePart} às ${payload.syncedAt}`);
        }
      } else {
        setLastSyncTimestamp(formatCurrentBrasiliaSyncTimestamp());
      }
    } catch {
      setLastSyncTimestamp(formatCurrentBrasiliaSyncTimestamp());
    }
  }, []);

  useEffect(() => {
    syncPortalData();
    const timer = setInterval(syncPortalData, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [syncPortalData]);

  // Opções dinâmicas para filtros do Kanban de Alunos
  const salaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.sala) set.add(r.sala);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [records]);

  const horarioOptions = useMemo(() => {
    const hourNumbers = new Set<number>();
    for (const r of records) {
      const h = extractRecordStartHour(r, 'AGENDADO');
      if (h !== null) hourNumbers.add(h);
    }
    return Array.from(hourNumbers)
      .sort((a, b) => a - b)
      .map((h) => `${String(h).padStart(2, '0')}h`);
  }, [records]);

  const modalidadeOptions = useMemo(() => {
    const set = new Set<ModalityType>();
    for (const r of records) {
      if (r.modalidade) set.add(r.modalidade);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [records]);

  // Registros avaliados do Kanban de Alunos com filtros de cabeçalho
  const headerFilteredRecords = useMemo(
    () =>
      filterAndSortRecords(
        records,
        {
          search: searchQuery,
          sala: selectedSala,
          horario: selectedHorario,
          modalidade: selectedModalidade,
          status: 'TODOS',
          attendanceFilter: 'TODOS',
          turno: 'TODOS',
          curso: 'TODOS',
          notaFilter: 'TODOS',
          apenasInadimplentes: false,
          sortBy: 'id',
          sortDir: 'asc',
        },
        currentTimeMinutes,
        {},
        activeNpsInvitations
      ),
    [
      records,
      searchQuery,
      selectedSala,
      selectedHorario,
      selectedModalidade,
      currentTimeMinutes,
      activeNpsInvitations,
    ]
  );

  // KPIs dos 6 cards de resumo de Alunos
  const kpis = useMemo(
    () =>
      computePerformanceKPIs(
        headerFilteredRecords,
        currentTimeMinutes,
        {},
        activeNpsInvitations
      ),
    [headerFilteredRecords, currentTimeMinutes, activeNpsInvitations]
  );

  // Registros finais do Kanban de Alunos (com filtro rápido de status/evasão se ativo)
  const activeStudentRecords = useMemo(() => {
    if (statusFilter === 'TODOS') return headerFilteredRecords;
    if (statusFilter === 'EVASAO') {
      return headerFilteredRecords.filter((r) => r.isEvasao);
    }
    return headerFilteredRecords.filter(
      (r) => r.attendanceStatus === statusFilter
    );
  }, [headerFilteredRecords, statusFilter]);

  // Colunas do Kanban de Alunos por horário (com 1ª coluna fixa)
  const studentKanbanColumns = useMemo(
    () =>
      groupByHourKanban(
        activeStudentRecords,
        'AGENDADO',
        currentTimeMinutes,
        {},
        activeNpsInvitations
      ),
    [activeStudentRecords, currentTimeMinutes, activeNpsInvitations]
  );

  // Todos os registros avaliados (usados para o Modal de Detalhes do Aluno)
  const allEvaluatedRecords = useMemo(
    () =>
      filterAndSortRecords(
        records,
        {
          search: '',
          status: 'TODOS',
          attendanceFilter: 'TODOS',
          modalidade: 'TODAS',
          turno: 'TODOS',
          curso: 'TODOS',
          horario: 'TODOS',
          notaFilter: 'TODOS',
          apenasInadimplentes: false,
          sortBy: 'horario',
          sortDir: 'asc',
        },
        currentTimeMinutes,
        {},
        activeNpsInvitations
      ),
    [records, currentTimeMinutes, activeNpsInvitations]
  );

  // === DADOS E FILTROS EXCLUSIVOS DA ABA KANBAN NPS ===
  // Opções de horários existentes nos dados vinculados de NPS
  const npsHorarioOptions = useMemo(() => {
    const hours = new Set<number>();
    for (const r of allEvaluatedRecords) {
      if (!r.hasActiveNps || !r.npsInvitation) continue;
      const h = extractRecordStartHour(r, 'AGENDADO');
      if (h !== null) hours.add(h);
    }
    return Array.from(hours)
      .sort((a, b) => a - b)
      .map((h) => `${String(h).padStart(2, '0')}h`);
  }, [allEvaluatedRecords]);

  // Registros de alunos com convite NPS ativo filtrados pelos controles da aba NPS
  const npsFilteredRecords = useMemo(() => {
    const criteria: NpsFilterCriteria = {
      search: npsSearchQuery,
      origem: npsOrigem,
      pontoJornada: npsPontoJornada,
      horario: npsHorario,
      diaSemana: 'TODOS',
    };
    return filterNpsRecords(allEvaluatedRecords, criteria);
  }, [
    allEvaluatedRecords,
    npsSearchQuery,
    npsOrigem,
    npsPontoJornada,
    npsHorario,
  ]);

  // 6 Indicadores de resumo exclusivos da aba NPS
  const npsKPIs = useMemo(
    () => computeNpsSummaryKPIs(npsFilteredRecords),
    [npsFilteredRecords]
  );

  // Colunas do Kanban NPS por faixa de horário (com 1ª coluna fixa)
  const npsKanbanColumns = useMemo(
    () => groupByNpsHourKanban(npsFilteredRecords, currentTimeMinutes),
    [npsFilteredRecords, currentTimeMinutes]
  );

  // Aluno selecionado para o modal de detalhes
  const selectedStudent = useMemo(() => {
    if (selectedStudentId === null) return null;
    return allEvaluatedRecords.find((r) => r.id === selectedStudentId) ?? null;
  }, [allEvaluatedRecords, selectedStudentId]);

  const selectedStudentHistory = useMemo(() => {
    if (!selectedStudent) return [];
    return allEvaluatedRecords.filter(
      (r) => r.contrato === selectedStudent.contrato
    );
  }, [allEvaluatedRecords, selectedStudent]);

  const toggleStatusFilter = (target: QuickCardFilter) => {
    setStatusFilter((prev) => (prev === target ? 'TODOS' : target));
  };

  const currentTimeStr = formatMinutesToHHMM(currentTimeMinutes);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50/80 text-slate-900">
      {/* 1. Cabeçalho Geral: Linha 1 (Navegação + Usuário + Sincronização) | Linha 2 (Filtros da Aba) */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-2">
        {/* Linha 1: 3 áreas nítidas e padronizadas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2 text-xs text-slate-600">
          {/* Área 1: Abas de Navegação padronizadas (Kanban de Alunos e Kanban NPS) */}
          <nav
            aria-label="Painéis do Sistema"
            className="inline-flex items-center rounded-lg border border-slate-200/90 bg-slate-100/90 p-0.5 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => setActiveTab('KANBAN_ALUNOS')}
              aria-current={activeTab === 'KANBAN_ALUNOS' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'KANBAN_ALUNOS'
                  ? 'bg-white text-sky-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5 text-sky-600" />
              <span>Kanban de Alunos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('KANBAN_NPS')}
              aria-current={activeTab === 'KANBAN_NPS' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'KANBAN_NPS'
                  ? 'bg-white text-amber-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Kanban NPS</span>
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                {activeNpsInvitations.length}
              </span>
            </button>
          </nav>

          {/* Área 2: Identificação do Usuário Logado */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-display inline-flex items-center gap-1.5 font-bold text-slate-900">
              <Building2 className="h-3.5 w-3.5 text-sky-600" />
              {PORTAL_METADATA.unidade}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-sky-600" />
              <span className="font-bold text-slate-900">
                {PORTAL_METADATA.usuarioNomeCompleto}
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {PORTAL_METADATA.usuarioCargo} ({PORTAL_METADATA.usuarioLogin})
              </span>
            </span>
          </div>

          {/* Área 3: Sincronização em tempo real (1 minuto) */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
              title="Sincronização contínua a cada minuto ativa"
            />
            <span className="text-[11px] font-medium text-slate-500 tabular-nums">
              Última sincronização:{' '}
              <strong className="font-semibold text-slate-800">
                {lastSyncTimestamp}
              </strong>
            </span>
          </div>
        </div>

        {/* Linha 2: Filtros dinâmicos e exclusivos conforme a aba ativa */}
        {activeTab === 'KANBAN_ALUNOS' ? (
          /* Filtros exclusivos do Kanban de Alunos: Sala, Horário, Modalidade e Pesquisa */
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
            {/* Sala */}
            <div className="sm:col-span-3">
              <label htmlFor="filter-sala" className="sr-only">
                Sala
              </label>
              <select
                id="filter-sala"
                aria-label="Sala"
                value={selectedSala}
                onChange={(e) => setSelectedSala(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODAS">Sala: Todas ({salaOptions.length})</option>
                {salaOptions.map((sala) => (
                  <option key={sala} value={sala}>
                    Sala: {sala}
                  </option>
                ))}
              </select>
            </div>

            {/* Horário */}
            <div className="sm:col-span-3">
              <label htmlFor="filter-horario" className="sr-only">
                Horário
              </label>
              <select
                id="filter-horario"
                aria-label="Horário"
                value={selectedHorario}
                onChange={(e) => setSelectedHorario(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 tabular-nums focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">
                  Horário: Todos ({horarioOptions.length})
                </option>
                {horarioOptions.map((h) => (
                  <option key={h} value={h}>
                    Horário: {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Modalidade */}
            <div className="sm:col-span-2">
              <label htmlFor="filter-modalidade" className="sr-only">
                Modalidade
              </label>
              <select
                id="filter-modalidade"
                aria-label="Modalidade"
                value={selectedModalidade}
                onChange={(e) =>
                  setSelectedModalidade(e.target.value as 'TODAS' | ModalityType)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODAS">Modalidade: Todas</option>
                {modalidadeOptions.map((mod) => (
                  <option key={mod} value={mod}>
                    Modalidade: {mod}
                  </option>
                ))}
              </select>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative sm:col-span-4">
              <label htmlFor="kanban-search" className="sr-only">
                Pesquisar Alunos
              </label>
              <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="kanban-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por aluno, contrato, módulo, sala ou NPS..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-1.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Filtros exclusivos da aba Kanban NPS: Origem, Ponto da Jornada, Horário e Pesquisa */
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
            {/* Origem (Todas, Portal do Aluno, E-mail) */}
            <div className="sm:col-span-3">
              <label htmlFor="filter-nps-origem" className="sr-only">
                Origem NPS
              </label>
              <select
                id="filter-nps-origem"
                aria-label="Origem da pesquisa NPS"
                value={npsOrigem}
                onChange={(e) =>
                  setNpsOrigem(e.target.value as 'TODAS' | NpsOrigemType)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="TODAS">Origem: Todas</option>
                <option value="Portal do Aluno">Portal do Aluno</option>
                <option value="E-mail">E-mail</option>
              </select>
            </div>

            {/* Ponto da Jornada (Todos, 30 dias, 50 dias) */}
            <div className="sm:col-span-3">
              <label htmlFor="filter-nps-jornada" className="sr-only">
                Ponto da Jornada NPS
              </label>
              <select
                id="filter-nps-jornada"
                aria-label="Ponto da Jornada"
                value={npsPontoJornada}
                onChange={(e) =>
                  setNpsPontoJornada(
                    e.target.value as 'TODOS' | '30 dias' | '50 dias'
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="TODOS">Jornada: Todas</option>
                <option value="30 dias">30 dias</option>
                <option value="50 dias">50 dias</option>
              </select>
            </div>

            {/* Horário (apenas horários existentes nos dados vinculados de NPS) */}
            <div className="sm:col-span-2">
              <label htmlFor="filter-nps-horario" className="sr-only">
                Horário da Aula
              </label>
              <select
                id="filter-nps-horario"
                aria-label="Horário da aula do aluno NPS"
                value={npsHorario}
                onChange={(e) => setNpsHorario(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 tabular-nums focus:border-amber-500 focus:outline-none"
              >
                <option value="TODOS">
                  Horário: Todos ({npsHorarioOptions.length})
                </option>
                {npsHorarioOptions.map((h) => (
                  <option key={h} value={h}>
                    Horário: {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Barra de Pesquisa da aba NPS */}
            <div className="relative sm:col-span-4">
              <label htmlFor="nps-search" className="sr-only">
                Pesquisar Convites NPS
              </label>
              <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="nps-search"
                type="text"
                value={npsSearchQuery}
                onChange={(e) => setNpsSearchQuery(e.target.value)}
                placeholder="Pesquisar por aluno, contrato, código NPS (#)..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
              {npsSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNpsSearchQuery('')}
                  aria-label="Limpar pesquisa NPS"
                  className="absolute right-2 top-1.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Acima do Kanban: 6 Cards de Resumo em linha horizontal (com mesmo padrão e altura de 40px) */}
      <section
        aria-label={
          activeTab === 'KANBAN_ALUNOS'
            ? 'Indicadores e filtros de status de Alunos'
            : 'Indicadores de pesquisa NPS'
        }
        className="shrink-0 border-b border-slate-200/75 bg-slate-50/90 px-4 py-2"
      >
        {activeTab === 'KANBAN_ALUNOS' ? (
          /* 6 Cards de Alunos */
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Presenças */}
            <button
              type="button"
              onClick={() => toggleStatusFilter('Presença')}
              aria-pressed={statusFilter === 'Presença'}
              className={`flex h-10 items-center justify-between rounded-lg border px-3 text-left transition-colors ${
                statusFilter === 'Presença'
                  ? 'border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-400/25'
                  : 'border-slate-200/90 bg-white hover:border-emerald-200 hover:bg-emerald-50/35'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Presenças
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-emerald-700 tabular-nums sm:text-base">
                {kpis.presencaCount}
              </span>
            </button>

            {/* 2. Faltas */}
            <button
              type="button"
              onClick={() => toggleStatusFilter('Falta')}
              aria-pressed={statusFilter === 'Falta'}
              className={`flex h-10 items-center justify-between rounded-lg border px-3 text-left transition-colors ${
                statusFilter === 'Falta'
                  ? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-400/25'
                  : 'border-slate-200/90 bg-white hover:border-rose-200 hover:bg-rose-50/35'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Faltas
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-rose-700 tabular-nums sm:text-base">
                {kpis.faltaCount}
              </span>
            </button>

            {/* 3. Não iniciado */}
            <button
              type="button"
              onClick={() => toggleStatusFilter('Não iniciado')}
              aria-pressed={statusFilter === 'Não iniciado'}
              className={`flex h-10 items-center justify-between rounded-lg border px-3 text-left transition-colors ${
                statusFilter === 'Não iniciado'
                  ? 'border-slate-400 bg-slate-100/90 ring-1 ring-slate-400/25'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Não iniciado
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-slate-700 tabular-nums sm:text-base">
                {kpis.aguardandoCount}
              </span>
            </button>

            {/* 4. Média de frequência */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Média de frequência
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-slate-800 tabular-nums sm:text-base">
                {kpis.mediaFrequencia.toFixed(1)}%
              </span>
            </div>

            {/* 5. Total de agendamentos */}
            <div
              data-testid="kpi-total-agendamentos"
              className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Total de agendamentos
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-slate-800 tabular-nums sm:text-base">
                {kpis.totalAgendamentos}
              </span>
            </div>

            {/* 6. Evasão */}
            <button
              type="button"
              data-testid="kpi-evasao"
              onClick={() => toggleStatusFilter('EVASAO')}
              aria-pressed={statusFilter === 'EVASAO'}
              title="Filtrar alunos identificados com possível evasão"
              className={`flex h-10 items-center justify-between rounded-lg border px-3 text-left transition-colors ${
                statusFilter === 'EVASAO'
                  ? 'border-rose-500 bg-rose-100/75 ring-1 ring-rose-500/30'
                  : kpis.evasaoCount > 0
                  ? 'evasao-alert-pulse border-rose-300/90 bg-rose-50/70 hover:border-rose-400 hover:bg-rose-50/90'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <AlertTriangle
                  className={`h-3.5 w-3.5 shrink-0 ${
                    kpis.evasaoCount > 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`truncate text-xs font-semibold whitespace-nowrap ${
                    kpis.evasaoCount > 0 ? 'text-rose-800' : 'text-slate-700'
                  }`}
                >
                  Evasão
                </span>
              </div>
              <span
                className={`font-display ml-2 text-sm font-bold tabular-nums sm:text-base ${
                  kpis.evasaoCount > 0 ? 'text-rose-700' : 'text-slate-600'
                }`}
              >
                {kpis.evasaoCount}
              </span>
            </button>
          </div>
        ) : (
          /* 6 Cards de Resumo Exclusivos da aba NPS (mesmo padrão e altura de 40px) */
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Convites Ativos */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-amber-300 bg-amber-50/70 px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="truncate text-xs font-semibold text-amber-900 whitespace-nowrap">
                  Convites Ativos
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-amber-900 tabular-nums sm:text-base">
                {npsKPIs.totalConvitesAtivos}
              </span>
            </div>

            {/* 2. Portal do Aluno */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Portal do Aluno
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-sky-700 tabular-nums sm:text-base">
                {npsKPIs.portalDoAlunoCount}
              </span>
            </div>

            {/* 3. E-mail */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  E-mail
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-indigo-700 tabular-nums sm:text-base">
                {npsKPIs.emailCount}
              </span>
            </div>

            {/* 4. Jornada 30 dias */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Jornada 30 dias
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-amber-800 tabular-nums sm:text-base">
                {npsKPIs.jornada30Count}
              </span>
            </div>

            {/* 5. Jornada 50 dias */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Jornada 50 dias
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-emerald-800 tabular-nums sm:text-base">
                {npsKPIs.jornada50Count}
              </span>
            </div>

            {/* 6. Agendamentos vinculados */}
            <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/90 bg-white px-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                <span className="truncate text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Agendamentos
                </span>
              </div>
              <span className="font-display ml-2 text-sm font-bold text-slate-800 tabular-nums sm:text-base">
                {npsKPIs.totalAgendamentosVinculados}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 3. Área principal: Kanban ocupando quase todo o espaço disponível da tela */}
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-2.5 pt-2">
        {activeTab === 'KANBAN_ALUNOS' ? (
          <HourKanbanBoard
            columns={studentKanbanColumns}
            onSelectStudent={(id) => setSelectedStudentId(id)}
          />
        ) : (
          <NpsHourKanbanBoard
            columns={npsKanbanColumns}
            onSelectStudent={(id) => setSelectedStudentId(id)}
            currentTimeStr={currentTimeStr}
          />
        )}
      </main>

      {/* Visualização detalhada do aluno ao clicar no card */}
      <StudentDetailModal
        student={selectedStudent}
        studentHistory={selectedStudentHistory}
        onClose={() => setSelectedStudentId(null)}
      />
    </div>
  );
}
