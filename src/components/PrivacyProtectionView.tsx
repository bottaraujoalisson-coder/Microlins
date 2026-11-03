import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Database,
  FileCheck2,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  PRIVACY_KNOWLEDGE_BASE,
  PRIVACY_QUICK_QUESTIONS,
  PrivacyKnowledgeTopic,
  searchPrivacyKnowledgeBase,
} from '../utils/privacyKnowledgeBase';
import { createLgpdRequestInSupabase } from '../utils/supabaseClient';

interface PrivacyProtectionViewProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeSchoolName?: string;
  activeUserName?: string;
  activeUserRole?: string;
}

export const PrivacyProtectionView: React.FC<PrivacyProtectionViewProps> = ({
  onBack,
  theme,
  onToggleTheme,
  activeSchoolName = 'PORTAL DE PRIVACIDADE E GOVERNANÇA LGPD',
  activeUserName,
  activeUserRole,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    PRIVACY_KNOWLEDGE_BASE[0]?.id || null
  );

  // Estado do formulário de requisição de direitos do titular (Art. 18 LGPD)
  const [requesterName, setRequesterName] = useState<string>(activeUserName || '');
  const [requesterEmail, setRequesterEmail] = useState<string>('');
  const [requesterRole, setRequesterRole] = useState<string>(
    activeUserRole || 'Aluno / Responsável Legal'
  );
  const [requestType, setRequestType] = useState<
    | 'ACESSO_DADOS'
    | 'CORRECAO_DADOS'
    | 'ANONIMIZACAO_EXCLUSAO'
    | 'REVOGACAO_CONSENTIMENTO'
    | 'DUVIDA_ENCARREGADO'
  >('ACESSO_DADOS');
  const [description, setDescription] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestFeedback, setRequestFeedback] = useState<{
    type: 'success' | 'error';
    protocol?: string;
    message: string;
  } | null>(null);

  const filteredTopics = useMemo<PrivacyKnowledgeTopic[]>(() => {
    const byQuery = searchPrivacyKnowledgeBase(searchQuery);
    if (selectedCategory === 'TODAS') return byQuery;
    return byQuery.filter((t) => t.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleQuickQuestionClick = (question: string) => {
    setSearchQuery(question);
    setSelectedCategory('TODAS');
    const matches = searchPrivacyKnowledgeBase(question);
    if (matches.length > 0) {
      setExpandedTopicId(matches[0].id);
    }
  };

  const handleSubmitLgpdRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestFeedback(null);

    if (!requesterName.trim() || !requesterEmail.trim() || !description.trim()) {
      setRequestFeedback({
        type: 'error',
        message:
          'Preencha seu nome completo, e-mail de contato e a descrição detalhada da solicitação.',
      });
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const payload = {
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
        requesterRole: requesterRole.trim(),
        requestType,
        description: description.trim(),
      };

      const supaRecord = await createLgpdRequestInSupabase(payload);

      try {
        await fetch('/api/privacy/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Servidor local opcional (em produção Netlify a gravação já ocorreu no Supabase)
      }

      setRequestFeedback({
        type: 'success',
        protocol: supaRecord.protocol,
        message: `Solicitação registrada com sucesso no Supabase sob o protocolo ${supaRecord.protocol}.`,
      });
      setDescription('');
    } catch (err: any) {
      setRequestFeedback({
        type: 'error',
        message:
          err?.message ||
          'Não foi possível registrar a solicitação no canal LGPD.',
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const categories = [
    'TODAS',
    'Armazenamento e Banco de Dados',
    'Criptografia e Senhas',
    'Controle de Acesso (RBAC)',
    'Coleta e Finalidade',
    'Direitos do Titular (LGPD)',
    'Segurança da Conta',
    'Retenção e Compartilhamento',
    'Canal de Atendimento e DPO',
  ];

  return (
    <div
      data-testid="privacy-protection-view"
      className="flex min-h-screen w-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      {/* CABEÇALHO INSTITUCIONAL MINIMALISTA E COMPACTO */}
      <header
        data-testid="privacy-header"
        className="shrink-0 border-b border-[#00386B] bg-[#004A8D] text-white shadow-xs dark:border-slate-800 dark:bg-[#003669]"
      >
        <div className="flex min-h-10 w-full flex-wrap items-center justify-between gap-2 px-3 py-1 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/assets/aistudio/logo-microlins_6400203f.png"
              alt="Microlins"
              className="h-5 w-auto object-contain brightness-0 invert"
            />
            <div className="hidden h-4 w-px bg-white/20 sm:block" />
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-sky-200" />
              <span className="text-xs font-extrabold tracking-tight text-white sm:text-sm">
                {activeSchoolName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activeUserName && (
              <div className="hidden h-7 items-center gap-1.5 rounded-md border border-white/15 bg-[#002D58] px-2.5 text-xs text-sky-100 sm:inline-flex">
                <UserCheck className="h-3 w-3 text-sky-200" />
                <span className="font-bold text-white">{activeUserName}</span>
                {activeUserRole && (
                  <span className="text-[11px] text-sky-300">
                    ({activeUserRole})
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              title={
                theme === 'light'
                  ? 'Alternar para Tema Escuro'
                  : 'Alternar para Tema Claro'
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              {theme === 'light' ? (
                <Moon className="h-3.5 w-3.5 text-sky-100" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-300" />
              )}
            </button>

            <button
              type="button"
              data-testid="privacy-back-btn"
              onClick={onBack}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/25 bg-white px-2.5 text-xs font-bold text-[#004A8D] shadow-2xs transition-colors hover:bg-sky-50"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-6 sm:px-6">
        {/* BANNER HERO E PILARES TÉCNICOS DE PROTEÇÃO */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#004A8D] dark:bg-sky-950/60 dark:text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CONFORMIDADE LGPD · LEI Nº 13.709/2018</span>
              </div>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Privacidade e Proteção de Dados Pessoais
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Consulte como os dados acadêmicos e cadastrais são protegidos e registre solicitações de direitos de titulares.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[440px]">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <KeyRound className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
                <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Senhas de Acesso
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Hash Argon2id
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Credenciais API
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  AES-256-GCM
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Persistência Real
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  SQLite ACID
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Permissões
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  RBAC + Trilha
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CAIXA DE PESQUISA SOBRE PRIVACIDADE E PROTEÇÃO DE DADOS */}
        <section
          aria-label="Pesquisa inteligente sobre privacidade e proteção de dados"
          data-testid="privacy-intelligent-search-section"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#004A8D] dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              Base de Conhecimento de Privacidade e Segurança
            </h2>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#004A8D] dark:text-sky-400" />
            <input
              type="search"
              data-testid="privacy-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar dúvida sobre privacidade, senhas, armazenamento ou LGPD..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/70 pr-4 pl-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#004A8D] focus:bg-white focus:ring-2 focus:ring-[#004A8D]/20 focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Sugestões Rápidas das 7 Perguntas Obrigatórias */}
          <div className="mt-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Perguntas Frequentes (Clique para consultar):
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRIVACY_QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickQuestionClick(q)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${
                    searchQuery === q
                      ? 'border-[#004A8D] bg-[#004A8D] text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#004A8D]/50 hover:bg-sky-50/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por Categoria */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <span className="mr-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Filtrar por tema:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Resultados da Base Oficial de Conhecimento */}
          <div
            data-testid="privacy-knowledge-results"
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {filteredTopics.map((topic) => {
              const isExpanded = expandedTopicId === topic.id;
              return (
                <article
                  key={topic.id}
                  data-testid={`privacy-topic-${topic.id}`}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                    isExpanded
                      ? 'border-[#004A8D] bg-white ring-1 ring-[#004A8D]/20 dark:border-sky-500 dark:bg-slate-900'
                      : 'border-slate-200/90 bg-white/90 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-[#004A8D] dark:bg-sky-950/70 dark:text-sky-300">
                        {topic.category}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {topic.legalBasis}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                      {topic.question}
                    </h3>

                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                      {topic.shortAnswer}
                    </p>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        <p>{topic.detailedExplanation}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTopicId(isExpanded ? null : topic.id)
                      }
                      className="text-xs font-bold text-[#004A8D] underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      {isExpanded
                        ? 'Recolher detalhes técnicos'
                        : 'Ver explicação técnica completa'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* QUADRO DETALHADO DAS DIRETRIZES LGPD + FORMULÁRIO DO TITULAR */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Coluna Esquerda (7 cols): Direitos dos Titulares e Pilares de Governança */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#004A8D] dark:text-sky-400" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Direitos dos Titulares de Dados (Art. 18 da LGPD)
                </h2>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                A qualquer momento, alunos, responsáveis legais e colaboradores
                podem exercer gratuitamente seus direitos perante a unidade escolar:
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  {
                    title: '1. Confirmação e Acesso',
                    desc: 'Confirmar a existência de tratamento e acessar todos os dados cadastrais, acadêmicos e de frequência vinculados ao seu contrato.',
                  },
                  {
                    title: '2. Correção de Dados',
                    desc: 'Solicitar a atualização imediata de dados incompletos, inexatos ou desatualizados (telefone, e-mail, responsável ou nome).',
                  },
                  {
                    title: '3. Sigilo Financeiro em Sala',
                    desc: 'Garantia técnica de que valores, boletos ou quantidade de parcelas não são expostos em telas pedagógicas de sala de aula.',
                  },
                  {
                    title: '4. Anonimização ou Exclusão',
                    desc: 'Requerer o bloqueio, anonimização ou eliminação de dados desnecessários, respeitados os prazos legais do acervo escolar.',
                  },
                  {
                    title: '5. Informação sobre Compartilhamento',
                    desc: 'Transparência total sobre a integração estrita com o Portal do Aluno MoveEdu e a plataforma oficial de pesquisa NPS Indecx.',
                  },
                  {
                    title: '6. Revogação e Oposição',
                    desc: 'Gerenciar preferências de recebimento de convites de pesquisa de satisfação e comunicações não obrigatórias.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Arquitetura de Segurança Implementada */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Medidas Técnicas e Administrativas de Segurança
                </h2>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#004A8D] dark:bg-sky-400" />
                  <span>
                    <strong>Banco de Dados Relacional Persistente:</strong> Todas as
                    unidades, credenciais, sessões, trilhas de auditoria e protocolos
                    LGPD são armazenados em banco SQLite transacional (WAL + Foreign
                    Keys) com backups preventivos automáticos.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#004A8D] dark:bg-sky-400" />
                  <span>
                    <strong>Criptografia de Senhas e Segredos:</strong> Senhas de
                    usuários nunca são salvas em texto puro, utilizando{' '}
                    <code>Argon2id</code> com sal aleatório de 128 bits. Credenciais de
                    integração externa utilizam criptografia autenticada{' '}
                    <code>AES-256-GCM</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#004A8D] dark:bg-sky-400" />
                  <span>
                    <strong>Proteção contra Força Bruta, XSS e SQL Injection:</strong>{' '}
                    Bloqueio automático após 5 tentativas inválidas de login, queries
                    100% parametrizadas (Prepared Statements) e filtro ativo contra
                    payloads maliciosos.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Coluna Direita (5 cols): Canal Oficial de Atendimento LGPD com Protocolo */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-[#004A8D] dark:text-sky-400" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Solicitação de Direitos do Titular (Canal LGPD)
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Registre um chamado formal de privacidade, atualização cadastral ou
                consulta de dados. Um protocolo auditável será gerado imediatamente.
              </p>

              {requestFeedback && (
                <div
                  data-testid="lgpd-request-feedback"
                  className={`mt-4 rounded-xl border p-3.5 text-xs ${
                    requestFeedback.type === 'success'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                  }`}
                >
                  <p className="font-black">
                    {requestFeedback.type === 'success'
                      ? `Protocolo Oficial: ${requestFeedback.protocol}`
                      : 'Atenção'}
                  </p>
                  <p className="mt-0.5">{requestFeedback.message}</p>
                </div>
              )}

              <form onSubmit={handleSubmitLgpdRequest} className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="lgpd-name"
                    className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Nome Completo do Titular ou Responsável
                  </label>
                  <input
                    id="lgpd-name"
                    data-testid="lgpd-name-input"
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ex.: Maria Aparecida da Silva"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="lgpd-email"
                      className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      E-mail para Retorno
                    </label>
                    <input
                      id="lgpd-email"
                      data-testid="lgpd-email-input"
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lgpd-role"
                      className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Vínculo com a Escola
                    </label>
                    <select
                      id="lgpd-role"
                      value={requesterRole}
                      onChange={(e) => setRequesterRole(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Aluno / Responsável Legal">
                        Aluno / Responsável Legal
                      </option>
                      <option value="Colaborador Pedagógico">
                        Colaborador Pedagógico
                      </option>
                      <option value="Coordenação / Secretaria">
                        Coordenação / Secretaria
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lgpd-type"
                    className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Tipo de Solicitação (Art. 18 LGPD)
                  </label>
                  <select
                    id="lgpd-type"
                    data-testid="lgpd-type-select"
                    value={requestType}
                    onChange={(e) =>
                      setRequestType(
                        e.target.value as
                          | 'ACESSO_DADOS'
                          | 'CORRECAO_DADOS'
                          | 'ANONIMIZACAO_EXCLUSAO'
                          | 'REVOGACAO_CONSENTIMENTO'
                          | 'DUVIDA_ENCARREGADO'
                      )
                    }
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ACESSO_DADOS">
                      Confirmação e Acesso aos Dados Pessoais
                    </option>
                    <option value="CORRECAO_DADOS">
                      Correção / Atualização de Dados Cadastrais
                    </option>
                    <option value="ANONIMIZACAO_EXCLUSAO">
                      Anonimização, Bloqueio ou Exclusão de Dados
                    </option>
                    <option value="REVOGACAO_CONSENTIMENTO">
                      Revogação de Consentimento / Preferências NPS
                    </option>
                    <option value="DUVIDA_ENCARREGADO">
                      Dúvida sobre Segurança ou Tratamento de Dados
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="lgpd-desc"
                    className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Descrição da Solicitação
                  </label>
                  <textarea
                    id="lgpd-desc"
                    data-testid="lgpd-desc-textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Informe o número de matrícula/contrato ou descreva sua solicitação..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-[#004A8D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="lgpd-submit-btn"
                  disabled={isSubmittingRequest}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#004A8D] px-4 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#003B70] disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isSubmittingRequest
                      ? 'Registrando Protocolo LGPD...'
                      : 'Registrar Solicitação com Protocolo Oficial'}
                  </span>
                </button>
              </form>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  Encarregado pelo Tratamento de Dados (DPO / Suporte Técnico):
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3 text-[#004A8D] dark:text-sky-400" />
                    <span>Alisson Araújo Bott</span>
                  </span>
                  <a
                    href="https://wa.me/5518997432487"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#004A8D] underline dark:text-sky-400"
                  >
                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                    <span>WhatsApp: (18) 99743-2487</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* RODAPÉ INSTITUCIONAL MINIMALISTA EM LINHA ÚNICA */}
      <footer className="shrink-0 border-t border-[#001B3A] bg-[#002855] px-3 py-1 text-[11px] text-slate-200 sm:px-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-white">
            © 2026 Grupo Realizar Microlins
          </span>
          <span className="hidden font-medium text-sky-200 sm:inline">
            Desenvolvido por Alisson Araújo Bott
          </span>
          <span className="inline-flex items-center gap-1 text-slate-200">
            <MessageSquare className="h-3 w-3 shrink-0 text-emerald-400" />
            <span>Suporte:</span>
            <a
              href="https://wa.me/5518997432487"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-sky-400/70 underline-offset-2 transition-colors hover:text-sky-200"
            >
              (18) 99743-2487
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};
