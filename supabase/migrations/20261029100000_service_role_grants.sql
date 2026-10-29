-- O servidor (chave secreta, papel service_role) precisa ler as tabelas da etapa 1 (imobiliárias, imóveis,
-- membros, perfis) para a assistente virtual e a IA. Projetos novos do Supabase não dão essas permissões
-- automaticamente; aqui ficam explícitas. O service_role só existe no servidor, nunca no navegador.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
