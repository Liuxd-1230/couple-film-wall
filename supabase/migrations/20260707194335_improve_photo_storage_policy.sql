drop policy if exists "members can update own photo objects" on storage.objects;

create policy "members can update own photo objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'couple-photos';
