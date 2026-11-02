import React, { useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Hash,
  Layers,
  Mail,
  MessageCircle,
  Pin,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  formatBrasiliaDateTime,
  NpsHourKanbanColumn,
  SynchronizedNpsStudentCard,
} from '../utils/performanceAnalytics';

interface NpsHourKanbanBoardProps {
  columns: NpsHourKanbanColumn[];
  onSelectStudentCard: (studentCard: SynchronizedNpsStudentCard) => void;
  currentTimeStr: string;
}

export const NpsHourKanbanBoard: React.FC<NpsHourKanbanBoardProps> = React.memo(({
  columns,
  onSelectStudentCard,
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
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="typo-title-section mt-3 text-slate-900 dark:text-slate-100">
          Nenhum aluno elegível com pesquisa NPS ativa para os filtros selecionados
        </h3>
      </div>
    );
  }

  const renderColumn = (col: NpsHourKanbanColumn) => {
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
        aria-label={`Alunos elegíveis no horário ${col.hourKey}`}
        data-nps-hour-key={col.hourKey}
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
              {col.totalConvites}{' '}
              {col.totalConvites === 1 ? 'aluno' : 'alunos'}
            </span>
          </div>
        </div>

        {/* Cards Reorganizados por Nível de Importância e Destinatário (Aluno vs Responsável) */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          {col.invitations.map((card) => {
            const latest = card.latestActiveInvitation;
            const isPortal = latest.origem === 'Portal do Aluno';
            const isResponsavel = card.npsDestinatario === 'RESPONSAVEL';
            const totalPesquisasHistorico = card.studentSurveyHistory.length;
            const outrasPesquisasCount = Math.max(0, totalPesquisasHistorico - 1);
            const cicloFormatado = (latest.pontoJornada || 'Ciclo Regular').replace(
              /\b(Novo contrato|Conclu[ií]do)\s+dias\b/i,
              '$1'
            );
            const deliveryStatus = latest.emailDeliveryStatus || (isPortal ? 'Entregue' : 'Enviado');
            const deliveryBadgeStyle =
              deliveryStatus === 'Aberto'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300'
                : deliveryStatus === 'Entregue'
                ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/70 dark:bg-sky-950/60 dark:text-sky-300'
                : deliveryStatus === 'Não entregue'
                ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-300'
                : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300';

            return (
              <article
                key={`${card.linkedContrato}-${latest.id}`}
                onClick={() => onSelectStudentCard(card)}
                data-nps-student-contrato={card.linkedContrato}
                data-nps-control-id={latest.controlId}
                data-nps-origem={latest.origem}
                data-nps-destinatario={card.npsDestinatario}
                data-nps-nivel-cruzamento={card.nivelCruzamento}
                data-nps-familia-ambigua={card.isVinculoFamiliarAmbiguo ? 'true' : 'false'}
                data-nps-delivery-status={deliveryStatus}
                data-nps-history-count={totalPesquisasHistorico}
                className={`group cursor-pointer rounded-lg border bg-white p-2.5 transition-all duration-150 hover:shadow-xs dark:bg-slate-900 ${
                  isResponsavel
                    ? 'border-fuchsia-200/90 hover:border-fuchsia-400 dark:border-fuchsia-900/70 dark:hover:border-fuchsia-600'
                    : 'border-slate-200/90 hover:border-purple-400 dark:border-slate-800 dark:hover:border-purple-600'
                }`}
              >
                {/* NÍVEL 1 (Prioritário): Nome do Aluno + Canal de Origem e Contrato + Sala */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3
                      title={card.linkedStudentName}
                      className="typo-card-title line-clamp-2 break-words text-slate-900 group-hover:text-[#004A8D] dark:text-slate-100 dark:group-hover:text-sky-400"
                    >
                      {card.linkedStudentName}
                    </h3>
                    <div className="typo-meta mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-500 tabular-nums dark:text-slate-400">
                      <span className="shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                        #{card.linkedContrato}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className="font-semibold text-slate-700 dark:text-slate-300"
                        title={`Sala: ${card.linkedSala}`}
                      >
                        Sala: {card.linkedSala}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`typo-badge inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 whitespace-nowrap ${
                      isPortal
                        ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/70 dark:bg-sky-950/60 dark:text-sky-300'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    {isPortal ? (
                      <Globe className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />
                    ) : (
                      <Mail className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <span>{latest.origem}</span>
                  </span>
                </div>

                {/* NÍVEL 2 (3.1 Badge Indicador de Destinatário + 3.2 Identificação do Respondente + Status Real Indecx) */}
                <div className="mt-1.5 space-y-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    {/* 3.1. Badge Indicador de Destinatário (Roxo = Aluno | Lilás/Fúcsia = Responsável) */}
                    <span
                      data-testid="nps-card-recipient-badge"
                      title={
                        isResponsavel
                          ? `Convite enviado ao responsável (${card.respondenteNome}) — Nível ${card.nivelCruzamento}`
                          : `Convite enviado diretamente ao aluno — Nível ${card.nivelCruzamento}`
                      }
                      className={`typo-badge inline-flex min-w-0 items-center gap-1 rounded border px-1.5 py-0.5 font-semibold ${
                        isResponsavel
                          ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-800/80 dark:bg-fuchsia-950/65 dark:text-fuchsia-200'
                          : 'border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-800/80 dark:bg-purple-950/65 dark:text-purple-200'
                      }`}
                    >
                      {isResponsavel ? (
                        <Users className="h-2.5 w-2.5 shrink-0 text-fuchsia-600 dark:text-fuchsia-400" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                      )}
                      <span className="truncate">
                        Convite NPS: {isResponsavel ? 'Responsável' : 'Aluno'} ({cicloFormatado})
                      </span>
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        title={
                          latest.emailBounceReason
                            ? `Status real de envio Indecx: ${deliveryStatus} (${latest.emailBounceReason})`
                            : `Status real de envio Indecx: ${deliveryStatus}`
                        }
                        className={`typo-badge inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-semibold whitespace-nowrap ${deliveryBadgeStyle}`}
                      >
                        <span>{deliveryStatus}</span>
                      </span>
                      <span className="typo-badge inline-flex items-center gap-0.5 rounded border border-purple-200/80 bg-purple-50/70 px-1.5 py-0.5 font-mono whitespace-nowrap text-purple-800 tabular-nums dark:border-purple-800/70 dark:bg-purple-950/60 dark:text-purple-300">
                        <Hash className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                        {latest.controlId || latest.id.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* 3.2. Subtítulo com Identificação Clara do Respondente e Vínculo Familiar */}
                  <div
                    data-testid="nps-card-respondent-label"
                    title={card.respondenteVinculoLabel}
                    className={`typo-meta flex items-start gap-1 rounded border px-2 py-1 ${
                      isResponsavel
                        ? 'border-fuchsia-200/70 bg-fuchsia-50/50 text-fuchsia-950 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-200'
                        : 'border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                    }`}
                  >
                    <UserCheck
                      className={`mt-0.5 h-3 w-3 shrink-0 ${
                        isResponsavel
                          ? 'text-fuchsia-600 dark:text-fuchsia-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`}
                    />
                    <span className="line-clamp-2 break-words font-medium">
                      {card.respondenteVinculoLabel}
                    </span>
                  </div>

                  {/* 4.2. Alerta de Vínculo Familiar quando há irmãos elegíveis no mesmo ciclo */}
                  {card.isVinculoFamiliarAmbiguo && (
                    <div
                      data-testid="nps-card-sibling-badge"
                      title={`Núcleo familiar com múltiplos filhos elegíveis: ${card.alunosVinculadosFamilia.join(', ')}. Consolidado em card único para evitar abordagem duplicada.`}
                      className="typo-meta flex items-center gap-1 rounded border border-amber-300/90 bg-amber-50/80 px-2 py-0.5 font-semibold text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
                    >
                      <Users className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="truncate">
                        Núcleo Familiar ({card.alunosVinculadosFamilia.length} irmãos vinculados)
                      </span>
                    </div>
                  )}

                  <div className="typo-meta flex items-center justify-between gap-2 rounded border border-slate-200/70 bg-slate-50/80 px-2 py-1 text-slate-600 tabular-nums dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {formatBrasiliaDateTime(latest.createdAt)}
                      </span>
                    </span>

                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-purple-800 dark:text-purple-300">
                      <Layers className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                      <span>
                        {outrasPesquisasCount > 0
                          ? `1 ativa (+${outrasPesquisasCount})`
                          : '1 pesquisa'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* NÍVEL 3 (Ação): 3.3 Disparo Inteligente pelo WhatsApp + Abrir Detalhes e Histórico */}
                <div
                  className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={card.whatsappNpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="nps-card-whatsapp-btn"
                    title={
                      isResponsavel
                        ? `Enviar pesquisa NPS para o responsável (${card.respondenteNome}) via WhatsApp`
                        : `Enviar pesquisa NPS para o aluno (${card.linkedStudentName}) via WhatsApp`
                    }
                    className={`typo-btn inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 transition-colors ${
                      isResponsavel
                        ? 'border-fuchsia-300 bg-fuchsia-50/80 text-fuchsia-900 hover:bg-fuchsia-600 hover:text-white dark:border-fuchsia-800/70 dark:bg-fuchsia-950/60 dark:text-fuchsia-200 dark:hover:bg-fuchsia-600 dark:hover:text-white'
                        : 'border-emerald-300 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-600 hover:text-white dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-600 dark:hover:text-white'
                    }`}
                  >
                    <MessageCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {isResponsavel ? 'WhatsApp Resp.' : 'WhatsApp Aluno'}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onSelectStudentCard(card)}
                    title={`Ver detalhes e histórico cronológico de pesquisas de ${card.linkedStudentName}`}
                    className="typo-btn inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[#004A8D]/25 bg-sky-50/60 px-2 text-[#004A8D] transition-colors hover:bg-[#004A8D] hover:text-white dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white"
                  >
                    <Eye className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {outrasPesquisasCount > 0
                        ? `Histórico (${totalPesquisasHistorico})`
                        : 'Ver detalhes'}
                    </span>
                  </button>
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
      data-testid="nps-kanban-container"
      className="flex h-full w-full items-stretch gap-3 overflow-hidden"
    >
      {/* Coluna do Horário Atual FIXADA à esquerda */}
      {pinnedCurrentColumn && (
        <div
          data-testid="nps-pinned-current-hour-wrapper"
          className="flex h-full shrink-0 items-stretch border-r border-slate-300/80 pr-2 dark:border-slate-800"
        >
          {renderColumn(pinnedCurrentColumn)}
        </div>
      )}

      {/* Demais colunas com rolagem horizontal suave */}
      <div
        data-testid="nps-scrollable-hours-wrapper"
        className="flex h-full min-w-0 flex-1 items-stretch gap-3 overflow-x-auto pb-1"
      >
        {scrollableOtherColumns.map((col) => renderColumn(col))}
      </div>
    </div>
  );
});
