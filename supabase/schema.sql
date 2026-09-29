-- TEAM87 Paid Traffic Store
-- Supabase database schema

create extension if not exists pgcrypto;

-- =========================
-- PACKAGES / PAKET TRAFFIC
-- =========================

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  traffic_amount bigint not null check (traffic_amount > 0),
  price bigint not null check (price >= 0),
  target_url_required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- ORDERS / PESANAN
-- =========================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete set null,

  customer_name text not null,
  customer_email text not null,
  target_url text,

  amount bigint not null check (amount >= 0),
  status text not null default 'pending'
    check (status in (
      'pending',
      'paid',
      'running',
      'completed',
      'cancelled'
    )),

  midtrans_order_id text unique,
  midtrans_transaction_id text,
  midtrans_payment_type text,
  midtrans_transaction_status text,

  paid_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- INDEX
-- =========================

create index if not exists orders_status_idx
  on public.orders(status);

create index if not exists orders_email_idx
  on public.orders(customer_email);

create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

create index if not exists orders_midtrans_order_id_idx
  on public.orders(midtrans_order_id);

-- =========================
-- UPDATED_AT
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists packages_updated_at on public.packages;

create trigger packages_updated_at
before update on public.packages
for each row
execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;

create trigger orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

-- =========================
-- ROW LEVEL SECURITY
-- =========================

alter table public.packages enable row level security;
alter table public.orders enable row level security;

-- Paket aktif boleh dibaca publik
drop policy if exists "Public can view active packages"
on public.packages;

create policy "Public can view active packages"
on public.packages
for select
to anon, authenticated
using (active = true);

-- Customer tidak boleh membaca seluruh order.
-- Order dibuat/diubah melalui backend / Edge Function.
-- Admin juga sebaiknya menggunakan backend dengan service role.

-- =========================
-- SAMPLE PACKAGES
-- =========================
-- Hapus bagian ini jika tidak ingin data paket contoh.

insert into public.packages
  (name, description, traffic_amount, price)
values
  ('Traffic 1K', 'Paket traffic 1.000 kunjungan', 1000, 10000),
  ('Traffic 5K', 'Paket traffic 5.000 kunjungan', 5000, 40000),
  ('Traffic 10K', 'Paket traffic 10.000 kunjungan', 10000, 70000)
on conflict do nothing;
