-- Create report_replies table
create table if not exists public.report_replies (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.report_replies enable row level security;

create index if not exists report_replies_report_id_idx on public.report_replies(report_id);
create index if not exists report_replies_author_id_idx on public.report_replies(author_id);

create policy "Replies readable by all" on public.report_replies
for select using (true);

create policy "Users can insert own replies" on public.report_replies
for insert to authenticated
with check (auth.uid() = author_id);
