-- SÓ NO PROJETO DE TESTE (Supabase xjxfqerqrscejpxqxspw). NUNCA em produção.
-- Imóveis de exemplo para testar recomendações, nota e leads. Todos com "[EXEMPLO]" no nome.
-- Uso: SQL Editor do projeto de teste > colar > Run. Troque o e-mail se a imobiliária de teste for outra.
do $$
declare
  v_agency uuid;
begin
  select id into v_agency from public.agencies
  where manager_email = '28s.patricio28+imob@gmail.com' and status = 'aprovada';
  if v_agency is null then
    raise exception 'Imobiliária de teste não encontrada ou não aprovada.';
  end if;
  if exists (select 1 from public.properties where agency_id = v_agency and title like '[EXEMPLO]%') then
    raise notice 'Os imóveis de exemplo já existem.';
    return;
  end if;
  insert into public.properties
    (agency_id, title, purpose, type, neighborhood, price, condo_fee, iptu_monthly, area_m2, bedrooms, suites, parking_spots, pets, amenities, status)
  values
    (v_agency, '[EXEMPLO] Residencial Varjota', 'venda', 'apartamento', 'Varjota', 790000, 650, 120, 74, 2, 1, 1, 'qualquer', '{Piscina,Academia}', 'publicado'),
    (v_agency, '[EXEMPLO] Edifício Cocó', 'venda', 'apartamento', 'Cocó', 885000, 780, 160, 96, 3, 1, 2, 'pequeno', '{Piscina,"Salão de festas","Pet place"}', 'publicado'),
    (v_agency, '[EXEMPLO] Edifício Aldeota', 'venda', 'apartamento', 'Aldeota', 950000, 900, 180, 82, 3, 1, 2, 'qualquer', '{"Portaria 24 h"}', 'publicado'),
    (v_agency, '[EXEMPLO] Casa Aldeota', 'venda', 'casa', 'Aldeota', 1140000, null, 200, 120, 3, 2, 2, 'qualquer', '{Churrasqueira}', 'publicado'),
    (v_agency, '[EXEMPLO] Edifício Meireles', 'venda', 'apartamento', 'Meireles', 1040000, 1100, 210, 68, 2, 1, 1, 'pequeno', '{Academia}', 'publicado'),
    (v_agency, '[EXEMPLO] Apartamento para alugar', 'aluguel', 'apartamento', 'Aldeota', 3800, 700, 90, 70, 2, 1, 1, 'qualquer', '{}', 'publicado');
end $$;
