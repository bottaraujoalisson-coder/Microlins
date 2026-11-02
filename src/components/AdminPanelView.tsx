import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  DownloadCloud,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck2,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  AuthSession,
  formatUserAccessDateTime,
  PortalExtractedData,
  RegisteredSchool,
  SchoolPortalUser,
} from '../utils/authRegistry';

interface AuditLogItem {
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

interface DatabaseStatusInfo {
  engine: string;
  databaseFile: string;
  fileSizeBytes: number;
  walMode: boolean;
  foreignKeysEnabled: boolean;
  schemaVersion: number;
  appliedMigrations: Array<{ version: number; name: string; appliedAt: string }>;
  counts: {
    schools: number;
    users: number;
    activeSessions: number;
    auditLogs: number;
    lgpdRequests: number;
    backupsCount: number;
  };
  backups: Array<{
    fileName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  securityAlgorithms: {
    passwordHashing: string;
    integrationSecretsEncryption: string;
    sessionTokenDigest: string;
  };
}

interface LgpdRequestItem {
  id: number;
  protocol: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
}

interface AdminPanelViewProps {
  schools: RegisteredSchool[];
  onSchoolsChange: (schools: RegisteredSchool[]) => void;
  onAccessSchoolAsProfile: (session: AuthSession) => void;
  sessionToken?: string;
}

type AdminSectionTab =
  | 'escolas'
  | 'gestao_escola'
  | 'seguranca_auditoria'
  | 'banco_lgpd';

type UserSortField =
  | 'nomeCompleto'
  | 'cargo'
  | 'login'
  | 'active'
  | 'ultimoAcesso'
  | 'lastTestedAt';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  schools,
  onSchoolsChange,
  onAccessSchoolAsProfile,
  sessionToken,
}) => {
  const [activeTab, setActiveTab] = useState<AdminSectionTab>('escolas');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    () => schools[0]?.id || ''
  );

  // Cadastro e Edição de Unidade Escolar
  const [newSchoolName, setNewSchoolName] = useState<string>('');
  const [editingSchool, setEditingSchool] = useState<RegisteredSchool | null>(
    null
  );
  const [editSchoolName, setEditSchoolName] = useState<string>('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');

  // Credenciais do NPS da Escola Selecionada
  const [npsEmail, setNpsEmail] = useState<string>('');
  const [npsPassword, setNpsPassword] = useState<string>('');
  const [showNpsPassword, setShowNpsPassword] = useState<boolean>(false);
  const [isTestingNps, setIsTestingNps] = useState<boolean>(false);

  // Cadastro e Sincronização de Usuários pelo Portal do Aluno
  const [portalLogin, setPortalLogin] = useState<string>('');
  const [portalSenha, setPortalSenha] = useState<string>('');
  const [showPortalSenha, setShowPortalSenha] = useState<boolean>(false);
  const [isSyncingPortalUser, setIsSyncingPortalUser] =
    useState<boolean>(false);
  const [retestingUserId, setRetestingUserId] = useState<string | null>(null);
  const [syncedUserData, setSyncedUserData] =
    useState<PortalExtractedData | null>(null);

  // Pesquisa, Classificação e Filtros da Tabela de Usuários
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [userSortField, setUserSortField] =
    useState<UserSortField>('nomeCompleto');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');

  // Auditoria, Banco de Dados SQLite e LGPD
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditFilterStatus, setAuditFilterStatus] = useState<
    'ALL' | 'SUCCESS' | 'DENIED' | 'ERROR'
  >('ALL');
  const [dbStatus, setDbStatus] = useState<DatabaseStatusInfo | null>(null);
  const [lgpdRequests, setLgpdRequests] = useState<LgpdRequestItem[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);

  // Modais
  const [passwordModalUser, setPasswordModalUser] =
    useState<SchoolPortalUser | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  const [confirmationModal, setConfirmationModal] = useState<{
    title: string;
    description: string;
    impactList: string[];
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const buildAdminHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    return headers;
  }, [sessionToken]);

  const fetchGovernanceTelemetry = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const headers = buildAdminHeaders();
      const [logsRes, dbRes, lgpdRes] = await Promise.all([
        fetch('/api/admin/audit-logs?limit=120', {
          headers,
          credentials: 'include',
        }),
        fetch('/api/admin/db-status', {
          headers,
          credentials: 'include',
        }),
        fetch('/api/admin/privacy-requests', {
          headers,
          credentials: 'include',
        }),
      ]);

      if (logsRes.ok) {
        const d = await logsRes.json();
        if (Array.isArray(d.logs)) setAuditLogs(d.logs);
      }
      if (dbRes.ok) {
        const d = await dbRes.json();
        if (d.status) setDbStatus(d.status);
      }
      if (lgpdRes.ok) {
        const d = await lgpdRes.json();
        if (Array.isArray(d.requests)) setLgpdRequests(d.requests);
      }
    } catch {
      // Silencioso caso ainda inicializando sessão
    }
  }, [buildAdminHeaders, sessionToken]);

  useEffect(() => {
    fetchGovernanceTelemetry();
  }, [fetchGovernanceTelemetry, activeTab, schools.length]);

  const selectedSchool =
    schools.find((s) => s.id === selectedSchoolId) || schools[0];

  useEffect(() => {
    if (selectedSchool) {
      setSelectedSchoolId(selectedSchool.id);
      setNpsEmail(selectedSchool.npsCredential?.email || '');
      // Não pré-preencher com máscara (Pr••••••••26) para evitar envio acidental de texto mascarado
      setNpsPassword('');
      setSyncedUserData(null);
    }
  }, [selectedSchool?.id]);

  // Indicadores Executivos do Painel ADM
  const totalSchoolsCount = schools.length;
  const activeSchoolsCount = schools.filter(
    (s) => s.active !== false && s.ativa !== false
  ).length;
  const totalUsersCount = useMemo(
    () => schools.reduce((acc, s) => acc + (s.users?.length || 0), 0),
    [schools]
  );
  const activeUsersCount = useMemo(
    () =>
      schools.reduce(
        (acc, s) =>
          acc +
          (s.users?.filter((u) => u.active !== false && u.ativo !== false)
            .length || 0),
        0
      ),
    [schools]
  );

  const filteredSchools = useMemo(() => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        (s.codigoPortal || '').toLowerCase().includes(q) ||
        (s.npsCredential?.email || '').toLowerCase().includes(q)
    );
  }, [schools, schoolSearchQuery]);

  const handleAccessSchoolManagement = (school: RegisteredSchool) => {
    setSelectedSchoolId(school.id);
    setActiveTab('gestao_escola');
    setFeedbackBanner(null);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSchoolName.trim().toUpperCase();
    if (!cleanName) {
      setFeedbackBanner({
        type: 'error',
        title: 'Nome obrigatório',
        message: 'Informe o nome da unidade escolar para cadastrar.',
      });
      return;
    }

    try {
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: buildAdminHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nome: cleanName }),
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
        if (data.school?.id) setSelectedSchoolId(data.school.id);
        setNewSchoolName('');
        setFeedbackBanner({
          type: 'success',
          title: 'Unidade escolar cadastrada',
          message: `A unidade "${cleanName}" foi registrada com sucesso.`,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          title: 'Não foi possível cadastrar',
          message: data?.error || 'Erro ao salvar unidade no banco.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro de comunicação',
        message: 'Não foi possível cadastrar a escola no momento.',
      });
    }
  };

  const handleSaveEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    const cleanName = editSchoolName.trim().toUpperCase();
    if (!cleanName) return;

    try {
      const res = await fetch(`/api/admin/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: buildAdminHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nome: cleanName }),
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
        setEditingSchool(null);
        setFeedbackBanner({
          type: 'success',
          title: 'Nome atualizado',
          message: `O nome da unidade foi alterado para "${cleanName}".`,
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro ao atualizar',
        message: 'Não foi possível atualizar o nome da escola.',
      });
    }
  };

  const handleToggleSchoolActive = (school: RegisteredSchool) => {
    const isCurrentlyActive = school.active !== false && school.ativa !== false;
    const nextState = !isCurrentlyActive;
    setConfirmationModal({
      title: nextState
        ? `Ativar Unidade: ${school.nome}`
        : `Desativar Unidade: ${school.nome}`,
      description: nextState
        ? 'Ao reativar esta unidade, todos os usuários ativos vinculados a ela voltarão a ter acesso imediato à plataforma.'
        : 'Ao desativar esta unidade, o login de todos os colaboradores vinculados a ela será temporariamente bloqueado.',
      impactList: nextState
        ? [
            'Liberação imediata do login dos colaboradores ativos da unidade.',
            'Retomada da sincronização automática com o Portal do Aluno e NPS.',
          ]
        : [
            'Bloqueio imediato de novos logins de colaboradores desta unidade.',
            'Preservação integral dos dados e histórico no banco de dados.',
          ],
      confirmLabel: nextState ? 'Confirmar Ativação' : 'Confirmar Desativação',
      isDestructive: !nextState,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/schools/${school.id}`, {
          method: 'PUT',
          headers: buildAdminHeaders(),
          credentials: 'include',
          body: JSON.stringify({ active: nextState, ativa: nextState }),
        });
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.schools)) {
          onSchoolsChange(data.schools);
        }
        setConfirmationModal(null);
      },
    });
  };

  const handleDeleteSchool = (school: RegisteredSchool) => {
    setConfirmationModal({
      title: `Excluir Unidade: ${school.nome}`,
      description:
        'Esta operação removerá a unidade escolar e todas as credenciais de usuários vinculadas a ela.',
      impactList: [
        `Remoção de ${school.users?.length || 0} usuário(s) vinculado(s) à unidade.`,
        'Registro permanente da exclusão na trilha de auditoria de segurança.',
      ],
      confirmLabel: 'Excluir Unidade Permanentemente',
      isDestructive: true,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/schools/${school.id}`, {
          method: 'DELETE',
          headers: buildAdminHeaders(),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.schools)) {
          onSchoolsChange(data.schools);
          if (selectedSchoolId === school.id) {
            setSelectedSchoolId(data.schools[0]?.id || '');
          }
        }
        setConfirmationModal(null);
      },
    });
  };

  const handleSaveAndTestNps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    if (!npsEmail.trim()) {
      setFeedbackBanner({
        type: 'error',
        title: 'E-mail obrigatório',
        message: 'Informe o e-mail da conta Indecx NPS da unidade.',
      });
      return;
    }

    setIsTestingNps(true);
    setFeedbackBanner(null);

    try {
      const res = await fetch('/api/admin/test-credentials', {
        method: 'POST',
        headers: buildAdminHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'NPS',
          schoolId: selectedSchool.id,
          npsEmail: npsEmail.trim(),
          npsPassword: npsPassword.trim(),
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
      }
      if (data.npsTest?.ok) {
        setNpsPassword('');
        setFeedbackBanner({
          type: 'success',
          title: 'Credencial NPS Validada e Salva',
          message: data.npsTest.message,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          title: 'Falha na validação Indecx NPS',
          message:
            data.npsTest?.message ||
            'Não foi possível validar a credencial NPS. Verifique o e-mail e a senha.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro de comunicação',
        message: 'Falha ao testar credencial do NPS.',
      });
    } finally {
      setIsTestingNps(false);
    }
  };

  const handleSyncPortalUserBeforeSave = async () => {
    if (!selectedSchool) return;
    const cleanLogin = portalLogin.trim();
    const cleanSenha = portalSenha.trim();
    if (!cleanLogin || !cleanSenha) {
      setFeedbackBanner({
        type: 'error',
        title: 'Campos obrigatórios',
        message:
          'Informe o login e a senha da escola (Portal do Aluno) para sincronizar e salvar.',
      });
      return;
    }

    setIsSyncingPortalUser(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch('/api/admin/sync-portal-user', {
        method: 'POST',
        headers: buildAdminHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          login: cleanLogin,
          senha: cleanSenha,
          autoSave: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        if (Array.isArray(data.schools)) {
          onSchoolsChange(data.schools);
        }
        if (data.saved) {
          setPortalLogin('');
          setPortalSenha('');
          setSyncedUserData(null);
          setFeedbackBanner({
            type: 'success',
            title: 'Credencial da Escola Sincronizada e Salva',
            message: `Colaborador "${data.data.nomeCompleto}" (${data.data.cargo}) validado no Portal MoveEdu e liberado para acesso imediato com o login "${cleanLogin}".`,
          });
        } else {
          setSyncedUserData(data.data);
          setFeedbackBanner({
            type: 'info',
            title: 'Dados extraídos do Portal MoveEdu',
            message: `Colaborador identificado: ${data.data.nomeCompleto} (${data.data.cargo}). Confirme abaixo para concluir o cadastro.`,
          });
        }
      } else {
        setSyncedUserData({
          login: cleanLogin,
          nomeCompleto: `Colaborador (${cleanLogin})`,
          cargo: 'Equipe Pedagógica',
          escolaNome: selectedSchool.nome,
          codigoEscola: selectedSchool.codigoPortal || '1875',
        });
        setFeedbackBanner({
          type: 'info',
          title: 'Cadastro Manual Assistido',
          message:
            data?.error ||
            'Verifique o nome e cargo abaixo e clique em Confirmar para salvar a credencial.',
        });
      }
    } catch {
      setSyncedUserData({
        login: cleanLogin,
        nomeCompleto: `Colaborador (${cleanLogin})`,
        cargo: 'Equipe Pedagógica',
        escolaNome: selectedSchool.nome,
        codigoEscola: selectedSchool.codigoPortal || '1875',
      });
    } finally {
      setIsSyncingPortalUser(false);
    }
  };

  const handleConfirmSaveUser = async () => {
    if (!selectedSchool || !syncedUserData) return;
    try {
      const res = await fetch(
        `/api/admin/schools/${selectedSchool.id}/users`,
        {
          method: 'POST',
          headers: buildAdminHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            login: portalLogin.trim(),
            senha: portalSenha.trim(),
            nomeCompleto: syncedUserData.nomeCompleto.trim(),
            cargo: syncedUserData.cargo.trim(),
            escolaNome: syncedUserData.escolaNome || selectedSchool.nome,
            codigoEscola:
              syncedUserData.codigoEscola || selectedSchool.codigoPortal,
            active: true,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
        setPortalLogin('');
        setPortalSenha('');
        setSyncedUserData(null);
        setFeedbackBanner({
          type: 'success',
          title: 'Credencial da Escola Salva',
          message: `O colaborador "${syncedUserData.nomeCompleto}" foi salvo e já pode acessar o sistema.`,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          title: 'Erro ao salvar credencial',
          message: data?.error || 'Verifique os dados informados.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Falha ao salvar',
        message: 'Não foi possível salvar o usuário no banco de dados.',
      });
    }
  };

  const handleRetestExistingUser = async (user: SchoolPortalUser) => {
    if (!selectedSchool) return;
    setRetestingUserId(user.id);
    setFeedbackBanner(null);
    try {
      const res = await fetch('/api/admin/test-credentials', {
        method: 'POST',
        headers: buildAdminHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: 'PORTAL_USER',
          schoolId: selectedSchool.id,
          userId: user.id,
          portalLogin: user.login,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
      }
      if (data.portalTest?.ok) {
        setFeedbackBanner({
          type: 'success',
          title: 'Credencial Validada no Portal MoveEdu',
          message: `${user.nomeCompleto} (#${user.login}): ${data.portalTest.message}`,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          title: 'Atenção na validação da credencial',
          message:
            data.portalTest?.message ||
            'Não foi possível validar a senha armazenada no Portal MoveEdu.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro de comunicação',
        message: 'Não foi possível testar a credencial no momento.',
      });
    } finally {
      setRetestingUserId(null);
    }
  };

  const handleSaveNewUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !passwordModalUser) return;
    if (newPassword.trim().length < 4) {
      setFeedbackBanner({
        type: 'error',
        title: 'Senha muito curta',
        message: 'A nova senha deve conter pelo menos 4 caracteres.',
      });
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setFeedbackBanner({
        type: 'error',
        title: 'Senhas divergentes',
        message: 'A confirmação de senha não coincide com a nova senha.',
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/schools/${selectedSchool.id}/users/${passwordModalUser.id}/password`,
        {
          method: 'PUT',
          headers: buildAdminHeaders(),
          credentials: 'include',
          body: JSON.stringify({ novaSenha: newPassword.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.schools)) {
        onSchoolsChange(data.schools);
        setPasswordModalUser(null);
        setNewPassword('');
        setConfirmPassword('');
        setFeedbackBanner({
          type: 'success',
          title: 'Senha da credencial atualizada',
          message: `A senha do colaborador "${passwordModalUser.nomeCompleto}" (#${passwordModalUser.login}) foi atualizada e desbloqueada.`,
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro ao alterar senha',
        message: 'Não foi possível atualizar a senha do usuário.',
      });
    }
  };

  const handleToggleUserStatus = async (user: SchoolPortalUser) => {
    if (!selectedSchool) return;
    const res = await fetch(
      `/api/admin/schools/${selectedSchool.id}/users/${user.id}/status`,
      {
        method: 'PUT',
        headers: buildAdminHeaders(),
        credentials: 'include',
      }
    );
    const data = await res.json();
    if (res.ok && data.ok && Array.isArray(data.schools)) {
      onSchoolsChange(data.schools);
    }
  };

  const handleDeleteUser = (user: SchoolPortalUser) => {
    if (!selectedSchool) return;
    setConfirmationModal({
      title: `Remover Usuário: ${user.nomeCompleto}`,
      description: `Tem certeza de que deseja revogar e excluir permanentemente a credencial "${user.login}" da unidade ${selectedSchool.nome}?`,
      impactList: [
        'Revogação imediata do acesso do colaborador à plataforma.',
        'Registro da operação na trilha de auditoria do sistema.',
      ],
      confirmLabel: 'Confirmar Exclusão',
      isDestructive: true,
      onConfirm: async () => {
        const res = await fetch(
          `/api/admin/schools/${selectedSchool.id}/users/${user.id}`,
          {
            method: 'DELETE',
            headers: buildAdminHeaders(),
            credentials: 'include',
          }
        );
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.schools)) {
          onSchoolsChange(data.schools);
        }
        setConfirmationModal(null);
      },
    });
  };

  const handleTriggerManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/db-backup', {
        method: 'POST',
        headers: buildAdminHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.status) setDbStatus(data.status);
        setFeedbackBanner({
          type: 'success',
          title: 'Backup Gerado com Sucesso',
          message: `Snapshot salvo em .data/backups/${data.backup?.backupFile} (${data.backup?.sizeBytes} bytes).`,
        });
        fetchGovernanceTelemetry();
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        title: 'Falha no Backup',
        message: 'Não foi possível criar o snapshot do banco no momento.',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    const list = selectedSchool?.users || [];
    const q = userSearchQuery.trim().toLowerCase();

    const filtered = list.filter((u) => {
      const isUserActive = u.active !== false && u.ativo !== false;
      if (userStatusFilter === 'ACTIVE' && !isUserActive) return false;
      if (userStatusFilter === 'INACTIVE' && isUserActive) return false;
      if (!q) return true;
      return (
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.login.toLowerCase().includes(q) ||
        u.cargo.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const dir = userSortOrder === 'asc' ? 1 : -1;
      if (userSortField === 'active') {
        const aAct = a.active !== false && a.ativo !== false ? 1 : 0;
        const bAct = b.active !== false && b.ativo !== false ? 1 : 0;
        return (aAct - bAct) * dir;
      }
      const valA = String(a[userSortField] || '').toLowerCase();
      const valB = String(b[userSortField] || '').toLowerCase();
      return valA.localeCompare(valB, 'pt-BR') * dir;
    });
  }, [
    selectedSchool?.users,
    userSearchQuery,
    userStatusFilter,
    userSortField,
    userSortOrder,
  ]);

  const filteredAuditLogs = useMemo(() => {
    if (auditFilterStatus === 'ALL') return auditLogs;
    return auditLogs.filter((l) => l.status === auditFilterStatus);
  }, [auditLogs, auditFilterStatus]);

  const toggleSort = (field: UserSortField) => {
    if (userSortField === field) {
      setUserSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  const hasConfiguredNps = Boolean(selectedSchool?.npsCredential?.email);

  return (
    <div
      data-testid="admin-panel-view"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100 px-3 py-2.5 sm:px-5 dark:bg-slate-950"
    >
      <div className="mx-auto w-full max-w-7xl space-y-2.5">
        {/* FAIXA SUPERIOR DE INDICADORES EXECUTIVOS PADRONIZADOS EM 2 LINHAS (2x2 COMPACTO) */}
        <section
          aria-label="Indicadores executivos do painel administrativo"
          data-testid="admin-summary-cards-grid"
          className="grid grid-cols-2 gap-1.5"
        >
          <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[#004A8D] dark:text-sky-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Unidades Escolares
              </span>
            </div>
            <span className="text-xs font-black tabular-nums text-slate-900 dark:text-white">
              {activeSchoolsCount}{' '}
              <span className="font-medium text-slate-500">
                / {totalSchoolsCount} ativas
              </span>
            </span>
          </div>

          <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Credenciais Escolares
              </span>
            </div>
            <span className="text-xs font-black tabular-nums text-emerald-700 dark:text-emerald-400">
              {activeUsersCount}{' '}
              <span className="font-medium text-slate-500">
                / {totalUsersCount} ativas
              </span>
            </span>
          </div>

          <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#004A8D] dark:text-sky-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Banco de Dados
              </span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              SQLite ·{' '}
              <span className="font-medium text-slate-500">
                {dbStatus?.counts.backupsCount ?? 1} backup(s)
              </span>
            </span>
          </div>

          <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Segurança & LGPD
              </span>
            </div>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
              Ativa ·{' '}
              <span className="font-medium text-slate-500">
                {dbStatus?.counts.auditLogs ?? auditLogs.length} eventos
              </span>
            </span>
          </div>
        </section>

        {/* BARRA DE NAVEGAÇÃO COMPACTA ENTRE OS 4 MÓDULOS DO PAINEL ADMINISTRATIVO */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              data-testid="admin-tab-escolas"
              onClick={() => setActiveTab('escolas')}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                activeTab === 'escolas'
                  ? 'bg-[#004A8D] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Unidades ({schools.length})</span>
            </button>

            <button
              type="button"
              data-testid="admin-tab-gestao-escola"
              onClick={() => setActiveTab('gestao_escola')}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                activeTab === 'gestao_escola'
                  ? 'bg-[#004A8D] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>
                Credenciais e NPS ({selectedSchool?.nome || 'Selecionar'})
              </span>
            </button>

            <button
              type="button"
              data-testid="admin-tab-seguranca"
              onClick={() => setActiveTab('seguranca_auditoria')}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                activeTab === 'seguranca_auditoria'
                  ? 'bg-[#004A8D] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Segurança e Auditoria</span>
            </button>

            <button
              type="button"
              data-testid="admin-tab-banco-lgpd"
              onClick={() => setActiveTab('banco_lgpd')}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                activeTab === 'banco_lgpd'
                  ? 'bg-[#004A8D] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Banco de Dados e LGPD</span>
            </button>
          </div>

          {selectedSchool && (
            <button
              type="button"
              data-testid="admin-enter-selected-school-btn"
              onClick={() => {
                const firstUser = selectedSchool.users?.[0];
                onAccessSchoolAsProfile({
                  role: 'ESCOLA',
                  login: firstUser?.login || 'coord.unidade',
                  nomeCompleto:
                    firstUser?.nomeCompleto || 'Administrador em Visão Escolar',
                  cargo: firstUser?.cargo || 'Administrador Geral',
                  schoolId: selectedSchool.id,
                  schoolName: selectedSchool.nome,
                  codigoPortal: selectedSchool.codigoPortal,
                  sessionToken,
                });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Acessar Painel de {selectedSchool.nome}</span>
            </button>
          )}
        </div>

        {/* BANNER DE FEEDBACK */}
        {feedbackBanner && (
          <div
            data-testid="admin-feedback-banner"
            className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-xs ${
              feedbackBanner.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                : feedbackBanner.type === 'error'
                  ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                  : 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : feedbackBanner.type === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              )}
              <div>
                <p className="font-bold">{feedbackBanner.title}</p>
                <p className="mt-0.5 leading-relaxed">
                  {feedbackBanner.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="rounded p-1 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =====================================================================
            ABA 1: UNIDADES ESCOLARES CADASTRADAS
           ===================================================================== */}
        {activeTab === 'escolas' && (
          <div className="space-y-4">
            {/* Card de Cadastro Rápido de Unidade */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Cadastrar Nova Unidade Escolar
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Adicione uma nova unidade para configurar suas credenciais do Portal do Aluno e do Indecx NPS.
              </p>

              <form
                onSubmit={handleCreateSchool}
                className="mt-3.5 flex flex-col gap-2.5 sm:flex-row"
              >
                <input
                  type="text"
                  data-testid="new-school-name-input"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Ex.: ESCOLA MARÍLIA ou ESCOLA BAURU"
                  className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  data-testid="create-school-submit-btn"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#004A8D] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#003B70]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Escola</span>
                </button>
              </form>
            </div>

            {/* Tabela de Unidades Escolares */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Unidades Escolares ({filteredSchools.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Selecione uma unidade para gerenciar seus usuários da escola e credenciais NPS.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={schoolSearchQuery}
                    onChange={(e) => setSchoolSearchQuery(e.target.value)}
                    placeholder="Buscar unidade ou e-mail NPS..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table
                  data-testid="schools-registry-table"
                  className="w-full border-collapse text-left text-xs"
                >
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                      <th className="px-3.5 py-2.5">Unidade Escolar</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Credencial NPS (Indecx)</th>
                      <th className="px-3.5 py-2.5">Credenciais da Escola</th>
                      <th className="px-3.5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {filteredSchools.map((school) => {
                      const isSchoolActive =
                        school.active !== false && school.ativa !== false;
                      const hasNps = Boolean(school.npsCredential?.email);
                      return (
                        <tr
                          key={school.id}
                          data-testid={`school-row-${school.id}`}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004A8D]/10 text-[#004A8D] dark:bg-sky-950 dark:text-sky-400">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {school.nome}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Código Portal: #{school.codigoPortal || '1875'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3.5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                isSchoolActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isSchoolActive
                                    ? 'bg-emerald-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              {isSchoolActive ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>

                          <td className="px-3.5 py-3">
                            {hasNps ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>{school.npsCredential.email}</span>
                                </span>
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                  Conectado e criptografado
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                Não configurado
                              </span>
                            )}
                          </td>

                          <td className="px-3.5 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              <Users className="h-3.5 w-3.5 text-[#004A8D] dark:text-sky-400" />
                              <span>
                                {(school.users || []).length} colaborador(es)
                              </span>
                            </span>
                          </td>

                          <td className="px-3.5 py-3 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                data-testid={`manage-school-btn-${school.id}`}
                                onClick={() =>
                                  handleAccessSchoolManagement(school)
                                }
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#004A8D] px-3 text-xs font-bold text-white transition-colors hover:bg-[#003B70]"
                              >
                                <span>Credenciais</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSchool(school);
                                  setEditSchoolName(school.nome);
                                }}
                                title="Renomear unidade"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleSchoolActive(school)}
                                title={
                                  isSchoolActive
                                    ? 'Desativar unidade'
                                    : 'Ativar unidade'
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSchool(school)}
                                title="Excluir unidade"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 2: GESTÃO DA UNIDADE SELECIONADA (NPS + CREDENCIAIS DA ESCOLA)
           ===================================================================== */}
        {activeTab === 'gestao_escola' && selectedSchool && (
          <div className="space-y-4">
            {/* Seletor Rápido de Unidade */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004A8D] text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Unidade Selecionada
                  </p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedSchool.nome}{' '}
                    <span className="text-xs font-medium text-slate-500">
                      (Portal #{selectedSchool.codigoPortal || '1875'})
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="admin-school-selector"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Alternar Unidade:
                </label>
                <select
                  id="admin-school-selector"
                  value={selectedSchool.id}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Coluna Esquerda (5 cols): Credencial da Escola (Portal MoveEdu) + Credencial NPS Indecx */}
              <div className="space-y-4 lg:col-span-5">
                {/* 1. Credencial da Escola (Portal do Aluno MoveEdu) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Credencial da Escola (Portal do Aluno)
                      </h3>
                    </div>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-[#004A8D] dark:bg-sky-950/60 dark:text-sky-300">
                      MoveEdu
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Informe o login e a senha do colaborador no Portal do Aluno para validar e liberar o acesso à unidade.
                  </p>

                  <div className="mt-3.5 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Login da Escola (Portal do Aluno)
                      </label>
                      <input
                        type="text"
                        data-testid="portal-user-login-input"
                        value={portalLogin}
                        onChange={(e) => setPortalLogin(e.target.value)}
                        placeholder="Ex.: a116882"
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Senha da Escola (Portal do Aluno)
                      </label>
                      <div className="relative">
                        <input
                          type={showPortalSenha ? 'text' : 'password'}
                          data-testid="portal-user-password-input"
                          value={portalSenha}
                          onChange={(e) => setPortalSenha(e.target.value)}
                          placeholder="Digite a senha do colaborador"
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-9 pl-3 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPortalSenha((p) => !p)}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPortalSenha ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="sync-portal-user-btn"
                      onClick={handleSyncPortalUserBeforeSave}
                      disabled={isSyncingPortalUser}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#004A8D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#003B70] disabled:opacity-60"
                    >
                      {isSyncingPortalUser ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Validando no Portal MoveEdu...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Sincronizar e Salvar Credencial</span>
                        </>
                      )}
                    </button>

                    {syncedUserData && (
                      <div className="mt-3 space-y-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/40">
                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Confirmar Dados do Colaborador
                        </p>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            value={syncedUserData.nomeCompleto}
                            onChange={(e) =>
                              setSyncedUserData({
                                ...syncedUserData,
                                nomeCompleto: e.target.value,
                              })
                            }
                            className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Cargo / Função
                          </label>
                          <input
                            type="text"
                            value={syncedUserData.cargo}
                            onChange={(e) =>
                              setSyncedUserData({
                                ...syncedUserData,
                                cargo: e.target.value,
                              })
                            }
                            className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <button
                          type="button"
                          data-testid="confirm-save-portal-user-btn"
                          onClick={handleConfirmSaveUser}
                          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Confirmar e Salvar Credencial</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Credencial NPS Indecx */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Credencial do NPS (Indecx)
                      </h3>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        hasConfiguredNps
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {hasConfiguredNps ? 'Conectado' : 'Pendente'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Credencial institucional para sincronização automática das pesquisas de satisfação NPS da unidade.
                  </p>

                  <form onSubmit={handleSaveAndTestNps} className="mt-3.5 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        E-mail da Conta Indecx NPS
                      </label>
                      <input
                        type="email"
                        data-testid="nps-email-input"
                        value={npsEmail}
                        onChange={(e) => setNpsEmail(e.target.value)}
                        placeholder="unidade@microlins.com.br"
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Senha do NPS Indecx
                        </label>
                        {hasConfiguredNps && !npsPassword && (
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Senha já salva no cofre
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showNpsPassword ? 'text' : 'password'}
                          data-testid="nps-password-input"
                          value={npsPassword}
                          onChange={(e) => setNpsPassword(e.target.value)}
                          placeholder={
                            hasConfiguredNps
                              ? 'Deixe em branco para manter a senha atual ou digite nova'
                              : 'Digite a senha do Indecx'
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-9 pl-3 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNpsPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showNpsPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-testid="save-nps-credentials-btn"
                      disabled={isTestingNps}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#004A8D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#003B70] disabled:opacity-60"
                    >
                      {isTestingNps ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Validando conexão no Indecx...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Testar e Salvar Credencial NPS</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Coluna Direita (7 cols): Lista de Credenciais da Escola */}
              <div className="lg:col-span-7">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Credenciais da Escola Autorizadas (
                        {filteredAndSortedUsers.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Colaboradores vinculados à unidade com acesso liberado ao sistema.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="search"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Filtrar por nome ou login..."
                          className="h-8 rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-2.5 text-xs font-medium text-slate-900 focus:border-[#004A8D] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <select
                        value={userStatusFilter}
                        onChange={(e) =>
                          setUserStatusFilter(
                            e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'
                          )
                        }
                        className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="ALL">Status: Todos</option>
                        <option value="ACTIVE">Apenas Ativos</option>
                        <option value="INACTIVE">Apenas Inativos</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table
                      data-testid="school-users-table"
                      className="w-full border-collapse text-left text-xs"
                    >
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                          <th className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => toggleSort('nomeCompleto')}
                              className="inline-flex items-center gap-1 font-bold hover:text-slate-900 dark:hover:text-white"
                            >
                              <span>Colaborador</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                          <th className="px-3 py-2.5">Login da Escola</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {filteredAndSortedUsers.map((user) => {
                          const isUserActive =
                            user.active !== false && user.ativo !== false;
                          const isRetesting = retestingUserId === user.id;
                          return (
                            <tr
                              key={user.id}
                              data-testid={`user-row-${user.login}`}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-3 py-3">
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {user.nomeCompleto}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {user.cargo} · Último acesso:{' '}
                                  {formatUserAccessDateTime(user.ultimoAcesso)}
                                </p>
                              </td>

                              <td className="px-3 py-3">
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-[#004A8D] dark:bg-slate-800 dark:text-sky-400">
                                  {user.login}
                                </span>
                                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                                  Credencial sincronizada
                                </p>
                              </td>

                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    isUserActive
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      isUserActive
                                        ? 'bg-emerald-500'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  {isUserActive ? 'Ativo' : 'Suspenso'}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    data-testid={`retest-user-btn-${user.login}`}
                                    onClick={() => handleRetestExistingUser(user)}
                                    disabled={isRetesting}
                                    title="Validar credencial no Portal do Aluno"
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <RefreshCw
                                      className={`h-3 w-3 text-[#004A8D] dark:text-sky-400 ${
                                        isRetesting ? 'animate-spin' : ''
                                      }`}
                                    />
                                    <span>Validar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPasswordModalUser(user);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                    }}
                                    title="Atualizar senha da credencial"
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <KeyRound className="h-3 w-3" />
                                    <span>Senha</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(user)}
                                    title={
                                      isUserActive
                                        ? 'Suspender acesso'
                                        : 'Reativar acesso'
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(user)}
                                    title="Excluir credencial"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 3: SEGURANÇA DA INFORMAÇÃO E TRILHA DE AUDITORIA (AUDIT LOGS)
           ===================================================================== */}
        {activeTab === 'seguranca_auditoria' && (
          <div
            data-testid="admin-security-audit-section"
            className="space-y-4"
          >
            {/* Resumo de Controles de Segurança Ativos */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <KeyRound className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase">
                    Proteção de Senhas
                  </h3>
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {dbStatus?.securityAlgorithms.passwordHashing ||
                    'Argon2id (v=19, m=4096 KiB, t=3, p=1)'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Verificação criptográfica em tempo constante contra ataques de força bruta.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-[#004A8D] dark:text-sky-400">
                  <Lock className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase">
                    Cofre de Integrações
                  </h3>
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {dbStatus?.securityAlgorithms.integrationSecretsEncryption ||
                    'AES-256-GCM (96-bit IV + 128-bit AuthTag)'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Credenciais do Portal MoveEdu e Indecx NPS protegidas em repouso no servidor.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-[#004A8D] dark:text-sky-400">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase">
                    Controle de Sessão e Acesso
                  </h3>
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  RBAC Estrito · Cookies HttpOnly · Rate Limit
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Gestão centralizada de senhas exclusiva pelo Administrador no Painel ADM.
                </p>
              </div>
            </div>

            {/* Tabela da Trilha de Auditoria */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Trilha de Auditoria do Sistema ({filteredAuditLogs.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Histórico de autenticações, sincronizações cadastrais e eventos administrativos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={auditFilterStatus}
                    onChange={(e) =>
                      setAuditFilterStatus(
                        e.target.value as 'ALL' | 'SUCCESS' | 'DENIED' | 'ERROR'
                      )
                    }
                    className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">Todos os Eventos</option>
                    <option value="SUCCESS">Sucesso (SUCCESS)</option>
                    <option value="DENIED">Negados (DENIED)</option>
                    <option value="ERROR">Falhas (ERROR)</option>
                  </select>

                  <button
                    type="button"
                    onClick={fetchGovernanceTelemetry}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table
                  data-testid="audit-logs-table"
                  className="w-full border-collapse text-left text-xs"
                >
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                      <th className="px-3 py-2.5">Data / Hora</th>
                      <th className="px-3 py-2.5">Usuário / Perfil</th>
                      <th className="px-3 py-2.5">Evento</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {filteredAuditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatUserAccessDateTime(log.timestamp)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {log.actorLogin}
                          </span>
                          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-[#004A8D] dark:text-sky-400">
                          {log.action}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 4: BANCO DE DADOS RELACIONAL SQLITE, BACKUPS E CHAMADOS LGPD
           ===================================================================== */}
        {activeTab === 'banco_lgpd' && (
          <div
            data-testid="admin-database-lgpd-section"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Diagnóstico do Banco SQLite + Backups (6 cols) */}
              <div className="space-y-4 lg:col-span-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-[#004A8D] dark:text-sky-400" />
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Banco de Dados Relacional (SQLite)
                      </h2>
                    </div>
                    <button
                      type="button"
                      data-testid="trigger-manual-backup-btn"
                      onClick={handleTriggerManualBackup}
                      disabled={isCreatingBackup}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#004A8D] px-3 text-xs font-bold text-white transition-colors hover:bg-[#003B70] disabled:opacity-60"
                    >
                      <DownloadCloud className="h-3.5 w-3.5" />
                      <span>
                        {isCreatingBackup
                          ? 'Gerando Backup...'
                          : 'Gerar Backup Agora'}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Arquivo Principal
                      </span>
                      <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {dbStatus?.databaseFile ||
                          '.data/microlins_production.sqlite'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Integridade Relacional
                      </span>
                      <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        WAL Ativo · Foreign Keys ON
                      </p>
                    </div>
                  </div>

                  {/* Lista de Backups Preventivos */}
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Snapshots de Backup ({dbStatus?.backups.length || 0})
                    </h3>
                    <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                      {(dbStatus?.backups || []).map((bk) => (
                        <div
                          key={bk.fileName}
                          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {bk.fileName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {(bk.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Solicitações de Titulares LGPD (6 cols) */}
              <div className="space-y-4 lg:col-span-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Solicitações de Direitos LGPD ({lgpdRequests.length})
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Chamados registrados através da página de Privacidade e Proteção de Dados.
                  </p>

                  {lgpdRequests.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                      Nenhuma solicitação pendente no momento.
                    </div>
                  ) : (
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {lgpdRequests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#004A8D] dark:text-sky-400">
                              {req.protocol}
                            </span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {req.status}
                            </span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900 dark:text-white">
                            {req.requesterName} ({req.requesterEmail})
                          </p>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            {req.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DO NOME DA ESCOLA */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Renomear Unidade Escolar
            </h3>
            <form onSubmit={handleSaveEditSchool} className="mt-4 space-y-3">
              <input
                type="text"
                value={editSchoolName}
                onChange={(e) => setEditSchoolName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-[#004A8D] px-4 text-xs font-bold text-white hover:bg-[#003B70]"
                >
                  Salvar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ALTERAÇÃO DE SENHA DO USUÁRIO */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Atualizar Senha ({passwordModalUser.nomeCompleto})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Defina a senha de acesso para o login{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {passwordModalUser.login}
              </span>
              .
            </p>
            <form onSubmit={handleSaveNewUserPassword} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-9 pl-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-[#004A8D] px-4 text-xs font-bold text-white hover:bg-[#003B70]"
                >
                  Salvar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE IMPACTO */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {confirmationModal.title}
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {confirmationModal.description}
            </p>
            <ul className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              {confirmationModal.impactList.map((imp) => (
                <li key={imp} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmationModal.onConfirm()}
                className={`h-9 rounded-lg px-4 text-xs font-bold text-white ${
                  confirmationModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#004A8D] hover:bg-[#003B70]'
                }`}
              >
                {confirmationModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
