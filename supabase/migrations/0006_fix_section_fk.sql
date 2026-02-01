-- Fix composite FK that nulls quote_id/invoice_id on section delete
alter table public.quote_items
  drop constraint if exists quote_items_section_fk;

alter table public.invoice_items
  drop constraint if exists invoice_items_section_fk;

alter table public.quote_items
  add constraint quote_items_section_fk
  foreign key (section_id)
  references public.quote_sections (id)
  on delete set null;

alter table public.invoice_items
  add constraint invoice_items_section_fk
  foreign key (section_id)
  references public.invoice_sections (id)
  on delete set null;

create or replace function public.ensure_quote_item_section()
returns trigger
language plpgsql
as $$
begin
  if new.section_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.quote_sections
    where id = new.section_id
      and quote_id = new.quote_id
      and tenant_id = new.tenant_id
  ) then
    raise exception 'section_id invalide pour ce devis';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_invoice_item_section()
returns trigger
language plpgsql
as $$
begin
  if new.section_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.invoice_sections
    where id = new.section_id
      and invoice_id = new.invoice_id
      and tenant_id = new.tenant_id
  ) then
    raise exception 'section_id invalide pour cette facture';
  end if;

  return new;
end;
$$;

drop trigger if exists quote_items_section_check on public.quote_items;
create trigger quote_items_section_check
before insert or update of section_id, quote_id, tenant_id
on public.quote_items
for each row execute function public.ensure_quote_item_section();

drop trigger if exists invoice_items_section_check on public.invoice_items;
create trigger invoice_items_section_check
before insert or update of section_id, invoice_id, tenant_id
on public.invoice_items
for each row execute function public.ensure_invoice_item_section();
