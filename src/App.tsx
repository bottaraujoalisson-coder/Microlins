import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Globe,
  GraduationCap,
  Kanban,
  KeyRound,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Percent,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ActiveNpsInvitation,
  ALL_WEEK_STUDENT_RECORDS,
  INITIAL_ACTIVE_NPS_INVITATIONS,
  ModalityType,
  NpsEmailDeliveryStatusType,
  NpsOrigemType,
  PORTAL_METADATA,
  PORTAL_WEEKDAY_LABEL_TO_CODE,
  StudentPerformanceRecord,
} from './data/microlinsData';
import { supabase, fetchStudentRecords, fetchNpsInvitations, fetchSchoolsFromSupabase } from './utils/supabaseClient';
import {
  ApostilaFilterType,
  buildSynchronizedNpsStudentCards,
  compareWeekdayWithCurrent,
  computeNpsSummaryKPIs,
  computePerformanceKPIs,
  CourseCategoryFilterType,
  evaluateAllStudentsAttendance,
  extractRecordStartHour,
  filterAndDeduplicateAnnualNpsInvitations,
  filterAndSortRecords,
  filterSynchronizedNpsCards,
  FinancialFilterType,
  formatMinutesToHHMM,
  getBrasiliaCurrentMinutes,
  getCurrentBrasiliaWeekdayLabel,
  getCurrentBrasiliaYear,
  groupByHourKanban,
  groupByNpsHourKanban,
  hasFrequencyData,
  isNotStartedAttendanceStatus,
  NpsFilterCriteria,
  QuickCardFilter,
  StudentNpsFilterType,
  SynchronizedNpsStudentCard,
} from './utils/performanceAnalytics';
import {
  AuthSession,
  createDefaultSchoolsRegistry,
  DEFAULT_ADMIN_CREDENTIALS,
  DEFAULT_ADMIN_PASSWORD_PLAIN,
  RegisteredSchool,
} from './utils/authRegistry';
import { StudentDetailModal } from './components/StudentDetailModal';
import { NpsInvitationDetailModal } from './components/NpsInvitationDetailModal';
import { HourKanbanBoard } from './components/HourKanbanBoard';
import { NpsHourKanbanBoard } from './components/NpsHourKanbanBoard';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { AdminPanelView } from './components/AdminPanelView';
import { PortalAlunoHubView } from './components/PortalAlunoHubView';
import { PrivacyProtectionView } from './components/PrivacyProtectionView';

const AUTO_SYNC_INTERVAL_MS = 60_000;
const FILTER_LOADING_DELAY_MS = 110;
const THEME_STORAGE_KEY = 'microlins_theme_preference';
const AUTH_SESSION_STORAGE_KEY = 'microlins_auth_session_v1';

export type ThemeMode = 'light' | 'dark';

const WEEKDAY_FILTER_OPTIONS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

const SYNC_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function computeRecordsSignature(list: StudentPerformanceRecord[]): string {
  if (list.length === 0) return '0';
  let sig = `${list.length}:`;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    sig += `${r.id}:${r.status}:${r.presencaOuFalta || ''}:${r.inicio || ''}:${r.fim || ''}|`;
  }
  return sig;
}

function computeNpsSignature(list: ActiveNpsInvitation[]): string {
  if (list.length === 0) return '0';
  let sig = `${list.length}:`;
  for (let i = 0; i < list.length; i++) {
    const inv = list[i];
    sig += `${inv.id}:${inv.invitationStatus}:${inv.answered ? 1 : 0}|`;
  }
  return sig;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'light';
}

function formatCurrentBrasiliaSyncTimestamp(): string {
  try {
    const parts = SYNC_TIMESTAMP_FORMATTER.formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
  } catch {
    return `${PORTAL_METADATA.dataReferencia} ${PORTAL_METADATA.horaExtracao.slice(0, 5)}`;
  }
}

function getSimulatedTimeOverrideFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    const h = params.get('hora') || params.get('simulatedTime');
    if (h && /^\d{1,2}:\d{2}/.test(h.trim())) {
      return h.trim();
    }
  } catch {
    // Ignore URL parse errors
  }
  return undefined;
}

function getSimulatedWeekdayOverrideFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('dia') || params.get('weekday');
    if (d && d.trim()) {
      return d.trim();
    }
  } catch {
    // Ignore URL parse errors
  }
  return undefined;
}

function resolveDefaultWeekdayFilter(): string {
  const urlDay = getSimulatedWeekdayOverrideFromUrl();
  if (urlDay) return urlDay;
  const currentLabel = getCurrentBrasiliaWeekdayLabel();
  const dayHasRecords = ALL_WEEK_STUDENT_RECORDS.some(
    (r) => r.diaSemana === currentLabel
  );
  if (!dayHasRecords) {
    // No início da semana (Domingo), exibe a Segunda-feira (primeiro dia com aulas da semana nova, já zerado)
    return 'Segunda-feira';
  }
  return currentLabel;
}

