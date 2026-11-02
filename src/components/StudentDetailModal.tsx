import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookX,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  MessageCircle,
  Percent,
  Phone,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  EvaluatedStudentRecord,
  formatModuleDisplay,
  isNotStartedAttendanceStatus,
} from '../utils/performanceAnalytics';

interface StudentDetailModalProps {
  student: EvaluatedStudentRecord | null;
  studentHistory: EvaluatedStudentRecord[];
  onClose: () => void;
  onOpenPortalHub?: (subTab?: 'CARTEIRINHA' | 'BOLETIM' | 'DECLARACAO') => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  studentHistory,
  onClose,
  onOpenPortalHub,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!student) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [student, onClose]);

  if (!student) return null;

  const presencasHistorico = studentHistory.filter(
    (h) => h.attendanceStatus === 'Presença'
  ).length;
  const faltasHistorico = studentHistory.filter(
    (h) => h.attendanceStatus === 'Falta'
  ).length;
  const naoIniciadosHistorico = studentHistory.filter((h) =>
    isNotStartedAttendanceStatus(h.attendanceStatus)
  ).length;

  const baseFreq = presencasHistorico + faltasHistorico;
  const frequenciaHistorico =
    baseFreq > 0 ? Number(((presencasHistorico / baseFreq) * 100).toFixed(1)) : null;

  const isFrequenciaGreen =
    frequenciaHistorico !== null && frequenciaHistorico >= 85;

  const handleCopyAuthLink = async () => {
    try {
      await navigator.clipboard.writeText(student.linkAcessoDireto);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback silent
    }
  };

  const salaDisplay =
    student.sala && student.sala.trim().length > 0
      ? student.sala
      : 'Sala não informada';

  const moduloDisplay = formatModuleDisplay(
    student.moduloAtual || student.curso
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/55 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Institutional Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-[#003A70] bg-[#004A8D] px-5 py-4 text-white">
          <div className="min-w-0 flex-1 pr-3">
            <div className="typo-meta flex flex-wrap items-center gap-2 text-sky-100 tabular-nums">
              <span className="font-semibold text-white">
                Contrato #{student.contrato}
              </span>
              <span aria-hidden="true">·</span>
              <span>{student.diaSemana}</span>
              <span aria-hidden="true">·</span>
              <span>{student.turno}</span>
            </div>
            <h2
              id="student-detail-title"
              className="typo-title-main mt-1 truncate text-white"
            >
              {student.nomeCompleto}
            </h2>
            <p className="typo-meta mt-0.5 text-sky-100/90">
              {student.formacao || 'Formação Profissional Microlins'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do aluno"
            className="rounded-lg p-1.5 text-sky-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* 3.1 - 3.3: Convite NPS Ativo com Identificação de Destinatário (Aluno vs Responsável) e Disparo Inteligente WhatsApp */}
          {student.hasActiveNps && student.npsInvitation && (
            <div
              data-testid="student-modal-nps-banner"
              className={`space-y-2 rounded-xl border p-3.5 ${
                student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                  ? 'border-fuchsia-200/90 bg-fuchsia-50/75 text-fuchsia-950 dark:border-fuchsia-800/70 dark:bg-fuchsia-950/50 dark:text-fuchsia-100'
                  : 'border-purple-200/90 bg-purple-50/75 text-purple-950 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-100'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={`h-5 w-5 shrink-0 ${
                      student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                        ? 'text-fuchsia-600 dark:text-fuchsia-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}
                  />
                  <div>
                    <div
                      className={`typo-subtitle font-bold ${
                        student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                          ? 'text-fuchsia-900 dark:text-fuchsia-200'
                          : 'text-purple-900 dark:text-purple-200'
                      }`}
                    >
                      Convite NPS:{' '}
                      {student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                        ? 'Responsável'
                        : 'Aluno'}{' '}
                      ({student.npsInvitation.pontoJornada})
                    </div>
                    <div className="typo-meta mt-0.5 opacity-90 tabular-nums">
                      {student.npsInvitation.respondenteVinculoLabel ||
                        `Respondente: ${student.nomeCompleto} (Aluno titular)`}{' '}
                      · Convite #{student.npsInvitation.controlId}
                    </div>
                  </div>
                </div>
                <span className="typo-badge rounded border border-purple-200 bg-white px-2 py-0.5 text-purple-800 dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-200">
                  {student.npsOrigemFormatada || student.npsInvitation.origem}
                </span>
              </div>

              {student.npsInvitation.orientacaoAbordagemPresencial && (
                <div
                  data-testid="student-modal-nps-orientacao-presencial"
                  className="typo-meta rounded-lg border border-fuchsia-300/80 bg-white/85 px-2.5 py-1.5 font-medium text-fuchsia-950 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-200"
                >
                  {student.npsInvitation.orientacaoAbordagemPresencial}
                </div>
              )}

              {student.whatsappNpsUrl && (
                <div className="pt-1">
                  <a
                    href={student.whatsappNpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="student-modal-nps-whatsapp-btn"
                    className={`typo-btn inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border px-3 transition-colors ${
                      student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                        ? 'border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                        : 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                        ? `Enviar Pesquisa NPS ao Responsável (${
                            student.npsInvitation.respondenteNome ||
                            student.nomeResponsavel
                          })`
                        : `Enviar Pesquisa NPS ao Aluno (${student.nomeCurto})`}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Alerta de Possível Evasão */}
          {student.isEvasao && (
            <div className="evasao-alert-pulse flex items-center justify-between gap-3 rounded-xl border border-rose-200/90 bg-rose-50/75 p-3.5 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <div className="typo-subtitle font-bold text-rose-800 dark:text-rose-200">
                    Alerta Automático de Possível Evasão
                  </div>
                  <div className="typo-meta mt-0.5 text-rose-700 dark:text-rose-300">
                    {student.evasaoSummary || 'Possível evasão registrada no dia'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1.2: Alerta Pedagógico de Tempo Insuficiente de Permanência */}
          {student.isTempoInsuficiente && (
            <div
              data-testid="student-modal-tempo-insuficiente-alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-amber-300/90 bg-amber-50/80 p-3.5 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100"
            >
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="typo-subtitle font-bold text-amber-900 dark:text-amber-200">
                    Indicador de Acompanhamento: Tempo Insuficiente de Permanência
                  </div>
                  <div className="typo-meta mt-0.5 text-amber-800 dark:text-amber-300">
                    O aluno concluiu a atividade em{' '}
                    <strong>{student.tempoPermanenciaMinutos} min</strong> (Início:{' '}
                    {student.inicio} · Fim: {student.fim}), abaixo da duração curricular
                    prevista ({student.duracaoCurricularMinutos} min). Recomenda-se
                    verificação pedagógica pelo instrutor ou coordenação.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1.3: Alerta Pedagógico de Saída Antecipada e Recorrência */}
          {student.isSaidaAntecipada && (
            <div
              data-testid="student-modal-saida-antecipada-alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-orange-300/90 bg-orange-50/80 p-3.5 text-orange-950 dark:border-orange-800/70 dark:bg-orange-950/50 dark:text-orange-100"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
                <div>
                  <div className="typo-subtitle font-bold text-orange-900 dark:text-orange-200">
                    Indicador de Saída Antecipada (Encerramento Previsto: {student.horaFim})
                  </div>
                  <div className="typo-meta mt-0.5 text-orange-800 dark:text-orange-300">
                    Atividade encerrada com{' '}
                    <strong>
                      {student.saidaAntecipadaMinutos} min de antecedência
                    </strong>{' '}
                    em relação ao término da turma.
                    {student.recorrenciaSaidaAntecipadaCount > 1 && (
                      <span>
                        {' '}
                        Recorrência identificada na semana:{' '}
                        <strong>{student.recorrenciaSaidaAntecipadaCount} ocorrências</strong>.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1.3 & 7.6: Cruzamento Preventivo de Permanência, Saída Antecipada, Frequência, Avaliação e NPS */}
          {student.isRiscoPreventivoEvasao && (
            <div
              data-testid="student-modal-risco-preventivo-alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-rose-300/90 bg-rose-50/80 p-3.5 text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-100"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <div className="typo-subtitle font-bold text-rose-900 dark:text-rose-200">
                    Inteligência Preventiva de Retenção (Cruzamento Pedagógico e Comportamental)
                  </div>
                  <div className="typo-meta mt-0.5 text-rose-800 dark:text-rose-300">
                    Foram identificados sinais combinados que recomendam abordagem preventiva da
                    coordenação/instrutor:{' '}
                    <strong>{student.riscoPreventivoEvasaoMotivos.join(' · ')}</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Automatic Attendance Status & Frequency Banner */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                student.attendanceStatus === 'Presença'
                  ? 'border-emerald-200/80 bg-emerald-50/60 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100'
                  : student.attendanceStatus === 'Falta'
                  ? 'border-rose-200/80 bg-rose-50/60 text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-100'
                  : 'border-slate-200 bg-slate-50/90 text-slate-900 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {student.attendanceStatus === 'Presença' && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                {student.attendanceStatus === 'Falta' && (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                {isNotStartedAttendanceStatus(student.attendanceStatus) && (
                  <Clock className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
                )}
                <div>
                  <div className="typo-meta opacity-80">
                    Status no Horário ({student.horario})
                  </div>
                  <div className="typo-title-section">
                    {student.attendanceStatus}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                frequenciaHistorico === null
                  ? 'border-slate-200 bg-slate-50/90 text-slate-800 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200'
                  : isFrequenciaGreen
                  ? 'border-emerald-200/85 bg-emerald-50/60 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100'
                  : 'border-rose-200/85 bg-rose-50/60 text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Percent
                  className={`h-5 w-5 shrink-0 ${
                    frequenciaHistorico === null
                      ? 'text-slate-500 dark:text-slate-400'
                      : isFrequenciaGreen
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
                <div>
                  <div className="typo-meta opacity-80">
                    Frequência do Aluno
                  </div>
                  <div
                    className={`typo-title-section tabular-nums ${
                      frequenciaHistorico === null
                        ? 'text-slate-700 dark:text-slate-300'
                        : isFrequenciaGreen
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {frequenciaHistorico !== null
                      ? `${frequenciaHistorico.toFixed(1)}%`
                      : 'Sem dados'}
                  </div>
                </div>
              </div>
              <span className="typo-meta opacity-75 tabular-nums">
                {presencasHistorico}P / {faltasHistorico}F
              </span>
            </div>
          </div>

          {/* Informações Acadêmicas e da Turma */}
          <div className="space-y-2">
            <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <GraduationCap className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
              Módulo Acadêmico e Inteligência Pedagógica
            </h3>
            <div className="typo-card-body grid grid-cols-2 gap-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="sm:col-span-2">
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Módulo Atual
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {moduloDisplay}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Aula Atual
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {student.aulaInfo || student.aulaAtualLabel}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Sala de Aula
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {salaDisplay}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Modalidade
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {student.modalidade}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Situação da Apostila
                </span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {student.possuiApostila ? (
                    <>
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <BookOpen className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Possui apostila
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center justify-center rounded-full bg-rose-100 p-1 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                        <BookX className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-rose-700 dark:text-rose-400">
                        Sem apostila
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Categoria do Curso
                </span>
                <p className="mt-0.5 font-semibold text-[#004A8D] dark:text-sky-300">
                  {student.categoriaCurso === 'INGLÊS'
                    ? 'Inglês'
                    : 'Profissionalizante'}
                </p>
              </div>
              {/* 1.1: Apresentação simplificada e discreta da Situação Financeira */}
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Situação Financeira
                </span>
                <p
                  data-testid="student-modal-financeiro-status"
                  title="Apresentação binária para proteção da privacidade financeira do aluno em sala de aula"
                  className={`mt-0.5 font-semibold ${
                    student.inadimplente
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {student.inadimplente ? 'Em atraso' : 'Em dia'}
                </p>
              </div>
              {/* 1.2: Tempo Real de Permanência na Aula */}
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Tempo de Permanência
                </span>
                <p
                  data-testid="student-modal-tempo-permanencia"
                  className={`mt-0.5 font-semibold tabular-nums ${
                    student.isTempoInsuficiente
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {student.tempoPermanenciaLabel ||
                    (student.inicio
                      ? `Em andamento (${student.duracaoCurricularMinutos} min previstos)`
                      : `Aguardando início (${student.duracaoCurricularMinutos} min previstos)`)}
                </p>
              </div>
              {/* 1.3: Comparação com Horário de Encerramento da Turma */}
              <div className="sm:col-span-1">
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Encerramento vs Turma ({student.horaFim})
                </span>
                <p
                  data-testid="student-modal-saida-antecipada"
                  className={`mt-0.5 font-semibold tabular-nums ${
                    student.isSaidaAntecipada
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {student.saidaAntecipadaLabel ||
                    (student.fim
                      ? `Regular no horário (${student.fim})`
                      : `Previsto: ${student.horaFim}`)}
                </p>
              </div>
              {/* 1.4: Identificação da Aula em que a Nota foi Obtida */}
              <div className="sm:col-span-2">
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Última Nota e Contexto Cronológico da Avaliação
                </span>
                <p
                  data-testid="student-modal-nota-contexto"
                  className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100"
                >
                  {student.notaContextoLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Histórico de Presenças e Faltas do Contrato */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <History className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                Histórico de Agendamentos (Contrato #{student.contrato})
              </h3>
              <div className="typo-meta flex items-center gap-2 font-semibold tabular-nums">
                <span className="text-emerald-700 dark:text-emerald-400">
                  {presencasHistorico} Presença(s)
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-rose-700 dark:text-rose-400">
                  {faltasHistorico} Falta(s)
                </span>
                {naoIniciadosHistorico > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {naoIniciadosHistorico} Não inic.
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {studentHistory.map((item) => {
                const isSelectedClass = item.id === student.id;
                const itemSala =
                  item.sala && item.sala.trim().length > 0
                    ? item.sala
                    : 'Sala não informada';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
                      isSelectedClass
                        ? 'bg-sky-50/45 dark:bg-sky-950/30'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="typo-card-body flex items-center gap-2 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        <span>{item.horario}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="truncate">
                          {formatModuleDisplay(item.moduloAtual || item.curso)}
                        </span>
                      </div>
                      <div className="typo-meta mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500 tabular-nums dark:text-slate-400">
                        <span>{item.aulaInfo}</span>
                        <span>·</span>
                        <span>Sala: {itemSala}</span>
                        <span>·</span>
                        <span>
                          Início: {item.inicio ? item.inicio : 'Não registrado'}
                        </span>
                        {item.fim && (
                          <>
                            <span>·</span>
                            <span>Fim: {item.fim}</span>
                          </>
                        )}
                        {item.tempoPermanenciaMinutos !== null && (
                          <>
                            <span>·</span>
                            <span
                              className={
                                item.isTempoInsuficiente
                                  ? 'font-semibold text-amber-700 dark:text-amber-400'
                                  : 'font-semibold text-slate-700 dark:text-slate-300'
                              }
                            >
                              Permanência: {item.tempoPermanenciaMinutos} min
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      className={`typo-badge inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 ${
                        item.attendanceStatus === 'Presença'
                          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.attendanceStatus === 'Falta'
                          ? 'border-rose-200/80 bg-rose-50/90 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'border-slate-200 bg-slate-100/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.attendanceStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dados de Contato e Link Direto de Aula/Autenticação */}
          <div className="space-y-2">
            <h3 className="typo-title-section flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Phone className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
              Contatos e Acesso Direto à Aula do Aluno
            </h3>
            <div className="typo-card-body grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/50">
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Telefone do Aluno
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {student.telefoneAluno || 'Não cadastrado no sistema'}
                </p>
              </div>
              <div>
                <span className="typo-meta text-slate-500 dark:text-slate-400">
                  Responsável Cadastrado
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {student.nomeResponsavel
                    ? `${student.nomeResponsavel}${
                        student.telefoneResponsavel
                          ? ` (${student.telefoneResponsavel})`
                          : ''
                      }`
                    : 'Sem responsável vinculado'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="typo-meta text-slate-500 dark:text-slate-400">
                    Link Individual de Acesso à Aula (Portal do Aluno)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={student.linkAcessoDireto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="typo-btn inline-flex items-center gap-1 rounded border border-[#004A8D]/25 bg-[#004A8D]/10 px-2 py-0.5 text-[#004A8D] transition-colors hover:bg-[#004A8D] hover:text-white dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white"
                    >
                      <KeyRound className="h-3 w-3" />
                      <span>Acessar Aula</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyAuthLink}
                      className="typo-btn inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Copiado
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="typo-meta mt-1 truncate rounded border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 select-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {student.linkAcessoDireto}
                </p>
              </div>
            </div>
          </div>

          {/* Ficha Individual do Aluno (Documentos Oficiais e Acompanhamento) */}
          {onOpenPortalHub && (
            <div className="space-y-2 rounded-xl border border-sky-200/80 bg-sky-50/60 p-3.5 dark:border-sky-800/70 dark:bg-sky-950/40">
              <div className="flex items-center justify-between">
                <span className="typo-subtitle font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                  Ficha Individual do Aluno (Documentos Oficiais)
                </span>
                <span className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider dark:text-sky-300">
                  Contrato #{student.contrato}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
                <button
                  type="button"
                  data-testid="student-modal-open-carteirinha"
                  onClick={() => onOpenPortalHub('CARTEIRINHA')}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-sky-300/80 bg-white p-2.5 text-center text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100/70 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                >
                  <CreditCard className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                  <span>Carteirinha Estudantil</span>
                </button>

                <button
                  type="button"
                  data-testid="student-modal-open-boletim"
                  onClick={() => onOpenPortalHub('BOLETIM')}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-sky-300/80 bg-white p-2.5 text-center text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100/70 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                >
                  <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Boletim Acadêmico</span>
                </button>

                <button
                  type="button"
                  data-testid="student-modal-open-declaracao"
                  onClick={() => onOpenPortalHub('DECLARACAO')}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-sky-300/80 bg-white p-2.5 text-center text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100/70 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Declaração de Matrícula</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <span className="typo-subtitle block text-slate-700 dark:text-slate-300">
              Ações Rápidas de Acesso e Contato
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <a
                href={student.linkAcessoDireto}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-btn inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#004A8D]/30 bg-[#004A8D]/10 px-3 py-2.5 text-[#004A8D] transition-colors hover:bg-[#004A8D] hover:text-white dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white"
              >
                <KeyRound className="h-4 w-4 shrink-0" />
                <span>Acessar Aula</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href={student.whatsappResponsavelContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-btn inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
                <span>Contatar Responsável</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href={student.whatsappAlunoLoginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-btn inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>Enviar Aula no WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
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
