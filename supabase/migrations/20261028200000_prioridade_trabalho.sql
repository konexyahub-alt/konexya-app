-- Nova prioridade do cliente: "Morar perto do trabalho" (docs/DECISOES.md, 2026-10-28).
alter table public.client_profiles drop constraint client_profiles_priorities_check;
alter table public.client_profiles add constraint client_profiles_priorities_check
  check (priorities <@ array['perto_trabalho', 'servicos_a_pe', 'praia', 'lazer_no_predio']);
