import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookX,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  KeyRound,
  MessageCircle,
  Pin,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import {
  EvaluatedStudentRecord,
  formatFullSalaName,
  formatModuleDisplay,
  hasFrequencyData,
  HourKanbanColumn,
  isNotStartedAttendanceStatus,
} from '../utils/performanceAnalytics';

interface HourKanbanBoardProps {
  columns: HourKanbanColumn[];
  onSelectStudent: (id: number) => void;
}

export const HourKanbanBoard: React.FC<HourKanbanBoardProps> = React.memo(({
  columns,
  onSelectStudent,
}) => {
  const { pinnedCurrentColumn, scrollableOtherColumns } = useMemo(() => {
    const current = columns.find((col) => col.isCurrentHour) || null;
    const others = columns.filter((col) => !col.isCurrentHour);
    return {
      pinnedCurrentColumn: current,
      scrollableOtherColumns: others,
    };
  }, [columns]);

  if (columns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Users className="h-5 w-5" />
        </div>
        <h3 className="typo-title-section mt-3 text-slate-900 dark:text-slate-100">
          Nenhum agendamento encontrado para os filtros selecionados
        </h3>
      </div>
    );
  }

  /**
   * Regra de identificação de faltas e presenças com prioridade absoluta:
   * - Presença -> "Presença"
   * - Falta -> "Falta"
   * - Não iniciada -> "Não iniciada"
   */
  const getStudentStageBadge = (student: EvaluatedStudentRecord) => {
    if (student.attendanceStatus === 'Presença') {
      return {
        label: 'Presença',
        title: student.scheduleStageLabel || 'Presença registrada pelo sistema',
        classes:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300',
        icon: <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />,
      };
    }

    if (student.attendanceStatus === 'Falta') {
      return {
        label: 'Falta',
        title:
          student.scheduleStageLabel ||
          'Falta identificada (sistema ou após 15 min de tolerância)',
        classes:
          'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-300',
        icon: <XCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />,
      };
    }

    return {
      label: 'Não iniciada',
      title:
        student.scheduleStageLabel ||
        'Não iniciada (aguardando início ou dentro dos 15 min de tolerância)',
      classes:
        'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      icon: <Clock className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400" />,
    };
  };

  const getCardSurfaceClasses = (student: EvaluatedStudentRecord) => {
    if (student.attendanceStatus === 'Presença') {
      return 'border-emerald-200/90 bg-white hover:border-emerald-400 dark:border-emerald-900/70 dark:bg-slate-900 dark:hover:border-emerald-700';
    }
    if (student.attendanceStatus === 'Falta') {
      return 'border-rose-200/90 bg-white hover:border-rose-400 dark:border-rose-900/70 dark:bg-slate-900 dark:hover:border-rose-700';
    }
    if (!isNotStartedAttendanceStatus(student.attendanceStatus)) {
      return 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700';
    }
    return 'border-slate-200/90 bg-white hover:border-[#004A8D]/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-600/60';
  };

  const renderColumn = (col: HourKanbanColumn) => {
    const hasColumnFreqData = hasFrequencyData(
      col.presencaCount,
      col.faltaCount
    );
    const isColumnFreqGreen = col.mediaFrequencia >= 85;

    const columnContainerClasses = col.isCurrentHour
      ? 'border-2 border-[#004A8D] bg-sky-50/70 shadow-md ring-2 ring-[#004A8D]/15 dark:border-sky-500 dark:bg-sky-950/35 dark:ring-sky-500/20'
      : col.isPastHour
      ? 'border border-emerald-300/90 bg-emerald-50/30 dark:border-emerald-800/70 dark:bg-emerald-950/20'
      : 'border border-slate-200/90 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/60';

    const columnHeaderClasses = col.isCurrentHour
      ? 'border-b border-[#003A70] bg-[#004A8D] text-white dark:border-sky-800 dark:bg-[#004A8D]'
      : col.isPastHour
      ? 'border-b border-emerald-200/90 bg-emerald-100/75 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-100'
      : 'border-b border-slate-200/90 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100';

    return (
      <section
        key={col.hourKey}
        aria-label={`Horário ${col.hourKey}`}
        data-hour-key={col.hourKey}
        data-column-state={
          col.isCurrentHour ? 'current' : col.isPastHour ? 'past' : 'future'
        }
        className={`flex h-full w-[294px] shrink-0 flex-col overflow-hidden rounded-xl transition-colors sm:w-[308px] ${columnContainerClasses}`}
      >
        {/* Cabeçalho da Coluna com mudança automática de cor conforme estado do horário */}
        <div className={`shrink-0 px-3 py-2 ${columnHeaderClasses}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="typo-title-section tabular-nums">
                {col.hourKey}
              </span>

              {col.isCurrentHour && (
                <span className="typo-badge inline-flex items-center gap-1 rounded border border-white/30 bg-white/15 px-1.5 py-0.5 text-white">
                  <Pin className="h-2.5 w-2.5 text-sky-200" />
                  <span>Em Andamento</span>
                </span>
              )}

              {col.isPastHour && (
                <span className="typo-badge inline-flex items-center gap-1 rounded border border-emerald-300 bg-white/90 px-1.5 py-0.5 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Concluído</span>
                </span>
              )}

              {col.isFutureHour && (
                <span className="typo-badge inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Clock className="h-2.5 w-2.5 text-slate-500 dark:text-slate-400" />
                  <span>Horário Futuro</span>
                </span>
              )}
            </div>

            <span
              className={`typo-meta font-semibold tabular-nums ${
                col.isCurrentHour
                  ? 'text-sky-100'
                  : col.isPastHour
                  ? 'text-emerald-800 dark:text-emerald-200'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {col.totalAgendamentos}{' '}
              {col.totalAgendamentos === 1 ? 'aluno' : 'alunos'}
            </span>
          </div>

          {/* Indicadores compactos da coluna */}
          <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-center text-slate-800 tabular-nums dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-200">
            <div>
              <div className="typo-badge text-slate-500 dark:text-slate-400">
                Presenças
              </div>
              <div className="typo-subtitle font-bold text-emerald-700 dark:text-emerald-400">
                {col.presencaCount}
              </div>
            </div>
            <div className="border-l border-slate-200/70 dark:border-slate-700">
              <div className="typo-badge text-slate-500 dark:text-slate-400">
                Faltas
              </div>
              <div className="typo-subtitle font-bold text-rose-700 dark:text-rose-400">
                {col.faltaCount}
              </div>
            </div>
            <div className="border-l border-slate-200/70 dark:border-slate-700">
              <div className="typo-badge text-slate-500 dark:text-slate-400">
                Não inic.
              </div>
              <div className="typo-subtitle font-bold text-slate-700 dark:text-slate-300">
                {col.naoIniciadoCount}
              </div>
            </div>
            <div className="border-l border-slate-200/70 dark:border-slate-700">
              <div className="typo-badge text-slate-500 dark:text-slate-400">
                Freq. Hora
              </div>
              <div
                className={`typo-subtitle font-bold ${
                  !hasColumnFreqData
                    ? 'text-slate-500 dark:text-slate-400'
                    : isColumnFreqGreen
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {hasColumnFreqData ? `${col.mediaFrequencia.toFixed(0)}%` : 'S/D'}
              </div>
            </div>
          </div>
        </div>

        {/* Cards Reorganizados por Nível de Importância: Nome Completo da Sala e Classificação do Curso exclusivamente pela Formação */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {col.students.map((student) => {
            const stageBadge = getStudentStageBadge(student);
            const cardSurface = getCardSurfaceClasses(student);
            const salaDisplay = formatFullSalaName(
              student.sala,
              student.modalidade
            );
            const moduloDisplay = formatModuleDisplay(
              student.moduloAtual || student.curso
            );
            const categoriaDisplay =
              student.categoriaCurso === 'INGLÊS'
                ? 'Inglês'
                : 'Profissionalizante';

            return (
              <article
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
                data-attendance-status={student.attendanceStatus}
                data-schedule-stage={student.scheduleStage}
                data-evasao={student.isEvasao ? 'true' : 'false'}
                data-nps-ativo={student.hasActiveNps ? 'true' : 'false'}
                data-nps-destinatario={
                  student.npsInvitation?.npsDestinatario || ''
                }
                data-tempo-insuficiente={
                  student.isTempoInsuficiente ? 'true' : 'false'
                }
                data-saida-antecipada={
                  student.isSaidaAntecipada ? 'true' : 'false'
                }
                data-possui-apostila={student.possuiApostila ? 'true' : 'false'}
                data-categoria-curso={student.categoriaCurso}
                data-situacao-financeira={
                  student.inadimplente ? 'EM_ATRASO' : 'EM_DIA'
                }
                className={`group cursor-pointer rounded-lg border p-2.5 transition-all duration-150 hover:shadow-xs ${cardSurface}`}
              >
                {/* NÍVEL 1 (Prioritário): Nome Completo do Aluno (sem corte indevido) + Status da Aula */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3
                      title={student.nomeCompleto}
                      className="typo-card-title line-clamp-2 break-words text-slate-900 group-hover:text-[#004A8D] dark:text-slate-100 dark:group-hover:text-sky-400"
                    >
                      {student.nomeCompleto}
                    </h3>
                    <div className="typo-meta mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-500 tabular-nums dark:text-slate-400">
                      <span
                        data-testid="student-card-contract"
                        className="shrink-0 font-semibold text-slate-600 dark:text-slate-300"
                      >
                        #{student.contrato}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        data-testid="student-card-sala"
                        className="break-words font-semibold text-slate-700 dark:text-slate-300"
                        title={`Sala: ${salaDisplay}`}
                      >
                        Sala: {salaDisplay}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        data-testid="student-card-categoria"
                        className={`font-semibold ${
                          student.categoriaCurso === 'INGLÊS'
                            ? 'text-[#004A8D] dark:text-sky-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {categoriaDisplay}
                      </span>
                    </div>
                  </div>

                  <span
                    data-testid="student-card-status-badge"
                    title={stageBadge.title}
                    className={`typo-badge inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 whitespace-nowrap ${stageBadge.classes}`}
                  >
                    {stageBadge.icon}
                    <span>{stageBadge.label}</span>
                  </span>
                </div>

                {/* NÍVEL 2 (Agrupamento Acadêmico e Financeiro): Módulo completo + Linha de Aula, Financeiro (binário discreto), Apostila (somente ícone), NPS e Alertas Pedagógicos */}
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <div
                    data-testid="student-card-modulo"
                    className="typo-card-body flex items-start justify-start gap-1 text-left"
                  >
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">
                      Módulo:
                    </span>
                    <span
                      title={moduloDisplay}
                      className="min-w-0 flex-1 line-clamp-2 break-words font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {moduloDisplay}
                    </span>
                  </div>

                  {student.professor && (
                    <div
                      data-testid="student-card-educador"
                      className="typo-meta flex items-center gap-1 text-slate-600 dark:text-slate-300"
                      title={`Educador(a) responsável: ${student.professor}`}
                    >
                      <GraduationCap className="h-3 w-3 shrink-0 text-[#004A8D] dark:text-sky-400" />
                      <span className="truncate font-medium">{student.professor}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1.5">
                    <div className="typo-meta flex min-w-0 flex-1 items-center gap-1.5 rounded border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
                      <span className="font-semibold whitespace-nowrap tabular-nums">
                        {student.aulaAtualLabel}
                      </span>
                      <span
                        className="text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      {/* 1.1: Badge financeiro estritamente binário no painel de sala (Em atraso / Em dia), sem expor quantidade de parcelas */}
                      <span
                        data-testid="student-card-financeiro"
                        title={
                          student.inadimplente
                            ? 'Atenção financeira: sinalização discreta para abordagem reservada pela coordenação/secretaria'
                            : 'Situação financeira regular'
                        }
                        className={`truncate font-semibold ${
                          student.inadimplente
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {student.inadimplente ? 'Em atraso' : 'Em dia'}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {student.hasActiveNps && (
                        <span
                          data-testid="student-card-nps-badge"
                          title={
                            student.npsInvitation?.respondenteVinculoLabel
                              ? `Convite NPS (${
                                  student.npsInvitation.npsDestinatario === 'RESPONSAVEL'
                                    ? 'Responsável'
                                    : 'Aluno'
                                }): ${student.npsInvitation.respondenteVinculoLabel} · Canal: ${
                                  student.npsOrigemFormatada || 'Portal do Aluno'
                                }`
                              : `Pesquisa NPS ativa via ${
                                  student.npsOrigemFormatada || 'Portal do Aluno'
                                }`
                          }
                          className={`typo-badge inline-flex items-center gap-1 rounded border px-1.5 py-0.5 whitespace-nowrap ${
                            student.npsInvitation?.npsDestinatario === 'RESPONSAVEL'
                              ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-800/70 dark:bg-fuchsia-950/60 dark:text-fuchsia-200'
                              : 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800/70 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}
                        >
                          <Sparkles
                            className={`h-2.5 w-2.5 ${
                              student.npsInvitation?.npsDestinatario === 'RESPONSAVEL'
                                ? 'text-fuchsia-600 dark:text-fuchsia-400'
                                : 'text-purple-600 dark:text-purple-400'
                            }`}
                          />
                          <span>
                            {student.npsInvitation?.npsDestinatario === 'RESPONSAVEL'
                              ? 'NPS · Resp.'
                              : 'NPS'}
                          </span>
                        </span>
                      )}

                      {student.isEvasao && (
                        <span
                          title={
                            student.evasaoSummary ||
                            'Possível evasão: compareceu a um horário e ausentou-se nos demais horários do dia'
                          }
                          className="evasao-alert-pulse typo-badge inline-flex items-center gap-1 rounded border border-rose-200/90 bg-rose-50 px-1.5 py-0.5 text-rose-700 whitespace-nowrap dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        >
                          <AlertTriangle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                          <span>Evasão</span>
                        </span>
                      )}

                      {/* Na informação referente à apostila, exibir SOMENTE o ícone, sem textos adicionais */}
                      <div
                        data-testid="student-card-apostila-icon"
                        title={
                          student.possuiApostila
                            ? 'Apostila entregue'
                            : 'Apostila não entregue'
                        }
                        aria-label={
                          student.possuiApostila
                            ? 'Apostila entregue'
                            : 'Apostila não entregue'
                        }
                        className={`flex h-6 w-7 shrink-0 items-center justify-center rounded border ${
                          student.possuiApostila
                            ? 'border-emerald-200/90 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'border-rose-200/90 bg-rose-50/80 text-rose-600 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {student.possuiApostila ? (
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <BookX className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1.4: Identificação da Aula em que a Nota foi Obtida (Contexto Cronológico da Avaliação) */}
                  {student.nota !== null && (
                    <div
                      data-testid="student-card-nota-contexto"
                      title={
                        student.isNotaModuloAnterior
                          ? `${student.notaContextoLabel} — Avaliação pertencente ao módulo anterior concluído`
                          : student.notaContextoLabel
                      }
                      className={`typo-meta flex items-center justify-between gap-1.5 rounded border px-2 py-0.5 tabular-nums ${
                        student.isNotaModuloAnterior
                          ? 'border-indigo-200/80 bg-indigo-50/60 text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate font-semibold">
                        {student.notaContextoLabel}
                      </span>
                    </div>
                  )}

                  {/* 1.2 & 1.3: Indicadores de Acompanhamento Pedagógico (Tempo Insuficiente de Permanência, Saída Antecipada e Risco Preventivo) */}
                  {(student.isTempoInsuficiente ||
                    student.isSaidaAntecipada ||
                    student.isRiscoPreventivoEvasao) && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {student.isTempoInsuficiente && (
                        <span
                          data-testid="student-card-tempo-insuficiente"
                          title={`Acompanhamento Pedagógico: ${student.tempoPermanenciaLabel}. Recomenda-se verificação pedagógica com o aluno.`}
                          className="typo-badge inline-flex items-center gap-1 rounded border border-amber-300/90 bg-amber-50/85 px-1.5 py-0.5 font-semibold text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
                        >
                          <Clock className="h-2.5 w-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            Tempo Insuficiente ({student.tempoPermanenciaMinutos} min)
                          </span>
                        </span>
                      )}

                      {student.isSaidaAntecipada && (
                        <span
                          data-testid="student-card-saida-antecipada"
                          title={`Saída Antecipada: ${student.saidaAntecipadaLabel}${
                            student.recorrenciaSaidaAntecipadaCount > 1
                              ? ` (Recorrência na semana: ${student.recorrenciaSaidaAntecipadaCount}x)`
                              : ''
                          }`}
                          className="typo-badge inline-flex items-center gap-1 rounded border border-orange-300/90 bg-orange-50/85 px-1.5 py-0.5 font-semibold text-orange-900 dark:border-orange-800/70 dark:bg-orange-950/50 dark:text-orange-200"
                        >
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-orange-600 dark:text-orange-400" />
                          <span>
                            Saída Antecipada (-{student.saidaAntecipadaMinutos} min
                            {student.recorrenciaSaidaAntecipadaCount > 1
                              ? ` · ${student.recorrenciaSaidaAntecipadaCount}x`
                              : ''}
                            )
                          </span>
                        </span>
                      )}

                      {student.isRiscoPreventivoEvasao && (
                        <span
                          data-testid="student-card-risco-preventivo"
                          title={`Atenção Preventiva (Cruzamento Pedagógico): ${student.riscoPreventivoEvasaoMotivos.join(' + ')}`}
                          className="typo-badge inline-flex items-center gap-1 rounded border border-rose-300/90 bg-rose-50/85 px-1.5 py-0.5 font-semibold text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-200"
                        >
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>Atenção Preventiva</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* NÍVEL 3 (Ações Rápidas): WhatsApp Responsável + Link Direto da Aula do Aluno */}
                <div
                  className="mt-2 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={student.whatsappResponsavelContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Contatar responsável de ${student.nomeCompleto} via WhatsApp`}
                    className="typo-btn inline-flex h-7 items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50/70 px-2 text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60"
                  >
                    <MessageCircle className="h-3 w-3 shrink-0 text-sky-700 dark:text-sky-400" />
                    <span className="truncate">Responsável</span>
                  </a>

                  <a
                    href={student.linkAcessoDireto}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="student-login-link"
                    title={`Acessar aula de ${student.nomeCompleto} no Portal do Aluno (${student.linkAcessoDireto})`}
                    className="typo-btn inline-flex h-7 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                  >
                    <KeyRound className="h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span className="truncate">Acessar Aula</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div
      data-testid="student-kanban-container"
      className="flex h-full w-full items-stretch gap-3 overflow-hidden"
    >
      {/* Coluna do Horário Atual FIXADA à esquerda */}
      {pinnedCurrentColumn && (
        <div
          data-testid="pinned-current-hour-wrapper"
          className="flex h-full shrink-0 items-stretch border-r border-slate-300/80 pr-2 dark:border-slate-800"
        >
          {renderColumn(pinnedCurrentColumn)}
        </div>
      )}

      {/* Demais colunas com rolagem horizontal suave */}
      <div
        data-testid="scrollable-hours-wrapper"
        className="flex h-full min-w-0 flex-1 items-stretch gap-3 overflow-x-auto pb-1"
      >
        {scrollableOtherColumns.map((col) => renderColumn(col))}
      </div>
    </div>
  );
});
