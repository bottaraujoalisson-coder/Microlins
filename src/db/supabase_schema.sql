-- SQL Schema completo para criação das tabelas no Supabase (Cole no SQL Editor do Supabase)

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT,
  uf TEXT,
  codigo_portal TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  nps_email TEXT,
  nps_company_filter TEXT,
  nps_base_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  login TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  portal_password TEXT,
  nome_completo TEXT NOT NULL,
  cargo TEXT NOT NULL,
  escola_nome TEXT,
  codigo_escola TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TEXT NOT NULL,
  ultimo_acesso TEXT
);

CREATE TABLE IF NOT EXISTS student_records (
  id BIGINT PRIMARY KEY,
  contrato TEXT,
  aula_id TEXT,
  nome_completo TEXT NOT NULL,
  nome_curto TEXT,
  telefone_aluno TEXT,
  whatsapp_aluno_url TEXT,
  nome_responsavel TEXT,
  telefone_responsavel TEXT,
  whatsapp_responsavel_url TEXT,
  formacao TEXT,
  curso TEXT,
  aula_info TEXT,
  aula_numero INTEGER,
  tipo_material TEXT,
  possui_apostila BOOLEAN,
  horario TEXT,
  hora_inicio TEXT,
  hora_fim TEXT,
  turno TEXT,
  sala TEXT,
  modalidade TEXT,
  inicio TEXT,
  fim TEXT,
  nota NUMERIC,
  nota_id TEXT,
  info_aula TEXT,
  status TEXT,
  presenca_ou_falta TEXT,
  status_sistema TEXT,
  inadimplente BOOLEAN,
  parcelas_atrasadas INTEGER,
  nota_aula_numero NUMERIC,
  dia_semana TEXT,
  semana_code TEXT,
  email TEXT,
  link_login_url TEXT,
  cad_id TEXT,
  cad_nome TEXT,
  unidade TEXT,
  municipio TEXT,
  educador TEXT,
  educador_cached_at TEXT
);

CREATE TABLE IF NOT EXISTS nps_records (
  id TEXT PRIMARY KEY,
  control_id TEXT,
  student_name TEXT NOT NULL,
  contrato TEXT,
  codigo_pessoa TEXT,
  email TEXT,
  phone TEXT,
  action_name TEXT,
  ponto_jornada TEXT,
  origem TEXT,
  channel TEXT,
  invitation_status TEXT,
  answered BOOLEAN,
  created_at TEXT,
  sent_at TEXT,
  answered_at TEXT,
  attempts_count INTEGER,
  survey_url TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_login TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  status TEXT NOT NULL,
  ip_address TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS lgpd_requests (
  id SERIAL PRIMARY KEY,
  protocol TEXT NOT NULL UNIQUE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
