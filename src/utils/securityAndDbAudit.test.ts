import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  hashPasswordArgon2id,
  verifyPasswordSecure,
  isArgon2idHash,
  encryptSecretAES256GCM,
  decryptSecretAES256GCM,
  isEncryptedSecret,
  generateSessionToken,
  hashSessionToken,
  sanitizeInputText,
  detectMaliciousPayload,
} from './securityCrypto';

import {
  searchPrivacyKnowledgeBase,
  PRIVACY_KNOWLEDGE_BASE,
  PRIVACY_QUICK_QUESTIONS,
} from './privacyKnowledgeBase';

import {
  getDatabase,
  closeDatabase,
  getDatabaseStatusSummary,
  createDatabaseBackup,
  authenticateUserInDb,
  validateSessionTokenInDb,
  revokeSessionTokenInDb,
  createPasswordRecoveryTokenInDb,
  resetPasswordWithRecoveryTokenInDb,
  upsertSchoolInDb,
  upsertUserInDb,
  createLgpdRequestInDb,
  getLgpdRequestsFromDb,
  getAuditLogsFromDb,
} from '../db/database';

const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'microlins-audit-test-'));
const isolatedDbPath = path.join(tmpTestDir, 'test_audit.sqlite');

test('ETAPA 3.1: Argon2id password hashing and constant-time verification', () => {
  const rawPassword = 'StrongPassword@2026!';
  const hash = hashPasswordArgon2id(rawPassword);

  assert.equal(isArgon2idHash(hash), true, 'Hash must use PHC $argon2id$v=19$ format');
  assert.notEqual(hash, rawPassword, 'Hash must never equal plaintext password');
  assert.equal(verifyPasswordSecure(rawPassword, hash), true, 'Correct password must verify true');
  assert.equal(verifyPasswordSecure('WrongPassword@2026!', hash), false, 'Wrong password must verify false');
  assert.equal(verifyPasswordSecure('', hash), false, 'Empty password must verify false');
});

test('ETAPA 3.2: Authenticated encryption at rest for external integration secrets', () => {
  const secretPortalPass = 'PortalMoveEdu#Secret99';
  const encrypted = encryptSecretAES256GCM(secretPortalPass);

  assert.equal(isEncryptedSecret(encrypted), true, 'Encrypted value must have enc:aes256gcm: prefix');
  assert.ok(!encrypted.includes(secretPortalPass), 'Ciphertext must not contain plaintext');

  const decrypted = decryptSecretAES256GCM(encrypted);
  assert.equal(decrypted, secretPortalPass, 'Decrypted value must match original plaintext');
});

test('ETAPA 3.3: Session token generation (256-bit entropy) and SHA-256 digest', () => {
  const tokenA = generateSessionToken();
  const tokenB = generateSessionToken();
  assert.equal(tokenA.length, 64, '256-bit hex token must be 64 hex chars');
  assert.notEqual(tokenA, tokenB, 'Tokens must be unique CSPRNG values');

  const digestA = hashSessionToken(tokenA);
  assert.equal(digestA.length, 64);
  assert.notEqual(digestA, tokenA);
});

test('ETAPA 3.4: XSS and SQL Injection payload detection & input sanitization', () => {
  const xssAttempt = '<script>alert("xss")</script>';
  assert.equal(detectMaliciousPayload(xssAttempt).isMalicious, true, 'Must detect <script> XSS tag');
  const sanitized = sanitizeInputText(xssAttempt);
  assert.ok(!sanitized.includes('<script>'), 'Sanitized string must not contain raw <script> tags');

  const sqliAttempt = "admin' UNION SELECT username, password FROM users --";
  assert.equal(detectMaliciousPayload(sqliAttempt).isMalicious, true, 'Must detect UNION SELECT SQLi pattern');

  const safeInput = 'ESCOLA PRESIDENTE PRUDENTE - Relatório Mensal 2026';
  assert.equal(detectMaliciousPayload(safeInput).isMalicious, false, 'Normal Portuguese text must not trigger false positive');
});

test('ETAPA 2: Real SQLite Database initialization, schema migrations, foreign keys & automatic backups', () => {
  closeDatabase();
  getDatabase(isolatedDbPath);
  const summary = getDatabaseStatusSummary();

  assert.equal(summary.engine.includes('SQLite'), true);
  assert.equal(summary.foreignKeysEnabled, true, 'SQLite PRAGMA foreign_keys must be enabled');
  assert.ok(summary.counts.schools >= 1, 'Default school must be seeded in SQLite');
  assert.ok(summary.counts.users >= 2, 'Default school and admin users must be seeded in SQLite');
  assert.ok(summary.appliedMigrations.length >= 1, 'Migration must be recorded in schema_migrations');

  const backupInfo = createDatabaseBackup('audit-unit-test');
  assert.ok(backupInfo.backupFile.length > 0, 'Backup file name must be returned');
  assert.ok(backupInfo.sizeBytes > 0, 'Backup file must be non-empty');
});

