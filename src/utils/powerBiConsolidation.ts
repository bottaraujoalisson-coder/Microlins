import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ALL_WEEK_STUDENT_RECORDS,
  ModalityType,
  PORTAL_METADATA,
  ShiftType,
  StudentPerformanceRecord,
} from '../data/microlinsData';
import type {
  ConsolidatedDashboardStudent,
  ConsolidatedSortField,
} from './performanceAnalytics';

/**
 * ============================================================================
 * 1. LÓGICA DE SEPARAÇÃO E IDENTIFICAÇÃO POR FORMAÇÃO DO ALUNO
 * ============================================================================
 * Regra Obrigatória:
 * - A FORMAÇÃO DO ALUNO é o critério principal de identificação e separação.
 * - Alunos vinculados ao mesmo contrato, mas que possuam formações diferentes,
 *   devem ser separados em registros ou agrupamentos distintos.
 * - O contrato NUNCA deve ser utilizado isoladamente para consolidar formações diferentes.
 * - Registros com a mesma formação e o mesmo contrato seguem a consolidação normal.
 */
export function formatFormacaoDisplay(raw?: string | null): string {
  if (!raw) return 'Formação Profissional';
  const cleaned = raw
    .replace(/^\d+_/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Formação Profissional';
}

export function normalizeFormacaoKey(raw?: string | null): string {
  return formatFormacaoDisplay(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildStudentFormationConsolidationKey(
  record: Pick<StudentPerformanceRecord, 'contrato' | 'formacao' | 'nomeCompleto'>
): string {
  const contratoClean = (record.contrato || '').trim();
  const fallbackName = (record.nomeCompleto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const idPart = contratoClean || fallbackName || 'sem-contrato';
  const formacaoPart = normalizeFormacaoKey(record.formacao);
  return `${idPart}::${formacaoPart}`;
}

/**
 * ============================================================================
 * 2. CONSOLIDAÇÃO DE MÚLTIPLAS BASES (CADs) ESTILO POWER BI
 * ============================================================================
 */
export interface CadDatabase {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  municipio: string;
  isDefault?: boolean;
  createdAt: string;
  records: StudentPerformanceRecord[];
}

export const DEFAULT_CAD_ID = 'CAD-PP-01';

const CAD_ASSIS_RECORDS: StudentPerformanceRecord[] = [
  // Aluno com MESMO CONTRATO (6010100) e DUAS FORMAÇÕES DIFERENTES na base de Assis
  {
    id: 90001,
    contrato: '6010100',
    aulaId: 'AS-90001',
    nomeCompleto: 'Gabriel Henrique Souza Lima',
    nomeCurto: 'Gabriel Henrique',
    telefoneAluno: '+55(18)99611-2201',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5518996112201',
    nomeResponsavel: 'Marcos Souza Lima',
    telefoneResponsavel: '+55(18)99611-2201',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5518996112201',
    formacao: 'Annual Book - Multimídia',
    curso: 'Annual Book 2 - Part A',
    aulaInfo: 'Aula 4 - Apostila',
    aulaNumero: 4,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '09:00 à 10:00',
    horaInicio: '09:00',
    horaFim: '10:00',
    turno: 'Manhã',
    sala: 'INGLÊS',
    modalidade: 'Presencial',
    inicio: '30/10/2026 09:02',
    fim: '30/10/2026 09:58',
    nota: 9.5,
    notaId: 'AS-N1',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Terça-feira',
    semanaCode: '2',
    cadId: 'CAD-AS-02',
    cadNome: 'CAD 02 - Assis',
    unidade: 'ESCOLA ASSIS',
    municipio: 'Assis - SP',
  },
  {
    id: 90002,
    contrato: '6010100',
    aulaId: 'AS-90002',
    nomeCompleto: 'Gabriel Henrique Souza Lima',
    nomeCurto: 'Gabriel Henrique',
    telefoneAluno: '+55(18)99611-2201',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5518996112201',
    nomeResponsavel: 'Marcos Souza Lima',
    telefoneResponsavel: '+55(18)99611-2201',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5518996112201',
    formacao: 'EXCEL AVANÇADO E POWER BI',
    curso: 'Excel 2021 Avançado Módulo I',
    aulaInfo: 'Aula 4 - Apostila',
    aulaNumero: 4,
    tipoMaterial: 'Apostila',
    possuiApostila: false,
    horario: '14:00 à 16:00',
    horaInicio: '14:00',
    horaFim: '16:00',
    turno: 'Tarde',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Presencial',
    inicio: '30/10/2026 14:01',
    fim: '30/10/2026 15:55',
    nota: 9.0,
    notaId: 'AS-N2',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Quinta-feira',
    semanaCode: '4',
    cadId: 'CAD-AS-02',
    cadNome: 'CAD 02 - Assis',
    unidade: 'ESCOLA ASSIS',
    municipio: 'Assis - SP',
  },
  {
    id: 90003,
    contrato: '6010205',
    aulaId: 'AS-90003',
    nomeCompleto: 'Beatriz Fernanda Oliveira Mendes',
    nomeCurto: 'Beatriz Fernanda',
    telefoneAluno: '+55(18)99722-3310',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5518997223310',
    nomeResponsavel: 'Fernanda Oliveira',
    telefoneResponsavel: '+55(18)99722-3310',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5518997223310',
    formacao: 'INFORMÁTICA ESSENCIAL',
    curso: 'Excel 2021',
    aulaInfo: 'Aula 6 - Apostila',
    aulaNumero: 6,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '10:00 à 12:00',
    horaInicio: '10:00',
    horaFim: '12:00',
    turno: 'Manhã',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Presencial',
    inicio: '30/10/2026 10:03',
    fim: '30/10/2026 11:55',
    nota: 10,
    notaId: 'AS-N3',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Quarta-feira',
    semanaCode: '3',
    cadId: 'CAD-AS-02',
    cadNome: 'CAD 02 - Assis',
    unidade: 'ESCOLA ASSIS',
    municipio: 'Assis - SP',
  },
  {
    id: 90004,
    contrato: '6010312',
    aulaId: 'AS-90004',
    nomeCompleto: 'Rafael Augusto Nogueira',
    nomeCurto: 'Rafael Augusto',
    telefoneAluno: '+55(18)99814-4402',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5518998144402',
    nomeResponsavel: 'Carlos Nogueira',
    telefoneResponsavel: '+55(18)99814-4402',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5518998144402',
    formacao: 'GESTÃO FINANCEIRA',
    curso: 'Educação Financeira',
    aulaInfo: 'Aula 3 - Apostila',
    aulaNumero: 3,
    tipoMaterial: 'Apostila',
    possuiApostila: false,
    horario: '19:00 à 21:00',
    horaInicio: '19:00',
    horaFim: '21:00',
    turno: 'Noite',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Online',
    inicio: '',
    fim: '',
    nota: null,
    notaId: '0',
    infoAula: 'FALTA',
    status: 'NÃO INICIADO',
    presencaOuFalta: 'F',
    inadimplente: true,
    diaSemana: 'Sexta-feira',
    semanaCode: '5',
    cadId: 'CAD-AS-02',
    cadNome: 'CAD 02 - Assis',
    unidade: 'ESCOLA ASSIS',
    municipio: 'Assis - SP',
  },
  {
    id: 90005,
    contrato: '6010488',
    aulaId: 'AS-90005',
    nomeCompleto: 'Camila Aparecida Rocha',
    nomeCurto: 'Camila Aparecida',
    telefoneAluno: '+55(18)99105-8890',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5518991058890',
    nomeResponsavel: 'Sonia Rocha',
    telefoneResponsavel: '+55(18)99105-8890',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5518991058890',
    formacao: 'DESIGNER GRÁFICO',
    curso: 'Adobe Illustrator - Creative Cloud',
    aulaInfo: 'Aula 4 - Apostila',
    aulaNumero: 4,
    tipoMaterial: 'Apostila',
    possuiApostila: false,
    horario: '08:00 à 10:00',
    horaInicio: '08:00',
    horaFim: '10:00',
    turno: 'Manhã',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Presencial',
    inicio: '30/10/2026 08:04',
    fim: '30/10/2026 09:50',
    nota: 8.5,
    notaId: 'AS-N5',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Sábado',
    semanaCode: '6',
    cadId: 'CAD-AS-02',
    cadNome: 'CAD 02 - Assis',
    unidade: 'ESCOLA ASSIS',
    municipio: 'Assis - SP',
  },
];

const CAD_MARILIA_RECORDS: StudentPerformanceRecord[] = [
  // Aluno com MESMO CONTRATO (7020200) e DUAS FORMAÇÕES DIFERENTES na base de Marília
  {
    id: 95001,
    contrato: '7020200',
    aulaId: 'MA-95001',
    nomeCompleto: 'Mariana Costa Vasconcelos',
    nomeCurto: 'Mariana Costa',
    telefoneAluno: '+55(14)99755-1200',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5514997551200',
    nomeResponsavel: 'Roberto Vasconcelos',
    telefoneResponsavel: '+55(14)99755-1200',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5514997551200',
    formacao: 'Inglês Speed Multimídia',
    curso: 'Speed I Multimídia',
    aulaInfo: 'Aula 5 - Apostila',
    aulaNumero: 5,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '09:00 à 11:00',
    horaInicio: '09:00',
    horaFim: '11:00',
    turno: 'Manhã',
    sala: 'INGLÊS',
    modalidade: 'Presencial',
    inicio: '30/10/2026 09:01',
    fim: '30/10/2026 10:55',
    nota: 9.8,
    notaId: 'MA-N1',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Segunda-feira',
    semanaCode: '1',
    cadId: 'CAD-MA-03',
    cadNome: 'CAD 03 - Marília',
    unidade: 'ESCOLA MARÍLIA',
    municipio: 'Marília - SP',
  },
  {
    id: 95002,
    contrato: '7020200',
    aulaId: 'MA-95002',
    nomeCompleto: 'Mariana Costa Vasconcelos',
    nomeCurto: 'Mariana Costa',
    telefoneAluno: '+55(14)99755-1200',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5514997551200',
    nomeResponsavel: 'Roberto Vasconcelos',
    telefoneResponsavel: '+55(14)99755-1200',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5514997551200',
    formacao: 'ROBÓTICA',
    curso: 'Robótica - Módulo I',
    aulaInfo: 'Aula 2 - Apostila',
    aulaNumero: 2,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '15:00 à 17:00',
    horaInicio: '15:00',
    horaFim: '17:00',
    turno: 'Tarde',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Presencial',
    inicio: '30/10/2026 15:00',
    fim: '30/10/2026 16:50',
    nota: 10,
    notaId: 'MA-N2',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Quarta-feira',
    semanaCode: '3',
    cadId: 'CAD-MA-03',
    cadNome: 'CAD 03 - Marília',
    unidade: 'ESCOLA MARÍLIA',
    municipio: 'Marília - SP',
  },
  {
    id: 95003,
    contrato: '7020350',
    aulaId: 'MA-95003',
    nomeCompleto: 'Leonardo Batista Prado',
    nomeCurto: 'Leonardo Batista',
    telefoneAluno: '+55(14)99822-6543',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5514998226543',
    nomeResponsavel: 'Helena Prado',
    telefoneResponsavel: '+55(14)99822-6543',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5514998226543',
    formacao: 'Inteligência Artificial',
    curso: 'Inteligência Artificial 1',
    aulaInfo: 'Aula 4 - Apostila',
    aulaNumero: 4,
    tipoMaterial: 'Apostila',
    possuiApostila: false,
    horario: '18:00 à 20:00',
    horaInicio: '18:00',
    horaFim: '20:00',
    turno: 'Noite',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Online',
    inicio: '30/10/2026 18:02',
    fim: '30/10/2026 19:50',
    nota: 8.0,
    notaId: 'MA-N3',
    infoAula: 'Portal do Aluno',
    status: 'FINALIZADO',
    presencaOuFalta: 'P',
    inadimplente: false,
    diaSemana: 'Sexta-feira',
    semanaCode: '5',
    cadId: 'CAD-MA-03',
    cadNome: 'CAD 03 - Marília',
    unidade: 'ESCOLA MARÍLIA',
    municipio: 'Marília - SP',
  },
  {
    id: 95004,
    contrato: '7020499',
    aulaId: 'MA-95004',
    nomeCompleto: 'Fernanda Ribeiro Cavalcanti',
    nomeCurto: 'Fernanda Ribeiro',
    telefoneAluno: '+55(14)99633-7788',
    whatsappAlunoUrl: 'https://api.whatsapp.com/send?phone=5514996337788',
    nomeResponsavel: 'Paulo Cavalcanti',
    telefoneResponsavel: '+55(14)99633-7788',
    whatsappResponsavelUrl: 'https://api.whatsapp.com/send?phone=5514996337788',
    formacao: 'CAPACITAÇÃO - DINÂMICA',
    curso: 'Assistente de Recursos Humanos',
    aulaInfo: 'Aula 7 - Apostila',
    aulaNumero: 7,
    tipoMaterial: 'Apostila',
    possuiApostila: true,
    horario: '10:00 à 12:00',
    horaInicio: '10:00',
    horaFim: '12:00',
    turno: 'Manhã',
    sala: 'PROFISSIONALIZANTE',
    modalidade: 'Presencial',
    inicio: '',
    fim: '',
    nota: null,
    notaId: '0',
    infoAula: 'FALTA',
    status: 'NÃO INICIADO',
    presencaOuFalta: 'F',
    inadimplente: true,
    diaSemana: 'Sábado',
    semanaCode: '6',
    cadId: 'CAD-MA-03',
    cadNome: 'CAD 03 - Marília',
    unidade: 'ESCOLA MARÍLIA',
    municipio: 'Marília - SP',
  },
];

export function buildInitialCadDatabases(
  primaryRecords: StudentPerformanceRecord[] = ALL_WEEK_STUDENT_RECORDS
): CadDatabase[] {
  return [
    {
      id: DEFAULT_CAD_ID,
      codigo: 'CAD-01',
      nome: 'CAD 01 - Presidente Prudente',
      unidade: PORTAL_METADATA.unidade || 'ESCOLA PRESIDENTE PRUDENTE',
      municipio: 'Presidente Prudente - SP',
      isDefault: true,
      createdAt: '2026-10-30T08:00:00.000Z',
      records: primaryRecords,
    },
    {
      id: 'CAD-AS-02',
      codigo: 'CAD-02',
      nome: 'CAD 02 - Assis',
      unidade: 'ESCOLA ASSIS',
      municipio: 'Assis - SP',
      isDefault: false,
      createdAt: '2026-10-30T08:30:00.000Z',
      records: CAD_ASSIS_RECORDS,
    },
    {
      id: 'CAD-MA-03',
      codigo: 'CAD-03',
      nome: 'CAD 03 - Marília',
      unidade: 'ESCOLA MARÍLIA',
      municipio: 'Marília - SP',
      isDefault: false,
      createdAt: '2026-10-30T09:00:00.000Z',
      records: CAD_MARILIA_RECORDS,
    },
  ];
}

export function buildScheduleDeduplicationKey(
  r: StudentPerformanceRecord
): string {
  const contrato = (r.contrato || '').trim().toLowerCase();
  const nome = (r.nomeCompleto || '').trim().toLowerCase();
  const formacao = normalizeFormacaoKey(r.formacao);
  const curso = (r.curso || '').trim().toLowerCase();
  const dia = (r.diaSemana || '').trim().toLowerCase();
  const hora = (r.horaInicio || r.horario || '').trim().toLowerCase();
  const aulaKey = String(r.aulaId || r.id || r.aulaNumero || '').trim().toLowerCase();
  return `${contrato || nome}::${formacao}::${curso}::${dia}::${hora}::${aulaKey}`;
}

export function consolidateMultipleCads(
  cadDatabases: CadDatabase[],
  selectedCadIds: string[]
): {
  consolidatedRawRecords: StudentPerformanceRecord[];
  activeCads: CadDatabase[];
  duplicatesRemovedCount: number;
  totalRawBeforeDedup: number;
} {
  const activeIdSet = new Set(
    selectedCadIds.length > 0 ? selectedCadIds : [DEFAULT_CAD_ID]
  );
  const activeCads = cadDatabases.filter((c) => activeIdSet.has(c.id));

  const seenScheduleKeys = new Set<string>();
  const consolidatedRawRecords: StudentPerformanceRecord[] = [];
  let duplicatesRemovedCount = 0;
  let totalRawBeforeDedup = 0;
  let syntheticIdCounter = 500000;

  for (const cad of activeCads) {
    for (const r of cad.records) {
      totalRawBeforeDedup++;
      const dedupKey = buildScheduleDeduplicationKey(r);
      if (seenScheduleKeys.has(dedupKey)) {
        duplicatesRemovedCount++;
        continue;
      }
      seenScheduleKeys.add(dedupKey);

      consolidatedRawRecords.push({
        ...r,
        id: r.id || ++syntheticIdCounter,
        cadId: r.cadId || cad.id,
        cadNome: r.cadNome || cad.nome,
        unidade: r.unidade || cad.unidade,
        municipio: r.municipio || cad.municipio,
      });
    }
  }

  return {
    consolidatedRawRecords,
    activeCads,
    duplicatesRemovedCount,
    totalRawBeforeDedup,
  };
}

/**
 * Converte dados importados (CSV, TSV ou JSON) em registros de alunos de um novo CAD,
 * permitindo adicionar novos CADs dinamicamente sem reiniciar a consolidação.
 */
export function parseImportedCadRecords(
  rawText: string,
  cadInfo: {
    id: string;
    nome: string;
    unidade: string;
    municipio: string;
  }
): StudentPerformanceRecord[] {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return [];

  let nextId = Date.now() % 10000000;

  // Tentar JSON primeiro
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.records)
        ? parsed.records
        : Array.isArray(parsed.alunos)
        ? parsed.alunos
        : [];
      return arr.map((item: Partial<StudentPerformanceRecord>, idx: number) => ({
        id: Number(item.id) || nextId + idx + 1,
        contrato: String(item.contrato || `${8000000 + idx}`).trim(),
        aulaId: String(item.aulaId || `IMP-${idx + 1}`),
        nomeCompleto: String(item.nomeCompleto || `Aluno Importado ${idx + 1}`).trim(),
        nomeCurto: String(item.nomeCurto || item.nomeCompleto || `Aluno ${idx + 1}`).slice(0, 18),
        telefoneAluno: String(item.telefoneAluno || '+55(18)99999-0000'),
        whatsappAlunoUrl: '',
        nomeResponsavel: String(item.nomeResponsavel || 'Responsável'),
        telefoneResponsavel: String(item.telefoneResponsavel || '+55(18)99999-0000'),
        whatsappResponsavelUrl: '',
        formacao: String(item.formacao || 'INFORMÁTICA ESSENCIAL').trim(),
        curso: String(item.curso || 'Introdução à Informática').trim(),
        aulaInfo: String(item.aulaInfo || `Aula ${item.aulaNumero || 1} - Apostila`),
        aulaNumero: Number(item.aulaNumero) || 1,
        tipoMaterial: String(item.tipoMaterial || 'Apostila'),
        possuiApostila:
          typeof item.possuiApostila === 'boolean' ? item.possuiApostila : true,
        horario: String(item.horario || '08:00 à 10:00'),
        horaInicio: String(item.horaInicio || '08:00'),
        horaFim: String(item.horaFim || '10:00'),
        turno: (item.turno as ShiftType) || 'Manhã',
        sala: String(item.sala || 'PROFISSIONALIZANTE'),
        modalidade: (item.modalidade as ModalityType) || 'Presencial',
        inicio: String(item.inicio || ''),
        fim: String(item.fim || ''),
        nota: typeof item.nota === 'number' ? item.nota : null,
        notaId: String(item.notaId || '0'),
        infoAula: String(item.infoAula || 'Portal do Aluno'),
        status: item.status || 'FINALIZADO',
        presencaOuFalta: item.presencaOuFalta || 'P',
        inadimplente: Boolean(item.inadimplente),
        diaSemana: String(item.diaSemana || 'Segunda-feira'),
        semanaCode: String(item.semanaCode || '1'),
        cadId: cadInfo.id,
        cadNome: cadInfo.nome,
        unidade: cadInfo.unidade,
        municipio: cadInfo.municipio,
      }));
    } catch {
      // Fallback para parser CSV
    }
  }

  // Parser CSV / TSV flexível
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';')
    ? ';'
    : lines[0].includes('\t')
    ? '\t'
    : ',';

  const firstCells = lines[0]
    .split(delimiter)
    .map((c) => c.replace(/^"|"$/g, '').trim().toLowerCase());

  const hasHeader =
    firstCells.some((c) => c.includes('nome') || c.includes('aluno')) ||
    firstCells.some((c) => c.includes('contrato') || c.includes('formac'));

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const colIdx = {
    nome: hasHeader
      ? firstCells.findIndex((c) => c.includes('nome') || c.includes('aluno'))
      : 0,
    contrato: hasHeader
      ? firstCells.findIndex((c) => c.includes('contrato') || c.includes('matric'))
      : 1,
    formacao: hasHeader
      ? firstCells.findIndex((c) => c.includes('formac') || c.includes('capacit'))
      : 2,
    curso: hasHeader
      ? firstCells.findIndex((c) => c.includes('curso') || c.includes('modul') || c.includes('módul'))
      : 3,
    dia: hasHeader ? firstCells.findIndex((c) => c.includes('dia')) : 4,
    horario: hasHeader
      ? firstCells.findIndex((c) => c.includes('horar') || c.includes('horár') || c.includes('hora'))
      : 5,
    modalidade: hasHeader
      ? firstCells.findIndex((c) => c.includes('modalid'))
      : 6,
    presenca: hasHeader
      ? firstCells.findIndex((c) => c.includes('presen') || c.includes('status'))
      : 7,
  };

  return dataLines.map((line, idx) => {
    const cells = line
      .split(delimiter)
      .map((c) => c.replace(/^"|"$/g, '').trim());
    const nomeCompleto =
      (colIdx.nome >= 0 ? cells[colIdx.nome] : cells[0]) ||
      `Aluno ${cadInfo.nome} ${idx + 1}`;
    const contrato =
      (colIdx.contrato >= 0 ? cells[colIdx.contrato] : cells[1])?.replace(
        /^#/,
        ''
      ) || `${8100000 + idx}`;
    const formacao =
      (colIdx.formacao >= 0 ? cells[colIdx.formacao] : cells[2]) ||
      'INFORMÁTICA ESSENCIAL';
    const curso =
      (colIdx.curso >= 0 ? cells[colIdx.curso] : cells[3]) ||
      'Excel 2021 Avançado Módulo I';
    const diaSemana =
      (colIdx.dia >= 0 ? cells[colIdx.dia] : cells[4]) || 'Segunda-feira';
    const rawHorario =
      (colIdx.horario >= 0 ? cells[colIdx.horario] : cells[5]) || '08:00';
    const horaInicio = rawHorario.slice(0, 5).includes(':')
      ? rawHorario.slice(0, 5)
      : '08:00';
    const rawMod =
      (colIdx.modalidade >= 0 ? cells[colIdx.modalidade] : cells[6]) ||
      'Presencial';
    const modalidade: ModalityType = rawMod.toLowerCase().includes('on')
      ? 'Online'
      : 'Presencial';
    const rawPres =
      (colIdx.presenca >= 0 ? cells[colIdx.presenca] : cells[7]) || 'P';
    const isFalta =
      rawPres.toUpperCase() === 'F' ||
      rawPres.toLowerCase().includes('falta');

    return {
      id: ++nextId,
      contrato,
      aulaId: `CAD-${cadInfo.id}-${idx + 1}`,
      nomeCompleto,
      nomeCurto: nomeCompleto.slice(0, 18),
      telefoneAluno: '+55(18)99700-0000',
      whatsappAlunoUrl: '',
      nomeResponsavel: 'Responsável Legal',
      telefoneResponsavel: '+55(18)99700-0000',
      whatsappResponsavelUrl: '',
      formacao,
      curso,
      aulaInfo: 'Aula 3 - Apostila',
      aulaNumero: 3,
      tipoMaterial: 'Apostila',
      possuiApostila: true,
      horario: `${horaInicio} à ${String(
        (parseInt(horaInicio.split(':')[0] || '8', 10) + 2) % 24
      ).padStart(2, '0')}:00`,
      horaInicio,
      horaFim: '10:00',
      turno:
        parseInt(horaInicio.split(':')[0] || '8', 10) < 12
          ? 'Manhã'
          : parseInt(horaInicio.split(':')[0] || '8', 10) < 18
          ? 'Tarde'
          : 'Noite',
      sala: formacao.toUpperCase().includes('INGL') ||
        formacao.toUpperCase().includes('BOOK')
        ? 'INGLÊS'
        : 'PROFISSIONALIZANTE',
      modalidade,
      inicio: isFalta ? '' : `30/10/2026 ${horaInicio}`,
      fim: isFalta ? '' : '30/10/2026 09:55',
      nota: isFalta ? null : 9.0,
      notaId: '0',
      infoAula: isFalta ? 'FALTA' : 'Portal do Aluno',
      status: isFalta ? 'NÃO INICIADO' : 'FINALIZADO',
      presencaOuFalta: isFalta ? 'F' : 'P',
      inadimplente: false,
      diaSemana,
      semanaCode: '1',
      cadId: cadInfo.id,
      cadNome: cadInfo.nome,
      unidade: cadInfo.unidade,
      municipio: cadInfo.municipio,
    };
  });
}

