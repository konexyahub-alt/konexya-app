-- Boas-vindas e despedida padrão da assistente sem promessa de prazo (docs/DECISOES.md, 2026-10-29):
-- a assistente não promete; "fala com você em breve" depende do corretor, não dela.
create or replace function public.agencies_after_insert_assistant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
  values (
    new.id,
    'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual '
      || case new.kind when 'autonomo' then 'de ' || btrim(new.legal_name) || ', corretor(a) autônomo(a)'
         else 'da ' || rtrim(new.legal_name, '.') end
      || '. Seu perfil já está com '
      || case new.kind when 'autonomo' then btrim(new.legal_name) else 'o corretor' end
      || '. Enquanto isso, podemos começar a conversar sobre o imóvel?',
    'Obrigada, [nome do cliente]! Já passei tudo para o corretor. A resposta chega aqui nesta conversa.',
    public.default_assistant_questions()
  )
  on conflict (agency_id) do nothing;
  return null;
end;
$$;
revoke execute on function public.agencies_after_insert_assistant() from public, anon, authenticated;

-- Só onde ainda está o texto padrão; mensagens editadas pela imobiliária ficam como estão.
update public.agency_assistant_settings
set welcome_message = replace(welcome_message,
  'Um corretor já recebeu seu perfil e vai falar com você em breve.', 'Seu perfil já está com o corretor.')
where welcome_message like '%Um corretor já recebeu seu perfil e vai falar com você em breve.%';

update public.agency_assistant_settings s
set welcome_message = replace(s.welcome_message,
  'Já recebi seu perfil e vou falar com você em breve.', 'Seu perfil já está com ' || btrim(a.legal_name) || '.')
from public.agencies a
where a.id = s.agency_id and s.welcome_message like '%Já recebi seu perfil e vou falar com você em breve.%';

update public.agency_assistant_settings
set farewell_message = 'Obrigada, [nome do cliente]! Já passei tudo para o corretor. A resposta chega aqui nesta conversa.'
where farewell_message = 'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.';
