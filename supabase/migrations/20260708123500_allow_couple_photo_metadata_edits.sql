revoke update on public.photos from authenticated;
grant update (caption, taken_at, tags) on public.photos to authenticated;

drop policy if exists "members can update own photos" on public.photos;
drop policy if exists "members can update photos in own couple" on public.photos;
create policy "members can update photos in own couple"
on public.photos
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));
