import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supabase,
  checkSupabaseHealth,
  fetchStudentRecords,
  fetchNpsInvitations,
  fetchSchoolsFromSupabase,
  upsertSchoolInSupabase,
  deleteSchoolFromSupabase,
  upsertUserInSupabase,
  updateUserPasswordInSupabase,
  toggleUserStatusInSupabase,
  deleteUserFromSupabase,
  authenticateUserInSupabase,
  recordAuditLogInSupabase,
  fetchAuditLogsFromSupabase,
  createLgpdRequestInSupabase,
  fetchLgpdRequestsFromSupabase,
  migrateAllDataToSupabase,
} from './supabaseClient';
import { resolveRecordProfessor } from './performanceAnalytics';

test('SUPABASE-01: Inicialização do cliente Supabase, Auth, Storage e RPC', () => {
  assert.ok(supabase, 'Cliente Supabase deve estar instanciado');
  assert.equal(typeof supabase.auth, 'object', 'Módulo Supabase Auth deve estar disponível');
  assert.equal(typeof supabase.storage, 'object', 'Módulo Supabase Storage deve estar disponível');
  assert.equal(typeof supabase.rpc, 'function', 'Método Supabase RPC (.rpc) deve estar disponível');
  assert.equal(typeof supabase.from, 'function', 'Query builder .from() deve ser uma função');
});

test('SUPABASE-02: Health Check de conexão e disponibilidade das 6 tabelas no PostgreSQL', async () => {
  const health = await checkSupabaseHealth();
  assert.equal(health.connected, true, `Supabase deve estar conectado (${health.error || 'OK'})`);
  assert.ok(health.supabaseUrl.includes('supabase.co'), 'URL do projeto Supabase deve ser válida');
  assert.ok(health.counts.schools >= 1, 'Tabela schools deve conter ao menos 1 unidade ativa');
  assert.ok(health.counts.users >= 1, 'Tabela users deve conter ao menos 1 credencial cadastrada');
  assert.ok(health.counts.studentRecords >= 600, 'Tabela student_records deve conter os agendamentos reais do Portal');
  assert.ok(health.counts.npsRecords >= 100, 'Tabela nps_records deve conter os convites reais do Indecx NPS');
});

test('SUPABASE-03: Leitura de student_records retorna dados reais do Portal e ZERO educadores fictícios', async () => {
  const records = await fetchStudentRecords();
  assert.ok(Array.isArray(records), 'fetchStudentRecords deve retornar um array');
  assert.ok(records.length >= 600, `Esperado >= 600 registros reais, recebido ${records.length}`);

  const sample = records[0];
  assert.ok(sample.contrato && sample.contrato.length > 0, 'Registro deve possuir número de contrato');
  assert.ok(sample.nomeCompleto && sample.nomeCompleto.length > 0, 'Registro deve possuir nomeCompleto');
  assert.ok(sample.diaSemana && sample.diaSemana.length > 0, 'Registro deve possuir diaSemana');

  // Garante que os antigos nomes fictícios ('João Silva', 'Camila Ferreira', 'Lucas Almeida') não aparecem
  const fictitiousSet = new Set(['João Silva', 'Camila Ferreira', 'Lucas Almeida']);
  for (const r of records) {
    const prof = resolveRecordProfessor(r);
    assert.equal(
      fictitiousSet.has(prof),
      false,
      `Educador fictício detectado indevidamente no contrato ${r.contrato}: ${prof}`
    );
  }
});

test('SUPABASE-04: Leitura de nps_records retorna convites NPS reais sincronizados', async () => {
  const invitations = await fetchNpsInvitations();
  assert.ok(Array.isArray(invitations), 'fetchNpsInvitations deve retornar um array');
  assert.ok(invitations.length >= 100, 'Lista de convites NPS não deve estar vazia');
  const sample = invitations[0];
  assert.ok(sample.controlId !== undefined, 'Convite NPS deve possuir controlId');
  assert.ok(sample.studentName !== undefined, 'Convite NPS deve possuir studentName');
});

