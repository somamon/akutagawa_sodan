-- 生成に失敗したときに、消費した1回分を返すための関数。
-- 日付が変わった後の返却で過去日の値を触らないよう、当日の行だけを対象にする。
-- used_count が 0 未満にならないよう greatest で下限を切る。
create or replace function public.refund_app_quota(p_subject text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (now() at time zone 'Asia/Tokyo')::date;
  v_used integer;
begin
  update public.app_usage
  set used_count = greatest(used_count - 1, 0),
      updated_at = now()
  where subject = p_subject
    and usage_date = v_date
  returning used_count into v_used;

  return coalesce(v_used, 0);
end;
$$;

revoke execute on function public.refund_app_quota(text) from public, anon, authenticated;
grant execute on function public.refund_app_quota(text) to service_role;