/**
 * ============================================================================
 * 3. PERSONALIZAÇÃO E FIXAÇÃO DE COLUNAS (ATÉ 2 COLUNAS FIXAS)
 * ============================================================================
 */
export type ConsolidatedColumnId =
  | 'nomeCompleto'
  | 'contrato'
  | 'formacao'
  | 'cadNome'
  | 'unidade'
  | 'municipio'
  | 'modalidade'
  | 'turno'
  | 'diaSemana'
  | 'horario'
  | 'sala'
  | 'modulo'
  | 'aulaAtual'
  | 'presencas'
  | 'faltas'
  | 'frequencia'
  | 'agendamentos'
  | 'categoria'
  | 'apostila'
  | 'financeiro'
  | 'alertas'
  | 'telefoneAluno'
  | 'nomeResponsavel'
  | 'acoes';

export interface ConsolidatedColumnDef {
  id: ConsolidatedColumnId;
  label: string;
  shortLabel: string;
  widthPx: number;
  defaultVisible: boolean;
  align: 'left' | 'center' | 'right';
  sortableField?: ConsolidatedSortField;
  groupableField?: GroupByField;
  exportable: boolean;
}

export const CONSOLIDATED_TABLE_COLUMNS: ConsolidatedColumnDef[] = [
  {
    id: 'nomeCompleto',
    label: 'Nome do Aluno',
    shortLabel: 'Nome do Aluno',
    widthPx: 250,
    defaultVisible: true,
    align: 'left',
    sortableField: 'nomeCompleto',
    exportable: true,
  },
  {
    id: 'contrato',
    label: 'Nº do Contrato',
    shortLabel: 'Nº do Contrato',
    widthPx: 130,
    defaultVisible: true,
    align: 'left',
    sortableField: 'contrato',
    exportable: true,
  },
  {
    id: 'formacao',
    label: 'Formação do Aluno',
    shortLabel: 'Formação',
    widthPx: 205,
    defaultVisible: true,
    align: 'left',
    sortableField: 'formacao',
    groupableField: 'formacao',
    exportable: true,
  },
  {
    id: 'modulo',
    label: 'Curso / Módulo',
    shortLabel: 'Módulo',
    widthPx: 215,
    defaultVisible: true,
    align: 'left',
    sortableField: 'modulo',
    groupableField: 'modulo',
    exportable: true,
  },
  {
    id: 'aulaAtual',
    label: 'Aula Atual',
    shortLabel: 'Aula Atual',
    widthPx: 115,
    defaultVisible: true,
    align: 'center',
    sortableField: 'aulaAtual',
    exportable: true,
  },
  {
    id: 'frequencia',
    label: 'Frequência',
    shortLabel: 'Frequência',
    widthPx: 120,
    defaultVisible: true,
    align: 'center',
    sortableField: 'frequencia',
    exportable: true,
  },
  {
    id: 'diaSemana',
    label: 'Dia da Aula',
    shortLabel: 'Dia da Aula',
    widthPx: 140,
    defaultVisible: true,
    align: 'left',
    sortableField: 'diaSemana',
    groupableField: 'diaSemana',
    exportable: true,
  },
  {
    id: 'horario',
    label: 'Horário',
    shortLabel: 'Horário',
    widthPx: 115,
    defaultVisible: true,
    align: 'left',
    sortableField: 'horario',
    groupableField: 'horario',
    exportable: true,
  },
  {
    id: 'sala',
    label: 'Sala',
    shortLabel: 'Sala',
    widthPx: 175,
    defaultVisible: true,
    align: 'left',
    sortableField: 'sala',
    groupableField: 'sala',
    exportable: true,
  },
  {
    id: 'modalidade',
    label: 'Modalidade',
    shortLabel: 'Modalidade',
    widthPx: 120,
    defaultVisible: true,
    align: 'center',
    sortableField: 'modalidade',
    groupableField: 'modalidade',
    exportable: true,
  },
  {
    id: 'categoria',
    label: 'Categoria',
    shortLabel: 'Categoria',
    widthPx: 135,
    defaultVisible: true,
    align: 'center',
    sortableField: 'categoria',
    groupableField: 'categoria',
    exportable: true,
  },
  {
    id: 'apostila',
    label: 'Apostila',
    shortLabel: 'Apostila',
    widthPx: 130,
    defaultVisible: true,
    align: 'center',
    sortableField: 'apostila',
    exportable: true,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    shortLabel: 'Financeiro',
    widthPx: 130,
    defaultVisible: true,
    align: 'center',
    sortableField: 'financeiro',
    exportable: true,
  },
  {
    id: 'alertas',
    label: 'Alertas / NPS',
    shortLabel: 'Alertas / NPS',
    widthPx: 150,
    defaultVisible: true,
    align: 'center',
    sortableField: 'alertas',
    exportable: true,
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    shortLabel: 'Agendamentos',
    widthPx: 125,
    defaultVisible: false,
    align: 'center',
    sortableField: 'agendamentos',
    exportable: true,
  },
  {
    id: 'turno',
    label: 'Período (Turno)',
    shortLabel: 'Período',
    widthPx: 125,
    defaultVisible: false,
    align: 'center',
    sortableField: 'turno',
    exportable: true,
  },
  {
    id: 'telefoneAluno',
    label: 'Telefone do Aluno',
    shortLabel: 'Telefone',
    widthPx: 145,
    defaultVisible: false,
    align: 'left',
    exportable: true,
  },
  {
    id: 'nomeResponsavel',
    label: 'Responsável',
    shortLabel: 'Responsável',
    widthPx: 170,
    defaultVisible: false,
    align: 'left',
    exportable: true,
  },
  {
    id: 'acoes',
    label: 'Ações',
    shortLabel: 'Ações',
    widthPx: 165,
    defaultVisible: true,
    align: 'right',
    exportable: false,
  },
];

