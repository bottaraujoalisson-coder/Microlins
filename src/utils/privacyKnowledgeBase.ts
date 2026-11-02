export interface PrivacyKnowledgeTopic {
  id: string;
  question: string;
  category:
    | 'Armazenamento e Banco de Dados'
    | 'Criptografia e Senhas'
    | 'Controle de Acesso (RBAC)'
    | 'Coleta e Finalidade'
    | 'Direitos do Titular (LGPD)'
    | 'Segurança da Conta'
    | 'Retenção e Compartilhamento'
    | 'Canal de Atendimento e DPO';
  categoryLabel: string;
  shortAnswer: string;
  detailedExplanation: string;
  legalBasis: string;
  technicalProof: string;
  keywords: string[];
  score?: number;
}

export type PrivacyKnowledgeArticle = PrivacyKnowledgeTopic;

export const PRIVACY_QUICK_QUESTIONS: string[] = [
  'Como meus dados são armazenados?',
  'Quem pode acessar minhas informações?',
  'Como minha senha é protegida?',
  'Quais informações são coletadas?',
  'Como solicitar a correção ou exclusão de dados?',
  'Como funciona a segurança da minha conta?',
  'Como entrar em contato sobre questões de privacidade?',
];

export const PRIVACY_KNOWLEDGE_BASE: PrivacyKnowledgeTopic[] = [
  {
    id: 'armazenamento-dados',
    question: 'Como meus dados são armazenados?',
    category: 'Armazenamento e Banco de Dados',
    categoryLabel: 'Armazenamento e Banco de Dados',
    shortAnswer:
      'Seus dados são armazenados em um banco de dados relacional SQLite persistente no servidor, com integridade referencial (Foreign Keys), modo WAL, backups versionados e criptografia autenticada AES-256-GCM para credenciais de integração.',
    detailedExplanation:
      'Todas as informações institucionais de escolas, usuários autorizados, sessões de acesso, solicitações de privacidade e logs de auditoria são persistidas em banco de dados relacional estruturado (SQLite com transações ACID). Credenciais de integração com sistemas externos (Portal MoveEdu e Indecx NPS) são criptografadas em repouso utilizando criptografia autenticada com vetor de inicialização (IV) único por registro. Backups automáticos e versionados são mantidos no diretório seguro do servidor antes de qualquer migração estrutural.',
    legalBasis: 'Art. 46 da LGPD (Lei nº 13.709/2018)',
    technicalProof:
      'Tabelas relacionais: schools, users, sessions, audit_logs, lgpd_requests e schema_migrations com chaves estrangeiras ativas.',
    keywords: [
      'como meus dados sao armazenados',
      'armazenamento',
      'banco de dados',
      'onde ficam',
      'guardados',
      'salvos',
      'sqlite',
      'criptografia',
      'backup',
      'persistencia',
    ],
  },
  {
    id: 'acesso-informacoes',
    question: 'Quem pode acessar minhas informações?',
    category: 'Controle de Acesso (RBAC)',
    categoryLabel: 'Controle de Acesso (RBAC)',
    shortAnswer:
      'Apenas profissionais autenticados e expressamente vinculados à unidade escolar possuem acesso aos indicadores pedagógicos, sob controle de acesso baseado em papéis (RBAC) validado no servidor.',
    detailedExplanation:
      'O sistema aplica separação rigorosa entre dois níveis de permissão validados no Back-end: Administrador (ADM) e Perfil da Escola (Auxiliares Pedagógicos, Instrutores e Coordenação). Usuários de uma unidade escolar visualizam exclusivamente os dados pedagógicos de sua respectiva escola, sendo bloqueados pelo servidor de acessar rotas administrativas (/api/admin/*) ou elevar privilégios. Em respeito à privacidade financeira do aluno e da família, o painel pedagógico aplica minimização de dados (Art. 6º, III da LGPD): instrutores visualizam apenas um indicador binário discreto ("Em dia" ou "Em atraso"), sem exposição de valores monetários ou quantidade de parcelas vencidas em sala de aula.',
    legalBasis: 'Art. 6º, III e VII da LGPD (Lei nº 13.709/2018)',
    technicalProof:
      'Middleware de autorização no servidor (requireAdmin) valida o token de sessão SHA-256 a cada requisição na API.',
    keywords: [
      'quem pode acessar minhas informacoes',
      'quem acessa',
      'quem ve',
      'permissoes',
      'acesso',
      'administrador',
      'professor',
      'instrutor',
      'financeiro',
      'inadimplencia',
      'rbac',
    ],
  },
  {
    id: 'protecao-senha',
    question: 'Como minha senha é protegida?',
    category: 'Criptografia e Senhas',
    categoryLabel: 'Criptografia e Senhas',
    shortAnswer:
      'Sua senha de acesso nunca é armazenada em texto puro: ela é protegida com hash criptográfico irreversível Argon2id com salt aleatório de 16 bytes e validação em tempo constante.',
    detailedExplanation:
      'Utilizamos o algoritmo Argon2id (vencedor da Password Hashing Competition e recomendado pela OWASP), resistente tanto a ataques de força bruta em GPU (side-channel) quanto a ataques de memória (time-memory trade-off). Cada senha recebe um salt criptográfico exclusivo de 128 bits (16 bytes) antes da derivação da chave, no formato padrão PHC ($argon2id$v=19$m=4096,t=3,p=1$...). A verificação durante o login utiliza comparação em tempo constante para impedir ataques de medição de tempo (timing attacks).',
    legalBasis: 'Art. 46 e Art. 49 da LGPD',
    technicalProof:
      'Módulo src/utils/securityCrypto.ts com Argon2id (RFC 9106) e verificação em tempo constante.',
    keywords: [
      'como minha senha e protegida',
      'senha',
      'hash',
      'argon2',
      'argon2id',
      'criptografada',
      'roubo de senha',
      'seguranca da senha',
    ],
  },
  {
    id: 'informacoes-coletadas',
    question: 'Quais informações são coletadas?',
    category: 'Coleta e Finalidade',
    categoryLabel: 'Coleta e Finalidade',
    shortAnswer:
      'Coletamos estritamente os dados acadêmicos e cadastrais necessários para o acompanhamento pedagógico, controle de frequência, entrega de material didático e pesquisa de satisfação (NPS).',
    detailedExplanation:
      'Dados de Alunos e Responsáveis: Nome completo, número de contrato/matrícula, telefone de contato institucional (WhatsApp), e-mail cadastral, curso/formação, módulo atual, horários de início e fim de aula, notas de avaliação, status de apostila e situação financeira binária. Dados de Colaboradores e Usuários: Nome completo, login institucional do Portal, cargo/função, unidade escolar vinculada, registros de último acesso e trilha de auditoria de operações administrativas. Nenhum dado coletado é comercializado ou utilizado para fins alheios à execução do contrato educacional.',
    legalBasis: 'Art. 7º, V e IX da LGPD (Execução de Contrato)',
    technicalProof:
      'Inventário de dados restrito às estruturas de acompanhamento escolar e sincronização autorizada.',
    keywords: [
      'quais informacoes sao coletadas',
      'dados coletados',
      'coleta',
      'quais dados',
      'aluno',
      'responsavel',
      'telefone',
      'contrato',
      'finalidade',
    ],
  },
  {
    id: 'correcao-exclusao-dados',
    question: 'Como solicitar a correção ou exclusão de dados?',
    category: 'Direitos do Titular (LGPD)',
    categoryLabel: 'Direitos do Titular (LGPD)',
    shortAnswer:
      'Você pode registrar uma solicitação formal diretamente nesta página através do formulário "Solicitação de Direitos do Titular (LGPD)" ou junto à Secretaria da sua unidade escolar, gerando um número de protocolo imediato.',
    detailedExplanation:
      'Nos termos do Art. 18 da LGPD, o titular dos dados (ou seu responsável legal, no caso de menores) tem direito a: confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos/inexatos, anonimização, bloqueio ou eliminação de dados desnecessários, e revogação de consentimento. Dados vinculados a contratos educacionais ativos e registros obrigatórios de frequência/certificação são retidos pelo prazo legal aplicável à legislação educacional e contratual (Art. 16, I da LGPD). Toda solicitação registrada nesta página é gravada no banco de dados com protocolo único auditável.',
    legalBasis: 'Art. 16 e Art. 18 da LGPD (Direitos do Titular)',
    technicalProof:
      'Endpoint POST /api/privacy/requests com gravação persistente na tabela lgpd_requests e geração de protocolo.',
    keywords: [
      'como solicitar a correcao ou exclusao de dados',
      'excluir',
      'exclusao',
      'apagar',
      'corrigir',
      'correcao',
      'atualizar',
      'direitos',
      'titular',
      'lgpd',
      'anonimizacao',
    ],
  },
  {
    id: 'seguranca-conta',
    question: 'Como funciona a segurança da minha conta?',
    category: 'Segurança da Conta',
    categoryLabel: 'Segurança da Conta',
    shortAnswer:
      'Sua conta possui bloqueio automático contra tentativas excessivas de login (Rate Limiting), tokens de sessão criptográficos com expiração, proteção contra XSS/CSRF/SQL Injection e registro em log de auditoria.',
    detailedExplanation:
      'Proteção contra Força Bruta: Após 5 tentativas consecutivas de login malsucedidas, o acesso para o identificador é temporariamente bloqueado por 15 minutos, registrando o evento no log de segurança. Gerenciamento Seguro de Sessões: As sessões utilizam tokens aleatórios de 256 bits de entropia armazenados no banco apenas como hash SHA-256, com cookie HttpOnly + SameSite=Lax e cabeçalho de verificação. Defesa em Profundidade: Todas as entradas passam por sanitização contra XSS, consultas ao banco utilizam exclusivamente Prepared Statements parametrizados contra SQL Injection, e cabeçalhos HTTP de segurança estão ativos.',
    legalBasis: 'Art. 46 a 48 da LGPD',
    technicalProof:
      'Tabelas sessions, login_attempts e audit_logs + cabeçalhos de segurança no servidor Express.',
    keywords: [
      'como funciona a seguranca da minha conta',
      'seguranca da conta',
      'sessao',
      'bloqueio',
      'tentativas de login',
      'forca bruta',
      'xss',
      'sql injection',
      'csrf',
      'recuperacao de senha',
    ],
  },
  {
    id: 'retencao-compartilhamento',
    question: 'Com quem os dados são compartilhados e por quanto tempo são mantidos?',
    category: 'Retenção e Compartilhamento',
    categoryLabel: 'Retenção e Compartilhamento',
    shortAnswer:
      'Não há compartilhamento comercial de dados com terceiros. A comunicação ocorre exclusivamente de forma autenticada servidor-a-servidor com os sistemas institucionais da rede (Portal MoveEdu e Indecx NPS).',
    detailedExplanation:
      'Os dados acadêmicos são sincronizados diretamente entre o servidor da plataforma e os portais oficiais da franqueadora mediante credenciais institucionais criptografadas da unidade escolar. Os registros são mantidos durante a vigência do vínculo contratual/educacional e pelo período exigido para cumprimento de obrigações legais, regulatórias ou exercício regular de direitos (Art. 16, I da LGPD).',
    legalBasis: 'Art. 15 e Art. 16 da LGPD (Término do Tratamento)',
    technicalProof:
      'Comunicação HTTPS restrita ao Back-end sem exposição de tokens de terceiros no navegador.',
    keywords: [
      'compartilhamento',
      'terceiros',
      'retencao',
      'quanto tempo',
      'prazo',
      'moveedu',
      'indecx',
      'vencimento',
    ],
  },
  {
    id: 'contato-privacidade',
    question: 'Como entrar em contato sobre questões de privacidade?',
    category: 'Canal de Atendimento e DPO',
    categoryLabel: 'Canal de Atendimento e DPO',
    shortAnswer:
      'Você pode abrir um protocolo diretamente nesta página de Privacidade e Proteção de Dados, procurar a Coordenação/Secretaria da unidade escolar ou acionar o canal técnico institucional indicado no rodapé.',
    detailedExplanation:
      'Canal Digital Direto: Utilize o formulário de Atendimento ao Titular disponível nesta página para registrar dúvidas, pedidos de acesso, retificação ou informações sobre o tratamento de dados pessoais. Atendimento Presencial na Unidade: A secretaria da unidade escolar está habilitada para atualizar dados cadastrais no sistema oficial (CAD/Portal) que são sincronizados com este painel. Observação Institucional (Art. 41 da LGPD): A nomeação formal do Encarregado pelo Tratamento de Dados Pessoais (DPO) e seu e-mail regulamentar dependem de definição administrativa da mantenedora de cada unidade franqueada.',
    legalBasis: 'Art. 41 da LGPD (Encarregado pelo Tratamento de Dados)',
    technicalProof:
      'Formulário integrado de protocolo LGPD e canais oficiais de suporte documentados.',
    keywords: [
      'como entrar em contato sobre questoes de privacidade',
      'contato',
      'dpo',
      'encarregado',
      'duvida',
      'suporte',
      'canal',
      'reclamacao',
      'atendimento',
    ],
  },
];

