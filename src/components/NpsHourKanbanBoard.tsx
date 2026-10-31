import React from 'react';
import {
  CheckCircle2,
  Eye,
  Globe,
  Mail,
  MessageCircle,
  Pin,
  Sparkles,
} from 'lucide-react';
import { NpsHourKanbanColumn } from '../utils/performanceAnalytics';

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
  const getColumnContainerClasses = (col: NpsHourKanbanColumn) => {
    if (col.isCurrentHour) {
      return 'border-sky-300/85 bg-sky-50/20 ring-1 ring-sky-200/50 shadow-2xs';
    }
    if (col.isPastHour) {
      return 'border-emerald-200/65 bg-slate-50/65';
    }
    return 'border-slate-200/80 bg-slate-50/75';
  };

  const getColumnHeaderClasses = (col: NpsHourKanbanColumn) => {
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
        <div className="max-w-md space-y-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Nenhum convite NPS ativo encontrado
          </p>
          <p className="text-xs text-slate-500">
            Nenhum convite de pesquisa ativo coincide com os filtros aplicados para os alunos vinculados no Kanban.
          </p>
        </div>
      </div>
    );
  }

  const renderColumn = (col: NpsHourKanbanColumn) => (
    <section
      key={col.hourKey}
      aria-label={`Horário NPS ${col.hourKey}`}
      data-hour-key={col.hourKey}
      data-hour-state={
        col.isCurrentHour ? 'current' : col.isPastHour ? 'past' : 'future'
      }
      data-current-hour={col.isCurrentHour ? 'true' : 'false'}
      className={`flex h-full w-[326px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border ${getColumnContainerClasses(
        col
      )}`}
    >
      {/* Column Header + Individual Hourly Summary (mesmo padrão estrutural e visual do Kanban de Alunos) */}
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
              <span
                title={`Horário Atual Real (${currentTimeStr})`}
                className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-100/85 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800"
              >
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

        {/* Individual Kanban Hourly Indicators (4 colunas padronizadas) */}
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-lg border border-slate-200/70 bg-white/95 px-2 py-1.5 text-center tabular-nums">
          <div>
            <div className="text-[10px] font-medium text-slate-500">Convites</div>
            <div className="text-xs font-bold text-amber-700">
              {col.totalConvitesUnicos}
            </div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Portal</div>
            <div className="text-xs font-bold text-sky-700">{col.portalCount}</div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">E-mail</div>
            <div className="text-xs font-bold text-indigo-700">{col.emailCount}</div>
          </div>
          <div className="border-l border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">30d / 50+</div>
            <div className="text-xs font-bold text-slate-800">
              {col.jornada30Count}/{col.jornada50Count}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Student NPS Schedule Cards */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {col.students.map((student) => {
          const inv = student.npsInvitation;
          const isPortal = student.npsOrigemFormatada === 'Portal do Aluno';

          return (
            <article
              key={`${col.hourKey}-${student.id}`}
              onClick={() => onSelectStudent(student.id)}
              data-nps-control-id={inv?.controlId}
              data-nps-origem={student.npsOrigemFormatada}
              className="group cursor-pointer rounded-lg border border-slate-200/85 bg-white p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/20 hover:shadow-2xs"
            >
              {/* 1. Identificação do aluno + Origem da pesquisa */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold leading-snug text-slate-900 group-hover:text-sky-700">
                    {student.nomeCompleto}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 tabular-nums">
                    Contrato: #{student.contrato} · {student.diaSemana}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                    isPortal
                      ? 'border-sky-200/90 bg-sky-50/90 text-sky-800'
                      : 'border-indigo-200/90 bg-indigo-50/90 text-indigo-800'
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

              {/* 2. Informações acadêmicas e ponto da jornada */}
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

                  <div className="rounded border border-amber-200/70 bg-amber-50/55 px-1.5 py-1">
                    <span className="block text-[10px] text-amber-700">Jornada</span>
                    <span className="block truncate font-semibold text-amber-900">
                      {inv?.pontoJornada || '30 dias'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Informações da turma e do convite ativo */}
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2 text-[11px]">
                <div className="min-w-0">
                  <span className="text-slate-500">Sala: </span>
                  <span className="font-semibold text-slate-800">
                    {student.sala}
                  </span>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-200/80 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 tabular-nums">
                  <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                  <span>Convite #{inv?.controlId || '---'}</span>
                </span>
              </div>

              {/* 4. Ações rápidas: Enviar Pesquisa via WhatsApp + Ver Aluno */}
              <div
                className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-200/50 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={student.whatsappNpsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Enviar pesquisa NPS para ${student.nomeCompleto} via WhatsApp`}
                  className="inline-flex items-center justify-center gap-1 rounded border border-emerald-200/90 bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50/80 whitespace-nowrap"
                >
                  <MessageCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                  <span>Enviar NPS</span>
                </a>

                <button
                  type="button"
                  onClick={() => onSelectStudent(student.id)}
                  title={`Ver detalhes do aluno ${student.nomeCompleto}`}
                  className="inline-flex items-center justify-center gap-1 rounded border border-sky-200/90 bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-50/80 whitespace-nowrap"
                >
                  <Eye className="h-3 w-3 shrink-0 text-sky-600" />
                  <span>Ver Aluno</span>
                </button>
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
      {/* Pinned 1st Column: permanently fixed on the left during horizontal scrolling */}
      <div className="h-full shrink-0 pb-2">{renderColumn(firstColumn)}</div>

      {/* Horizontally Scrollable Remaining Columns */}
      {remainingColumns.length > 0 && (
        <div
          id="nps-kanban-scroll-container"
          className="flex h-full min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2"
        >
          {remainingColumns.map((col) => renderColumn(col))}
        </div>
      )}
    </div>
  );
};
