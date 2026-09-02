-- セキュリティ強化:
-- 1) RPC関数の実行権限をサーバー(service_role)経由のみに限定
--    （PostgreSQLのデフォルトでは関数のEXECUTEがPUBLICに付与されるため、
--      anonキーを知る者が PostgREST の /rpc/ 経由で直接叩けてしまう）
-- 2) 通報機能（reports カラム + 加算関数）

revoke execute on function public.increment_likes(uuid) from public, anon, authenticated;
grant execute on function public.increment_likes(uuid) to service_role;

alter table public.consultations
  add column if not exists reports integer not null default 0;

-- 通報をアトミックに加算する
create or replace function public.increment_reports(consultation_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.consultations
  set reports = reports + 1
  where id = consultation_id
  returning reports;
$$;

revoke execute on function public.increment_reports(uuid) from public, anon, authenticated;
grant execute on function public.increment_reports(uuid) to service_role;