function normalizeSearchText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Pesquisa inteligente na base oficial de Privacidade e Proteção de Dados.
 * Retorna os artigos ordenados por relevância sem criar respostas fictícias.
 */
export function searchPrivacyKnowledgeBase(
  query: string,
  categoryFilter: string = 'TODAS'
): PrivacyKnowledgeTopic[] {
  const normalizedQuery = normalizeSearchText(query);

  let pool = PRIVACY_KNOWLEDGE_BASE;
  if (categoryFilter && categoryFilter !== 'TODAS') {
    pool = pool.filter((item) => item.category === categoryFilter);
  }

  if (!normalizedQuery) {
    return pool.map((item) => ({ ...item, score: 100 }));
  }

  const queryTokens = normalizedQuery
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 2 &&
        ![
          'de',
          'da',
          'do',
          'os',
          'as',
          'um',
          'ou',
          'em',
          'na',
          'no',
          'por',
          'que',
          'sao',
          'meu',
          'meus',
          'minha',
          'minhas',
        ].includes(t)
    );

  const scored = pool
    .map((article) => {
      let score = 0;
      const qNorm = normalizeSearchText(article.question);
      const shortNorm = normalizeSearchText(article.shortAnswer);
      const detailNorm = normalizeSearchText(article.detailedExplanation);
      const keywordsNorm = article.keywords.map(normalizeSearchText);

      if (qNorm.includes(normalizedQuery)) {
        score += 100;
      }

      for (const kw of keywordsNorm) {
        if (kw.includes(normalizedQuery) || normalizedQuery.includes(kw)) {
          score += 50;
        }
      }

      for (const token of queryTokens) {
        if (qNorm.includes(token)) score += 25;
        if (keywordsNorm.some((k) => k.includes(token))) score += 20;
        if (shortNorm.includes(token)) score += 12;
        if (detailNorm.includes(token)) score += 8;
      }

      return { article: { ...article, score }, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.article);
}