export const DEFAULT_COLUMN_ORDER: ConsolidatedColumnId[] =
  CONSOLIDATED_TABLE_COLUMNS.map((c) => c.id);

export const DEFAULT_VISIBLE_COLUMN_IDS: ConsolidatedColumnId[] =
  CONSOLIDATED_TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);

export interface ResolvedTableColumn extends ConsolidatedColumnDef {
  isFrozen: boolean;
  frozenSlot: 1 | 2 | null;
  stickyLeftPx: number | null;
  isLastFrozen: boolean;
}

/**
 * Alterna a fixação de uma coluna respeitando o limite máximo de 2 colunas fixadas.
 * - Se a coluna já estiver fixada (1ª ou 2ª), desafixa ela.
 * - Se houver menos de 2 colunas fixadas, fixa na vaga disponível (1ª ou 2ª).
 * - Se já houver 2 colunas fixadas, substitui a 2ª coluna fixa pela nova coluna clicada.
 */
export function toggleColumnPinState(
  colId: ConsolidatedColumnId,
  frozenCol1: ConsolidatedColumnId | null,
  frozenCol2: ConsolidatedColumnId | null
): {
  frozenCol1: ConsolidatedColumnId | null;
  frozenCol2: ConsolidatedColumnId | null;
} {
  if (frozenCol1 === colId) {
    return {
      frozenCol1: frozenCol2,
      frozenCol2: null,
    };
  }
  if (frozenCol2 === colId) {
    return {
      frozenCol1,
      frozenCol2: null,
    };
  }
  if (!frozenCol1) {
    return {
      frozenCol1: colId,
      frozenCol2,
    };
  }
  return {
    frozenCol1,
    frozenCol2: colId,
  };
}

