-- 買い切り課金（アプリ版）:
-- 1) app_entitlements ... 検証済みのレシートと、それを使う端末の紐付け
-- 2) app_usage        ... 1日あたりの相談回数（無料枠 / 購入後の枠を数える）
--
-- どちらも service_role（Nitroサーバー）からのみ触る。RLSを有効にし、
-- ポリシーを一切作らないことで anon からの直接アクセスを拒否する。

-- 購入したユーザーの権利。1レシート（transaction_id）につき1行。
-- 端末を買い替えたり再インストールした場合は「購入を復元」で device_id を貼り替える。
create table if not exists public.app_entitlements (
  transaction_id          text primary key,
  device_id               text not null,
  platform                text not null check (platform in ('ios', 'android')),
  product_id              text not null,
  original_transaction_id text,
  purchased_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- 相談のたびに「この端末は購入済みか」を引くのでインデックスを張る
create index if not exists app_entitlements_device_idx
  on public.app_entitlements (device_id);

alter table public.app_entitlements enable row level security;

-- 1日の利用回数。subject は 'device:<id>' または 'ip:<addr>'。
-- 日付は日本時間（Asia/Tokyo）の暦日で区切る。
create table if not exists public.app_usage (
  subject    text not null,
  usage_date date not null,
  used_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subject, usage_date)
);

alter table public.app_usage enable row level security;

-- 古い行の掃除用（日次バッチや手動実行を想定）
create index if not exists app_usage_date_idx on public.app_usage (usage_date);

/**
 * 1回分の枠をアトミックに消費する。
 * 上限に達していれば allowed=false を返し、カウントは増やさない。
 * 同時リクエストでも UPDATE ... WHERE used_count < p_limit が行ロックを取るため
 * 上限を超えて通過することはない。
 */
create or replace function public.consume_app_quota(p_subject text, p_limit integer)
returns table (allowed boolean, used integer, quota_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (now() at time zone 'Asia/Tokyo')::date;
  v_used integer;
begin
  insert into public.app_usage (subject, usage_date, used_count)
  values (p_subject, v_date, 0)
  on conflict (subject, usage_date) do nothing;

  update public.app_usage
  set used_count = used_count + 1,
      updated_at = now()
  where subject = p_subject
    and usage_date = v_date
    and used_count < p_limit
  returning used_count into v_used;

  if v_used is null then
    -- 上限に達している。現在値をそのまま返す
    select used_count into v_used
    from public.app_usage
    where subject = p_subject and usage_date = v_date;
    return query select false, coalesce(v_used, 0), p_limit;
    return;
  end if;

  return query select true, v_used, p_limit;
end;
$$;

/** 消費せずに今日の利用回数だけを見る（残り回数の表示用） */
create or replace function public.peek_app_quota(p_subject text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select used_count
      from public.app_usage
      where subject = p_subject
        and usage_date = (now() at time zone 'Asia/Tokyo')::date
    ),
    0
  );
$$;

revoke execute on function public.consume_app_quota(text, integer) from public, anon, authenticated;
grant execute on function public.consume_app_quota(text, integer) to service_role;

revoke execute on function public.peek_app_quota(text) from public, anon, authenticated;
grant execute on function public.peek_app_quota(text) to service_role;
