import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supabase,
  fetchStudentRecords,
  fetchNpsInvitations,
  fetchSchoolsFromSupabase,
  migrateAllDataToSupabase,
} from './supabaseClient';

test('SUPABASE-01: Supabase client initialization and configuration', () => {
  assert.ok(supabase, 'Supabase client must be defined');
  assert.equal(typeof supabase.auth, 'object', 'Supabase auth manager must be present');
  assert.equal(typeof supabase.from, 'function', 'Supabase query builder .from() must be a function');
});

test('SUPABASE-02: Async fetchStudentRecords retrieves student records successfully', async () => {
  const records = await fetchStudentRecords();
  assert.ok(Array.isArray(records), 'Records must be an array');
  assert.ok(records.length > 0, 'Records array must not be empty (should return remote or fallback data)');
  const sample = records[0];
  assert.ok(sample.contrato !== undefined, 'Student record must have contrato field');
  assert.ok(sample.nomeCompleto !== undefined, 'Student record must have nomeCompleto field');
});

test('SUPABASE-03: Async fetchNpsInvitations retrieves NPS survey invitations successfully', async () => {
  const invitations = await fetchNpsInvitations();
  assert.ok(Array.isArray(invitations), 'NPS invitations must be an array');
  assert.ok(invitations.length > 0, 'NPS invitations array must not be empty');
  const sample = invitations[0];
  assert.ok(sample.controlId !== undefined, 'NPS invitation must have controlId field');
  assert.ok(sample.studentName !== undefined, 'NPS invitation must have studentName field');
});

test('SUPABASE-04: Async fetchSchoolsFromSupabase retrieves registered schools successfully', async () => {
  const schools = await fetchSchoolsFromSupabase();
  assert.ok(Array.isArray(schools), 'Schools registry must be an array');
  assert.ok(schools.length > 0, 'Schools registry must not be empty');
  const school = schools[0];
  assert.ok(school.id !== undefined, 'School must have id');
  assert.ok(school.nome !== undefined, 'School must have nome');
  assert.ok(school.npsCredential !== undefined, 'School must have npsCredential configuration');
  assert.ok(Array.isArray(school.users), 'School must have users array');
});

test('SUPABASE-05: Supabase Auth session management methods are available', async () => {
  const { data, error } = await supabase.auth.getSession();
  assert.ok(data !== undefined, 'Auth getSession result data must be defined');
});

test('SUPABASE-06: migrateAllDataToSupabase migration function is defined', () => {
  assert.equal(typeof migrateAllDataToSupabase, 'function');
});
