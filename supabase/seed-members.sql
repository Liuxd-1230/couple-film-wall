-- Run this after both people have signed in once, so their auth.users rows exist.
-- Replace the emails and names before running.

with new_couple as (
  insert into public.couples (name, start_date)
  values ('我们的胶片册', '2022-05-20')
  returning id
)
insert into public.couple_members (couple_id, user_id, display_name, email, avatar_color)
select new_couple.id, users.id, seed.display_name, seed.email, seed.avatar_color
from new_couple
cross join (
  values
    ('person-one@example.com', '她', '#b96f5d'),
    ('person-two@example.com', '他', '#66775a')
) as seed(email, display_name, avatar_color)
join auth.users as users on lower(users.email) = lower(seed.email);