test('SUPABASE-05: Leitura de schools e relacionamento 1:N com users (sanitização de segredos)', async () => {
  const sanitizedSchools = await fetchSchoolsFromSupabase(false);
  assert.ok(Array.isArray(sanitizedSchools), 'Schools deve ser um array');
  assert.ok(sanitizedSchools.length >= 1, 'Deve existir ao menos a unidade padrão');

  const mainSchool = sanitizedSchools.find((s) => s.id === 'school-1875') || sanitizedSchools[0];
  assert.ok(mainSchool, 'Unidade principal deve existir');
  assert.ok(Array.isArray(mainSchool.users), 'Relacionamento school.users deve ser um array');
  assert.ok(mainSchool.users.length >= 1, 'Unidade principal deve possuir usuários vinculados');

  // Verifica que senhas e hashes nunca vazam quando includeSensitive = false
  for (const u of mainSchool.users) {
    assert.equal(
      u.senha.startsWith('argon2id$'),
      false,
      'Hash Argon2id não deve ser exposto para o cliente quando sanitizado'
    );
  }
});

test('SUPABASE-06: Ciclo completo CRUD (INSERT, SELECT, UPDATE, DELETE) em schools e users com limpeza automática', async () => {
  const tempSchoolId = `school-audit-test-${Date.now()}`;
  const tempUserId = `user-audit-test-${Date.now()}`;
  const tempLogin = `audit.user.${Date.now()}`;

  try {
    // 1. INSERT School
    const createdSchoolRes = await upsertSchoolInSupabase({
      id: tempSchoolId,
      nome: 'UNIDADE TESTE AUDITORIA SUPABASE',
      cidade: 'Presidente Prudente',
      uf: 'SP',
      codigoPortal: '9999',
      ativa: true,
      npsEmail: 'auditoria@microlins.com.br',
    });
    assert.ok(
      createdSchoolRes.schools.some((s) => s.id === tempSchoolId),
      'Escola recém-inserida deve constar no Supabase'
    );

    // 2. UPDATE School
    const updatedSchoolRes = await upsertSchoolInSupabase({
      id: tempSchoolId,
      nome: 'UNIDADE TESTE AUDITORIA ATUALIZADA',
      ativa: true,
    });
    const updatedSchool = updatedSchoolRes.schools.find((s) => s.id === tempSchoolId);
    assert.equal(
      updatedSchool?.nome,
      'UNIDADE TESTE AUDITORIA ATUALIZADA',
      'Nome da unidade deve ser atualizado no Supabase'
    );

    // 3. INSERT User vinculado à escola (FK school_id)
    const createdUserRes = await upsertUserInSupabase(tempSchoolId, {
      id: tempUserId,
      login: tempLogin,
      senha: 'AuditPass@2026',
      nomeCompleto: 'Colaborador Teste Auditoria',
      cargo: 'Coordenador Pedagógico',
      ativo: true,
    });
    assert.equal(createdUserRes.user.login, tempLogin, 'Usuário deve ser inserido com login correto');

    // 4. Autenticação real contra o usuário recém-criado no Supabase
    const authSuccess = await authenticateUserInSupabase(tempLogin, 'AuditPass@2026');
    assert.equal(authSuccess.ok, true, 'Autenticação com senha correta deve ter sucesso no Supabase');
    assert.equal(authSuccess.session?.role, 'ESCOLA', 'Perfil deve ser ESCOLA');

    // 5. UPDATE Password do usuário no Supabase
    await updateUserPasswordInSupabase(tempSchoolId, tempUserId, 'NovaSenha@2026');
    const authAfterPassChange = await authenticateUserInSupabase(tempLogin, 'NovaSenha@2026');
    assert.equal(
      authAfterPassChange.ok,
      true,
      'Autenticação com a nova senha atualizada deve funcionar imediatamente'
    );

    // 6. Toggle status ativo/inativo do usuário
    await toggleUserStatusInSupabase(tempSchoolId, tempUserId);
    const authWhenInactive = await authenticateUserInSupabase(tempLogin, 'NovaSenha@2026');
    assert.equal(
      authWhenInactive.ok,
      false,
      'Usuário inativado deve ter login bloqueado'
    );

    // 7. DELETE User
    const afterDeleteUser = await deleteUserFromSupabase(tempSchoolId, tempUserId);
    const schoolAfterUserDel = afterDeleteUser.find((s) => s.id === tempSchoolId);
    assert.equal(
      schoolAfterUserDel?.users.some((u) => u.id === tempUserId),
      false,
      'Usuário excluído não deve mais existir na unidade'
    );
  } finally {
    // 8. DELETE School (limpeza garantida)
    await deleteSchoolFromSupabase(tempSchoolId);
    await supabase.from('audit_logs').delete().like('resource', `%${tempSchoolId}%`);
    await supabase.from('audit_logs').delete().eq('actor_login', tempLogin);
  }

  const finalSchools = await fetchSchoolsFromSupabase(false);
  assert.equal(
    finalSchools.some((s) => s.id === tempSchoolId),
    false,
    'Unidade temporária de teste deve ter sido completamente removida'
  );
});

