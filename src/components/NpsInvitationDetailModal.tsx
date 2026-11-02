import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  History,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { ActiveNpsInvitation } from '../data/microlinsData';
import {
  formatBrasiliaDateTime,
  SynchronizedNpsStudentCard,
} from '../utils/performanceAnalytics';

interface NpsInvitationDetailModalProps {
  studentCard: SynchronizedNpsStudentCard | null;
  currentYear: number;
  onClose: () => void;
}

export const NpsInvitationDetailModal: React.FC<NpsInvitationDetailModalProps> = ({
  studentCard,
  currentYear,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<'id' | 'url' | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  useEffect(() => {
    if (studentCard) {
      setSelectedSurveyId(studentCard.latestActiveInvitation.id);
    } else {
      setSelectedSurveyId(null);
    }
  }, [studentCard]);

  useEffect(() => {
    if (!studentCard) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studentCard, onClose]);

  if (!studentCard) return null;

  const chronologicalSurveys = [...studentCard.studentSurveyHistory].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  const activeInvitation: ActiveNpsInvitation =
    chronologicalSurveys.find((s) => s.id === selectedSurveyId) ||
    studentCard.latestActiveInvitation;

  const isLatestActive =
    activeInvitation.id === studentCard.latestActiveInvitation.id;
  const isPortal = activeInvitation.origem === 'Portal do Aluno';
  const isResponsavel = studentCard.npsDestinatario === 'RESPONSAVEL';
  const statusLower = (activeInvitation.invitationStatus || 'ativo').toLowerCase();
  const isAnswered = Boolean(
    activeInvitation.answered || statusLower === 'respondido'
  );
  const isExpired = statusLower === 'expirado';

  const statusLabel = isAnswered
    ? 'Respondida'
    : isExpired
    ? 'Expirada'
    : 'Ativa (Aguardando Resposta)';

  const nivelCruzamentoLabel =
    studentCard.nivelCruzamento === 'CONTRATO'
      ? 'Nível 1 — Contrato (Prioridade Ouro)'
      : studentCard.nivelCruzamento === 'NOME_ALUNO'
      ? 'Nível 2 — Nome do Aluno (Prioridade Prata)'
      : studentCard.nivelCruzamento === 'NOME_RESPONSAVEL'
      ? 'Nível 3 — Nome do Responsável (Prioridade Bronze)'
      : 'Nível 4 — Confirmação por E-mail Familiar';

  const handleCopy = async (text: string, type: 'id' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/55 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-invitation-detail-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Institucional em Azul Microlins */}
        <div className="flex shrink-0 items-start justify-between border-b border-[#003A70] bg-[#004A8D] px-5 py-4 text-white">
          <div className="min-w-0 flex-1 pr-3">
            <div className="typo-meta flex flex-wrap items-center gap-2 text-sky-100 tabular-nums">
              <span className="font-semibold text-white">
                Contrato #{studentCard.linkedContrato}
              </span>
              <span aria-hidden="true">·</span>
              <span>{studentCard.linkedDiaSemana}</span>
              <span aria-hidden="true">·</span>
              <span>{studentCard.linkedHorario}</span>
            </div>
            <h2
              id="nps-invitation-detail-title"
              className="typo-title-main mt-1 truncate text-white"
            >
              {studentCard.linkedStudentName}
            </h2>
            <p className="typo-meta mt-0.5 text-sky-100/90">
              Ciclo {currentYear} · Sala {studentCard.linkedSala}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do convite NPS"
            className="rounded-lg p-1.5 text-sky-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* 0. Hierarquia de Cruzamento em Cascata (4 Níveis) + Destinatário + Disparo Inteligente WhatsApp */}
          <div
            data-testid="nps-modal-hierarchy-banner"
            className={`space-y-2.5 rounded-xl border p-3.5 ${
              isResponsavel
                ? 'border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-950 dark:border-fuchsia-800/70 dark:bg-fuchsia-950/45 dark:text-fuchsia-100'
                : 'border-purple-200 bg-purple-50/70 text-purple-950 dark:border-purple-800/70 dark:bg-purple-950/45 dark:text-purple-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`typo-badge inline-flex items-center gap-1 rounded border px-2 py-0.5 font-bold ${
                  isResponsavel
                    ? 'border-fuchsia-300 bg-white text-fuchsia-900 dark:border-fuchsia-700 dark:bg-fuchsia-900/70 dark:text-fuchsia-200'
                    : 'border-purple-300 bg-white text-purple-900 dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-200'
                }`}
              >
                {isResponsavel ? (
                  <Users className="h-3 w-3 text-fuchsia-600 dark:text-fuchsia-400" />
                ) : (
                  <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                )}
                <span>
                  Convite NPS: {isResponsavel ? 'Responsável' : 'Aluno'} (
                  {activeInvitation.pontoJornada || 'Ciclo Regular'})
                </span>
              </span>

              <span className="typo-badge rounded border border-slate-200 bg-white/90 px-2 py-0.5 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {nivelCruzamentoLabel}
              </span>
            </div>

            <div className="typo-card-body flex items-start gap-2">
              <UserCheck
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  isResponsavel
                    ? 'text-fuchsia-600 dark:text-fuchsia-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}
              />
              <div>
                <p className="font-bold">{studentCard.respondenteVinculoLabel}</p>
                <p className="typo-meta mt-0.5 opacity-85">
                  {isResponsavel
                    ? `Disparo direcionado para o telefone do responsável (${
                        studentCard.linkedTelefoneResponsavel || activeInvitation.phone || 'cadastrado'
                      }) com saudação personalizada sobre o desenvolvimento do aluno.`
                    : `Disparo direcionado para o telefone do aluno (${
                        studentCard.linkedTelefoneAluno || activeInvitation.phone || 'cadastrado'
                      }) com mensagem direta ao estudante.`}
                </p>
              </div>
            </div>

            {studentCard.orientacaoAbordagemPresencial && (
              <div
                data-testid="nps-modal-orientacao-presencial"
                className="typo-meta rounded-lg border border-fuchsia-300/80 bg-white/90 px-3 py-2 font-medium text-fuchsia-950 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-100"
              >
                {studentCard.orientacaoAbordagemPresencial}
              </div>
            )}

            {studentCard.isVinculoFamiliarAmbiguo && (
              <div
                data-testid="nps-modal-sibling-alert"
                className="flex items-start gap-2 rounded-lg border border-amber-300/90 bg-amber-50/90 p-2.5 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-100"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="typo-meta">
                  <p className="font-bold">
                    Vínculo Familiar com Irmãos na Mesma Unidade (Cenário 2 — Desambiguação Ativa)
                  </p>
                  <p className="mt-0.5">
                    O responsável <strong>{studentCard.respondenteNome}</strong> possui{' '}
                    <strong>{(studentCard.alunosVinculadosFamilia ?? []).length} filhos elegíveis</strong>{' '}
                    no ciclo ({(studentCard.alunosVinculadosFamilia ?? []).join(' e ')} — Contratos #
                    {(studentCard.contratosVinculadosFamilia ?? []).join(' / #')}). Os convites foram
                    consolidados neste único card familiar para evitar mensagens duplicadas e
                    impedir que uma mesma resposta seja contabilizada em duplicidade.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <a
                href={studentCard.whatsappNpsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="nps-modal-smart-whatsapp-btn"
                className={`typo-btn inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border px-3 transition-colors ${
                  isResponsavel
                    ? 'border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                    : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>
                  {isResponsavel
                    ? `Disparo Inteligente WhatsApp para Responsável (${studentCard.respondenteNome})`
                    : `Disparo Inteligente WhatsApp para Aluno (${studentCard.linkedStudentName})`}
                </span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            </div>
          </div>

          {/* 1. Vínculo Sincronizado com o Painel Principal (Kanban de Alunos) */}
          <div className="space-y-2">
            <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Link2 className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
              Vínculo Sincronizado com o Kanban de Alunos
            </h3>
            <div className="typo-card-body grid grid-cols-2 gap-3 rounded-xl border border-sky-200/80 bg-sky-50/40 p-3.5 sm:grid-cols-3 dark:border-sky-800/60 dark:bg-sky-950/30">
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Horário no Kanban
                </span>
                <p className="mt-0.5 font-bold text-[#004A8D] tabular-nums dark:text-sky-400">
                  {studentCard.linkedHourKey} ({studentCard.linkedHorario})
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Sala / Modalidade
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {studentCard.linkedSala} · {studentCard.linkedModalidade}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Situação no Horário
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {studentCard.linkedAttendanceStatus}
                </p>
              </div>
              <div className="sm:col-span-3">
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Módulo Vinculado
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {studentCard.linkedCurso}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Histórico Cronológico de Pesquisas Vinculadas ao Aluno */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <History className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                Histórico Cronológico de Pesquisas do Aluno
              </h3>
              <span className="typo-meta font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                {chronologicalSurveys.length}{' '}
                {chronologicalSurveys.length === 1
                  ? 'pesquisa vinculada'
                  : 'pesquisas vinculadas'}
              </span>
            </div>

            <div
              data-testid="nps-chronological-history-list"
              className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
            >
              {chronologicalSurveys.map((item, index) => {
                const isSelected = item.id === activeInvitation.id;
                const isPrimaryCardSurvey =
                  item.id === studentCard.latestActiveInvitation.id;
                const itemStatus = (item.invitationStatus || 'ativo').toLowerCase();
                const itemAnswered = Boolean(
                  item.answered || itemStatus === 'respondido'
                );
                const itemExpired = itemStatus === 'expirado';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSurveyId(item.id)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-purple-50/70 dark:bg-purple-950/40'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="typo-card-body flex flex-wrap items-center gap-1.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        <span className="typo-badge font-bold text-slate-400">
                          {index + 1}º
                        </span>
                        <span className="font-mono text-purple-800 dark:text-purple-300">
                          #{item.controlId || item.id.slice(-6)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{item.origem}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{item.pontoJornada || 'Ciclo Regular'}</span>
                        {isPrimaryCardSurvey && (
                          <span className="typo-badge rounded border border-purple-300 bg-purple-100/80 px-1.5 py-0.5 text-purple-900 dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-200">
                            Exibida no Card Principal
                          </span>
                        )}
                      </div>
                      <div className="typo-meta mt-0.5 flex items-center gap-1.5 text-slate-500 tabular-nums dark:text-slate-400">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>Criada em {formatBrasiliaDateTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <span
                      className={`typo-badge inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 ${
                        itemAnswered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : itemExpired
                          ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                    >
                      {itemAnswered
                        ? 'Respondida'
                        : itemExpired
                        ? 'Expirada'
                        : 'Ativa'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Detalhes da Pesquisa Selecionada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <FileText className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                Detalhes da Pesquisa Selecionada (#
                {activeInvitation.controlId || activeInvitation.id.slice(-6)})
              </h3>
              {isLatestActive && (
                <span className="typo-badge inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  <Sparkles className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                  Mais recente não respondida
                </span>
              )}
            </div>

            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                isAnswered
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
                  : isExpired
                  ? 'border-slate-200 bg-slate-100/80 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  : 'border-purple-200 bg-purple-50/70 text-purple-950 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {isAnswered ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : isExpired ? (
                  <XCircle className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                )}
                <div>
                  <div className="typo-meta opacity-80">
                    Situação da Pesquisa
                  </div>
                  <div className="typo-subtitle font-bold">{statusLabel}</div>
                </div>
              </div>

              <div className="typo-subtitle flex items-center gap-1.5 font-semibold">
                {isPortal ? (
                  <Globe className="h-3.5 w-3.5 text-sky-700 dark:text-sky-400" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-indigo-700 dark:text-indigo-400" />
                )}
                <span>Canal: {activeInvitation.origem}</span>
              </div>
            </div>

            <div className="typo-card-body grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/50">
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Código de Controle (Indecx)
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    <Hash className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    {activeInvitation.controlId || 'Não informado'}
                  </span>
                  {activeInvitation.controlId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeInvitation.controlId, 'id')}
                      className="typo-btn inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {copiedField === 'id' ? (
                        <>
                          <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Copiado
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Ponto da Jornada / Ciclo
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {activeInvitation.pontoJornada || 'Ciclo Regular'}
                </p>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Data e Horário de Criação
                </span>
                <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>{formatBrasiliaDateTime(activeInvitation.createdAt)}</span>
                </p>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Data de Resposta
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {activeInvitation.answeredAt
                    ? formatBrasiliaDateTime(activeInvitation.answeredAt)
                    : isAnswered
                    ? 'Respondida no ciclo vigente'
                    : 'Aguardando resposta'}
                </p>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  E-mail Vinculado
                </span>
                <p className="mt-0.5 break-all font-semibold text-slate-900 dark:text-slate-100">
                  {activeInvitation.email || 'Não informado'}
                </p>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Telefone Registrado
                </span>
                <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{activeInvitation.phone || 'Não informado'}</span>
                </p>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Status Real de Envio / Entrega (Indecx)
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`typo-badge inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold ${
                      activeInvitation.emailDeliveryStatus === 'Aberto'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : activeInvitation.emailDeliveryStatus === 'Entregue'
                        ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        : activeInvitation.emailDeliveryStatus === 'Não entregue'
                        ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {activeInvitation.emailDeliveryStatus ||
                      (isPortal ? 'Entregue' : 'Enviado')}
                  </span>
                  {activeInvitation.emailBounceReason && (
                    <span className="typo-meta font-medium text-rose-700 dark:text-rose-400">
                      ({activeInvitation.emailBounceReason})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Eventos Registrados na Plataforma
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {activeInvitation.emailDeliveryEvents &&
                  activeInvitation.emailDeliveryEvents.length > 0
                    ? activeInvitation.emailDeliveryEvents.join(' → ')
                    : isPortal
                    ? 'Disponibilizado no Portal do Aluno'
                    : 'send'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Ação / Pesquisa Vinculada
                </span>
                <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>{activeInvitation.actionName || 'B2C | Microlins - NPS'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 4. URL de Auditoria da Pesquisa */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="typo-subtitle flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                URL da Pesquisa Selecionada
              </span>
              <button
                type="button"
                onClick={() => handleCopy(activeInvitation.surveyUrl, 'url')}
                className="typo-btn inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {copiedField === 'url' ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Copiado
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="typo-meta mt-1.5 truncate rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-600 select-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {activeInvitation.surveyUrl}
            </p>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="typo-btn rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
