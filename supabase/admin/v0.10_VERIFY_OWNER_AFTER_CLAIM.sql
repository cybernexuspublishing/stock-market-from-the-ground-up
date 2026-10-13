-- Run only AFTER creating stockmarketfromthegroundup@gmail.com,
-- verifying the email, signing in, and clicking Claim OWNER Control Center.

select u.id, u.email, p.username, p.display_name
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('stockmarketfromthegroundup@gmail.com');

select r.user_id, r.role_code, r.granted_at
from public.admin_user_roles r
join auth.users u on u.id = r.user_id
where lower(u.email) = lower('stockmarketfromthegroundup@gmail.com')
order by r.role_code;

select e.user_id, e.product_key, e.status, e.starts_at, e.ends_at
from public.entitlements e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('stockmarketfromthegroundup@gmail.com');

select l.product_code, l.access_type, l.source_channel, l.expires_at
from public.user_library l
join auth.users u on u.id = l.user_id
where lower(u.email) = lower('stockmarketfromthegroundup@gmail.com')
order by l.product_code;
