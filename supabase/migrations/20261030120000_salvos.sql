-- Salvos (C-09): o cliente vê os imóveis que salvou, inclusive os que saíram do ar ("Não está mais disponível").
-- O RLS de imóveis só mostra os publicados; esta função devolve o mínimo (título, bairro, preço) dos salvos do
-- próprio cliente, sem expor nada de imóveis que ele não salvou.
create function public.my_saved_properties()
returns table (property_id uuid, title text, type public.property_type, neighborhood text, price numeric, available boolean, saved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.title, p.type, p.neighborhood, p.price,
         (p.status = 'publicado' and public.is_agency_approved(p.agency_id)), f.created_at
  from public.favorites f
  join public.properties p on p.id = f.property_id
  where f.user_id = auth.uid()
  order by f.created_at desc;
$$;
revoke execute on function public.my_saved_properties() from public, anon;
grant execute on function public.my_saved_properties() to authenticated;
