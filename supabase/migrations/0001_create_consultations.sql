-- 相談テーブル
create table if not exists public.consultations (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null default '名無しの相談者',
  query      text not null,
  answer     text not null,
  is_public  boolean not null default true,
  likes      integer not null default 0,
  created_at timestamptz not null default now()
);

-- タイムライン取得用インデックス
create index if not exists consultations_public_created_idx
  on public.consultations (created_at desc)
  where is_public;

-- アクセスはすべて Nitro サーバー（service_role）経由。
-- RLS を有効化し、anon からの直接アクセスは全て拒否する（ポリシーなし = 拒否）。
alter table public.consultations enable row level security;

-- いいねをアトミックに加算し、加算後の件数を返す
create or replace function public.increment_likes(consultation_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.consultations
  set likes = likes + 1
  where id = consultation_id
  returning likes;
$$;
