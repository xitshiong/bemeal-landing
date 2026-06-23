-- BeMeal waitlist — run once in Supabase SQL Editor
-- Dashboard: Project → SQL → New query → paste → Run

create sequence if not exists public.waitlist_queue_seq start with 248;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  queue_position integer not null default nextval('public.waitlist_queue_seq'),
  ref_code text,
  referred_by text,
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_unique unique (email),
  constraint waitlist_signups_email_format check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

alter table public.waitlist_signups enable row level security;

-- Block direct table access from the browser; use the RPC below instead.
revoke all on public.waitlist_signups from anon, authenticated;

create or replace function public.join_waitlist(
  p_email text,
  p_ref_code text default null,
  p_referred_by text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_queue integer;
begin
  if v_email is null or v_email = '' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select queue_position
  into v_queue
  from public.waitlist_signups
  where email = v_email;

  if found then
    return json_build_object(
      'ok', true,
      'queue', v_queue,
      'already_joined', true
    );
  end if;

  insert into public.waitlist_signups (email, ref_code, referred_by)
  values (v_email, p_ref_code, p_referred_by)
  returning queue_position into v_queue;

  return json_build_object(
    'ok', true,
    'queue', v_queue,
    'already_joined', false
  );
end;
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon;

grant usage, select on sequence public.waitlist_queue_seq to postgres, service_role;
