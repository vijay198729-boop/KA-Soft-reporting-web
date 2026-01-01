-- Create a table to store allowed users and their roles
create table allowed_users (
  email text primary key,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert YOUR email as the first admin
insert into allowed_users (email, role)
values ('vijay198729@gmail.com', 'admin');

-- (Optional) Enable RLS if you want to lock this down further, 
-- but our Node backend will handle the security for now.
alter table allowed_users enable row level security;
create policy "Allow read access for all authenticated users" on allowed_users for select to authenticated using (true);
