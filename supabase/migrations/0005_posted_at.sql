-- X への自動投稿済みかどうかを記録する。
-- 同じ相談を二度投稿しないための目印。
alter table public.consultations
  add column if not exists posted_at timestamptz;

-- 未投稿のものを探す問い合わせ用
create index if not exists consultations_unposted_idx
  on public.consultations (likes desc, created_at desc)
  where is_public and posted_at is null;
