'use strict';

// Copies the cloud project's data into the local Docker Supabase stack and
// re-owns every row to the local dev account (DEV_USER in .env.local), so
// `pnpm dev` has a realistic dataset that's actually visible under the
// owner-scoped read policies (20260802120000_owner_scoped_content_reads.sql).
//
// Idempotent: everything is upserted by primary key, nothing is ever deleted,
// so local-only rows survive a re-run.
//
// Usage (from web/):
//   node --env-file=.env.local scripts/pull-remote.js [source-email]
//
// .env.local supplies the REMOTE url/service key plus DEV_USER; the LOCAL
// url/service key are parsed out of .env.local.docker (passing --env-file
// twice would clobber the remote url with the local one).

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SOURCE_EMAIL = 'naveennaik0202@gmail.com';
const PAGE = 1000; // PostgREST max_rows
const CHUNK = 100; // markdown + body_html make rows fat; keep payloads small

function readEnvFile(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

// supabase-js has no getUserByEmail — page through listUsers to find it.
async function findUser(client, email) {
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

async function pullAll(client, table, filter) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (filter) q = q.eq(filter[0], filter[1]);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function push(client, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length} row(s) upserted`);
}

async function count(client, table) {
  const { count: n, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return n;
}

(async () => {
  const sourceEmail = process.argv[2] || DEFAULT_SOURCE_EMAIL;
  const devEmail = process.env.DEV_USER;

  const remoteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const remoteKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!remoteUrl || !remoteKey || !devEmail) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEV_USER — run with --env-file=.env.local',
    );
    process.exit(1);
  }
  if (remoteUrl.includes('localhost') || remoteUrl.includes('127.0.0.1')) {
    console.error(`Refusing to run: ${remoteUrl} is not the remote project`);
    process.exit(1);
  }

  const localEnv = readEnvFile(path.resolve(__dirname, '../.env.local.docker'));
  const localUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL;
  const localKey = localEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!localUrl || !localKey) {
    console.error('Missing url/service key in .env.local.docker');
    process.exit(1);
  }

  const remote = createClient(remoteUrl, remoteKey);
  const local = createClient(localUrl, localKey);

  const [src, dev] = await Promise.all([
    findUser(remote, sourceEmail),
    findUser(local, devEmail),
  ]);
  if (!src) {
    console.error(`No remote user with email ${sourceEmail}`);
    process.exit(1);
  }
  if (!dev) {
    console.error(
      `No local user with email ${devEmail} — sign in once at localhost:3000 to create it`,
    );
    process.exit(1);
  }
  console.log(`Remote ${remoteUrl}`);
  console.log(`  source: ${sourceEmail} (${src.id})`);
  console.log(`Local  ${localUrl}`);
  console.log(`  dev:    ${devEmail} (${dev.id})\n`);

  // --- pull -----------------------------------------------------------------
  const mine = ['user_id', src.id];
  const [
    questions,
    groups,
    remoteSections,
    progress,
    positions,
    inbox,
    setAside,
    settings,
  ] = await Promise.all([
    pullAll(remote, 'questions'),
    pullAll(remote, 'topic_groups'),
    pullAll(remote, 'sections'),
    pullAll(remote, 'progress', mine),
    pullAll(remote, 'question_position', mine),
    pullAll(remote, 'inbox_items', mine),
    pullAll(remote, 'set_aside_items', mine),
    pullAll(remote, 'user_settings', mine),
  ]);

  // Remote has caught up on 20260804105557, so these selects now fail and
  // starred/priority come through as columns on `questions` instead. Kept as a
  // fallback for pointing this at a project still on the pre-merge shape.
  const legacy = async (table) => {
    try {
      return await pullAll(remote, table, mine);
    } catch {
      return null;
    }
  };
  const [starredRows, priorityRows] = await Promise.all([
    legacy('starred_questions'),
    legacy('priority'),
  ]);
  const starred = new Set((starredRows ?? []).map((r) => r.question_id));
  const priority = new Map(
    (priorityRows ?? []).map((r) => [r.question_id, r.level]),
  );

  console.log(
    `Pulled: ${questions.length} questions, ${groups.length} topic_groups, ` +
      `${remoteSections.length} sections, ${progress.length} progress, ` +
      `${positions.length} positions, ${inbox.length} inbox, ` +
      `${setAside.length} set_aside, ${settings.length} settings, ` +
      `${starred.size} starred, ${priority.size} priorities\n`,
  );

  // --- transform ------------------------------------------------------------
  const own = (rows, col) => rows.map((r) => ({ ...r, [col]: dev.id }));

  const questionRows = questions.map((q) => ({
    id: q.id,
    topic: q.topic,
    file: q.file,
    number: q.number,
    title: q.title,
    body_html: q.body_html,
    label: q.label,
    group_slug: q.group_slug,
    markdown: q.markdown,
    lang: q.lang,
    tags: q.tags,
    problem: q.problem,
    created_by: dev.id,
    starred: q.starred ?? starred.has(q.id),
    priority: q.priority ?? priority.get(q.id) ?? null,
  }));

  // Only 2 `sections` rows exist remotely — the static curriculum's subtopics
  // never got any. Derive the rest from the questions themselves so every
  // subtopic is reachable (broader than scripts/backfill-static-sections.js,
  // which only knows lib/content/topics.ts's static list).
  const sectionByKey = new Map();
  for (const s of remoteSections) {
    sectionByKey.set(`${s.topic}/${s.file}`, {
      topic: s.topic,
      file: s.file,
      label: s.label,
      group_slug: s.group_slug,
      created_by: dev.id,
    });
  }
  for (const q of questions) {
    const key = `${q.topic}/${q.file}`;
    if (!sectionByKey.has(key)) {
      sectionByKey.set(key, {
        topic: q.topic,
        file: q.file,
        label: q.label,
        group_slug: q.group_slug,
        created_by: dev.id,
      });
    }
  }
  const sectionRows = [...sectionByKey.values()];

  // A section's group_slug FKs topic_groups.slug — drop any orphans rather
  // than failing the whole import on one stale row.
  const groupSlugs = new Set(groups.map((g) => g.slug));
  const orphans = sectionRows.filter((s) => !groupSlugs.has(s.group_slug));
  if (orphans.length) {
    console.log(
      `  skipping ${orphans.length} section(s) with unknown group_slug: ` +
        orphans.map((s) => `${s.topic}/${s.file}`).join(', '),
    );
  }

  // --- push (FK order: topic_groups <- sections) ----------------------------
  console.log('Writing to local:');
  await push(local, 'topic_groups', own(groups, 'created_by'), 'slug');
  await push(
    local,
    'sections',
    sectionRows.filter((s) => groupSlugs.has(s.group_slug)),
    'topic,file',
  );
  await push(local, 'questions', questionRows, 'id');
  await push(
    local,
    'progress',
    own(progress, 'user_id'),
    'user_id,question_id',
  );
  await push(
    local,
    'question_position',
    own(positions, 'user_id'),
    'user_id,question_id',
  );
  await push(local, 'inbox_items', own(inbox, 'user_id'), 'id');
  await push(local, 'set_aside_items', own(setAside, 'user_id'), 'id');
  await push(local, 'user_settings', own(settings, 'user_id'), 'user_id');

  // --- verify ---------------------------------------------------------------
  const expected = {
    topic_groups: groups.length,
    sections: sectionRows.length - orphans.length,
    questions: questionRows.length,
    progress: progress.length,
    question_position: positions.length,
    inbox_items: inbox.length,
    set_aside_items: setAside.length,
    user_settings: settings.length,
  };
  console.log('\nVerifying local counts:');
  let ok = true;
  for (const [table, want] of Object.entries(expected)) {
    const got = await count(local, table);
    // >= not ==: local-only rows are kept, so the count can legitimately exceed
    // what was just written.
    const pass = got >= want;
    if (!pass) ok = false;
    console.log(
      `  ${table}: ${got} (expected >= ${want}) ${pass ? 'ok' : 'MISMATCH'}`,
    );
  }
  if (!ok) process.exit(1);
  console.log('\nDone.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