/**
 * Calcula a lista ordenada de colunas visíveis e aplica a fixação de até 2 colunas
 * independentes (1ª coluna fixa e 2ª coluna fixa) com offsets exatos em pixels.
 */
export function resolveEffectiveTableColumns(
  columnOrder: ConsolidatedColumnId[],
  visibleColumnIds: ConsolidatedColumnId[],
  frozenCol1: ConsolidatedColumnId | null,
  frozenCol2: ConsolidatedColumnId | null
): ResolvedTableColumn[] {
  const visibleSet = new Set(visibleColumnIds);
  const colMap = new Map<ConsolidatedColumnId, ConsolidatedColumnDef>(
    CONSOLIDATED_TABLE_COLUMNS.map((c) => [c.id, c])
  );

  // Garantir que todas as colunas válidas estejam representadas na ordem configurada
  const orderedVisible: ConsolidatedColumnDef[] = [];
  for (const id of columnOrder) {
    if (visibleSet.has(id)) {
      const def = colMap.get(id);
      if (def) orderedVisible.push(def);
    }
  }
  for (const def of CONSOLIDATED_TABLE_COLUMNS) {
    if (visibleSet.has(def.id) && !orderedVisible.some((c) => c.id === def.id)) {
      orderedVisible.push(def);
    }
  }

  const effectiveFrozen1 =
    frozenCol1 && visibleSet.has(frozenCol1) ? frozenCol1 : null;
  const effectiveFrozen2 =
    frozenCol2 &&
    visibleSet.has(frozenCol2) &&
    frozenCol2 !== effectiveFrozen1
      ? frozenCol2
      : null;

  // Posicionar as colunas fixadas nas primeiras posições à esquerda para rolagem horizontal perfeita
  const pinnedCols: ConsolidatedColumnDef[] = [];
  if (effectiveFrozen1) {
    const def1 = colMap.get(effectiveFrozen1);
    if (def1) pinnedCols.push(def1);
  }
  if (effectiveFrozen2) {
    const def2 = colMap.get(effectiveFrozen2);
    if (def2) pinnedCols.push(def2);
  }

  const unpinnedCols = orderedVisible.filter(
    (c) => c.id !== effectiveFrozen1 && c.id !== effectiveFrozen2
  );

  const finalList = [...pinnedCols, ...unpinnedCols];
  let currentLeft = 0;

  return finalList.map((col, idx) => {
    const isSlot1 = col.id === effectiveFrozen1;
    const isSlot2 = col.id === effectiveFrozen2;
    const isFrozen = isSlot1 || isSlot2;
    const stickyLeftPx = isFrozen ? currentLeft : null;
    if (isFrozen) {
      currentLeft += col.widthPx;
    }
    const isLastFrozen = isFrozen && idx === pinnedCols.length - 1;

    return {
      ...col,
      isFrozen,
      frozenSlot: isSlot1 ? 1 : isSlot2 ? 2 : null,
      stickyLeftPx,
      isLastFrozen,
    };
  });
}