test('ETAPA 3.5: Authentication, Server-side Sessions, and Brute-Force Lockout Protection', () => {
  getDatabase(isolatedDbPath);

  // 1. Valid login for default school user
  const validAuth = authenticateUserInDb(
    'a116882',
    'Joao@2025',
    '127.0.0.1',
    'NodeTestAgent'
  );
  assert.equal(validAuth.ok, true);
  assert.equal(validAuth.status, 200);
  assert.ok(validAuth.session?.sessionToken, 'Must issue 256-bit session token');
  assert.equal(validAuth.session?.role, 'ESCOLA');

  // 2. Validate session token in DB
  const sessionCheck = validateSessionTokenInDb(validAuth.session?.sessionToken);
  assert.ok(sessionCheck, 'Session token must validate in DB');
  assert.equal(sessionCheck?.login, 'a116882');
  assert.equal(sessionCheck?.role, 'ESCOLA');

  // 3. Revoke session token (Logout)
  revokeSessionTokenInDb(validAuth.session?.sessionToken);
  const afterRevoke = validateSessionTokenInDb(validAuth.session?.sessionToken);
  assert.equal(afterRevoke, null, 'Revoked session token must no longer validate');

  // 4. Brute-force protection: 5 failed attempts lock the username
  const bruteUser = 'brute_target_user';
  for (let i = 1; i <= 5; i++) {
    const res = authenticateUserInDb(bruteUser, 'WrongPass', '10.0.0.99', 'AttackerBot');
    assert.equal(res.ok, false);
  }

  // 6th attempt while locked must return 429 Too Many Requests
  const lockedAttempt = authenticateUserInDb(bruteUser, 'WrongPass', '10.0.0.99', 'AttackerBot');
  assert.equal(lockedAttempt.ok, false);
  assert.equal(lockedAttempt.status, 429, 'Locked account must return HTTP 429');
});

test('ETAPA 3.6: Secure single-use time-limited Password Recovery flow', () => {
  getDatabase(isolatedDbPath);

  const { school } = upsertSchoolInDb({
    nome: 'UNIDADE TESTE RECUPERACAO',
    codigoPortal: '9991',
    cidade: 'Marília',
    uf: 'SP',
    npsEmail: 'marilia@microlins.com.br',
    npsPassword: 'MariliaNps@2026',
  });
  assert.ok(school.id);

  const { user } = upsertUserInDb(school.id, {
    login: 'prof_recuperacao',
    senha: 'Initial@123',
    nomeCompleto: 'Prof Teste Recuperacao',
    cargo: 'Instrutor',
  });
  assert.equal(user.login, 'prof_recuperacao');

  // Request password recovery token
  const recovery = createPasswordRecoveryTokenInDb('prof_recuperacao', '127.0.0.1');
  assert.equal(recovery.ok, true);
  assert.ok(recovery.recoveryToken, 'Must generate single-use recovery token');

  // Reset password using the recovery token
  const resetRes = resetPasswordWithRecoveryTokenInDb(
    recovery.recoveryToken!,
    'NewSecurePass#2026',
    '127.0.0.1'
  );
  assert.equal(resetRes.ok, true);

  // Reusing the same recovery token must fail (single-use enforcement)
  const reuseRes = resetPasswordWithRecoveryTokenInDb(
    recovery.recoveryToken!,
    'AnotherPass#2026',
    '127.0.0.1'
  );
  assert.equal(reuseRes.ok, false, 'Single-use recovery token must reject second use');

  // Authenticate with new password
  const loginNew = authenticateUserInDb('prof_recuperacao', 'NewSecurePass#2026', '127.0.0.1');
  assert.equal(loginNew.ok, true, 'User must be able to login with the newly reset password');
});

test('ETAPA 4: LGPD Knowledge Base Intelligent Search & Subject Rights Request Persistence', () => {
  getDatabase(isolatedDbPath);

  assert.ok(PRIVACY_KNOWLEDGE_BASE.length >= 8, 'Knowledge base must cover all required LGPD topics');
  assert.equal(PRIVACY_QUICK_QUESTIONS.length, 7, 'Must expose all 7 mandatory quick questions');

  for (const question of PRIVACY_QUICK_QUESTIONS) {
    const results = searchPrivacyKnowledgeBase(question);
    assert.ok(results.length >= 1, `Intelligent search must return relevant answer for: "${question}"`);
    assert.ok((results[0].score || 0) >= 25, `Top match score must be high for: "${question}"`);
  }

  // Test persisting an LGPD Subject Right request in SQLite
  const lgpdRecord = createLgpdRequestInDb({
    requesterName: 'Maria Silva',
    requesterEmail: 'maria.silva@exemplo.com.br',
    requesterRole: 'Aluno / Responsável Legal',
    requestType: 'ACESSO_DADOS',
    description: 'Solicito confirmação de tratamento e relatório de logs de acesso à minha conta.',
    ipAddress: '127.0.0.1',
  });
  assert.ok(lgpdRecord.protocol.startsWith('LGPD-'), 'Must generate official LGPD protocol number');

  const requests = getLgpdRequestsFromDb();
  assert.ok(requests.some((r) => r.protocol === lgpdRecord.protocol), 'LGPD request must be persisted in SQLite');

  const logs = getAuditLogsFromDb(50);
  assert.ok(logs.length > 0, 'Audit logs must record system security and LGPD events');

  closeDatabase();
});
