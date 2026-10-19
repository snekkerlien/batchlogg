alter table public.profiles
  add column if not exists allow_friend_requests boolean not null default true;

create table public.community_friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_friendships_canonical_pair check (user_a < user_b),
  constraint community_friendships_unique_pair unique (user_a, user_b)
);

create table public.community_friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_friend_requests_distinct_users check (requester_id <> recipient_id)
);

create unique index community_friend_requests_unique_direction
  on public.community_friend_requests (requester_id, recipient_id);
create index community_friend_requests_recipient_created
  on public.community_friend_requests (recipient_id, created_at desc);

create table public.community_friend_request_events (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index community_friend_request_events_recent
  on public.community_friend_request_events (requester_id, created_at desc);

create table public.community_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_blocks_distinct_users check (blocker_id <> blocked_id),
  constraint community_blocks_unique_pair unique (blocker_id, blocked_id)
);

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint community_messages_distinct_users check (sender_id <> recipient_id)
);

create index community_messages_sender_created
  on public.community_messages (sender_id, created_at desc);
create index community_messages_recipient_created
  on public.community_messages (recipient_id, created_at desc);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.community_messages(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now(),
  constraint community_reports_distinct_users check (reporter_id <> reported_user_id)
);

create table public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request', 'message')),
  message_id uuid references public.community_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index community_notifications_recipient_created
  on public.community_notifications (recipient_id, created_at desc);
create index community_notifications_recipient_unread
  on public.community_notifications (recipient_id)
  where read_at is null;

create or replace function public.enforce_community_message_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 0));
  if not exists (
    select 1
    from public.community_friendships f
    where f.user_a = least(new.sender_id, new.recipient_id)
      and f.user_b = greatest(new.sender_id, new.recipient_id)
  ) then
    raise exception 'Messages are only allowed between friends';
  end if;

  if exists (
    select 1
    from public.community_blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = new.recipient_id)
       or (b.blocker_id = new.recipient_id and b.blocked_id = new.sender_id)
  ) then
    raise exception 'Messaging is unavailable for this user';
  end if;

  if (
    select count(*)
    from public.community_messages m
    where m.sender_id = new.sender_id
      and m.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Message rate limit exceeded';
  end if;

  return new;
end;
$$;

create trigger community_messages_enforce_rules
  before insert on public.community_messages
  for each row execute function public.enforce_community_message_rules();

create or replace function public.enforce_friend_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.requester_id::text, 0));
  if (
    select count(*)
    from public.community_friend_request_events e
    where e.requester_id = new.requester_id
      and e.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Friend request rate limit exceeded';
  end if;
  insert into public.community_friend_request_events (requester_id)
  values (new.requester_id);
  return new;
end;
$$;

create trigger community_friend_requests_rate_limit
  before insert on public.community_friend_requests
  for each row execute function public.enforce_friend_request_rate_limit();

alter table public.community_friendships enable row level security;
alter table public.community_friend_requests enable row level security;
alter table public.community_friend_request_events enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_notifications enable row level security;

revoke all on public.community_friendships, public.community_friend_requests,
  public.community_friend_request_events,
  public.community_blocks, public.community_messages, public.community_reports,
  public.community_notifications from anon, authenticated;
grant all on public.community_friendships, public.community_friend_requests,
  public.community_friend_request_events,
  public.community_blocks, public.community_messages, public.community_reports,
  public.community_notifications to service_role;

notify pgrst, 'reload schema';
