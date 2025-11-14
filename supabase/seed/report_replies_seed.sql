with reports_list as (
  select id from public.reports limit 5
),
users_list as (
  select id, display_name, avatar_url from public.users limit 5
)
insert into public.report_replies (report_id, author_id, body, created_at)
select r.id,
       u.id,
       (array[ 'Appreciate you flagging this — I walk past this spot daily.',
               'I reported this to 311 last week too. Glad it is getting traction.',
               'Took a quick photo this morning to add more context.',
               'Let me know if you need help escalating this to the alderman.',
               'Saw crews inspecting earlier today, will keep an eye out.'
             ])[floor(random()*5)+1],
       now() - (interval '1 day' * floor(random()*5))
from reports_list r
join users_list u on true;
