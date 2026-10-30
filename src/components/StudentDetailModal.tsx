import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookX,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  History,
  KeyRound,
  MessageCircle,
  Phone,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { EvaluatedStudentRecord } from '../utils/performanceAnalytics';

interface StudentDetailModalProps {
  student: EvaluatedStudentRecord | null;
  studentHistory: EvaluatedStudentRecord[];
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  studentHistory,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!student) return null;

  const presencasHistorico = studentHistory.filter(
    (h) => h.attendanceStatus === 'Presença'
  ).length;
  const faltasHistorico = studentHistory.filter(
    (h) => h.attendanceStatus === 'Falta'
  ).length;
  const naoIniciadosHistorico = studentHistory.filter(
    (h) => h.attendanceStatus === 'Não iniciado'
  ).length;

  const handleCopyAuthLink = async () => {
    try {
      await navigator.clipboard.writeText(student.linkAcessoDireto);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback silent
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 tabular-nums">
                <span className="font-semibold text-slate-700">
                  Contrato #{student.contrato}
                </span>
                <span aria-hidden="true">·</span>
                <span>{student.diaSemana}</span>
                <span aria-hidden="true">·</span>
                <span>{student.turno}</span>
              </div>
              <h2
                id="student-detail-title"
                className="font-display mt-1.5 text-lg font-bold text-slate-900"
              >
                {student.nomeCompleto}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-600">
                {student.formacao}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes do aluno"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Convite NPS Ativo (Indecx) */}
          {student.hasActiveNps && student.npsInvitation && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-amber-50/75 p-3.5 text-amber-950">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    Convite NPS Ativo ({student.npsInvitation.pontoJornada})
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-amber-800 tabular-nums">
                    Convite #{student.npsInvitation.controlId} ·{' '}
                    {student.npsInvitation.actionName}
                  </div>
                </div>
              </div>
              {student.whatsappNpsUrl && (
                <a
                  href={student.whatsappNpsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/70"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Enviar NPS</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>
          )}

          {/* Alerta de Possível Evasão (quando identificado pela regra automática) */}
          {student.isEvasao && (
            <div className="evasao-alert-pulse flex items-center justify-between gap-3 rounded-xl border border-rose-200/90 bg-rose-50/75 p-3.5 text-rose-900">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <div className="text-xs font-bold text-rose-800">
                    Alerta Automático de Possível Evasão
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-rose-700">
                    {student.evasaoSummary ||
                      'Mais de 2 horários agendados no mesmo dia, com presença em um horário e falta nos demais.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Automatic Attendance Status Banner */}
          <div
            className={`flex items-center justify-between rounded-xl border p-3.5 ${
              student.attendanceStatus === 'Presença'
                ? 'border-emerald-200/80 bg-emerald-50/60 text-emerald-950'
                : student.attendanceStatus === 'Falta'
                ? 'border-rose-200/80 bg-rose-50/60 text-rose-950'
                : 'border-slate-200 bg-slate-50/90 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {student.attendanceStatus === 'Presença' && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              )}
              {student.attendanceStatus === 'Falta' && (
                <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
              )}
              {student.attendanceStatus === 'Não iniciado' && (
                <Clock className="h-5 w-5 shrink-0 text-slate-500" />
              )}
              <div>
                <div className="text-[11px] font-medium opacity-80">
                  Status Atual do Aluno ({student.toleranceWindowLabel})
                </div>
                <div className="text-sm font-bold">{student.attendanceStatus}</div>
              </div>
            </div>
            <div className="text-right text-xs font-semibold tabular-nums">
              <div>
                {student.diaSemana} · {student.horario}
              </div>
              <div className="mt-0.5 text-[11px] font-normal opacity-80">
                Status no Portal: {student.status}
              </div>
            </div>
          </div>

          {/* Informações Acadêmicas e da Turma */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              Informações Acadêmicas e da Turma
            </h3>
            <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-3">
              <div className="sm:col-span-2">
                <span className="text-slate-500">Módulo Atual</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {student.moduloAtual}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Aula Atual</span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {student.aulaInfo || student.aulaAtualLabel}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Modalidade</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {student.modalidade}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Sala de Aula</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {student.sala}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Situação da Apostila</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {student.possuiApostila ? (
                    <>
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-700">
                        <BookOpen className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-emerald-700">
                        Possui apostila
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-1 text-red-600">
                        <BookX className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-red-700">
                        Sem apostila
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Última Nota de Avaliação</span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {student.nota !== null
                    ? `${student.nota.toFixed(2).replace('.', ',')} (Aval. #${student.notaId})`
                    : 'Sem avaliação registrada'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Origem / Sistema</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {student.infoAula || 'Não registrado'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Situação Cadastral</span>
                <p
                  className={`mt-0.5 font-semibold ${
                    student.inadimplente ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {student.inadimplente ? 'Pendência financeira' : 'Regular'}
                </p>
              </div>
            </div>
          </div>

          {/* Histórico de Presenças e Faltas do Contrato */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <History className="h-3.5 w-3.5 text-blue-600" />
                Histórico de Presenças e Faltas (Contrato #{student.contrato})
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums">
                <span className="text-emerald-700">
                  {presencasHistorico} Presença(s)
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-red-700">{faltasHistorico} Falta(s)</span>
                {naoIniciadosHistorico > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-700">
                      {naoIniciadosHistorico} Não inic.
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
              {studentHistory.map((item) => {
                const isSelectedClass = item.id === student.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
                      isSelectedClass ? 'bg-sky-50/45' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 tabular-nums">
                        <span>{item.diaSemana}</span>
                        <span className="text-slate-300">·</span>
                        <span>{item.horario}</span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{item.curso}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 tabular-nums">
                        <span>{item.aulaInfo}</span>
                        <span>·</span>
                        <span>Sala {item.sala}</span>
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
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${
                        item.attendanceStatus === 'Presença'
                          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700'
                          : item.attendanceStatus === 'Falta'
                          ? 'border-rose-200/80 bg-rose-50/90 text-rose-700'
                          : 'border-slate-200 bg-slate-100/80 text-slate-600'
                      }`}
                    >
                      {item.attendanceStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dados de Contato e Link Direto de Autenticação */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              Contatos e Acesso Direto do Aluno
            </h3>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Telefone do Aluno</span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {student.telefoneAluno || 'Não cadastrado no sistema'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Responsável Cadastrado</span>
                <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">
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
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Link Individual de Autenticação Direta (Token do Aluno)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAuthLink}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 truncate rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 select-all">
                  {student.linkAcessoDireto}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions via WhatsApp */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              Ações Rápidas via WhatsApp
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={student.whatsappResponsavelContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
              >
                <MessageCircle className="h-4 w-4 text-blue-700" />
                <span>Contatar Responsável</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href={student.whatsappAlunoLoginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                <KeyRound className="h-4 w-4 text-emerald-700" />
                <span>Enviar Link de Acesso Direto</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