export function reorderColumnList(
  order: ConsolidatedColumnId[],
  colId: ConsolidatedColumnId,
  direction: 'up' | 'down'
): ConsolidatedColumnId[] {
  const idx = order.indexOf(colId);
  if (idx === -1) return order;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= order.length) return order;
  const next = [...order];
  const [item] = next.splice(idx, 1);
  next.splice(targetIdx, 0, item);
  return next;
}

/**
 * ============================================================================
 * 4. EXTRAÇÃO DE VALORES DE COLUNA E FILTROS MULTI-VALOR
 * ============================================================================
 */
export function getStudentColumnDisplayValue(
  st: ConsolidatedDashboardStudent,
  colId: ConsolidatedColumnId
): string {
  switch (colId) {
    case 'nomeCompleto':
      return st.nomeCompleto;
    case 'contrato':
      return `#${st.contrato}`;
    case 'formacao':
      return st.formacao || st.capacitacao;
    case 'cadNome':
      return st.cadNome || 'CAD 01 - Presidente Prudente';
    case 'unidade':
      return st.unidade || PORTAL_METADATA.unidade;
    case 'municipio':
      return st.municipio || 'Presidente Prudente - SP';
    case 'modalidade':
      return st.modalidadesLabel;
    case 'turno':
      return st.turno || 'Manhã';
    case 'diaSemana':
      return st.diasSemana.join(', ');
    case 'horario':
      return st.horariosKeys.join(', ');
    case 'sala':
      return st.salas.join(', ');
    case 'modulo':
      return st.cursos.join(' · ');
    case 'aulaAtual':
      return st.aulaMinAluno === st.aulaMaxAluno
        ? `Aula ${st.aulaAtualPrincipal}`
        : `Aulas ${st.aulaMinAluno} a ${st.aulaMaxAluno}`;
    case 'presencas':
      return String(st.presencaCount);
    case 'faltas':
      return String(st.faltaCount);
    case 'frequencia':
      return st.frequenciaSemanalPercent !== null
        ? `${st.frequenciaSemanalPercent.toFixed(0)}%`
        : 'S/D';
    case 'agendamentos':
      return String(st.agendamentosCount);
    case 'categoria':
      return st.categoriaCurso === 'INGLÊS' ? 'Inglês' : 'Profissionalizante';
    case 'apostila':
      return st.possuiApostila ? 'Entregue' : 'Não entregue';
    case 'financeiro':
      return st.situacaoFinanceiraLabel;
    case 'alertas':
      return st.alertaStatusLabel || 'Regular';
    case 'telefoneAluno':
      return st.telefoneAluno || 'Não informado';
    case 'nomeResponsavel':
      return st.nomeResponsavel || 'Próprio aluno';
    case 'acoes':
      return '';
  }
}

