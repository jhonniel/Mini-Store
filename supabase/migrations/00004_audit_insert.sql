-- Allow authenticated members to write their own audit rows from the app.
drop policy if exists "audit_insert_member" on public.audit_logs;
create policy "audit_insert_member"
  on public.audit_logs for insert
  to authenticated
  with check (
    public.is_member_of(organization_id)
    and (user_id is null or user_id = auth.uid())
  );