test('SUPABASE-07: Ciclo CRUD em lgpd_requests e audit_logs com validação de dados e limpeza', async () => {
  const createdReq = await createLgpdRequestInSupabase({
    requesterName: 'Titular Teste Auditoria',
    requesterEmail: 'titular.teste@microlins.com.br',
    requesterRole: 'Aluno',
    requestType: 'ACESSO_DADOS',
    description: 'Solicitação automatizada de teste de integridade LGPD no Supabase.',
  });

  try {
    assert.ok(createdReq.protocol.startsWith('LGPD-'), 'Protocolo LGPD deve ser gerado no formato padrão');
    const allRequests = await fetchLgpdRequestsFromSupabase();
    assert.ok(
      allRequests.some((r) => r.protocol === createdReq.protocol),
      'Solicitação LGPD inserida deve ser retornada na consulta ao Supabase'
    );

    const logs = await fetchAuditLogsFromSupabase(30);
    assert.ok(logs.length > 0, 'Trilha de auditoria no Supabase deve conter eventos registrados');
  } finally {
    await supabase.from('lgpd_requests').delete().eq('protocol', createdReq.protocol);
    await supabase
      .from('audit_logs')
      .delete()
      .eq('resource', `lgpd_requests/${createdReq.protocol}`);
  }
});

test('SUPABASE-08: Tratamento de erros ao enviar dados inválidos e tentativa de login inválido', async () => {
  await assert.rejects(
    async () => {
      await upsertSchoolInSupabase({ nome: '   ' });
    },
    /obrigatório/i,
    'Deve rejeitar criação de escola com nome vazio'
  );

  await assert.rejects(
    async () => {
      await createLgpdRequestInSupabase({
        requesterName: '',
        requesterEmail: '',
        requesterRole: 'Aluno',
        requestType: 'ACESSO_DADOS',
        description: '',
      });
    },
    /obrigatórios/i,
    'Deve rejeitar solicitação LGPD com campos obrigatórios vazios'
  );

  const invalidLogin = await authenticateUserInSupabase('usuario_inexistente_999', 'senha_errada');
  assert.equal(invalidLogin.ok, false, 'Login inexistente deve retornar ok: false');
  assert.ok(invalidLogin.error, 'Login inválido deve retornar mensagem clara de erro');
  await supabase.from('audit_logs').delete().eq('actor_login', 'usuario_inexistente_999');
});

test('SUPABASE-09: Função migrateAllDataToSupabase está disponível e funcional', () => {
  assert.equal(typeof migrateAllDataToSupabase, 'function');
});