export function getStudentColumnFilterTokens(
  st: ConsolidatedDashboardStudent,
  colId: ConsolidatedColumnId
): string[] {
  switch (colId) {
    case 'diaSemana':
      return st.diasSemana.length > 0 ? st.diasSemana : ['Não informado'];
    case 'horario':
      return st.horariosKeys.length > 0 ? st.horariosKeys : ['Não informado'];
    case 'sala':
      return st.salas.length > 0 ? st.salas : ['Não informada'];
    case 'modulo':
      return st.cursos.length > 0 ? st.cursos : ['Não informado'];
    case 'cadNome':
      return st.cadNomes && st.cadNomes.length > 0
        ? st.cadNomes
        : [getStudentColumnDisplayValue(st, 'cadNome')];
    case 'unidade':
      return st.unidades && st.unidades.length > 0
        ? st.unidades
        : [getStudentColumnDisplayValue(st, 'unidade')];
    case 'municipio':
      return st.municipios && st.municipios.length > 0
        ? st.municipios
        : [getStudentColumnDisplayValue(st, 'municipio')];
    case 'turno':
      return st.turnos && st.turnos.length > 0
        ? st.turnos
        : [getStudentColumnDisplayValue(st, 'turno')];
    case 'alertas': {
      const tokens: string[] = [];
      if (st.isEvasao) tokens.push('Evasão');
      if (st.hasActiveNps) tokens.push('NPS Ativo');
      if (st.isAula4SemApostilaFinEmDia) tokens.push('4ª Aula s/ Apostila');
      if (tokens.length === 0) tokens.push('Regular');
      return tokens;
    }
    default:
      return [getStudentColumnDisplayValue(st, colId)];
  }
}

export function extractColumnDistinctValues(
  students: ConsolidatedDashboardStudent[],
  colId: ConsolidatedColumnId
): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const st of students) {
    const tokens = getStudentColumnFilterTokens(st, colId);
    for (const token of tokens) {
      if (!token) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'pt-BR', { numeric: true }));
}

export function matchesMultiValueColumnFilters(
  st: ConsolidatedDashboardStudent,
  multiColumnFilters?: Partial<Record<ConsolidatedColumnId, string[]>>
): boolean {
  if (!multiColumnFilters) return true;
  for (const [colIdStr, selectedValues] of Object.entries(multiColumnFilters)) {
    if (!selectedValues || selectedValues.length === 0) continue;
    const colId = colIdStr as ConsolidatedColumnId;
    const studentTokens = getStudentColumnFilterTokens(st, colId);
    const hasMatch = selectedValues.some((val) => studentTokens.includes(val));
    if (!hasMatch) return false;
  }
  return true;
}

/**
 * ============================================================================
 * 5. AGRUPAMENTO DE DADOS RELEVANTE (MÁXIMO DE 3 OPÇÕES RELEVANTES)
 * ============================================================================
 */
export type GroupByField =
  | 'formacao'
  | 'modulo'
  | 'financeiro'
  | 'contrato'
  | 'cadNome'
  | 'unidade'
  | 'municipio'
  | 'categoria'
  | 'apostila'
  | 'situacaoAluno'
  | 'turno'
  | 'diaSemana'
  | 'horario'
  | 'modalidade'
  | 'sala';

export interface GroupByFieldDef {
  field: GroupByField;
  label: string;
}