export default function App() {
  // Tema Visual Global com Persistência em localStorage (Item 5)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [records, setRecords] = useState<StudentPerformanceRecord[]>([]);
  const [activeNpsInvitations, setActiveNpsInvitations] = useState<
    ActiveNpsInvitation[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [portalMeta, setPortalMeta] = useState(PORTAL_METADATA);
  const [npsReferenceYear, setNpsReferenceYear] = useState<number>(() =>
    getCurrentBrasiliaYear()
  );

  // Cadastro de escolas, credenciais NPS e usuários do Portal do Aluno (gerenciados pelo Perfil Administrador)
  const [schoolsRegistry, setSchoolsRegistry] = useState<RegisteredSchool[]>(
    () => createDefaultSchoolsRegistry()
  );
  const [enteredSchoolFromAdmin, setEnteredSchoolFromAdmin] =
    useState<boolean>(false);

  // Carregamento assíncrono do Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadSupabaseData() {
      try {
        const [remoteRecords, remoteNps, remoteSchools] = await Promise.all([
          fetchStudentRecords(),
          fetchNpsInvitations(),
          fetchSchoolsFromSupabase(),
        ]);
        if (isMounted) {
          if (remoteRecords && remoteRecords.length > 0) {
            setRecords(remoteRecords);
          }
          if (remoteNps && remoteNps.length > 0) {
            setActiveNpsInvitations(
              filterAndDeduplicateAnnualNpsInvitations(remoteNps, getCurrentBrasiliaYear())
            );
          }
          if (remoteSchools && remoteSchools.length > 0) {
            setSchoolsRegistry(remoteSchools);
          }
        }
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }
    loadSupabaseData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime Subscription (Sincronização automática em tempo real via WebSockets)
  useEffect(() => {
    const channel = supabase
      .channel('microlins-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_records' },
        async () => {
          const remoteRecords = await fetchStudentRecords();
          if (remoteRecords && remoteRecords.length > 0) {
            setRecords(remoteRecords);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nps_records' },
        async () => {
          const remoteNps = await fetchNpsInvitations();
          if (remoteNps && remoteNps.length > 0) {
            setActiveNpsInvitations(
              filterAndDeduplicateAnnualNpsInvitations(remoteNps, getCurrentBrasiliaYear())
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schools' },
        async () => {
          const remoteSchools = await fetchSchoolsFromSupabase();
          if (remoteSchools && remoteSchools.length > 0) {
            setSchoolsRegistry(remoteSchools);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async () => {
          const remoteSchools = await fetchSchoolsFromSupabase();
          if (remoteSchools && remoteSchools.length > 0) {
            setSchoolsRegistry(remoteSchools);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Página dedicada de Privacidade e Proteção de Dados (LGPD — Lei nº 13.709/2018)
  const [showPrivacyPage, setShowPrivacyPage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('pagina') === 'privacidade' ||
        params.get('privacidade') === '1'
      );
    } catch {
      return false;
    }
  });

  // Sessão autenticada (Perfil Administrador ou Perfil da Escola)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const autostart = params.get('autostart');
      const perfil = (params.get('perfil') || '').toLowerCase();
      if (perfil === 'admin') {
        return {
          role: 'ADMIN',
          login: DEFAULT_ADMIN_CREDENTIALS.login,
          nomeCompleto: DEFAULT_ADMIN_CREDENTIALS.nomeCompleto,
          cargo: DEFAULT_ADMIN_CREDENTIALS.cargo,
        };
      }
      if (autostart === '1' || perfil === 'escola') {
        const defaultSchool = createDefaultSchoolsRegistry()[0];
        const defaultUser = defaultSchool.users[0];
        return {
          role: 'ESCOLA',
          login: defaultUser.login,
          nomeCompleto: defaultUser.nomeCompleto,
          cargo: defaultUser.cargo,
          schoolId: defaultSchool.id,
          schoolName: defaultSchool.nome,
          codigoPortal: defaultSchool.codigoPortal,
        };
      }
      const saved = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthSession;
        if (parsed && (parsed.role === 'ADMIN' || parsed.role === 'ESCOLA')) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  // Se iniciou como ADMIN via URL sem token de sessão ainda, obtém sessão real do servidor SQLite
  useEffect(() => {
    if (authSession?.role === 'ADMIN' && !authSession.sessionToken) {
      let active = true;
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          login: DEFAULT_ADMIN_CREDENTIALS.login,
          senha: DEFAULT_ADMIN_PASSWORD_PLAIN,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (active && d?.ok && d.session?.sessionToken) {
            setAuthSession((prev) =>
              prev ? { ...prev, sessionToken: d.session.sessionToken } : prev
            );
          }
        })
        .catch(() => {
          // Ignore bootstrap error
        });
      return () => {
        active = false;
      };
    }
  }, [authSession?.role, authSession?.sessionToken]);

  // Carrega escolas e usuários cadastrados no servidor ao iniciar
  useEffect(() => {
    let active = true;
    fetch('/api/admin/schools', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.ok && Array.isArray(data.schools)) {
          setSchoolsRegistry(data.schools);
        }
      })
      .catch(() => {
        // Mantém registro local padrão
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSuccess = useCallback(
    (
      session: AuthSession,
      updatedMetadata?: {
        unidade?: string;
        codigoUnidade?: string;
        usuarioLogin?: string;
        usuarioNomeCompleto?: string;
        usuarioCargo?: string;
      }
    ) => {
      setAuthSession(session);
      setEnteredSchoolFromAdmin(false);
      try {
        window.sessionStorage.setItem(
          AUTH_SESSION_STORAGE_KEY,
          JSON.stringify(session)
        );
      } catch {
        // Ignore storage errors
      }
      if (session.role === 'ESCOLA') {
        setPortalMeta((prev) => ({
          ...prev,
          unidade:
            session.schoolName || updatedMetadata?.unidade || prev.unidade,
          usuarioLogin:
            session.login || updatedMetadata?.usuarioLogin || prev.usuarioLogin,
          usuarioNomeCompleto:
            session.nomeCompleto ||
            updatedMetadata?.usuarioNomeCompleto ||
            prev.usuarioNomeCompleto,
          usuarioCargo:
            session.cargo || updatedMetadata?.usuarioCargo || prev.usuarioCargo,
        }));
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(
      () => {}
    );
    setAuthSession(null);
    setEnteredSchoolFromAdmin(false);
    try {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Horário e dia da semana atuais reais em Brasília (America/Sao_Paulo)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() =>
    getBrasiliaCurrentMinutes(getSimulatedTimeOverrideFromUrl())
  );
  const [currentBrasiliaWeekday, setCurrentBrasiliaWeekday] = useState<string>(
    () => getSimulatedWeekdayOverrideFromUrl() || getCurrentBrasiliaWeekdayLabel()
  );

  // Data e hora discreta da última sincronização
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() =>
    formatCurrentBrasiliaSyncTimestamp()
  );

  // Estado de carregamento com desfoque (blur) e bloqueio visual
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    'Carregando e atualizando informações do Kanban...'
  );
  const loadingTimeoutRef = useRef<number | null>(null);

  const triggerWithLoading = useCallback(
    (action: () => void, _customMessage?: string) => {
      action();
    },
    []
  );

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Navegação entre as abas (Kanban de Alunos, Kanban NPS, Consolidado e Ficha Individual)
  const [activeTab, setActiveTab] = useState<
    'KANBAN_ALUNOS' | 'KANBAN_NPS' | 'DASHBOARD' | 'PORTAL_ALUNO'
  >('KANBAN_ALUNOS');
  const [portalHubStudentId, setPortalHubStudentId] = useState<number | null>(null);
  const [portalHubInitialSubTab, setPortalHubInitialSubTab] = useState<
    'CARTEIRINHA' | 'BOLETIM' | 'DECLARACAO'
  >('BOLETIM');

  // === Filtros da aba KANBAN DE ALUNOS (sem barra de pesquisa, conforme Item 2) ===
  const [selectedDiaSemana, setSelectedDiaSemana] = useState<string>(() =>
    resolveDefaultWeekdayFilter()
  );
  const [selectedSala, setSelectedSala] = useState<string>('TODAS');
  const [selectedHorario, setSelectedHorario] = useState<string>('TODOS');
  const [selectedModalidade, setSelectedModalidade] = useState<
    'TODAS' | ModalityType
  >('TODAS');
  const [selectedApostila, setSelectedApostila] =
    useState<ApostilaFilterType>('TODAS');
  const [selectedNpsFilter, setSelectedNpsFilter] =
    useState<StudentNpsFilterType>('TODOS');
  const [selectedCourseCategory, setSelectedCourseCategory] =
    useState<CourseCategoryFilterType>('TODOS');
  const [selectedFinancialStatus, setSelectedFinancialStatus] =
    useState<FinancialFilterType>('TODOS');
  const [statusFilter, setStatusFilter] = useState<QuickCardFilter>('TODOS');

  // === Filtros da aba KANBAN NPS (sem barra de pesquisa, conforme Item 2, aberto no Dia Atual por padrão) ===
  const [npsDiaSemana, setNpsDiaSemana] = useState<string>(() =>
    resolveDefaultWeekdayFilter()
  );
  const [npsOrigem, setNpsOrigem] = useState<'TODAS' | NpsOrigemType>('TODAS');
  const [npsPontoJornada, setNpsPontoJornada] = useState<
    'TODOS' | '30 dias' | '50 dias' | '70 dias' | '50+ dias'
  >('TODOS');
  const [npsHorario, setNpsHorario] = useState<string>('TODOS');
  const [npsDeliveryStatus, setNpsDeliveryStatus] = useState<
    'TODOS' | NpsEmailDeliveryStatusType
  >('TODOS');
  const [npsDestinatarioFilter, setNpsDestinatarioFilter] = useState<
    'TODOS' | 'ALUNO' | 'RESPONSAVEL'
  >('TODOS');

  // Modal de detalhes do aluno (Kanban de Alunos)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Modal de detalhes do aluno/pesquisa NPS (Kanban NPS -> ao clicar no card do aluno)
  const [selectedNpsStudentCard, setSelectedNpsStudentCard] =
    useState<SynchronizedNpsStudentCard | null>(null);

  const selectedDiaSemanaRef = useRef<string>(selectedDiaSemana);
  useEffect(() => {
    selectedDiaSemanaRef.current = selectedDiaSemana;
  }, [selectedDiaSemana]);

  // Sincronização automática em segundo plano a cada 1 minuto (sem travar a thread principal quando os dados não mudam)
  const syncPortalData = useCallback(async (diaSemanaFilter?: string) => {
    try {
      const targetDay = diaSemanaFilter ?? selectedDiaSemanaRef.current;
      const semanaCode =
        targetDay && targetDay !== 'TODOS'
          ? PORTAL_WEEKDAY_LABEL_TO_CODE[targetDay] || ''
          : '';
      const querySuffix = semanaCode
        ? `?semana=${encodeURIComponent(semanaCode)}`
        : '';
      const res = await fetch(`/api/microlins/sync${querySuffix}`);
      const nextWeekday =
        getSimulatedWeekdayOverrideFromUrl() || getCurrentBrasiliaWeekdayLabel();
      setCurrentBrasiliaWeekday((prev) =>
        prev === nextWeekday ? prev : nextWeekday
      );
      const urlTimeOverride = getSimulatedTimeOverrideFromUrl();

      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.records) && payload.records.length > 0) {
          const incomingRecords: StudentPerformanceRecord[] = payload.records;
          setRecords((prev) =>
            computeRecordsSignature(prev) ===
            computeRecordsSignature(incomingRecords)
              ? prev
              : incomingRecords
          );
        }
        if (
          Array.isArray(payload.activeNpsInvitations) &&
          payload.activeNpsInvitations.length > 0
        ) {
          const refYear =
            typeof payload.npsReferenceYear === 'number'
              ? payload.npsReferenceYear
              : getCurrentBrasiliaYear();
          setNpsReferenceYear((prev) => (prev === refYear ? prev : refYear));
          const deduplicatedNps = filterAndDeduplicateAnnualNpsInvitations(
            payload.activeNpsInvitations,
            refYear
          );
          setActiveNpsInvitations((prev) =>
            computeNpsSignature(prev) === computeNpsSignature(deduplicatedNps)
              ? prev
              : deduplicatedNps
          );
        }
        if (payload.metadata) {
          setPortalMeta((prev) => {
            if (
              prev.unidade === payload.metadata.unidade &&
              prev.usuarioNomeCompleto ===
                payload.metadata.usuarioNomeCompleto &&
              prev.usuarioCargo === payload.metadata.usuarioCargo &&
              prev.usuarioLogin === payload.metadata.usuarioLogin
            ) {
              return prev;
            }
            return { ...prev, ...payload.metadata };
          });
        }
        const nextMinutes = urlTimeOverride
          ? getBrasiliaCurrentMinutes(urlTimeOverride)
          : payload.syncedAt
          ? getBrasiliaCurrentMinutes(payload.syncedAt)
          : getBrasiliaCurrentMinutes();
        setCurrentTimeMinutes((prev) =>
          prev === nextMinutes ? prev : nextMinutes
        );

        const nextSyncStr =
          payload.syncedDate && payload.syncedAt
            ? `${payload.syncedDate} ${payload.syncedAt.slice(0, 5)}`
            : formatCurrentBrasiliaSyncTimestamp();
        setLastSyncTimestamp((prev) =>
          prev === nextSyncStr ? prev : nextSyncStr
        );
      } else {
        const [remoteRecords, remoteNps] = await Promise.all([
          fetchStudentRecords(),
          fetchNpsInvitations(),
        ]);
        if (remoteRecords && remoteRecords.length > 0) {
          setRecords((prev) =>
            computeRecordsSignature(prev) ===
            computeRecordsSignature(remoteRecords)
              ? prev
              : remoteRecords
          );
        }
        if (remoteNps && remoteNps.length > 0) {
          const deduplicatedNps = filterAndDeduplicateAnnualNpsInvitations(
            remoteNps,
            getCurrentBrasiliaYear()
          );
          setActiveNpsInvitations((prev) =>
            computeNpsSignature(prev) === computeNpsSignature(deduplicatedNps)
              ? prev
              : deduplicatedNps
          );
        }
        const nextMinutes = getBrasiliaCurrentMinutes(
          getSimulatedTimeOverrideFromUrl()
        );
        setCurrentTimeMinutes((prev) =>
          prev === nextMinutes ? prev : nextMinutes
        );
        setLastSyncTimestamp(formatCurrentBrasiliaSyncTimestamp());
      }
    } catch {
      try {
        const [remoteRecords, remoteNps] = await Promise.all([
          fetchStudentRecords(),
          fetchNpsInvitations(),
        ]);
        if (remoteRecords && remoteRecords.length > 0) {
          setRecords((prev) =>
            computeRecordsSignature(prev) ===
            computeRecordsSignature(remoteRecords)
              ? prev
              : remoteRecords
          );
        }
        if (remoteNps && remoteNps.length > 0) {
          const deduplicatedNps = filterAndDeduplicateAnnualNpsInvitations(
            remoteNps,
            getCurrentBrasiliaYear()
          );
          setActiveNpsInvitations((prev) =>
            computeNpsSignature(prev) === computeNpsSignature(deduplicatedNps)
              ? prev
              : deduplicatedNps
          );
        }
      } catch {
        // Ignore network errors
      }
      const nextMinutes = getBrasiliaCurrentMinutes(
        getSimulatedTimeOverrideFromUrl()
      );
      setCurrentTimeMinutes((prev) =>
        prev === nextMinutes ? prev : nextMinutes
      );
      const nextWeekday =
        getSimulatedWeekdayOverrideFromUrl() || getCurrentBrasiliaWeekdayLabel();
      setCurrentBrasiliaWeekday((prev) =>
        prev === nextWeekday ? prev : nextWeekday
      );
      setLastSyncTimestamp(formatCurrentBrasiliaSyncTimestamp());
    }
  }, []);

  useEffect(() => {
    syncPortalData();
    const timer = setInterval(() => syncPortalData(), AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [syncPortalData]);

  // 1. Avaliação global de todos os agendamentos respeitando prioridade absoluta do sistema e regra dos 15 minutos
  const allEvaluatedRecords = useMemo(
    () =>
      evaluateAllStudentsAttendance(
        records,
        currentTimeMinutes,
        {},
        activeNpsInvitations,
        currentBrasiliaWeekday
      ),
    [records, currentTimeMinutes, activeNpsInvitations, currentBrasiliaWeekday]
  );

  // Registros filtrados pelo Dia da Semana selecionado no Kanban de Alunos
  const dayFilteredRecords = useMemo(() => {
    if (selectedDiaSemana === 'TODOS') {
      return allEvaluatedRecords;
    }
    return allEvaluatedRecords.filter((r) => r.diaSemana === selectedDiaSemana);
  }, [allEvaluatedRecords, selectedDiaSemana]);

  // Opções dinâmicas para filtros do Kanban de Alunos
  const salaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of dayFilteredRecords) {
      if (r.sala) set.add(r.sala);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [dayFilteredRecords]);

  const horarioOptions = useMemo(() => {
    const hourNumbers = new Set<number>();
    for (const r of dayFilteredRecords) {
      const h = extractRecordStartHour(r, 'AGENDADO');
      if (h !== null) hourNumbers.add(h);
    }
    return Array.from(hourNumbers)
      .sort((a, b) => a - b)
      .map((h) => `${String(h).padStart(2, '0')}h`);
  }, [dayFilteredRecords]);

  const modalidadeOptions = useMemo(() => {
    const set = new Set<ModalityType>();
    for (const r of dayFilteredRecords) {
      if (r.modalidade) set.add(r.modalidade);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [dayFilteredRecords]);

  // Registros avaliados do Kanban de Alunos com filtros de cabeçalho (sem campo de busca)
  const headerFilteredRecords = useMemo(
    () =>
      filterAndSortRecords(
        allEvaluatedRecords,
        {
          search: '',
          diaSemana: selectedDiaSemana,
          sala: selectedSala,
          horario: selectedHorario,
          modalidade: selectedModalidade,
          apostilaFilter: selectedApostila,
          npsFilter: selectedNpsFilter,
          courseCategoryFilter: selectedCourseCategory,
          financialFilter: selectedFinancialStatus,
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
        activeNpsInvitations,
        currentBrasiliaWeekday
      ),
    [
      allEvaluatedRecords,
      selectedDiaSemana,
      selectedSala,
      selectedHorario,
      selectedModalidade,
      selectedApostila,
      selectedNpsFilter,
      selectedCourseCategory,
      selectedFinancialStatus,
      currentTimeMinutes,
      activeNpsInvitations,
      currentBrasiliaWeekday,
    ]
  );

  // KPIs dos 6 cards de resumo de Alunos (organizados em 2 linhas)
  const kpis = useMemo(
    () =>
      computePerformanceKPIs(
        headerFilteredRecords,
        currentTimeMinutes,
        {},
        activeNpsInvitations,
        currentBrasiliaWeekday
      ),
    [
      headerFilteredRecords,
      currentTimeMinutes,
      activeNpsInvitations,
      currentBrasiliaWeekday,
    ]
  );

  const hasValidStudentFrequency = hasFrequencyData(
    kpis.presencaCount,
    kpis.faltaCount
  );
  const isGlobalFreqSatisfactory = kpis.mediaFrequencia >= 85;

  // Registros finais do Kanban de Alunos
  const activeStudentRecords = useMemo(() => {
    if (statusFilter === 'TODOS') return headerFilteredRecords;
    if (statusFilter === 'EVASAO') {
      return headerFilteredRecords.filter((r) => r.isEvasao);
    }
    if (statusFilter === 'FALTA_PENDENTE') {
      return headerFilteredRecords.filter((r) => r.isPendingNextDayAbsence);
    }
    if (isNotStartedAttendanceStatus(statusFilter)) {
      return headerFilteredRecords.filter((r) =>
        isNotStartedAttendanceStatus(r.attendanceStatus)
      );
    }
    return headerFilteredRecords.filter(
      (r) => r.attendanceStatus === statusFilter
    );
  }, [headerFilteredRecords, statusFilter]);

  // Colunas do Kanban de Alunos por horário
  const studentKanbanColumns = useMemo(
    () =>
      groupByHourKanban(
        activeStudentRecords,
        'AGENDADO',
        currentTimeMinutes,
        {},
        activeNpsInvitations,
        currentBrasiliaWeekday
      ),
    [
      activeStudentRecords,
      currentTimeMinutes,
      activeNpsInvitations,
      currentBrasiliaWeekday,
    ]
  );

  // === DADOS SINCRONIZADOS DA ABA KANBAN NPS ===
  const synchronizedNpsStudentCards = useMemo(
    () =>
      buildSynchronizedNpsStudentCards(
        activeNpsInvitations,
        allEvaluatedRecords,
        npsReferenceYear,
        npsDiaSemana !== 'TODOS' ? npsDiaSemana : selectedDiaSemana,
        currentTimeMinutes
      ),
    [
      activeNpsInvitations,
      allEvaluatedRecords,
      npsReferenceYear,
      npsDiaSemana,
      selectedDiaSemana,
      currentTimeMinutes,
    ]
  );

  // Opções de horários dos alunos elegíveis no NPS
  const npsHorarioOptions = useMemo(() => {
    const hours = new Set<number>();
    for (const card of synchronizedNpsStudentCards) {
      hours.add(card.linkedHourNumber);
    }
    return Array.from(hours)
      .sort((a, b) => a - b)
      .map((h) => `${String(h).padStart(2, '0')}h`);
  }, [synchronizedNpsStudentCards]);

  // Cards de alunos NPS filtrados (sem barra de pesquisa)
  const npsFilteredCards = useMemo(() => {
    const criteria: NpsFilterCriteria = {
      search: '',
      origem: npsOrigem,
      pontoJornada: npsPontoJornada,
      horario: npsHorario,
      diaSemana: npsDiaSemana,
      emailDeliveryStatus: npsDeliveryStatus,
      destinatarioFilter: npsDestinatarioFilter,
    };
    return filterSynchronizedNpsCards(synchronizedNpsStudentCards, criteria);
  }, [
    synchronizedNpsStudentCards,
    npsOrigem,
    npsPontoJornada,
    npsHorario,
    npsDiaSemana,
    npsDeliveryStatus,
    npsDestinatarioFilter,
  ]);

  // Indicadores de resumo da aba NPS
  const npsKPIs = useMemo(
    () => computeNpsSummaryKPIs(npsFilteredCards),
    [npsFilteredCards]
  );

  // Relação de dia para as colunas do Kanban NPS (sincronizada com o dia de Brasília)
  const npsDayRelation = useMemo(() => {
    if (npsDiaSemana !== 'TODOS') {
      return compareWeekdayWithCurrent(npsDiaSemana, currentBrasiliaWeekday);
    }
    return 'CURRENT_DAY';
  }, [npsDiaSemana, currentBrasiliaWeekday]);

  // Colunas do Kanban NPS agrupadas pelo horário do aluno no Kanban
  const npsKanbanColumns = useMemo(
    () =>
      groupByNpsHourKanban(
        npsFilteredCards,
        currentTimeMinutes,
        npsDayRelation
      ),
    [npsFilteredCards, currentTimeMinutes, npsDayRelation]
  );

  // Aluno selecionado para o modal de detalhes (Kanban de Alunos)
  const selectedStudent = useMemo(() => {
    if (selectedStudentId === null) return null;
    return allEvaluatedRecords.find((r) => r.id === selectedStudentId) ?? null;
  }, [allEvaluatedRecords, selectedStudentId]);

  const selectedStudentHistory = useMemo(() => {
    if (!selectedStudent) return [];
    return allEvaluatedRecords.filter(
      (r) =>
        r.contrato === selectedStudent.contrato &&
        r.diaSemana === selectedStudent.diaSemana
    );
  }, [allEvaluatedRecords, selectedStudent]);

  const toggleStatusFilter = (target: QuickCardFilter) => {
    triggerWithLoading(() => {
      setStatusFilter((prev) => (prev === target ? 'TODOS' : target));
    }, 'Filtrando cards por status...');
  };

  const hasActiveStudentFilters =
    selectedDiaSemana !== resolveDefaultWeekdayFilter() ||
    selectedSala !== 'TODAS' ||
    selectedHorario !== 'TODOS' ||
    selectedModalidade !== 'TODAS' ||
    selectedApostila !== 'TODAS' ||
    selectedNpsFilter !== 'TODOS' ||
    selectedCourseCategory !== 'TODOS' ||
    selectedFinancialStatus !== 'TODOS' ||
    statusFilter !== 'TODOS';

  const handleResetStudentFilters = () => {
    triggerWithLoading(() => {
      setSelectedDiaSemana(resolveDefaultWeekdayFilter());
      setSelectedSala('TODAS');
      setSelectedHorario('TODOS');
      setSelectedModalidade('TODAS');
      setSelectedApostila('TODAS');
      setSelectedNpsFilter('TODOS');
      setSelectedCourseCategory('TODOS');
      setSelectedFinancialStatus('TODOS');
      setStatusFilter('TODOS');
    }, 'Restaurando filtros padrão do Kanban de Alunos...');
  };

  const hasActiveNpsFilters =
    npsDiaSemana !== resolveDefaultWeekdayFilter() ||
    npsOrigem !== 'TODAS' ||
    npsPontoJornada !== 'TODOS' ||
    npsHorario !== 'TODOS' ||
    npsDeliveryStatus !== 'TODOS' ||
    npsDestinatarioFilter !== 'TODOS';

  const handleResetNpsFilters = () => {
    triggerWithLoading(() => {
      setNpsDiaSemana(resolveDefaultWeekdayFilter());
      setNpsOrigem('TODAS');
      setNpsPontoJornada('TODOS');
      setNpsHorario('TODOS');
      setNpsDeliveryStatus('TODOS');
      setNpsDestinatarioFilter('TODOS');
    }, 'Restaurando filtros padrão do Kanban NPS...');
  };

  const currentTimeStr = formatMinutesToHHMM(currentTimeMinutes);

  // Se a página de Privacidade e Proteção de Dados (LGPD) estiver ativa, renderiza a página dedicada
  if (showPrivacyPage) {
    return (
      <PrivacyProtectionView
        onBack={() => setShowPrivacyPage(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeSchoolName={
          authSession
            ? authSession.role === 'ESCOLA'
              ? authSession.schoolName || portalMeta.unidade
              : 'PAINEL ADMINISTRADOR'
            : 'Gestão Pedagógica e Acadêmica'
        }
        activeUserName={authSession?.nomeCompleto}
        activeUserRole={authSession?.cargo}
      />
    );
  }

  // Se o usuário ainda não estiver autenticado no Painel de Login e Senha, exibe a tela de Login
  if (!authSession) {
    return (
      <LoginView
        schools={schoolsRegistry}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPrivacyPage={() => setShowPrivacyPage(true)}
      />
    );
  }

  const activeSchoolName =
    authSession.role === 'ESCOLA'
      ? authSession.schoolName || portalMeta.unidade
      : 'PAINEL ADMINISTRADOR';
  const activeUserFullName =
    authSession.nomeCompleto || portalMeta.usuarioNomeCompleto;
  const activeUserRole = authSession.cargo || portalMeta.usuarioCargo;
  const activeUserLogin = authSession.login || portalMeta.usuarioLogin;

  if (isLoadingData) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Carregando dados da nuvem (Supabase)...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme-mode={theme}
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100/80 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
    >
      {/* REGIÃO 1: CABEÇALHO COMPACTO E MINIMALISTA DE LINHA ÚNICA */}
      <header
        data-testid="main-header"
        className="shrink-0 border-b border-[#00386B] bg-[#004A8D] text-white shadow-2xs dark:border-slate-800 dark:bg-[#003669]"
      >
        <div className="flex min-h-10 w-full flex-wrap items-center justify-between gap-2 px-3 py-1 sm:px-4 lg:flex-nowrap">
          {/* Esquerda: Logo Oficial da Microlins + Nome da Escola */}
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <img
              src="/assets/aistudio/logo-microlins_6400203f.png"
              alt="Microlins"
              className="h-5 w-auto object-contain brightness-0 invert"
              data-testid="header-microlins-logo"
            />
            <div className="hidden h-4 w-px bg-white/20 sm:block" />
            <div className="flex min-w-0 items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-200" />
              <span
                data-testid="header-school-name"
                className="max-w-[200px] truncate text-xs font-bold tracking-tight text-white xl:max-w-[240px]"
              >
                {activeSchoolName}
              </span>
            </div>
          </div>

          {/* Centro: Navegação Principal entre Módulos */}
          {authSession.role === 'ESCOLA' ? (
            <nav
              aria-label="Navegação entre Módulos"
              className="order-3 flex w-full shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#003669]/90 p-0.5 lg:order-2 lg:w-auto dark:bg-slate-900/70"
            >
              <button
                type="button"
                data-testid="tab-kanban-alunos"
                onClick={() =>
                  triggerWithLoading(
                    () => setActiveTab('KANBAN_ALUNOS'),
                    'Carregando Kanban de Alunos...'
                  )
                }
                aria-current={activeTab === 'KANBAN_ALUNOS' ? 'page' : undefined}
                className={`inline-flex h-6.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'KANBAN_ALUNOS'
                    ? 'bg-white text-[#004A8D] shadow-2xs'
                    : 'text-sky-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Kanban className="h-3 w-3 shrink-0" />
                <span>Kanban de Alunos</span>
                <span className="font-mono text-[10px] opacity-80 tabular-nums">
                  ({headerFilteredRecords.length})
                </span>
              </button>

              <button
                type="button"
                data-testid="tab-kanban-nps"
                onClick={() =>
                  triggerWithLoading(
                    () => setActiveTab('KANBAN_NPS'),
                    'Carregando Kanban NPS...'
                  )
                }
                aria-current={activeTab === 'KANBAN_NPS' ? 'page' : undefined}
                className={`inline-flex h-6.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'KANBAN_NPS'
                    ? 'bg-white text-[#004A8D] shadow-2xs'
                    : 'text-sky-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>Kanban NPS</span>
                <span className="font-mono text-[10px] opacity-80 tabular-nums">
                  ({npsFilteredCards.length})
                </span>
              </button>

              <button
                type="button"
                data-testid="tab-dashboard"
                onClick={() =>
                  triggerWithLoading(
                    () => setActiveTab('DASHBOARD'),
                    'Carregando Consolidado...'
                  )
                }
                aria-current={activeTab === 'DASHBOARD' ? 'page' : undefined}
                className={`inline-flex h-6.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-white text-[#004A8D] shadow-2xs'
                    : 'text-sky-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3 w-3 shrink-0" />
                <span>Consolidado</span>
              </button>

              <button
                type="button"
                data-testid="tab-portal-aluno"
                onClick={() =>
                  triggerWithLoading(() => {
                    setPortalHubStudentId(null);
                    setActiveTab('PORTAL_ALUNO');
                  }, 'Carregando Ficha Individual do Aluno...')
                }
                aria-current={activeTab === 'PORTAL_ALUNO' ? 'page' : undefined}
                className={`inline-flex h-6.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'PORTAL_ALUNO'
                    ? 'bg-white text-[#004A8D] shadow-2xs'
                    : 'text-sky-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <GraduationCap className="h-3 w-3 shrink-0" />
                <span>Ficha Individual</span>
              </button>
            </nav>
          ) : (
            <div className="order-2 hidden items-center gap-1.5 text-xs font-semibold text-sky-100 lg:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>Gestão Centralizada de Unidades e Credenciais</span>
            </div>
          )}

          {/* Direita: Sincronização Compacta + Usuário + Tema + Sair */}
          <div className="order-2 flex shrink-0 items-center gap-1.5 lg:order-3">
            {enteredSchoolFromAdmin && authSession.role !== 'ADMIN' && (
              <button
                type="button"
                data-testid="header-back-to-admin-btn"
                onClick={() =>
                  setAuthSession((prev) => ({
                    role: 'ADMIN',
                    login: DEFAULT_ADMIN_CREDENTIALS.login,
                    nomeCompleto: DEFAULT_ADMIN_CREDENTIALS.nomeCompleto,
                    cargo: DEFAULT_ADMIN_CREDENTIALS.cargo,
                    sessionToken: prev?.sessionToken,
                  }))
                }
                className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-300/40 bg-amber-500/20 px-2 text-[11px] font-bold text-amber-100 whitespace-nowrap transition-colors hover:bg-amber-500/30"
              >
                <KeyRound className="h-3 w-3 text-amber-300" />
                <span>Painel ADM</span>
              </button>
            )}

            <div
              data-testid="sync-status-badge"
              className="hidden items-center gap-1 text-[11px] font-medium text-emerald-200 xl:inline-flex"
              title="Integração Portal do Aluno e Indecx NPS ativa"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span className="sr-only 2xl:not-sr-only">Sincronizado</span>
            </div>

            <div
              data-testid="sync-timestamp-badge"
              className="hidden items-center gap-1 text-[11px] text-sky-200 tabular-nums whitespace-nowrap xl:inline-flex"
              title={`Horário oficial de Brasília: ${lastSyncTimestamp}`}
            >
              <Clock className="h-3 w-3 text-sky-300" />
              <span>{lastSyncTimestamp}</span>
            </div>

            <div className="hidden h-3.5 w-px bg-white/15 xl:block" />

            <div
              data-testid="header-user-session-info"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/15 bg-[#003669] px-2 text-[11px] text-sky-100 whitespace-nowrap"
              title={`${activeUserFullName} · ${activeUserRole} (#${activeUserLogin})`}
            >
              <UserCheck className="h-3 w-3 shrink-0 text-sky-200" />
              <span
                data-testid="header-user-fullname"
                className="max-w-[140px] truncate font-semibold text-white"
              >
                {activeUserFullName}
              </span>
              <span
                data-testid="header-user-role"
                className="sr-only 2xl:not-sr-only 2xl:inline-flex 2xl:items-center 2xl:gap-1 text-[11px] text-sky-200"
              >
                <span>· {activeUserRole}</span>
                <span className="text-sky-300/80">(#{activeUserLogin})</span>
              </span>
            </div>

            <button
              type="button"
              data-testid="theme-toggle-button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              title={theme === 'light' ? 'Alternar para o Tema Escuro' : 'Alternar para o Tema Claro'}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              {theme === 'light' ? (
                <Moon className="h-3.5 w-3.5 text-sky-100" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-300" />
              )}
            </button>

            <button
              type="button"
              data-testid="header-logout-btn"
              onClick={handleLogout}
              title="Sair da plataforma"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-rose-300/30 bg-rose-500/20 px-2.5 text-[11px] font-bold text-rose-100 whitespace-nowrap transition-colors hover:bg-rose-500/35"
            >
              <LogOut className="h-3 w-3 text-rose-200" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Se o usuário logado estiver no PERFIL ADMINISTRADOR, renderiza o Painel Administrador */}
      {authSession.role === 'ADMIN' ? (
        <AdminPanelView
          schools={schoolsRegistry}
          onSchoolsChange={setSchoolsRegistry}
          sessionToken={authSession.sessionToken}
          onAccessSchoolAsProfile={(schoolSession) => {
            setAuthSession({
              ...schoolSession,
              sessionToken: authSession.sessionToken,
            });
            setEnteredSchoolFromAdmin(true);
            setPortalMeta((prev) => ({
              ...prev,
              unidade: schoolSession.schoolName || prev.unidade,
              usuarioLogin: schoolSession.login,
              usuarioNomeCompleto: schoolSession.nomeCompleto,
              usuarioCargo: schoolSession.cargo,
            }));
          }}
        />
      ) : (
        <>
          {/* REGIÃO 2: ÁREA DE FILTROS PADRONIZADA EM EXATAMENTE 2 LINHAS */}
          {activeTab !== 'DASHBOARD' && activeTab !== 'PORTAL_ALUNO' && (
            <section
              aria-label="Filtros do painel ativo"
              data-testid="filters-section"
              className="shrink-0 border-b border-slate-200/90 bg-white px-3 py-1.5 transition-colors sm:px-5 dark:border-slate-800 dark:bg-slate-900"
            >
              {activeTab === 'KANBAN_ALUNOS' ? (
                /* 9 controles distribuídos em 5 colunas x 2 linhas (Sala ocupa 2 colunas para leitura integral) */
                <div
                  data-testid="filters-row-1"
                  className="grid grid-cols-2 gap-1.5 sm:grid-cols-5"
                >
                  {/* Linha 1 - Col 1: Dia da Semana */}
                  <div className="relative">
                    <label htmlFor="filter-dia-semana" className="sr-only">
                      Dia da Semana
                    </label>
                    <Calendar className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <select
                      id="filter-dia-semana"
                      aria-label="Dia da Semana"
                      value={selectedDiaSemana}
                      onChange={(e) => {
                        const val = e.target.value;
                        triggerWithLoading(
                          () => setSelectedDiaSemana(val),
                          'Atualizando Kanban para o dia selecionado...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-6 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Dia: Todos os dias</option>
                      {WEEKDAY_FILTER_OPTIONS.map((dia) => (
                        <option key={dia} value={dia}>
                          Dia: {dia}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Linha 1 - Col 2: Categoria do Curso */}
                  <div className="relative">
                    <label htmlFor="filter-categoria-curso" className="sr-only">
                      Categoria do Curso
                    </label>
                    <GraduationCap className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <select
                      id="filter-categoria-curso"
                      aria-label="Categoria do Curso"
                      value={selectedCourseCategory}
                      onChange={(e) => {
                        const val = e.target.value as CourseCategoryFilterType;
                        triggerWithLoading(
                          () => setSelectedCourseCategory(val),
                          'Filtrando alunos por categoria de curso...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-6 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Curso: Todos</option>
                      <option value="INGLÊS">Curso: Inglês</option>
                      <option value="PROFISSIONALIZANTE">
                        Curso: Profissionalizante
                      </option>
                    </select>
                  </div>

                  {/* Linha 1 - Col 3 e 4 (2 colunas): Sala */}
                  <div className="sm:col-span-2">
                    <label htmlFor="filter-sala" className="sr-only">
                      Sala
                    </label>
                    <select
                      id="filter-sala"
                      aria-label="Sala"
                      value={selectedSala}
                      onChange={(e) => {
                        const val = e.target.value;
                        triggerWithLoading(
                          () => setSelectedSala(val),
                          'Filtrando alunos por sala...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODAS">
                        Sala: Todas as salas ({salaOptions.length})
                      </option>
                      {salaOptions.map((sala) => (
                        <option key={sala} value={sala}>
                          Sala: {sala}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Linha 1 - Col 5: Horário */}
                  <div>
                    <label htmlFor="filter-horario" className="sr-only">
                      Horário
                    </label>
                    <select
                      id="filter-horario"
                      aria-label="Horário"
                      value={selectedHorario}
                      onChange={(e) => {
                        const val = e.target.value;
                        triggerWithLoading(
                          () => setSelectedHorario(val),
                          'Filtrando alunos por horário...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 tabular-nums transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

                  {/* Linha 2 - Col 1: Modalidade */}
                  <div>
                    <label htmlFor="filter-modalidade" className="sr-only">
                      Modalidade
                    </label>
                    <select
                      id="filter-modalidade"
                      aria-label="Modalidade"
                      value={selectedModalidade}
                      onChange={(e) => {
                        const val = e.target.value as 'TODAS' | ModalityType;
                        triggerWithLoading(
                          () => setSelectedModalidade(val),
                          'Filtrando alunos por modalidade...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODAS">Modalidade: Todas</option>
                      {modalidadeOptions.map((mod) => (
                        <option key={mod} value={mod}>
                          Modalidade: {mod}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Linha 2 - Col 2: Situação Financeira */}
                  <div className="relative">
                    <label
                      htmlFor="filter-situacao-financeira"
                      className="sr-only"
                    >
                      Situação Financeira
                    </label>
                    <DollarSign className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <select
                      id="filter-situacao-financeira"
                      aria-label="Situação Financeira"
                      value={selectedFinancialStatus}
                      onChange={(e) => {
                        const val = e.target.value as FinancialFilterType;
                        triggerWithLoading(
                          () => setSelectedFinancialStatus(val),
                          'Filtrando alunos por situação financeira...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-6 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Financeiro: Todos</option>
                      <option value="EM_DIA">Financeiro: Em dia</option>
                      <option value="EM_ATRASO">Financeiro: Em atraso</option>
                    </select>
                  </div>

                  {/* Linha 2 - Col 3: Apostila */}
                  <div className="relative">
                    <label htmlFor="filter-apostila" className="sr-only">
                      Filtro de Apostila
                    </label>
                    <BookOpen className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <select
                      id="filter-apostila"
                      aria-label="Filtro de Apostila"
                      value={selectedApostila}
                      onChange={(e) => {
                        const val = e.target.value as ApostilaFilterType;
                        triggerWithLoading(
                          () => setSelectedApostila(val),
                          'Filtrando alunos por situação de apostila...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-6 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODAS">Apostila: Todas</option>
                      <option value="COM_APOSTILA">Apostila: Entregue</option>
                      <option value="SEM_APOSTILA">
                        Apostila: Não entregue
                      </option>
                    </select>
                  </div>

                  {/* Linha 2 - Col 4: Convite NPS */}
                  <div className="relative">
                    <label htmlFor="filter-nps-aluno" className="sr-only">
                      Filtro de Convite NPS
                    </label>
                    <Sparkles className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <select
                      id="filter-nps-aluno"
                      aria-label="Filtro de Convite NPS"
                      value={selectedNpsFilter}
                      onChange={(e) => {
                        const val = e.target.value as StudentNpsFilterType;
                        triggerWithLoading(
                          () => setSelectedNpsFilter(val),
                          'Filtrando alunos por convite de NPS...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-6 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">NPS: Todos</option>
                      <option value="COM_NPS">NPS: Possui NPS</option>
                      <option value="SEM_NPS">NPS: Sem NPS</option>
                    </select>
                  </div>

                  {/* Linha 2 - Col 5: Limpar Filtros */}
                  <button
                    type="button"
                    data-testid="reset-student-filters"
                    onClick={handleResetStudentFilters}
                    disabled={!hasActiveStudentFilters}
                    title="Restaurar filtros padrão"
                    className={`typo-btn col-span-2 inline-flex h-7 items-center justify-center gap-1.5 rounded-md border px-2.5 transition-colors sm:col-span-1 ${
                      hasActiveStudentFilters
                        ? 'border-slate-300 bg-white text-slate-700 hover:border-[#004A8D] hover:bg-sky-50/60 hover:text-[#004A8D] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        : 'cursor-not-allowed border-slate-200/70 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                    }`}
                  >
                    <RotateCcw className="h-3 w-3 shrink-0" />
                    <span>Limpar filtros</span>
                  </button>
                </div>
              ) : (
                /* 6 controles do Kanban NPS distribuídos em 3 colunas x 2 linhas */
                <div
                  data-testid="nps-filters-row-1"
                  className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
                >
                  <div className="relative">
                    <label htmlFor="filter-nps-dia" className="sr-only">
                      Dia da Semana no Kanban
                    </label>
                    <Calendar className="pointer-events-none absolute left-2.5 top-2 h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <select
                      id="filter-nps-dia"
                      aria-label="Dia da Semana no Kanban"
                      value={npsDiaSemana}
                      onChange={(e) => {
                        const val = e.target.value;
                        triggerWithLoading(
                          () => setNpsDiaSemana(val),
                          'Atualizando Kanban NPS para o dia selecionado...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-7 pr-2 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Dia: Todos os dias</option>
                      {WEEKDAY_FILTER_OPTIONS.map((dia) => (
                        <option key={dia} value={dia}>
                          Dia: {dia}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-nps-horario" className="sr-only">
                      Horário do Aluno no Kanban
                    </label>
                    <select
                      id="filter-nps-horario"
                      aria-label="Horário do Aluno no Kanban"
                      value={npsHorario}
                      onChange={(e) => {
                        const val = e.target.value;
                        triggerWithLoading(
                          () => setNpsHorario(val),
                          'Filtrando convites NPS por horário...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 tabular-nums transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

                  <div>
                    <label htmlFor="filter-nps-origem" className="sr-only">
                      Canal de Origem NPS
                    </label>
                    <select
                      id="filter-nps-origem"
                      aria-label="Canal de Origem da pesquisa NPS"
                      value={npsOrigem}
                      onChange={(e) => {
                        const val = e.target.value as 'TODAS' | NpsOrigemType;
                        triggerWithLoading(
                          () => setNpsOrigem(val),
                          'Filtrando convites NPS por canal de origem...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODAS">Canal: Todos os canais</option>
                      <option value="Portal do Aluno">
                        Canal: Portal do Aluno
                      </option>
                      <option value="E-mail">Canal: E-mail</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-nps-entrega" className="sr-only">
                      Status de Entrega do Convite NPS
                    </label>
                    <select
                      id="filter-nps-entrega"
                      aria-label="Status de Entrega do Convite NPS"
                      value={npsDeliveryStatus}
                      onChange={(e) => {
                        const val = e.target.value as
                          | 'TODOS'
                          | NpsEmailDeliveryStatusType;
                        triggerWithLoading(
                          () => setNpsDeliveryStatus(val),
                          'Filtrando convites NPS por status real de entrega...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Status Envio: Todos</option>
                      <option value="Enviado">Status Envio: Enviado</option>
                      <option value="Entregue">Status Envio: Entregue</option>
                      <option value="Aberto">Status Envio: Aberto</option>
                      <option value="Não entregue">
                        Status Envio: Não entregue
                      </option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-nps-jornada" className="sr-only">
                      Ciclo da Pesquisa NPS
                    </label>
                    <select
                      id="filter-nps-jornada"
                      aria-label="Ciclo da Pesquisa NPS"
                      value={npsPontoJornada}
                      onChange={(e) => {
                        const val = e.target.value as
                          | 'TODOS'
                          | '30 dias'
                          | '50 dias'
                          | '70 dias'
                          | '50+ dias';
                        triggerWithLoading(
                          () => setNpsPontoJornada(val),
                          'Filtrando convites NPS por ciclo de jornada...'
                        );
                      }}
                      className="typo-control h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-slate-800 transition-colors hover:border-slate-300 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="TODOS">Ciclo: Todos os ciclos</option>
                      <option value="30 dias">Ciclo: 30 dias</option>
                      <option value="50 dias">Ciclo: 50 dias</option>
                      <option value="70 dias">Ciclo: 70 dias</option>
                      <option value="50+ dias">Ciclo: 50 e 70 dias (50+)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    data-testid="reset-nps-filters"
                    onClick={handleResetNpsFilters}
                    disabled={!hasActiveNpsFilters}
                    title="Restaurar filtros NPS"
                    className={`typo-btn inline-flex h-7 items-center justify-center gap-1.5 rounded-md border px-3 transition-colors ${
                      hasActiveNpsFilters
                        ? 'border-slate-300 bg-white text-slate-700 hover:border-[#004A8D] hover:bg-sky-50/60 hover:text-[#004A8D] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        : 'cursor-not-allowed border-slate-200/70 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                    }`}
                  >
                    <RotateCcw className="h-3 w-3 shrink-0" />
                    <span>Limpar filtros</span>
                  </button>
                </div>
              )}
            </section>
          )}

          {/* REGIÃO 3: CARDS DE RESUMO PADRONIZADOS EM EXATAMENTE 2 LINHAS (3 COLUNAS x 2 LINHAS) */}
          {activeTab !== 'DASHBOARD' && activeTab !== 'PORTAL_ALUNO' && (
            <section
              aria-label={
                activeTab === 'KANBAN_ALUNOS'
                  ? 'Indicadores e filtros de status de Alunos'
                  : 'Indicadores de convites NPS ativos sincronizados'
              }
              data-testid="summary-cards-section"
              className="shrink-0 border-b border-slate-200/80 bg-slate-50/95 px-3 py-1.5 transition-colors sm:px-5 dark:border-slate-800 dark:bg-slate-900/80"
            >
              {activeTab === 'KANBAN_ALUNOS' ? (
                /* 6 Cards organizados em 2 linhas de 3 cards (grid-cols-3) */
                <div
                  data-testid="student-summary-cards-grid"
                  className="grid grid-cols-3 gap-1.5"
                >
                  {/* Linha 1 - Card 1: Presenças */}
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('Presença')}
                    aria-pressed={statusFilter === 'Presença'}
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-all duration-150 ${
                      statusFilter === 'Presença'
                        ? 'border-emerald-500 bg-emerald-50/90 ring-1 ring-emerald-500/25 dark:border-emerald-500 dark:bg-emerald-950/60'
                        : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        Presenças
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-emerald-700 tabular-nums dark:text-emerald-400">
                      {kpis.presencaCount}
                    </span>
                  </button>

                  {/* Linha 1 - Card 2: Faltas */}
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('Falta')}
                    aria-pressed={statusFilter === 'Falta'}
                    title="Faltas registradas pelo sistema ou após 15 minutos do início da aula"
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-all duration-150 ${
                      statusFilter === 'Falta'
                        ? 'border-rose-500 bg-rose-50/90 ring-1 ring-rose-500/25 dark:border-rose-500 dark:bg-rose-950/60'
                        : 'border-slate-200/90 bg-white hover:border-rose-300 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-700'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        Faltas
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-rose-700 tabular-nums dark:text-rose-400">
                      {kpis.faltaCount}
                    </span>
                  </button>

                  {/* Linha 1 - Card 3: Não iniciada */}
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('Não iniciada')}
                    aria-pressed={isNotStartedAttendanceStatus(statusFilter)}
                    title="Aulas ainda não iniciadas ou dentro dos 15 minutos de tolerância"
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-all duration-150 ${
                      isNotStartedAttendanceStatus(statusFilter)
                        ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-400/25 dark:border-slate-600 dark:bg-slate-800'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        Não iniciada
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-slate-700 tabular-nums dark:text-slate-200">
                      {kpis.aguardandoCount}
                    </span>
                  </button>

                  {/* Linha 2 - Card 4: Frequência Geral */}
                  <div
                    data-testid="kpi-frequencia"
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 transition-colors ${
                      !hasValidStudentFrequency
                        ? 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
                        : isGlobalFreqSatisfactory
                        ? 'border-emerald-300/90 bg-emerald-50/60 dark:border-emerald-800/80 dark:bg-emerald-950/40'
                        : 'border-rose-300/90 bg-rose-50/60 dark:border-rose-800/80 dark:bg-rose-950/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Percent
                        className={`h-3.5 w-3.5 shrink-0 ${
                          !hasValidStudentFrequency
                            ? 'text-slate-400'
                            : isGlobalFreqSatisfactory
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      />
                      <span
                        className={`typo-subtitle truncate whitespace-nowrap ${
                          !hasValidStudentFrequency
                            ? 'text-slate-700 dark:text-slate-200'
                            : isGlobalFreqSatisfactory
                            ? 'text-emerald-900 dark:text-emerald-200'
                            : 'text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        Frequência
                      </span>
                    </div>
                    <span
                      className={`typo-title-section ml-2 whitespace-nowrap tabular-nums ${
                        !hasValidStudentFrequency
                          ? 'text-slate-500 dark:text-slate-400'
                          : isGlobalFreqSatisfactory
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {hasValidStudentFrequency
                        ? `${kpis.mediaFrequencia.toFixed(1)}%`
                        : 'S/D'}
                    </span>
                  </div>

                  {/* Linha 2 - Card 5: Total de agendamentos */}
                  <div
                    data-testid="kpi-total-agendamentos"
                    className="flex h-8 items-center justify-between rounded-md border border-slate-200/90 bg-white px-2.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-[#004A8D] dark:text-sky-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        <span className="hidden sm:inline">
                          Total de agendamentos
                        </span>
                        <span className="sm:hidden">Agendamentos</span>
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-slate-800 tabular-nums dark:text-slate-100">
                      {kpis.totalAgendamentos}
                    </span>
                  </div>

                  {/* Linha 2 - Card 6: Evasão */}
                  <button
                    type="button"
                    data-testid="kpi-evasao"
                    onClick={() => toggleStatusFilter('EVASAO')}
                    aria-pressed={statusFilter === 'EVASAO'}
                    title="Filtrar alunos identificados com possível evasão"
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-all duration-150 ${
                      statusFilter === 'EVASAO'
                        ? 'border-rose-500 bg-rose-100/80 ring-1 ring-rose-500/30 dark:border-rose-500 dark:bg-rose-950/60'
                        : kpis.evasaoCount > 0
                        ? 'evasao-alert-pulse border-rose-300/90 bg-rose-50/70 hover:border-rose-400 hover:bg-rose-50/90 dark:border-rose-800 dark:bg-rose-950/40'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <AlertTriangle
                        className={`h-3.5 w-3.5 shrink-0 ${
                          kpis.evasaoCount > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`typo-subtitle truncate whitespace-nowrap ${
                          kpis.evasaoCount > 0
                            ? 'text-rose-800 dark:text-rose-300'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        Evasão
                      </span>
                    </div>
                    <span
                      className={`typo-title-section ml-2 tabular-nums ${
                        kpis.evasaoCount > 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {kpis.evasaoCount}
                    </span>
                  </button>
                </div>
              ) : (
                /* 6 Cards do Kanban NPS organizados em 2 linhas de 3 cards (grid-cols-3) */
                <div
                  data-testid="nps-summary-cards-grid"
                  className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
                >
                  {/* Linha 1 - Card 1: Total de Convites */}
                  <button
                    type="button"
                    data-testid="nps-kpi-total-convites"
                    onClick={handleResetNpsFilters}
                    className="flex h-8 items-center justify-between rounded-md border border-[#004A8D]/30 bg-sky-50/75 px-2.5 text-left transition-colors hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/50"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#004A8D] dark:text-sky-400" />
                      <span className="typo-subtitle truncate text-slate-900 whitespace-nowrap dark:text-sky-100">
                        Total de convites
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-[#004A8D] tabular-nums dark:text-sky-300">
                      {npsKPIs.totalConvites}
                    </span>
                  </button>

                  {/* Linha 1 - Card 2: Convites pelo Portal */}
                  <button
                    type="button"
                    data-testid="nps-kpi-portal"
                    onClick={() =>
                      triggerWithLoading(() => {
                        setNpsOrigem((prev) =>
                          prev === 'Portal do Aluno' ? 'TODAS' : 'Portal do Aluno'
                        );
                      }, 'Filtrando convites pelo Portal do Aluno...')
                    }
                    aria-pressed={npsOrigem === 'Portal do Aluno'}
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-colors ${
                      npsOrigem === 'Portal do Aluno'
                        ? 'border-sky-500 bg-sky-50/90 ring-1 ring-sky-500/25 dark:border-sky-500 dark:bg-sky-950/60'
                        : 'border-slate-200/90 bg-white hover:border-sky-300 hover:bg-sky-50/35 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        Portal do Aluno
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-sky-700 tabular-nums dark:text-sky-400">
                      {npsKPIs.portalDoAlunoCount}
                    </span>
                  </button>

                  {/* Linha 1 - Card 3: Convites por E-mail */}
                  <button
                    type="button"
                    data-testid="nps-kpi-email"
                    onClick={() =>
                      triggerWithLoading(() => {
                        setNpsOrigem((prev) =>
                          prev === 'E-mail' ? 'TODAS' : 'E-mail'
                        );
                      }, 'Filtrando convites por E-mail...')
                    }
                    aria-pressed={npsOrigem === 'E-mail'}
                    className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left transition-colors ${
                      npsOrigem === 'E-mail'
                        ? 'border-indigo-500 bg-indigo-50/90 ring-1 ring-indigo-500/25 dark:border-indigo-500 dark:bg-indigo-950/60'
                        : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/35 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span className="typo-subtitle truncate text-slate-700 whitespace-nowrap dark:text-slate-200">
                        Por E-mail
                      </span>
                    </div>
                    <span className="typo-title-section ml-2 text-indigo-700 tabular-nums dark:text-indigo-400">
                      {npsKPIs.emailCount}
                    </span>
                  </button>

                  {/* Linha 2 - Card 4: Destinatário (Aluno vs Responsável) */}
                  <div
                    data-testid="nps-kpi-destinatarios"
                    className="flex h-8 items-center justify-between rounded-md border border-slate-200/90 bg-white px-2.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="typo-subtitle truncate text-slate-700 dark:text-slate-200">
                      Destinatário
                    </span>
                    <div className="flex items-center gap-1 tabular-nums">
                      <button
                        type="button"
                        data-testid="nps-kpi-filter-aluno"
                        onClick={() =>
                          triggerWithLoading(() => {
                            setNpsDestinatarioFilter((prev) =>
                              prev === 'ALUNO' ? 'TODOS' : 'ALUNO'
                            );
                          }, 'Filtrando convites enviados diretamente ao Aluno...')
                        }
                        aria-pressed={npsDestinatarioFilter === 'ALUNO'}
                        title="Filtrar convites enviados diretamente ao Aluno (Níveis 1 e 2)"
                        className={`typo-badge rounded border px-1.5 py-0.5 transition-colors ${
                          npsDestinatarioFilter === 'ALUNO'
                            ? 'border-[#004A8D] bg-[#004A8D] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Aluno: {npsKPIs.destinatarioAlunoCount}
                      </button>
                      <button
                        type="button"
                        data-testid="nps-kpi-filter-responsavel"
                        onClick={() =>
                          triggerWithLoading(() => {
                            setNpsDestinatarioFilter((prev) =>
                              prev === 'RESPONSAVEL' ? 'TODOS' : 'RESPONSAVEL'
                            );
                          }, 'Filtrando convites enviados ao Responsável (Nível 3)...')
                        }
                        aria-pressed={npsDestinatarioFilter === 'RESPONSAVEL'}
                        title="Filtrar convites enviados ao Responsável (Níveis 3 e 4)"
                        className={`typo-badge rounded border px-1.5 py-0.5 transition-colors ${
                          npsDestinatarioFilter === 'RESPONSAVEL'
                            ? 'border-[#004A8D] bg-[#004A8D] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Resp.: {npsKPIs.destinatarioResponsavelCount}
                      </button>
                    </div>
                  </div>

                  {/* Linha 2 - Card 5: Resumo de Status Real de Entrega Indecx */}
                  <div
                    data-testid="nps-kpi-real-delivery"
                    className="flex h-8 items-center justify-between rounded-md border border-slate-200/90 bg-white px-2.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="typo-subtitle truncate text-slate-700 dark:text-slate-200">
                      Envio Real
                    </span>
                    <div className="flex items-center gap-1 tabular-nums">
                      <span
                        title="Abertos pelo aluno/responsável"
                        className="typo-badge rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      >
                        Ab: {npsKPIs.emailAbertoCount}
                      </span>
                      <span
                        title="Entregues"
                        className="typo-badge rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                      >
                        Ent: {npsKPIs.emailEntregueCount}
                      </span>
                      <span
                        title="Não entregues (Bounce/Falha)"
                        className="typo-badge rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      >
                        Falha: {npsKPIs.emailNaoEntregueCount}
                      </span>
                    </div>
                  </div>

                  {/* Linha 2 - Card 6: Ciclos da Jornada NPS (30d vs 50+ dias) */}
                  <div
                    data-testid="nps-kpi-ciclos-jornada"
                    className="col-span-2 flex h-8 items-center justify-between rounded-md border border-slate-200/90 bg-white px-2.5 sm:col-span-1 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="typo-subtitle truncate text-slate-700 dark:text-slate-200">
                      Ciclo NPS
                    </span>
                    <div className="flex items-center gap-1 tabular-nums">
                      <button
                        type="button"
                        onClick={() =>
                          triggerWithLoading(() => {
                            setNpsPontoJornada((prev) =>
                              prev === '30 dias' ? 'TODOS' : '30 dias'
                            );
                          }, 'Filtrando ciclo de 30 dias...')
                        }
                        className={`typo-badge rounded border px-1.5 py-0.5 transition-colors ${
                          npsPontoJornada === '30 dias'
                            ? 'border-[#004A8D] bg-[#004A8D] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        30 dias
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          triggerWithLoading(() => {
                            setNpsPontoJornada((prev) =>
                              prev === '50+ dias' ? 'TODOS' : '50+ dias'
                            );
                          }, 'Filtrando ciclo de 50 e 70 dias...')
                        }
                        className={`typo-badge rounded border px-1.5 py-0.5 transition-colors ${
                          npsPontoJornada === '50+ dias'
                            ? 'border-[#004A8D] bg-[#004A8D] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        50+ dias
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* REGIÃO 4: ÁREA PRINCIPAL DOS KANBANS, DASHBOARD OU PORTAL DO ALUNO */}
          <main
            className={`relative min-h-0 flex-1 px-3 py-1.5 sm:px-5 ${
              activeTab === 'PORTAL_ALUNO' || activeTab === 'DASHBOARD'
                ? 'overflow-y-auto'
                : 'overflow-hidden'
            }`}
          >
            <div
              className={`h-full w-full transition-opacity duration-100 ${
                isLoading
                  ? 'pointer-events-none opacity-60 select-none'
                  : 'opacity-100'
              }`}
            >
              {activeTab === 'KANBAN_ALUNOS' ? (
                <HourKanbanBoard
                  columns={studentKanbanColumns}
                  onSelectStudent={setSelectedStudentId}
                />
              ) : activeTab === 'KANBAN_NPS' ? (
                <NpsHourKanbanBoard
                  columns={npsKanbanColumns}
                  onSelectStudentCard={setSelectedNpsStudentCard}
                  currentTimeStr={currentTimeStr}
                />
              ) : activeTab === 'DASHBOARD' ? (
                <DashboardView
                  allEvaluatedRecords={allEvaluatedRecords}
                  onSelectStudentRecord={setSelectedStudentId}
                />
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  <PortalAlunoHubView
                    allStudents={allEvaluatedRecords}
                    selectedStudentId={portalHubStudentId}
                    onSelectStudentId={(id) => setPortalHubStudentId(id)}
                    unidadeAtual={portalMeta.unidade}
                    initialSubTab={portalHubInitialSubTab}
                  />
                </div>
              )}
            </div>

            {isLoading && (
              <div
                data-testid="kanban-loading-overlay"
                role="status"
                aria-live="polite"
                className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1.5px] transition-opacity duration-100"
              >
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#004A8D] dark:text-sky-400" />
                  <div className="flex flex-col">
                    <span className="typo-subtitle font-bold text-slate-900 dark:text-slate-100">
                      Processando atualização...
                    </span>
                    <span className="typo-meta text-slate-600 dark:text-slate-400">
                      {loadingMessage}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* REGIÃO 5: RODAPÉ MINIMALISTA E COMPACTO DE LINHA ÚNICA */}
      <footer className="shrink-0 border-t border-[#001B3A] bg-[#002855] px-3 py-1 text-[11px] text-slate-300 sm:px-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-white">
              © 2026 Grupo Realizar Microlins
            </span>
            <span className="text-white/25">·</span>
            <button
              type="button"
              data-testid="footer-privacy-link"
              onClick={() => setShowPrivacyPage(true)}
              className="inline-flex items-center gap-1 font-medium text-sky-200 transition-colors hover:text-white"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Privacidade e LGPD</span>
            </button>
          </div>

          <span className="hidden text-sky-200/90 sm:inline">
            Desenvolvido por Alisson Araújo Bott
          </span>

          <div className="inline-flex items-center gap-1.5 text-slate-200">
            <MessageSquare className="h-3 w-3 shrink-0 text-emerald-400" />
            <span>Suporte:</span>
            <a
              href="https://wa.me/5518997432487"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-sky-200"
            >
              (18) 99743-2487
            </a>
          </div>
        </div>
      </footer>

      {/* Modal de Detalhes Acadêmicos do Aluno (Kanban de Alunos) */}
      <StudentDetailModal
        student={selectedStudent}
        studentHistory={selectedStudentHistory}
        onClose={() => setSelectedStudentId(null)}
        onOpenPortalHub={(hubSubTab) => {
          if (selectedStudent) {
            setPortalHubStudentId(selectedStudent.id);
          }
          setPortalHubInitialSubTab(hubSubTab || 'BOLETIM');
          setSelectedStudentId(null);
          setActiveTab('PORTAL_ALUNO');
        }}
      />

      {/* Modal de Detalhes e Histórico Cronológico de Pesquisas do Aluno (Kanban NPS) */}
      <NpsInvitationDetailModal
        studentCard={selectedNpsStudentCard}
        currentYear={npsReferenceYear}
        onClose={() => setSelectedNpsStudentCard(null)}
      />
    </div>
  );
}
