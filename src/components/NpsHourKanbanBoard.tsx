import React from 'react';
import {
  Clock,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Eye,
  Mail,
  Globe,
  Calendar,
  Building2,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  EvaluatedStudentRecord,
  NpsHourKanbanColumn,
} from '../utils/performanceAnalytics';

interface NpsHourKanbanBoardProps {
  columns: NpsHourKanbanColumn[];
  onSelectStudent: (studentId: number) => void;
  currentTimeStr: string;
}

export const NpsHourKanbanBoard: React.FC<NpsHourKanbanBoardProps> = ({
  columns,
  onSelectStudent,
  currentTimeStr,
}) => {
  if (columns.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-slate-800">
          Nenhum convite NPS ativo encontrado
        </h3>
        <p className="mt-1 max-w-md text-xs text-slate-500">
          Nenhum convite de pesquisa ativo coincide com os filtros aplicados para os alunos matriculados no Kanban.
        </p>
      </div>
    );
  }

  const renderColumn = (col: NpsHourKanbanColumn, isFixedColumn = false) => {
    const isCurrent = col.isCurrentHour;
    const isPast = col.isPastHour;

    const columnBorder = isCurrent
      ? 'border-sky-400/90 ring-1 ring-sky-400/40'
      : isPast
      ? 'border-slate-200/90'
      : 'border-slate-200';

    const headerBg = isCurrent
      ? 'bg-gradient-to-r from-sky-50 via-sky-50/80 to-blue-50/60 border-b border-sky-200'
      : isPast
      ? 'bg-slate-50/90 border-b border-slate-200/80'
      : 'bg-white border-b border-slate-100';

    return (
      <section
        key={col.hourKey}
        data-hour-key={col.hourKey}
        data-current-hour={isCurrent ? 'true' : 'false'}
        aria-label={`Coluna NPS do horário ${col.hourKey}`}
        className={`flex h-full w-[310px] shrink-0 snap-start flex-col rounded-xl border bg-slate-50/40 shadow-xs transition-shadow ${columnBorder}`}
      >
        {/* Header da coluna: totalmente padronizado com o Kanban de Alunos */}
        <header className={`shrink-0 rounded-t-xl p-3 ${headerBg}`}>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                  isCurrent
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {col.hourKey}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xs font-bold text-slate-800">
                  Início às {col.hourKey.replace('h', ':00')}
                </h2>
                <p className="text-[10px] text-slate-500">
                  {col.turno} · {col.totalAgendamentos} agendamento{col.totalAgendamentos !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isCurrent && (
                <span
                  title={`Horário Atual Real (${currentTimeStr})`}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                >
                  <Clock className="h-2.5 w-2.5" />
                  <span>Atual</span>
                </span>
              )}
              {isFixedColumn && !isCurrent && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                  Inicial
                </span>
              )}
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {col.totalConvitesUnicos} NPS
              </span>
            </div>
          </div>

          {/* Sub-indicadores da coluna: Origem e Jornada */}
          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-slate-200/60 pt-2 text-[10px]">
            <div className="flex items-center justify-between rounded bg-white/70 px-1.5 py-0.5 text-slate-600">
              <span className="flex items-center gap-1">
                <Globe className="h-2.5 w-2.5 text-sky-600" />
                <span>Portal:</span>
              </span>
              <strong className="text-slate-800">{col.portalCount}</strong>
            </div>
            <div className="flex items-center justify-between rounded bg-white/70 px-1.5 py-0.5 text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="h-2.5 w-2.5 text-indigo-600" />
                <span>E-mail:</span>
              </span>
              <strong className="text-slate-800">{col.emailCount}</strong>
            </div>
          </div>
        </header>

        {/* Lista de cards da coluna */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
          {col.students.map((student) => {
            const inv = student.npsInvitation;
            const isPortal = student.npsOrigemFormatada === 'Portal do Aluno';

            return (
              <article
                key={`${col.hourKey}-${student.id}`}
                onClick={() => onSelectStudent(student.id)}
                data-nps-control-id={inv?.controlId}
                data-nps-origem={student.npsOrigemFormatada}
                className="group cursor-pointer rounded-lg border border-slate-200/90 bg-white p-3 shadow-2xs transition-colors hover:border-amber-300 hover:shadow-xs"
              >
                {/* 1. Identificação do aluno + Origem da pesquisa */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold leading-snug text-slate-900 group-hover:text-amber-800">
                      {student.nomeCompleto}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500 tabular-nums">
                      Contrato: #{student.contrato} · {student.diaSemana}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                      isPortal
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-800'
                    }`}
                  >
                    {isPortal ? (
                      <Globe className="h-2.5 w-2.5 text-sky-600" />
                    ) : (
                      <Mail className="h-2.5 w-2.5 text-indigo-600" />
                    )}
                    <span>{student.npsOrigemFormatada || 'Portal do Aluno'}</span>
                  </span>
                </div>

                {/* 2. Informações acadêmicas e de turma */}
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="shrink-0 text-slate-500">Módulo:</span>
                    <span className="truncate font-semibold text-slate-800">
                      {student.moduloAtual}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-0.5 text-[11px]">
                    <div className="rounded border border-slate-100 bg-slate-50/80 px-1.5 py-1">
                      <span className="block text-[10px] text-slate-500">Aula</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {student.aulaAtualLabel}
                      </span>
                    </div>

                    <div className="rounded border border-slate-100 bg-slate-50/80 px-1.5 py-1">
                      <span className="block text-[10px] text-slate-500">Sala</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {student.sala}
                      </span>
                    </div>

                    <div className="rounded border border-amber-200/70 bg-amber-50/50 px-1.5 py-1">
                      <span className="block text-[10px] text-amber-700">Jornada</span>
                      <span className="font-semibold text-amber-900 truncate block">
                        {inv?.pontoJornada || '30 dias'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Metadados do convite NPS: Código e Status */}
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <span className="font-mono text-slate-600">
                    Convite: #{inv?.controlId || '---'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ativo Indecx
                  </span>
                </div>

                {/* 4. Ações rápidas: Enviar Pesquisa via WhatsApp + Ver Aluno */}
                <div
                  className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={student.whatsappNpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Enviar pesquisa NPS para ${student.nomeCompleto} via WhatsApp`}
                    className="inline-flex items-center justify-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 whitespace-nowrap"
                  >
                    <MessageCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span>Enviar NPS</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    title={`Ver detalhes do aluno ${student.nomeCompleto}`}
                    className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Eye className="h-3 w-3 shrink-0 text-slate-500" />
                    <span>Ver Aluno</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const [firstColumn, ...remainingColumns] = columns;

  return (
    <div className="flex h-full w-full items-stretch gap-3 overflow-hidden">
      {/* Pinned 1st Column: permanently fixed on the left during horizontal scrolling */}
      <div className="h-full shrink-0 pb-2">{renderColumn(firstColumn, true)}</div>

      {/* Horizontally Scrollable Remaining Columns */}
      {remainingColumns.length > 0 && (
        <div
          id="nps-kanban-scroll-container"
          className="flex h-full min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2"
        >
          {remainingColumns.map((col) => renderColumn(col, false))}
        </div>
      )}
    </div>
  );
};