/**
 * As 7 opções específicas de agrupamento disponíveis como ícone na lista de colunas à esquerda da tabela:
 * Formação, Módulo, Dia da Aula, Horário, Sala, Modalidade e Categoria.
 */
export const GROUPABLE_FIELDS: GroupByFieldDef[] = [
  { field: 'formacao', label: 'Formação do Aluno' },
  { field: 'modulo', label: 'Curso / Módulo' },
  { field: 'diaSemana', label: 'Dia da Aula' },
  { field: 'horario', label: 'Horário' },
  { field: 'sala', label: 'Sala' },
  { field: 'modalidade', label: 'Modalidade' },
  { field: 'categoria', label: 'Categoria' },
];

export function getGroupFieldLabel(field: GroupByField): string {
  const found = GROUPABLE_FIELDS.find((g) => g.field === field);
  if (found) return found.label;
  switch (field) {
    case 'formacao':
      return 'Formação do Aluno';
    case 'modulo':
      return 'Curso / Módulo';
    case 'diaSemana':
      return 'Dia da Aula';
    case 'horario':
      return 'Horário';
    case 'sala':
      return 'Sala';
    case 'modalidade':
      return 'Modalidade';
    case 'categoria':
      return 'Categoria';
    case 'financeiro':
      return 'Situação Financeira';
    default:
      return field;
  }
}

export function extractStudentGroupValue(
  st: ConsolidatedDashboardStudent,
  field: GroupByField
): string {
  switch (field) {
    case 'formacao':
      return st.formacao || st.capacitacao || 'Formação Profissional';
    case 'contrato':
      return `Contrato #${st.contrato}`;
    case 'cadNome':
      return st.cadNome || 'CAD 01 - Presidente Prudente';
    case 'unidade':
      return st.unidade || PORTAL_METADATA.unidade;
    case 'municipio':
      return st.municipio || 'Presidente Prudente - SP';
    case 'modulo':
      return st.cursos.join(' · ') || 'Módulo não informado';
    case 'categoria':
      return st.categoriaCurso === 'INGLÊS' ? 'Inglês' : 'Profissionalizante';
    case 'financeiro':
      return st.situacaoFinanceiraLabel;
    case 'apostila':
      return st.possuiApostila ? 'Apostila Entregue' : 'Apostila Não Entregue';
    case 'situacaoAluno':
      return st.alertaStatusLabel || 'Regular';
    case 'turno':
      return st.turno || 'Manhã';
    case 'diaSemana':
      return st.diasSemana.join(', ') || 'Não informado';
    case 'horario':
      return st.horariosKeys.join(', ') || 'Não informado';
    case 'modalidade':
      return st.modalidadesLabel || 'Presencial';
    case 'sala':
      return st.salas.join(', ') || 'Sala não informada';
  }
}

export interface GroupSubtotalMetrics {
  studentCount: number;
  agendamentosCount: number;
  presencaCount: number;
  faltaCount: number;
  frequenciaPercent: number | null;
  apostilaEntregueCount: number;
  apostilaPercent: number;
  financeiroEmDiaCount: number;
  financeiroEmDiaPercent: number;
  evasaoCount: number;
}

export function computeGroupSubtotals(
  students: ConsolidatedDashboardStudent[]
): GroupSubtotalMetrics {
  const studentCount = students.length;
  let agendamentosCount = 0;
  let presencaCount = 0;
  let faltaCount = 0;
  let apostilaEntregueCount = 0;
  let financeiroEmDiaCount = 0;
  let evasaoCount = 0;

  for (const st of students) {
    agendamentosCount += st.agendamentosCount;
    presencaCount += st.presencaCount;
    faltaCount += st.faltaCount;
    if (st.possuiApostila) apostilaEntregueCount++;
    if (!st.inadimplente) financeiroEmDiaCount++;
    if (st.isEvasao) evasaoCount++;
  }

  const baseFreq = presencaCount + faltaCount;
  const frequenciaPercent =
    baseFreq > 0 ? Number(((presencaCount / baseFreq) * 100).toFixed(1)) : null;

  const apostilaPercent =
    studentCount > 0
      ? Number(((apostilaEntregueCount / studentCount) * 100).toFixed(1))
      : 0;

  const financeiroEmDiaPercent =
    studentCount > 0
      ? Number(((financeiroEmDiaCount / studentCount) * 100).toFixed(1))
      : 0;

  return {
    studentCount,
    agendamentosCount,
    presencaCount,
    faltaCount,
    frequenciaPercent,
    apostilaEntregueCount,
    apostilaPercent,
    financeiroEmDiaCount,
    financeiroEmDiaPercent,
    evasaoCount,
  };
}

export interface MultiLevelGroupNode {
  groupKey: string;
  field: GroupByField;
  fieldLabel: string;
  value: string;
  level: number;
  subtotals: GroupSubtotalMetrics;
  children: MultiLevelGroupNode[];
  students: ConsolidatedDashboardStudent[];
}

export function buildMultiLevelGroups(
  students: ConsolidatedDashboardStudent[],
  groupByFields: GroupByField[],
  level = 0,
  parentKeyPrefix = ''
): MultiLevelGroupNode[] {
  if (groupByFields.length === 0 || level >= groupByFields.length) {
    return [];
  }

  const currentField = groupByFields[level];
  const fieldLabel = getGroupFieldLabel(currentField);
  const buckets = new Map<string, ConsolidatedDashboardStudent[]>();

  for (const st of students) {
    const val = extractStudentGroupValue(st, currentField);
    const list = buckets.get(val) ?? [];
    list.push(st);
    buckets.set(val, list);
  }

  const nodes: MultiLevelGroupNode[] = Array.from(buckets.entries()).map(
    ([value, groupStudents]) => {
      const groupKey = parentKeyPrefix
        ? `${parentKeyPrefix}||${currentField}:${value}`
        : `${currentField}:${value}`;
      const subtotals = computeGroupSubtotals(groupStudents);
      const hasMoreLevels = level + 1 < groupByFields.length;
      const children = hasMoreLevels
        ? buildMultiLevelGroups(
            groupStudents,
            groupByFields,
            level + 1,
            groupKey
          )
        : [];

      return {
        groupKey,
        field: currentField,
        fieldLabel,
        value,
        level,
        subtotals,
        children,
        students: groupStudents,
      };
    }
  );

  return nodes.sort((a, b) => {
    if (b.subtotals.studentCount !== a.subtotals.studentCount) {
      return b.subtotals.studentCount - a.subtotals.studentCount;
    }
    return a.value.localeCompare(b.value, 'pt-BR', { numeric: true });
  });
}

