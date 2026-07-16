pragma foreign_keys = on;
pragma journal_mode = wal;
pragma busy_timeout = 5000;

create table if not exists app_meta (
  key text primary key,
  value text not null,
  updated_at text not null
);

create table if not exists foundation (
  id text primary key,
  name text not null,
  locale text not null,
  timezone text not null,
  base_currency text not null,
  fiscal_year_start_month integer not null check (fiscal_year_start_month between 1 and 12),
  mission text,
  setup_completed_at text,
  created_at text not null,
  updated_at text not null
);

create table if not exists accounts (
  id text primary key,
  username text not null unique collate nocase,
  display_name text not null,
  email text unique collate nocase,
  password_hash text not null,
  role text not null check (role in ('administrator','foundation_manager','voting_member','finance_manager','project_steward','reviewer','viewer')),
  active integer not null default 1 check (active in (0,1)),
  created_at text not null,
  updated_at text not null
);

create table if not exists sessions (
  token_hash text primary key,
  account_id text not null references accounts(id) on delete cascade,
  csrf_token text not null,
  expires_at text not null,
  created_at text not null
);
create index if not exists sessions_account_idx on sessions(account_id);

create table if not exists invitations (
  id text primary key,
  token_hash text not null unique,
  email text,
  role text not null,
  created_by text not null references accounts(id),
  expires_at text not null,
  used_at text,
  used_by text references accounts(id),
  created_at text not null
);

create table if not exists objectives (
  id text primary key,
  title text not null,
  outcome text not null,
  population text,
  geography text,
  metric text not null,
  unit text not null,
  baseline_value real,
  current_value real,
  target_value real not null,
  target_date text not null,
  causal_thesis text,
  assumptions text,
  evidence_status text not null default 'not_measured' check (evidence_status in ('not_measured','reported','reviewed','verified')),
  last_evidence_at text,
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null
);

create table if not exists organizations (
  id text primary key,
  name text not null,
  country_code text,
  website text,
  registration_id text,
  summary text,
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null
);

create table if not exists opportunities (
  id text primary key,
  title text not null,
  organization_id text references organizations(id),
  objective_id text references objectives(id),
  stage text not null check (stage in ('inbox','screening','diligence','decision','agreement','active','review','closed')),
  disposition text check (disposition is null or disposition in ('declined','withdrawn','duplicate')),
  summary text,
  request_minor integer not null default 0,
  request_currency text not null,
  steward_id text references accounts(id),
  version integer not null default 1,
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null
);
create index if not exists opportunities_stage_idx on opportunities(stage, updated_at);

create table if not exists opportunity_transitions (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  from_stage text not null,
  to_stage text not null,
  reason text,
  actor_id text not null references accounts(id),
  created_at text not null
);

create table if not exists decision_rounds (
  id text primary key,
  opportunity_id text not null references opportunities(id),
  round_number integer not null,
  status text not null check (status in ('open','blocked','accepted','superseded','cancelled')),
  proposal_version integer not null,
  amount_minor integer not null,
  currency text not null,
  title text not null,
  opened_by text not null references accounts(id),
  opened_at text not null,
  closed_at text,
  unique(opportunity_id, round_number)
);

create table if not exists decision_electorate (
  round_id text not null references decision_rounds(id) on delete cascade,
  account_id text not null references accounts(id),
  recused integer not null default 0 check (recused in (0,1)),
  recusal_reason text,
  primary key(round_id, account_id)
);

create table if not exists decision_responses (
  id text primary key,
  round_id text not null references decision_rounds(id) on delete cascade,
  account_id text not null references accounts(id),
  response text not null check (response in ('support','neutral','object')),
  note text,
  active integer not null default 1 check (active in (0,1)),
  created_at text not null
);
create unique index if not exists decision_response_active_idx on decision_responses(round_id, account_id) where active = 1;

create table if not exists funds (
  id text primary key,
  name text not null,
  currency text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists budgets (
  id text primary key,
  fund_id text not null references funds(id),
  objective_id text references objectives(id),
  fiscal_year integer not null,
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'approved' check (status in ('draft','approved','closed')),
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null,
  unique(fund_id, objective_id, fiscal_year)
);

create table if not exists commitments (
  id text primary key,
  opportunity_id text not null references opportunities(id),
  decision_round_id text not null references decision_rounds(id),
  fund_id text not null references funds(id),
  amount_minor integer not null,
  currency text not null,
  base_minor integer not null,
  base_currency text not null,
  exchange_rate text not null,
  rate_date text not null,
  status text not null check (status in ('active','cancelled','complete')),
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null
);

create table if not exists payments (
  id text primary key,
  commitment_id text not null references commitments(id),
  kind text not null check (kind in ('payment','refund','reversal')),
  amount_minor integer not null,
  currency text not null,
  base_minor integer not null,
  base_currency text not null,
  exchange_rate text not null,
  rate_date text not null,
  payment_date text not null,
  reference text,
  reverses_payment_id text references payments(id),
  posted_by text not null references accounts(id),
  posted_at text not null
);

create table if not exists documents (
  id text primary key,
  opportunity_id text references opportunities(id),
  logical_name text not null,
  classification text not null check (classification in ('internal','confidential','public_submission')),
  created_by text references accounts(id),
  created_at text not null
);

create table if not exists document_versions (
  id text primary key,
  document_id text not null references documents(id) on delete cascade,
  version integer not null,
  original_name text not null,
  storage_path text not null unique,
  content_type text not null,
  byte_size integer not null,
  checksum_sha256 text not null,
  scan_status text not null check (scan_status in ('trusted_internal','pending','clean','rejected')),
  uploaded_by text references accounts(id),
  uploaded_at text not null,
  unique(document_id, version)
);

create table if not exists meetings (
  id text primary key,
  title text not null,
  timezone text not null,
  status text not null check (status in ('polling','confirmed','completed','cancelled')),
  confirmed_slot_id text,
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null
);

create table if not exists meeting_slots (
  id text primary key,
  meeting_id text not null references meetings(id) on delete cascade,
  starts_at text not null,
  ends_at text not null,
  created_by text not null references accounts(id),
  created_at text not null
);

create table if not exists meeting_availability (
  slot_id text not null references meeting_slots(id) on delete cascade,
  account_id text not null references accounts(id),
  response text not null check (response in ('available','if_needed','unavailable')),
  updated_at text not null,
  primary key(slot_id, account_id)
);

create table if not exists audit_events (
  id text primary key,
  actor_id text references accounts(id),
  action text not null,
  object_type text not null,
  object_id text,
  summary_json text not null,
  request_id text,
  created_at text not null
);
create index if not exists audit_created_idx on audit_events(created_at desc);
