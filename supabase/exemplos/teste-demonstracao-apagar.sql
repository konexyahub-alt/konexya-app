-- SÓ NO PROJETO DE TESTE. Apaga o movimento de exemplo do teste-demonstracao.sql (leads "(exemplo)",
-- com conversas, visitas e propostas, e os clientes @exemplo.invalid com visualizações e salvos).
-- Os imóveis [EXEMPLO] continuam (para apagar, use o painel).
do $$
begin
  delete from public.leads where client_name like '%(exemplo)'
    and client_id in (select id from auth.users where email like '%@exemplo.invalid');
  delete from auth.users where email like '%@exemplo.invalid';
  raise notice 'Movimento de exemplo apagado.';
end $$;
