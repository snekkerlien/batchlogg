create index if not exists community_messages_sender_recipient_created_at_idx
  on public.community_messages (sender_id, recipient_id, created_at desc, id desc);

create index if not exists community_messages_recipient_sender_created_at_idx
  on public.community_messages (recipient_id, sender_id, created_at desc, id desc);

create or replace function public.community_message_inbox_summaries(target_user_id uuid)
returns table (
  peer_id uuid,
  latest_message_id uuid,
  latest_sender_id uuid,
  latest_recipient_id uuid,
  latest_body text,
  latest_created_at timestamptz,
  latest_read_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_messages as (
    select
      case
        when message.sender_id = $1 then message.recipient_id
        else message.sender_id
      end as conversation_peer_id,
      message.id,
      message.sender_id,
      message.recipient_id,
      message.body,
      message.created_at,
      message.read_at,
      count(*) filter (
        where
          message.recipient_id = $1
          and message.sender_id <> $1
          and message.read_at is null
      ) over (
        partition by case
          when message.sender_id = $1 then message.recipient_id
          else message.sender_id
        end
      ) as conversation_unread_count,
      row_number() over (
        partition by case
          when message.sender_id = $1 then message.recipient_id
          else message.sender_id
        end
        order by message.created_at desc, message.id desc
      ) as message_rank
    from public.community_messages as message
    where message.sender_id = $1 or message.recipient_id = $1
  )
  select
    ranked.conversation_peer_id,
    ranked.id,
    ranked.sender_id,
    ranked.recipient_id,
    ranked.body,
    ranked.created_at,
    ranked.read_at,
    ranked.conversation_unread_count
  from ranked_messages as ranked
  where ranked.message_rank = 1;
$$;

revoke all on function public.community_message_inbox_summaries(uuid)
  from public, anon, authenticated;
grant execute on function public.community_message_inbox_summaries(uuid)
  to service_role;