export function collectAllGroupKeys(nodes: MultiLevelGroupNode[]): string[] {
  const keys: string[] = [];
  const walk = (list: MultiLevelGroupNode[]) => {
    for (const n of list) {
      keys.push(n.groupKey);
      if (n.children.length > 0) {
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

/**
 * ============================================================================
 * 6. EXPORTAÇÃO ESTRUTURADA PARA EXCEL (.XLSX) E PDF (.PDF)
 * ============================================================================
 */
export interface ConsolidatedExportMatrix {
  headers: string[];
  columnIds: ConsolidatedColumnId[];
  rows: Array<{
    type: 'GROUP_HEADER' | 'DATA' | 'GRAND_TOTAL';
    cells: (string | number)[];
    level?: number;
  }>;
  grandTotals: GroupSubtotalMetrics;
}

export function buildConsolidatedExportMatrix(
  students: ConsolidatedDashboardStudent[],
  effectiveColumns: ConsolidatedColumnDef[],
  groupByFields: GroupByField[] = [],
  includeGroups = true
): ConsolidatedExportMatrix {
  const exportCols = effectiveColumns.filter((c) => c.exportable);
  const headers = exportCols.map((c) => c.label);
  const columnIds = exportCols.map((c) => c.id);
  const grandTotals = computeGroupSubtotals(students);

  const rows: ConsolidatedExportMatrix['rows'] = [];

  const pushStudentRow = (st: ConsolidatedDashboardStudent) => {
    const cells = exportCols.map((col) => {
      switch (col.id) {
        case 'agendamentos':
          return st.agendamentosCount;
        default:
          return getStudentColumnDisplayValue(st, col.id);
      }
    });
    rows.push({ type: 'DATA', cells });
  };

  if (includeGroups && groupByFields.length > 0) {
    const groupTree = buildMultiLevelGroups(students, groupByFields);
    const traverse = (nodes: MultiLevelGroupNode[]) => {
      for (const node of nodes) {
        const indent = '  '.repeat(node.level);
        const freqText =
          node.subtotals.frequenciaPercent !== null
            ? `${node.subtotals.frequenciaPercent.toFixed(1)}%`
            : 'S/D';
        const summaryTitle = `${indent}[${node.fieldLabel}: ${node.value}] — ${node.subtotals.studentCount} reg. | Frequência: ${freqText}`;

        const groupCells: (string | number)[] = exportCols.map((col, idx) => {
          if (idx === 0) return summaryTitle;
          if (col.id === 'frequencia') return freqText;
          if (col.id === 'agendamentos') return node.subtotals.agendamentosCount;
          return '';
        });

        rows.push({
          type: 'GROUP_HEADER',
          cells: groupCells,
          level: node.level,
        });

        if (node.children.length > 0) {
          traverse(node.children);
        } else {
          for (const st of node.students) {
            pushStudentRow(st);
          }
        }
      }
    };
    traverse(groupTree);
  } else {
    for (const st of students) {
      pushStudentRow(st);
    }
  }

  // Linha de Total Geral
  const grandFreqText =
    grandTotals.frequenciaPercent !== null
      ? `${grandTotals.frequenciaPercent.toFixed(1)}%`
      : 'S/D';
  const grandTotalCells: (string | number)[] = exportCols.map((col, idx) => {
    if (idx === 0) {
      return `TOTAL GERAL (${grandTotals.studentCount} registros)`;
    }
    if (col.id === 'frequencia') return grandFreqText;
    if (col.id === 'agendamentos') return grandTotals.agendamentosCount;
    if (col.id === 'apostila')
      return `${grandTotals.apostilaEntregueCount} (${grandTotals.apostilaPercent}%)`;
    if (col.id === 'financeiro')
      return `${grandTotals.financeiroEmDiaCount} em dia (${grandTotals.financeiroEmDiaPercent}%)`;
    return '';
  });

  rows.push({
    type: 'GRAND_TOTAL',
    cells: grandTotalCells,
  });

  return {
    headers,
    columnIds,
    rows,
    grandTotals,
  };
}

export function generateConsolidatedXlsxWorkbook(
  matrix: ConsolidatedExportMatrix,
  sheetTitle = 'Consolidado Alunos'
): XLSX.WorkBook {
  const aoa: (string | number)[][] = [
    matrix.headers,
    ...matrix.rows.map((r) => r.cells),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = matrix.headers.map((h, i) => {
    let maxLen = h.length + 4;
    for (const r of matrix.rows) {
      const cellStr = String(r.cells[i] ?? '');
      if (cellStr.length > maxLen && r.type === 'DATA') {
        maxLen = Math.min(48, cellStr.length + 3);
      }
    }
    return { wch: Math.max(14, maxLen) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
  return wb;
}

export function exportConsolidatedToXlsx(params: {
  students: ConsolidatedDashboardStudent[];
  effectiveColumns: ConsolidatedColumnDef[];
  groupByFields: GroupByField[];
  includeGroups: boolean;
  scopeLabel: string;
  activeCadNames?: string[];
}): string {
  const matrix = buildConsolidatedExportMatrix(
    params.students,
    params.effectiveColumns,
    params.groupByFields,
    params.includeGroups
  );
  const wb = generateConsolidatedXlsxWorkbook(matrix, 'Tabela Consolidada');
  const safeScope = params.scopeLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const filename = `microlins-tabela-consolidada-${safeScope}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

export function exportConsolidatedToPdf(params: {
  students: ConsolidatedDashboardStudent[];
  effectiveColumns: ConsolidatedColumnDef[];
  groupByFields: GroupByField[];
  includeGroups: boolean;
  scopeLabel: string;
  activeCadNames?: string[];
}): string {
  const matrix = buildConsolidatedExportMatrix(
    params.students,
    params.effectiveColumns,
    params.groupByFields,
    params.includeGroups
  );

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const dataRows = matrix.rows.filter((r) => r.type !== 'GRAND_TOTAL');
  const grandTotalRow = matrix.rows.find((r) => r.type === 'GRAND_TOTAL');

  const groupLabels =
    params.groupByFields.length > 0
      ? params.groupByFields.map(getGroupFieldLabel).join(' > ')
      : 'Sem agrupamento';

  autoTable(doc, {
    head: [matrix.headers],
    body: dataRows.map((r) => r.cells.map((c) => String(c ?? ''))),
    foot: grandTotalRow
      ? [grandTotalRow.cells.map((c) => String(c ?? ''))]
      : undefined,
    startY: 26,
    margin: { top: 26, right: 8, bottom: 14, left: 8 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 74, 141],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowMeta = dataRows[hookData.row.index];
        if (rowMeta?.type === 'GROUP_HEADER') {
          hookData.cell.styles.fillColor = [224, 242, 254];
          hookData.cell.styles.textColor = [0, 56, 107];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (hookData) => {
      // Cabeçalho institucional em todas as páginas
      doc.setFillColor(0, 74, 141);
      doc.rect(8, 6, 281, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(
        'GRUPO REALIZAR MICROLINS — TABELA CONSOLIDADA DE ALUNOS',
        12,
        12.5
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        `Unidade: ${PORTAL_METADATA.unidade} | Escopo: ${params.scopeLabel} (${params.students.length} registros) | Agrupamento: ${groupLabels}`,
        12,
        18.5
      );

      // Rodapé com paginação
      const pageCount = doc.getNumberOfPages();
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(
        `Microlins — Relatório Gerencial Consolidado · Página ${hookData.pageNumber} de ${pageCount}`,
        12,
        204
      );
    },
  });

  const safeScope = params.scopeLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const filename = `microlins-tabela-consolidada-${safeScope}.pdf`;
  doc.save(filename);
  return filename;
}
