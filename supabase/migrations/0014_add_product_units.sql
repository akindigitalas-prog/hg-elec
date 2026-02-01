-- Add more units for catalogue imports
alter type public.product_unit add value if not exists 'ml';
alter type public.product_unit add value if not exists 'heure';
alter type public.product_unit add value if not exists 'forfait';
alter type public.product_unit add value if not exists 'boite';
alter type public.product_unit add value if not exists 'rouleau';
alter type public.product_unit add value if not exists 'paire';
