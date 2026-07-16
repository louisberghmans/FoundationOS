create table if not exists objective_observations (
  id text primary key,
  objective_id text not null references objectives(id) on delete cascade,
  observed_at text not null,
  value real not null,
  state text not null check (state in ('reported','reviewed','verified')),
  source text,
  methodology text,
  confidence_note text,
  recorded_by text not null references accounts(id),
  recorded_at text not null
);
create index if not exists observations_objective_idx on objective_observations(objective_id, observed_at desc);

create table if not exists grant_agreements (
  id text primary key,
  commitment_id text not null references commitments(id),
  document_id text references documents(id),
  reference text,
  agreement_date text not null,
  starts_on text not null,
  ends_on text not null,
  status text not null check (status in ('draft','executed','terminated','complete')),
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null,
  check (ends_on >= starts_on)
);

create table if not exists commitment_amendments (
  id text primary key,
  commitment_id text not null references commitments(id),
  decision_round_id text references decision_rounds(id),
  kind text not null check (kind in ('increase','decrease','extension','cancellation')),
  delta_minor integer not null,
  delta_base_minor integer not null,
  currency text not null,
  effective_date text not null,
  new_end_date text,
  reason text not null,
  created_by text not null references accounts(id),
  created_at text not null
);

create table if not exists disbursement_schedules (
  id text primary key,
  commitment_id text not null references commitments(id),
  sequence integer not null,
  due_date text not null,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null,
  condition text,
  status text not null check (status in ('planned','ready','held','paid','cancelled')),
  created_by text not null references accounts(id),
  created_at text not null,
  updated_at text not null,
  unique(commitment_id, sequence)
);

alter table payments add column schedule_id text references disbursement_schedules(id);

create table if not exists agenda_items (
  id text primary key,
  meeting_id text not null references meetings(id) on delete cascade,
  title text not null,
  item_type text not null check (item_type in ('decision','discussion','update')),
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  proposed_by text not null references accounts(id),
  owner_id text references accounts(id),
  position integer not null,
  status text not null check (status in ('proposed','accepted','completed','deferred')),
  notes text,
  created_at text not null,
  updated_at text not null
);

create table if not exists grant_reviews (
  id text primary key,
  commitment_id text not null references commitments(id),
  review_date text not null,
  review_type text not null check (review_type in ('interim','final','renewal')),
  relevance text,
  coherence text,
  effectiveness text,
  efficiency text,
  impact text,
  sustainability text,
  unexpected_outcomes text,
  learning text not null,
  recommendation text not null check (recommendation in ('continue','renew','close','investigate')),
  reviewer_id text not null references accounts(id),
  created_at text not null
);
