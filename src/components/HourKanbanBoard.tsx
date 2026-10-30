import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookX,
  CheckCircle2,
  Clock,
  KeyRound,
  MessageCircle,
  Pin,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AttendanceStatus, HourKanbanColumn } from '../utils/performanceAnalytics';

interface HourKanbanBoardProps {
  columns: HourKanbanColumn[];
  onSelectStudent: (id: number) => void;
}

export const HourKanbanBoard: React.FC<HourKanbanBoardProps> = ({
  columns,
  onSelectStudent,
}) => {
  // Suavização das cores dos status nos cards
  const getAttendanceBadgeClasses = (status: AttendanceStatus) => {
    if (status === 'Presença') {
      return 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700';
    }
    if (status === 'Falta') {
      return 'border-rose-200/80 bg-rose-50/90 text-rose-700';
    }
    return 'border-slate-200 bg-slate-100/80 text-slate-600';
  };

  const getCardSurfaceClasses = (status: AttendanceStatus, isEvasao: boolean) => {
    if (isEvasao && status === 'Falta') {
      return 'border-rose-300/80 bg-rose-50/55 hover:border-rose-400 hover:bg-rose-50/80';
    }
    if (status === 'Presença') {
      return 'border-emerald-200/75 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50/65';
    }
    if (status === 'Falta') {
      return 'border-rose-200/75 bg-rose-50/40 hover:border-rose-300 hover:bg-rose-50/65';
    }
    return 'border-slate-200/85 bg-white hover:border-slate-300 hover:bg-slate-50/40';
  };

  // Suavização das cores das colunas (Horário atual: azul suave, Horário finalizado: verde suave no topo, Não iniciado: neutro claro)
  const getColumnContainerClasses = (col: HourKanbanColumn) => {
    if (col.isCurrentHour) {
      return 'border-sky-300/85 bg-sky-50/20 ring-1 ring-sky-200/50 shadow-2xs';
    }
    if (col.isPastHour) {
      return 'border-emerald-200/65 bg-slate-50/65';
    }
    return 'border-slate-200/80 bg-slate-50/75';
  };

  const getColumnHeaderClasses = (col: HourKanbanColumn) => {
    if (col.isCurrentHour) {
      return 'border-sky-200/80 bg-sky-50/75';
    }
    if (col.isPastHour) {
      return 'border-emerald-200/65 bg-emerald-50/60';
    }
    return 'border-slate-200/80 bg-white';
  };

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          Nenhum agendamento encontrado para os filtros selecionados.
        </p>
      </div>
    );
  }

  const renderColumn = (col: HourKanbanColumn) => (
    <section
      key={col.hourKey}
      aria-label={`Horário ${col.hourKey}`}
      data-hour-key={col.hourKey}
      data-hour-state={
        col.isCurrentHour ? 'current' : col.isPastHour ? 'past' : 'future'
      }
      className={`flex h-full w-[326px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border ${getColumnContainerClasses(
        col
      )}`}
    >
      {/* Column Header + Individual Hourly Summary (Contagem por Agendamento) */}
      <div className={`shrink-0 border-b px-3.5 py-2.5 ${getColumnHeaderClasses(col)}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-display text-base font-bold tabular-nums ${
                col.isCurrentHour
                  ? 'text-sky-800'
                  : col.isPastHour
                  ? 'text-emerald-800'
                  : 'text-slate-800'
              }`}
            >
              {col.hourKey}
            </span>
            {col.isCurrentHour && (
              <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-100/85 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                <Pin className="h-2.5 w-2.5 text-sky-700" />
                Horário Atual
              </span>
            )}
            {col.isPastHour && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-200/80 bg-emerald-100/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                Finalizado
              </span>
            )}
          </div>
          <span
            className={`text-xs font-semibold tabular-nums ${
              col.isPastHour
                ? 'text-emerald-700'
                : col.isCurrentHour
                ? 'text-sky-700'
                : 'text-slate-500'
            }`}
          >
            {col.totalAgendamentos}{' '}
            {col.totalAgendamentos === 1 ? 'agendamento' : 'agendamentos'}
          </span>
        </div>

        {/* Individual Kanban Hourly Indicators */}
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-lg border border-slate-200/70 bg-white/95 px-2 py-1.5 text-center tabular-nums">
          <div>
            <div className="text-[10px] font-medium text-slate-500">Presenças</div>
            <div className="text-xs font-bold text-emerald-700">
              {col.presencaCount}
            </div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Faltas</div>
            <div className="text-xs font-bold text-rose-700">{col.faltaCount}</div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Não inic.</div>
            <div className="text-xs font-bold text-slate-600">
              {col.naoIniciadoCount}
            </div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Média</div>
            <div className="text-xs font-bold text-slate-800">
              {col.mediaFrequencia.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Individual Student Schedule Cards (1 Card = 1 Agendamento independente) */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {col.students.map((student) => {
          const badgeStyle = getAttendanceBadgeClasses(student.attendanceStatus);
          const cardSurface = getCardSurfaceClasses(
            student.attendanceStatus,
            student.isEvasao
          );

          return (
            <article
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              data-attendance-status={student.attendanceStatus}
              data-evasao={student.isEvasao ? 'true' : 'false'}
              data-nps-ativo={student.hasActiveNps ? 'true' : 'false'}
              className={`group cursor-pointer rounded-lg border p-3 transition-colors hover:shadow-2xs ${cardSurface}`}
            >
              {/* 1. Identificação do aluno: Nome completo em destaque + Contrato + Dia + Indicadores de Evasão e NPS Ativo */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold leading-snug text-slate-900 group-hover:text-sky-700">
                    {student.nomeCompleto}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 tabular-nums">
                    Contrato: #{student.contrato} · {student.diaSemana}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {student.hasActiveNps && (
                    <span
                      title={`Pesquisa NPS disponível via ${student.npsOrigemFormatada || 'Portal do Aluno'}`}
                      className="inline-flex items-center gap-1 rounded border border-amber-200/90 bg-amber-50/95 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 whitespace-nowrap"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                      <span>NPS · {student.npsOrigemFormatada || 'Portal do Aluno'}</span>
                    </span>
                  )}

                  {student.isEvasao && (
                    <span
                      title={
                        student.evasaoSummary ||
                        'Possível evasão: compareceu a um horário e faltou nos demais horários do dia'
                      }
                      className="evasao-alert-pulse inline-flex items-center gap-1 rounded border border-rose-200/90 bg-rose-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 whitespace-nowrap"
                    >
                      <AlertTriangle className="h-3 w-3 text-rose-600" />
                      <span>Evasão</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Informações acadêmicas: Módulo atual, Aula atual, Modalidade, Indicador visual de apostila */}
              <div className="mt-2 space-y-1.5 border-t border-slate-200/50 pt-2 text-[11px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="shrink-0 text-slate-500">Módulo:</span>
                  <span className="truncate font-semibold text-slate-800">
                    {student.moduloAtual}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-0.5 text-[11px]">
                  <div className="rounded border border-slate-200/60 bg-white/85 px-1.5 py-1">
                    <span className="block text-[10px] text-slate-500">Aula</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {student.aulaAtualLabel}
                    </span>
                  </div>
                  <div className="rounded border border-slate-200/60 bg-white/85 px-1.5 py-1">
                    <span className="block text-[10px] text-slate-500">
                      Modalidade
                    </span>
                    <span className="font-semibold text-slate-800">
                      {student.modalidade}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-between rounded border border-slate-200/60 bg-white/85 px-1.5 py-1">
                    <span className="block text-[10px] text-slate-500">
                      Apostila
                    </span>
                    {student.possuiApostila ? (
                      <span
                        title="Possui apostila ativa"
                        aria-label="Possui apostila"
                        className="mt-0.5 inline-flex items-center justify-center rounded-full bg-emerald-100/80 p-1 text-emerald-700"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span
                        title="Não possui apostila"
                        aria-label="Não possui apostila"
                        className="mt-0.5 inline-flex items-center justify-center rounded-full bg-rose-100/80 p-1 text-rose-600"
                      >
                        <BookX className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Informações da turma: Sala de aula + Status atual automático */}
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2">
                <div className="min-w-0 text-[11px]">
                  <span className="text-slate-500">Sala: </span>
                  <span className="font-semibold text-slate-800">
                    {student.sala}
                  </span>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${badgeStyle}`}
                >
                  {student.attendanceStatus === 'Presença' && (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                  )}
                  {student.attendanceStatus === 'Falta' && (
                    <XCircle className="h-3 w-3 shrink-0 text-rose-600" />
                  )}
                  {student.attendanceStatus === 'Não iniciado' && (
                    <Clock className="h-3 w-3 shrink-0 text-slate-500" />
                  )}
                  <span>{student.attendanceStatus}</span>
                </span>
              </div>

              {/* 4. Ações rápidas: WhatsApp Responsável + Enviar Link Direto de Login ao Aluno */}
              <div
                className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-200/50 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={student.whatsappResponsavelContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Contatar responsável de ${student.nomeCompleto} via WhatsApp`}
                  className="inline-flex items-center justify-center gap-1 rounded border border-sky-200/90 bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-50/80 whitespace-nowrap"
                >
                  <MessageCircle className="h-3 w-3 shrink-0 text-sky-600" />
                  <span>Responsável</span>
                </a>

                <a
                  href={student.whatsappAlunoLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Enviar link de acesso direto para ${student.nomeCompleto} via WhatsApp`}
                  className="inline-flex items-center justify-center gap-1 rounded border border-emerald-200/90 bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50/80 whitespace-nowrap"
                >
                  <KeyRound className="h-3 w-3 shrink-0 text-emerald-600" />
                  <span>Link de Login</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  const [firstColumn, ...remainingColumns] = columns;

  return (
    <div className="flex h-full w-full items-stretch gap-3 overflow-hidden">
      {/* Pinned 1st Column: permanently fixed on the left */}
      <div className="h-full shrink-0 pb-2">{renderColumn(firstColumn)}</div>

      {/* Horizontally Scrollable Remaining Columns */}
      {remainingColumns.length > 0 && (
        <div
          id="kanban-scroll-container"
          className="flex h-full min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2"
        >
          {remainingColumns.map((col) => renderColumn(col))}
        </div>
      )}
    </div>
  );
};
