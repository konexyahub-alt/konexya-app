<!-- Texto extraído automaticamente de mvp.pdf. O PDF é o original; tabelas podem ter perdido a formatação. -->

    Konexya — Documento do MVP
    Oct 27, 2026 · @Konexya

    Resumo executivo
    O MVP da Konexya prova uma coisa: que a imobiliária responde mais rápido e fecha mais
    quando o lead chega já qualificado, no mesmo sistema onde estão os imóveis e o funil. Tudo
    o que não ajuda a provar isso fica fora desta versão.

       Para o cliente: um web app (PWA) com chat de IA que entende o perfil, recomendações
       com nota de compatibilidade, Mapa Vivo, comparação de imóveis, alertas por WhatsApp
       e contato com o corretor.
       Para a imobiliária: um painel que recebe o lead já qualificado, com resumo feito pela IA,
       mensagem sugerida, funil, agenda de visitas, cadastro de imóveis com selo de anúncio
       completo e métricas de tempo de resposta.
       Região do piloto: Fortaleza.
       Objetivo do piloto: de 3 a 5 imobiliárias parceiras usando o painel com leads reais.
       Ponto em aberto mais crítico: de onde vêm os primeiros clientes do app (seção
       "Aquisição dos primeiros clientes").

    Problema e validação até agora
    A dor confirmada em campo é operacional: o SDR da imobiliária trabalha separado do site e
    do banco de imóveis. O resultado relatado é trabalho lento, muitos leads sem resposta ou
    sem qualificação e vendas que demoram para fechar.

    O que já foi feito (outubro de 2026):

       Reunião com o gerente de uma unidade RE/MAX, que gostou da ideia e se ofereceu para
       ajudar a desenvolver.
       Conversas com 10 a 20 imobiliárias, incluindo uma de Paracuru que também atua em
       Fortaleza.
       Meta da semana seguinte: ao menos dobrar o número de imobiliárias contatadas.
       Protótipo navegável do app (cliente + painel) já existe e serve de base visual para o
       desenvolvimento.
    O que ainda não foi validado:

       Se a imobiliária paga R$ 500/mês, ou qualquer valor, antes de ver leads chegando.
       Se o comprador final usa um app novo em vez dos portais que já conhece.
       Se a qualificação feita pela IA é boa o bastante para o corretor confiar nela.

    Interesse em reunião não é compromisso de compra. O piloto precisa transformar esse
    interesse em uso real e, de preferência, em uma carta de intenção ou pagamento simbólico.

    Proposta de valor e modelo de funcionamento
    Para a imobiliária, a Konexya é o SDR dentro de um sistema só: busca, atendimento,
    qualificação e CRM no mesmo lugar. Para o comprador, é um assistente que entende o que
    ele precisa e encontra o imóvel certo sem ele ter de filtrar dezenas de anúncios.

    Como funciona:

     1. O cliente usa o app da Konexya: conversa com a IA, explora o Mapa Vivo, salva e
       compara imóveis.
     2. Ao tocar em "Falar com o corretor", ele autoriza o compartilhamento dos dados (LGPD).
     3. O lead chega no painel da imobiliária já qualificado, com o perfil resumido pela IA.
     4. O corretor responde dentro da Konexya, com uma mensagem sugerida pela IA que ele
       aprova ou edita.
     5. A visita é agendada e o lead avança no funil.

    O que a Konexya não é: um bot no WhatsApp da imobiliária, nem um link enviado pelo
    corretor ao cliente. O WhatsApp entra só como canal de alerta que traz o usuário de volta
    ao app.

    Diferença em relação aos portais: o portal entrega um contato frio (nome e telefone). A
    Konexya entrega o contexto: orçamento, rotina, bairros, imóveis vistos e comparados, e o
    que pesou na escolha.

    Público e personas
    Quem paga é a imobiliária; quem gera o valor é o comprador. O MVP precisa funcionar bem
    para os dois, mas as decisões de escopo priorizam o que faz o lead chegar bom ao corretor.

      Persona                    Quem é             O que quer            O que usa no MVP

                                 Pessoa             Achar rápido um       Chat IA,
                                                    imóvel que caiba
      Comprador/locatário       buscando           no orçamento e na     recomendações, Mapa
                                imóvel em          rotina                Vivo, comparação,
                                Fortaleza                                alertas no WhatsApp

                                                   Leads com
                                                                         Caixa de leads,
                                Atende leads e     contexto e menos
      Corretor                                                           mensagem sugerida,
                                faz visitas        tempo perdido
                                                                         agenda, chat
                                                   qualificando

                                                   Ver se o time
                                Dono ou                                  Funil, métricas,
                                                   responde rápido e
      Gestor da imobiliária     gerente da                               distribuição de leads,
                                                   se os leads
                                unidade                                  cadastro de corretores
                                                   convertem

                                Quem sobe os
                                                   Cadastrar rápido e    Cadastro e importação
                                imóveis (pode
      Anunciante/cadastrador                       ter o anúncio bem     de imóveis, selo de
                                ser o próprio
                                                   posicionado           anúncio completo
                                corretor)

                                                   Aprovar parceiros,
      Admin Konexya             Samuel e Pedro     acompanhar uso,       Painel interno
                                                   corrigir problemas

    Escopo do MVP — funcionalidades do cliente
    O lado do cliente tem 9 funcionalidades. Cada uma traz o critério de aceite que o dev
    precisa cumprir para ela ser dada como pronta.

    C1. Cadastro e login

       Login com e-mail (código ou senha) e Google.
       Aceite dos termos de uso e da política de privacidade no primeiro acesso.
       Aceite: o usuário cria a conta em menos de 1 minuto e consegue excluir a conta pelo
       próprio app.

    C2. Chat de perfil com IA

       Conversa guiada que coleta: compra ou aluguel, orçamento, tipo de imóvel, quartos,
       vagas, bairros de interesse, endereços da rotina (trabalho, escola) e itens
       indispensáveis.
       A IA transforma a conversa num perfil estruturado, que o usuário vê e pode editar.
       Aceite: o perfil é gerado em até 10 mensagens e todo campo pode ser corrigido
       manualmente.

    C3. Recomendações com nota de compatibilidade

       Lista de imóveis das imobiliárias parceiras ordenada pela compatibilidade com o perfil.
       Cada imóvel mostra uma nota e o motivo em uma frase ("dentro do orçamento, 12 min
       do trabalho").
       Filtros manuais básicos: preço, quartos, bairro, tipo.
       Aceite: a nota é explicável. Nenhum imóvel aparece com nota sem a justificativa.

    C4. Mapa Vivo — detalhado na seção própria.

    C5. Ficha do imóvel e favoritos

       Fotos, valor, condomínio, IPTU, metragem, descrição, localização, selo de anúncio
       completo e link de tour virtual (se houver).
       Botão de salvar; lista de favoritos.

    C6. Comparação por IA

       O usuário escolhe de 2 a 3 imóveis salvos.
       A IA monta uma tabela lado a lado e um parecer curto ligado ao perfil ("o B custa mais,
       mas economiza 40 min por dia de deslocamento").
       Aceite: o parecer só usa dados que estão nos anúncios e no perfil; a IA não inventa
       atributos.

    C7. Falar com o corretor

       Botão na ficha do imóvel. Antes de enviar, uma tela pede a autorização explícita para
       compartilhar o perfil com aquela imobiliária.
       Chat dentro do app entre cliente e corretor, com envio de texto e fotos.
       Aceite: sem autorização, nenhum dado do cliente chega à imobiliária.

    C8. Pedido de visita

       O cliente sugere até 3 horários; o corretor confirma um.
       Lembrete por WhatsApp/e-mail na véspera.

    C9. Alertas por WhatsApp — detalhado na seção própria.

    Escopo do MVP — funcionalidades da imobiliária
    O painel tem 9 funcionalidades. A mais importante para a venda é a I4 (caixa de leads); a
    mais importante para a operação é a I2 (importação de imóveis), porque sem estoque não
    há recomendação.

    I1. Conta da imobiliária e equipe

       Cadastro da imobiliária (razão social, CNPJ, CRECI jurídico) com aprovação manual pela
       Konexya.
       Convite de corretores por e-mail; dois papéis: gestor e corretor.

    I2. Cadastro e importação de imóveis

       Cadastro manual com fotos, valores, metragem, endereço e link de tour virtual.
       Importação em lote por planilha (modelo da Konexya) e, se o tempo permitir, por XML no
       padrão usado pelos portais.
       Aceite: uma imobiliária com 100 imóveis numa planilha consegue subir tudo em menos
       de 1 hora.

    I3. Selo de anúncio completo — detalhado na seção própria.

    I4. Caixa de leads qualificados

       Cada lead chega com: resumo do perfil feito pela IA, imóveis vistos, salvos e
       comparados, e uma nota de prontidão (curioso, pesquisando, pronto para visitar).
       A IA sugere a primeira mensagem; o corretor aprova, edita ou descarta. Nada sai em
       nome do corretor sem aprovação humana; a única mensagem automática é a de boas-
       vindas, identificada como IA, se a imobiliária ativar.
       Aceite: o corretor entende o lead sem rolar o chat inteiro.

    I5. Distribuição de leads

       Rodízio simples entre os corretores ativos ou atribuição manual pelo gestor.

    I6. Funil (kanban)

       Etapas fixas: Novo, Em atendimento, Qualificado, Visita agendada, Proposta,
       Negociação, e as finais Fechado e Perdido (com motivo).

    I7. Agenda de visitas

       Pedidos de visita vindos do app, confirmação de horário e lista do dia por corretor.

    I8. Métricas

       Leads recebidos, tempo até a primeira resposta, taxa de visita e de fechamento, leads
       parados há mais de 48 h.
       O tempo de primeira resposta é a métrica principal: é o número que prova a dor que a
       RE/MAX relatou.
    I9. Notificações para o corretor

       Aviso de lead novo e de mensagem recebida por WhatsApp e e-mail, com botão que
       abre o painel direto no lead.

    Mapa Vivo, WhatsApp e Selo em detalhe
    As três funcionalidades entram no MVP. Cada uma tem uma regra que evita o principal risco
    dela.

    Mapa Vivo
    Mostra onde cada imóvel fica em relação à vida do usuário, não só no mapa da cidade.

       Imóveis recomendados como pins, com a cor indicando a faixa de compatibilidade.
       Tempo de deslocamento de cada imóvel até os endereços da rotina (trabalho, escola,
       academia), de carro e de transporte público, via API de rotas.
       Pontos de interesse próximos: mercado, farmácia, escola, hospital, parada de ônibus.
       Nota de bairro calculada só com critérios mensuráveis (deslocamento, serviços num
       raio definido, faixa de preço média dos anúncios na base), mostrando de onde vem cada
       número.
       Regra: nenhum dado de bairro sem fonte. Segurança e "qualidade de vida" ficam fora
       até existir base confiável, porque uma nota errada sobre um bairro queima a
       credibilidade com o corretor que conhece a região.
       Custo variável: cada cálculo de rota é uma chamada paga de API. Os resultados
       precisam ficar em cache por imóvel e endereço.

    Alertas por WhatsApp
    Traz o cliente de volta ao app; não é um canal de conversa.

       API oficial do WhatsApp Business (Meta), direta ou por um provedor (BSP).
       Opt-in explícito no app, separado do aceite dos termos, com opção de sair a qualquer
       momento.
       Templates do MVP, todos com botão que abre o app no lugar certo:
            1. Imóvel novo compatível com seu perfil.
            2. Você recebeu mensagem do corretor.
            3. Lembrete de visita.
            4. (Corretor) Lead novo ou mensagem recebida.

       Limite de frequência: no máximo 1 alerta de imóvel novo por dia por usuário, e só acima
       de uma nota mínima de compatibilidade.
       Riscos: cada template precisa ser aprovado pela Meta antes do uso; há custo por
       conversa iniciada pela empresa; excesso de mensagens leva a bloqueios e denúncias,
       que reduzem a qualidade do número.

    Selo de anúncio completo
    Incentiva o anunciante a melhorar a base, que é o que alimenta as recomendações.

       Regra objetiva, sem avaliação subjetiva da IA. Proposta inicial (a validar com as
       imobiliárias): número mínimo de fotos, metragem, valor, condomínio e IPTU
       preenchidos, descrição com tamanho mínimo e localização confirmada no mapa.
       Checklist no painel mostrando ao anunciante o que falta para ganhar o selo.
       Imóveis com selo ganham um pequeno peso extra na ordenação, sem passar à frente de
       imóveis muito mais compatíveis.
       Fica para depois: a revisão periódica automática dos anúncios pela IA.

    Fora do escopo
    Estes itens não entram no MVP. Deixá-los escritos evita que voltem aos poucos durante o
    desenvolvimento.

                                                                                   Quando
     Item                   Por que fica fora
                                                                                   reavaliar

                                                                                   Depois do
                            Alto custo e complexidade; não ajuda a provar a
     Escaneamento 3D                                                               piloto, se as
                            tese do lead qualificado. O anúncio aceita link de
     próprio                                                                       imobiliárias
                            tour virtual já existente.
                                                                                   pedirem

                                                                                   Quando a
                            Exige base de dados de transações que a Konexya
     Estudo de mercado                                                             base de
                            não tem; um valor errado queima credibilidade. Há
     e sugestão de                                                                 anúncios
                            ainda uma questão regulatória sobre avaliação de
     preço por IA                                                                  tiver volume
                            imóveis a verificar junto ao CRECI.
                                                                                   em Fortaleza

     Revisão periódica
     dos anúncios pela      O selo com regra objetiva já cobre o essencial         Versão 2
     IA

     Conversa com a IA      Custo por mensagem e risco de virar o "bot no          Não
     pelo WhatsApp          WhatsApp" que o modelo rejeita                         planejado
                                                                                   Quando
      Apps nativos (App                                                            houver uso
                             O web app (PWA) atende cliente e imobiliária com
      Store e Google                                                               recorrente
                             um só código
      Play)                                                                        que
                                                                                   justifique

      Configurações
      avançadas da IA
      (tom                   Rodízio simples e 3 tons prontos bastam para o
                                                                                   Versão 2
      personalizado,         piloto
      distribuição
      inteligente)

                                                                                   Ao fechar a
      Cobrança
                                                                                   primeira
      automática e           Pilotos gratuitos ou cobrados manualmente
                                                                                   imobiliária
      planos
                                                                                   pagante

                                                                                   Depois de
      Outras cidades
                             Foco de estoque e de usuários em uma praça            validar
      (Paracuru etc.)
                                                                                   Fortaleza

      Integração com                                                               Sob
      CRMs e portais                                                               demanda de
                             Cada integração é um projeto à parte
      existentes (exceto                                                           parceiro
      importação)                                                                  pagante

    Fluxos principais
    O fluxo inteiro gira em torno de um ponto de controle: o cliente autorizar o contato. Antes
    disso, ele explora sozinho; depois, o corretor assume com o contexto completo.

    [embedded content: fluxo principal · cliente e imobiliária]

    Se o cliente não autoriza, continua explorando e nenhum dado vai para a imobiliária. O
    alerta no WhatsApp é a única forma de a imobiliária "puxar" o cliente de volta, e mesmo
    assim ele cai no app, não numa conversa com o corretor.

    Fluxos detalhados passo a passo
    São 8 fluxos. Cada passo diz o que o usuário faz e o que o sistema faz em resposta; o dev
    deve testar cada fluxo de ponta a ponta antes de dar a fase como entregue.
    F1. Primeiro acesso do cliente
    1. O cliente abre o link do app (PWA). Vê a tela de boas-vindas com o logo, o slogan e dois
       botões: "Começar" e "Já tenho conta".
    2. Toca em "Começar". O app pede celular ou e-mail.
    3. O sistema envia um código de 6 dígitos (SMS ou e-mail). O cliente digita o código.
    4. Primeiro acesso: aparece o aceite dos termos de uso e da política de privacidade (caixa
       obrigatória). Sem aceite, não avança.
    5. O app abre direto na aba Conversa, com a primeira pergunta da IA já na tela.
    6. Na primeira vez que o app é aberto no celular, aparece a sugestão "Adicionar à tela
       inicial" (instalação do PWA), que pode ser dispensada.

    F2. Conversa e montagem do perfil
    1. A IA faz uma pergunta por vez, sempre com botões de resposta rápida e com o campo
       de texto livre liberado.
    2. Ordem das perguntas (seguindo o protótipo): prioridades no lugar onde vai morar; onde
       trabalha (ou se trabalha de casa); tempo máximo de trajeto no pico; tranquilidade ou
       movimento; filhos e pets; morar ou investir; prazo de mudança; faixa de valor;
       apartamento ou casa.
    3. A cada resposta, o item correspondente acende na faixa "Seu perfil" no topo da
       conversa, e o perfil é salvo no banco.
    4. Se o cliente escreve algo fora do roteiro ("quero mais perto da praia"), a IA interpreta,
       ajusta o perfil e confirma o que mudou.
    5. Quando o perfil mínimo está completo (orçamento, tipo, bairros ou endereço de rotina),
       a IA mostra os 3 imóveis mais compatíveis como cartões dentro da conversa.
    6. O cliente pode continuar ajustando por texto ("pode subir um pouco o orçamento"); a IA
       recalcula e avisa "Recomendações atualizadas: seu top 3 mudou".

    F3. Explorar, salvar e comparar
    1. O cliente toca num cartão e abre a ficha do imóvel.
    2. Na ficha, vê a nota de compatibilidade explicada por critério (trajeto, orçamento, pets,
       estilo de vida etc.), com sinal verde para o que atende e vermelho para o que não
       atende.
    3. Toca no coração para salvar. Aviso: "Salvo. Você encontra este imóvel na aba Salvos".
    4. Na aba Salvos, marca até 3 imóveis e toca em "Comparar". Se tentar marcar um quarto,
       aviso: "Até 3 imóveis. Desmarque um para incluir outro".
    5. A tela de comparação mostra a tabela lado a lado e o parecer da IA.
    F4. Falar com o corretor (com consentimento)
     1. Na ficha do imóvel, o cliente toca em "Falar com o corretor".
     2. Abre a folha de consentimento (de baixo para cima) explicando, em lista, o que será
       compartilhado: o perfil (rotina, orçamento, pets, prioridades) e os imóveis salvos, com o
       nome da imobiliária que vai receber.
     3. Dois botões: "Autorizar e falar com o corretor" e "Agora não".
     4. "Agora não": a folha fecha e nada é enviado.
     5. "Autorizar": o sistema registra o consentimento (data, hora, imobiliária, dados
       compartilhados), cria o lead no painel daquela imobiliária e abre a aba Corretor com a
       mensagem do sistema "Você autorizou compartilhar seu perfil com a [imobiliária]".
     6. Se a imobiliária usa o modo automático, a IA da imobiliária envia na hora uma mensagem
       de boas-vindas identificada como IA. Se não, o cliente vê "Seu perfil já está com a
       corretora. Continue a conversa por aqui".

    F5. Atendimento do lead pelo corretor
     1. O lead aparece no painel na coluna "Novo" do funil, com aviso no topo e notificação por
       WhatsApp/e-mail para o corretor da vez no rodízio.
     2. O corretor abre o lead. Vê o resumo do perfil, a qualificação, os imóveis vistos e salvos e
       a mensagem sugerida pela IA.
     3. Ele aprova a mensagem, edita antes de enviar ou descarta. A mensagem enviada
       aparece na aba Corretor do cliente.
     4. Ao enviar, o lead passa para "Em atendimento" e o tempo até a primeira resposta é
       registrado.
     5. A partir daí, a conversa segue entre corretor e cliente. A IA só sugere respostas; o
       corretor pode "devolver para a IA" dúvidas simples (preço, condomínio, aceita pets,
       vagas), se a imobiliária permitir.

    F6. Visita
     1. O corretor (ou a IA, com aprovação) sugere horários; o cliente escolhe um no chat ou
       pede outro.
     2. O corretor confirma a visita no lead. Só ele pode confirmar.
     3. A visita entra na Agenda do corretor, o lead vai para "Visita agendada" e o cliente vê a
       confirmação no app.
     4. Na véspera, o cliente recebe lembrete por WhatsApp (se tiver dado opt-in) e por e-mail.

    F7. Proposta
     1. O cliente faz a proposta pelo chat ("Quero fazer uma proposta de R$ X") ou o corretor a
       registra no lead.
     2. O corretor registra o valor e marca "Encaminhada ao proprietário". O lead vai para
       "Proposta".
     3. A resposta do proprietário (aceite, recusa ou contraproposta) é registrada manualmente
       pelo corretor e aparece para o cliente.
     4. Com contraproposta, o lead vai para "Negociação". Ao final, o corretor marca "Fechado"
       ou "Perdido" (com motivo).

    F8. Imóvel novo e alerta por WhatsApp
     1. A imobiliária cadastra ou importa um imóvel. Ao salvar, o painel mostra o checklist do
       selo.
     2. Ao publicar, o sistema calcula a compatibilidade do imóvel com os perfis ativos dos
       clientes.
     3. Para cada cliente com nota acima do mínimo, com opt-in no WhatsApp e sem alerta nas
       últimas 24 h, sai o template "Imóvel novo compatível com você".
     4. O botão do alerta abre o app direto na ficha daquele imóvel (se a sessão expirou, passa
       pelo login e depois cai na ficha).

    Mapa de telas
    O MVP tem 22 telas: 11 no app do cliente e 11 no painel da imobiliária. Os códigos (C-01, P-
    01) são os mesmos usados nas seções seguintes, para o dev e o orçamento se referirem a
    cada tela sem ambiguidade.

    [embedded content: mapa de telas · 11 do cliente, 11 do painel]

    A única ligação entre os dois lados é o consentimento: só depois dele o lead aparece no
    painel. No sentido contrário, a imobiliária alcança o cliente apenas pelos alertas, que abrem
    a ficha do imóvel no app.

    Telas do cliente (1/2): entrada, Conversa e Perfil
    O app do cliente é pensado para celular, com barra de 5 abas fixa no rodapé: Conversa,
    Mapa, Salvos, Corretor e Perfil. Ficha do imóvel, comparação e consentimento abrem por
    cima das abas. Cada tela abaixo segue o mesmo formato: objetivo, layout de cima para
    baixo, ações e estados.

    Tela C-01 · Boas-vindas
       Objetivo: apresentar a Konexya em 3 segundos e levar ao login.
       Layout: fundo branco; logo "konexya" centralizado com o Y pincelado; slogan "Você
       conversa. A Konexya encontra." em texto fino; uma frase sobre o que o app faz; botão
       preto "Começar" (largura total); link "Já tenho conta" abaixo.
       Ações: "Começar" e "Já tenho conta" levam para C-02.
       Estados: usuário já logado pula esta tela e abre direto na aba Conversa.

    Tela C-02 · Entrar (celular ou e-mail)
       Objetivo: login sem senha.
       Layout: seta de voltar; título "Entre com seu celular"; campo de telefone com máscara
       (85) 9XXXX-XXXX; botão "Enviar código"; link "Usar e-mail" (troca para o campo de e-
       mail); botão "Continuar com Google".
       Ações: enviar código leva a C-03.
       Estados e erros: botão desativado até o número ou e-mail estar completo; e-mail
       inválido mostra "Esse e-mail não parece completo. Confira se tem @ e o domínio, como
       voce@email.com"; limite de 3 reenvios por 10 minutos.

    Tela C-03 · Código de verificação
       Layout: título "Digite o código"; texto "Enviado para (85) 9XXXX-XXXX"; 6 caixas de
       dígito (com colar automático do SMS); link "Reenviar código" com contador de 60 s.
       Ações: código certo mostra "Código confirmado". No primeiro acesso, abre o aceite
       dos termos; depois, a aba Conversa.
       Erros: código errado treme as caixas e mostra "Código incorreto"; código expirado (10
       min) pede novo envio.

    Tela C-04 · Conversa (aba 1)
       Objetivo: montar o perfil e entregar as recomendações.
       Layout:
        1. Cabeçalho: avatar com o Y, nome "Konexya" e a linha "Toque nas opções ou
          escreva".
        2. Faixa "Seu perfil": chips em linha com rolagem lateral (Prioridade, Trabalho, Trajeto,
          Estilo de vida, Filhos e pets, Objetivo, Prazo, Orçamento, Tipo). Chip vazio é
          tracejado e cinza; chip preenchido fica com borda preta e o valor.
        3. Área de mensagens: balões da IA à esquerda (fundo cinza claro), do cliente à direita
          (fundo preto, texto branco), avisos do sistema centralizados em cinza.
        4. Respostas rápidas: botões com borda preta acima do campo de texto, alinhados à
          direita.
        5. Cartões de recomendação dentro da conversa: foto, nome, bairro, preço, quartos e
          metragem, nota em selo colorido (verde a partir de 85%, amarelo de 75% a 84%,
          vermelho abaixo de 75%) e 2 ou 3 motivos com ícone de certo ou de alerta.
        6. Campo de texto com botão de enviar redondo e preto.

       Ações: tocar numa resposta rápida; escrever; tocar num cartão (abre C-07); tocar num
       chip do perfil (abre a edição daquele item em C-05).
       Estados: "digitando" com três pontos enquanto a IA responde; se a IA falhar,
       mensagem "Não consegui responder agora. Tente de novo" com botão de repetir; limite
       diário de mensagens atingido mostra aviso e mantém os botões de resposta rápida
       funcionando.

    Tela C-05 · Perfil (aba 5)
       Objetivo: deixar o cliente ver e corrigir tudo o que a IA entendeu.
       Layout: cabeçalho com iniciais e nome; texto "A IA monta este perfil durante a
       conversa. Toque em Editar para mudar qualquer item: as recomendações se atualizam
       na hora"; um cartão por campo (rótulo, valor ou "Ainda não informado", link "Editar"); ao
       editar, o cartão abre e mostra as opções como botões de seleção; abaixo, os endereços
       da rotina com nome (Trabalho, Escola) e campo de endereço com autocompletar.
       Seção Conta e privacidade: alertas no WhatsApp (liga e desliga, com o número);
       imobiliárias com quem o perfil foi compartilhado (com botão para revogar); "Baixar
       meus dados"; "Excluir minha conta" (com confirmação); "Sair".
       Estados: salvar uma edição mostra "Recomendações atualizadas"; revogar o
       compartilhamento avisa que a imobiliária já recebeu os dados até aquele momento e
       que novos dados não serão enviados.

    Telas do cliente (2/2): Mapa, imóveis e Corretor

    Tela C-06 · Mapa Vivo (aba 2)
       Objetivo: mostrar onde os imóveis ficam em relação à rotina do cliente.
       Layout:
        1. Mapa em tela cheia (entre o topo e a barra de abas), centrado nos bairros do perfil.
        2. Sobre o mapa, no topo: chips de camadas com rolagem lateral (Restaurantes,
          Academias, Escolas, Hospitais, Transporte, Áreas verdes, Pet-friendly). Chip ligado
          fica preto. No máximo 2 camadas ao mesmo tempo; a terceira mostra o aviso
          "Máximo de 2 camadas. Desligue uma para ligar outra".
        3. Logo abaixo, etiquetas do perfil em uso (ex.: "Até 20 min no pico", "cão grande").
        4. Bairros pintados pela compatibilidade: verde (85% ou mais), neutro (75% a 84%),
          vermelho claro (abaixo de 75%).
        5. Pins dos imóveis com a nota dentro. Pins dos endereços da rotina (Trabalho, Escola)
          com ícone próprio.
        6. Botão "Legenda" no canto inferior direito, que abre um quadro explicando cores e
          ícones.

       Ações: tocar num pin abre um cartão na parte de baixo (foto, nome, preço, nota, tempo
       até o trabalho) com botão "Ver imóvel" (C-07); tocar num bairro mostra a nota do bairro
       e os critérios que a formam; tocar num endereço da rotina desenha o trajeto até o
       imóvel selecionado.
       Estados: sem endereço de rotina, o mapa mostra só os imóveis e um aviso "Adicione
       seu trabalho no Perfil para ver os tempos de trajeto"; sem conexão, mostra os últimos
       imóveis carregados em lista.

    Tela C-07 · Ficha do imóvel
       Objetivo: dar toda a informação para o cliente decidir se quer falar com o corretor.
       Layout:
        1. Galeria de fotos com rolagem lateral e contador (1/12); botões de voltar,
          compartilhar e salvar sobre a foto.
        2. Nome, bairro, selo "Anúncio completo" (se tiver) e preço em destaque; condomínio e
          IPTU logo abaixo.
        3. Linha de atributos com ícones: quartos, suítes, vagas, metragem, pets.
        4. Bloco "Compatível com a sua vida": nota geral e a lista de critérios, cada um com
          certo ou alerta e uma frase ("18 min até o trabalho no horário de pico", "12% acima
          do orçamento informado", "Condomínio só aceita pets de porte pequeno").
        5. Descrição, itens do prédio (lazer, pet place, bicicletário) e link do tour virtual, se
          houver.
        6. Mini mapa com a localização e os tempos até os endereços da rotina; botão "Abrir
          no Mapa Vivo".
        7. Imobiliária responsável, corretor e CRECI.
        8. Barra fixa no rodapé: "Comparar" (contorno) e "Falar com o corretor" (preto).

       Estados: imóvel retirado do ar mostra "Este imóvel não está mais disponível" e 3
       parecidos; perfil já compartilhado com a imobiliária troca o botão para "Continuar
       conversa".
    Tela C-08 · Comparação
       Layout: título "3 imóveis lado a lado"; colunas com foto, nome e nota; linhas para preço,
       área, preço por m², quartos, vagas, condomínio, trajeto, pets e itens do prédio, com o
       melhor valor de cada linha em negrito; abaixo, o parecer da IA em 3 a 5 frases ligadas ao
       perfil.
       Ações: remover um imóvel da comparação; tocar numa coluna abre a ficha.
       No celular: a tabela rola na horizontal, com a primeira coluna (nome do critério) fixa.

    Tela C-09 · Salvos (aba 3)
       Layout: título "Imóveis que você guardou" e contador; lista de cartões iguais aos da
       conversa, cada um com caixa de seleção; quando há 2 ou 3 selecionados, aparece a
       barra fixa "Comparar (2)".
       Ações: abrir a ficha; tirar dos salvos (deslizar para o lado ou tocar no coração);
       comparar.
       Estado vazio: "Você ainda não salvou nenhum imóvel. Toque no coração de um imóvel
       para guardá-lo aqui", com botão "Voltar para a conversa".
       Badge na aba: número de salvos.

    Tela C-10 · Consentimento (folha sobre a ficha)
       Layout: folha que sobe do rodapé com fundo escurecido; ícone de escudo; título
       "Compartilhar seu perfil com a [imobiliária]?"; lista do que vai junto ("Seu perfil: rotina,
       orçamento, pets e prioridades"; "Os imóveis salvos, incluindo o [imóvel]"); frase "Você
       pode revogar quando quiser no seu Perfil"; link para a política de privacidade; botões
       "Autorizar e falar com o corretor" (preto) e "Agora não" (texto).
       Regra: o consentimento vale só para aquela imobiliária. Um imóvel de outra imobiliária
       pede um novo consentimento.

    Tela C-11 · Corretor (aba 4)
       Objetivo: conversa entre cliente e corretor.
       Layout: cabeçalho com foto ou iniciais do corretor, nome, "Corretora · [imobiliária]" e o
       imóvel em questão; cartão fixo no topo com o resumo do imóvel e da visita (se
       agendada); mensagens (corretor à esquerda com borda, cliente à direita em preto,
       avisos do sistema no centro, como "Visita confirmada pelo corretor: sáb, 24/10, 10h");
       mensagens da IA da imobiliária marcadas como "IA da [imobiliária]"; campo de texto
       com envio de foto.
       Ações: escrever; escolher um horário de visita sugerido (botões dentro da mensagem);
       enviar proposta pelo botão "Fazer proposta" (abre um campo de valor).
       Com mais de uma imobiliária: a aba mostra primeiro a lista de conversas (uma por
       imobiliária) e depois o chat.
       Estado vazio: "Fale com um corretor quando quiser. Seu perfil só é compartilhado com
       a imobiliária se você autorizar. Abra um imóvel e toque em Falar com o corretor".
       Badge na aba: mensagens não lidas.

    Telas do painel (1/2): acesso, Painel, Funil e Lead aberto
    O painel é pensado primeiro para computador, mas funciona no celular. No computador, há
    um menu lateral fixo à esquerda: no topo, as iniciais e o nome da imobiliária; abaixo, os itens
    Painel, Funil, Lead aberto, Agenda de visitas, Imóveis anunciados, Métricas, IA da
    imobiliária e Equipe, com contadores (leads novos no Funil, leads aguardando no Lead
    aberto). No celular, o menu vira uma barra inferior com Painel, Funil, Agenda e um botão
    "Mais".

    Tela P-01 · Acesso da imobiliária
       Layout: logo; frase "A IA atende, qualifica e organiza. Você fecha o negócio."; login por
       e-mail com código; link "Quero ser parceiro" (leva ao cadastro da imobiliária); aviso,
       quando houver, "1 novo lead esperando. Entre para ver".
       Cadastro de parceiro: razão social, CNPJ, CRECI jurídico, nome do gestor, e-mail e
       WhatsApp. Ao enviar, aparece "Recebemos seu cadastro. A Konexya libera o acesso
       após a conferência".
       Regra: o corretor convidado entra pelo link do convite e só vê o que o papel dele
       permite.

    Tela P-02 · Painel (visão geral)
       Objetivo: mostrar em 10 segundos o que precisa de ação hoje.
       Layout:
         1. Título "Painel" e a data ("Terça, 20 de outubro · visão geral do atendimento").
         2. Faixa de aviso quando chega um lead novo ("Marina acabou de chegar"), com botão
              "Abrir lead".
         3. Quatro cartões de número: leads novos hoje, aguardando resposta, visitas da
              semana, tempo médio até a primeira resposta.
         4. Funil resumido em barras horizontais (Conversas iniciadas, Qualificadas pela IA,
              Visitas agendadas, Propostas, Em negociação).
         5. Lista "Aguardando você": leads e tarefas com o próximo passo ("Revisar e aprovar a
              primeira mensagem", "Lembrete de visita para Marina"), cada um com botão de
           ação.
        6. Próximas visitas do dia.

       Corretor x gestor: o corretor vê só os próprios leads; o gestor vê a equipe toda e pode
       filtrar por corretor.

    Tela P-03 · Funil (kanban)
       Layout: título "Funil" e a dica "Arraste os cartões entre as etapas ou use as setas";
       filtros (corretor, imóvel, período); colunas Novo, Em atendimento, Qualificado, Visita
       agendada, Proposta, Negociação, com contador em cada uma; Fechado e Perdido
       ficam numa aba separada ("Encerrados") para não poluir a tela.
       Cartão do lead: nome, o que busca em uma linha ("3 quartos no Cocó, com escola
       perto"), faixa de valor, nota de compatibilidade, corretor responsável (iniciais) e há
       quanto tempo está na etapa. Selo "Aguardando você" quando há ação pendente. Borda
       vermelha quando o lead está parado há mais de 48 h.
       Ações: arrastar entre colunas (ou setas, no celular); tocar no cartão abre P-04; mover
       para Perdido pede o motivo (preço, localização, desistiu, comprou com outro, sem
       resposta, outro).
       No celular: uma coluna por vez, com abas no topo para trocar de etapa.

    Tela P-04 · Lead aberto
       Objetivo: tudo o que o corretor precisa para atender sem sair da tela.
       Layout no computador (3 colunas):
        1. Esquerda, perfil: nome, origem ("Konexya · autorizou em 20/10, 14h32"), resumo
           do perfil em 3 a 4 frases feito pela IA ("Trabalha na Aldeota e aceita até 20 min de
           trajeto no pico. Tem um cão de porte grande: o condomínio precisa aceitar pets
           grandes."); bloco Qualificação com itens marcados como ok ou a confirmar
           (orçamento informado, necessidade clara, prazo, consentimento LGPD, forma de
           pagamento) e a nota de prontidão; imóveis vistos, salvos e comparados, com a nota
           de cada um.
        2. Centro, conversa: histórico com o cliente; a mensagem sugerida pela IA aparece
           num cartão acima do campo de texto, marcada "Aguardando você", com os botões
           Aprovar e enviar, Editar e Descartar; campo para escrever do zero; botões rápidos
           "Sugerir horários" e "Enviar comparativo".
        3. Direita, próximos passos: a próxima ação recomendada (muda conforme a etapa:
           aprovar a primeira mensagem, aguardar resposta, confirmar visita, encaminhar
           proposta); etapa do funil com seletor; corretor responsável (o gestor pode trocar);
           visita (data, hora, imóvel, botão "Confirmar visita"); proposta (valor, status:
          aguardando você, encaminhada ao proprietário, contraproposta); anotações
          internas ("Só a equipe vê").

       No celular: as três colunas viram abas: Conversa, Perfil e Próximos passos.
       Regras: visitas só são confirmadas pelo corretor; nenhuma mensagem em nome do
       corretor sai sem aprovação; o botão "Devolver para a IA" só aparece se a imobiliária
       ativou as respostas automáticas para dúvidas simples.
       Estado vazio: sem lead selecionado, mostra "Nenhum lead aberto. Escolha um no Funil
       ou no Painel".

    Telas do painel (2/2): agenda, imóveis, métricas e
    configurações

    Tela P-05 · Agenda de visitas
       Layout: título "Agenda de visitas" e a semana ("Semana de 19 a 25 de outubro") com
       setas para trocar; visão de semana no computador e de dia no celular; cada visita é um
       bloco com horário, nome do cliente, imóvel e status (pedida, confirmada, realizada,
       cancelada); filtro por corretor para o gestor.
       Ações: abrir a visita (mostra o lead e o endereço); confirmar um pedido; remarcar (avisa
       o cliente no app e por WhatsApp); marcar como realizada ou não compareceu.
       Regra: dois pedidos no mesmo horário para o mesmo corretor geram aviso de conflito.

    Tela P-06 · Imóveis anunciados
       Layout: título "Imóveis anunciados" e "Desempenho dos últimos 30 dias"; botões
       "Novo imóvel" e "Importar planilha"; busca e filtros (bairro, tipo, status, com ou sem
       selo); tabela com foto, imóvel, bairro, preço, preço por m², visualizações, salvos, leads,
       selo e status (publicado, rascunho, pausado, vendido ou alugado).
       Ações: abrir para editar (P-07); pausar; marcar como vendido ou alugado (sai das
       recomendações e os clientes que salvaram veem "não está mais disponível").
       No celular: a tabela vira lista de cartões.

    Tela P-07 · Cadastro e edição de imóvel
       Layout em etapas, com barra de progresso:
        1. Básico: finalidade (venda ou aluguel), tipo, endereço com autocompletar e
          confirmação do pino no mapa.
        2. Valores e medidas: preço, condomínio, IPTU, área útil, quartos, suítes, banheiros,
          vagas.
        3. Características: aceita pets (não, pequeno, qualquer porte), mobiliado, andar, vista,
          lista de itens do prédio em caixas de seleção.
        4. Fotos: envio múltiplo arrastando os arquivos, reordenar arrastando, escolher a capa;
          link de tour virtual.
        5. Descrição e responsável: texto livre (com botão "Melhorar com IA", que reescreve
          sem inventar dados) e corretor responsável.

       Checklist do selo: painel fixo à direita (ou no fim, no celular) com cada critério marcado
       ou pendente e a frase "Faltam 2 itens para o selo Anúncio completo".
       Ações: salvar como rascunho; publicar. Publicar dispara o cálculo de compatibilidade e
       os alertas (fluxo F8).

    Tela P-08 · Importar imóveis
       Passos: baixar o modelo de planilha; enviar o arquivo; tela de conferência mostrando
       quantos imóveis foram lidos, quantos têm erro (com a linha e o motivo, como "preço
       vazio") e quantos ganham o selo; botão "Importar os X válidos". As fotos podem vir por
       link na planilha ou ser enviadas depois.

    Tela P-09 · Métricas
       Layout: filtro de período (7, 30, 90 dias) e de corretor; funil com o número e a
       porcentagem de cada etapa (leads recebidos, qualificados pela IA, visitas agendadas,
       propostas, em negociação); tempo até a primeira resposta (média e por corretor) em
       destaque; gráfico de leads por hora do dia, marcando o que chegou fora do horário
       comercial (antes das 8h e depois das 18h); uso da IA (mensagens aprovadas sem
       edição, editadas antes de enviar, descartadas); motivos de perda.
       Por que importa: é a tela que a imobiliária vai usar para decidir se continua pagando.

    Tela P-10 · IA da imobiliária
       Layout: título "O que a IA pode fazer sozinha e o que sempre passa por você"; lista de
       permissões com chave liga e desliga: responder dúvidas sobre os imóveis (preço,
       condomínio, pets, vagas), sugerir horários de visita, enviar mensagem de boas-vindas
       automática (identificada como IA). Item travado e sempre desligado: "Enviar a primeira
       mensagem do corretor sem aprovação", com a explicação "Sempre exige o corretor. A
       Konexya não fecha negócios sozinha".
       Tom de voz: 3 opções prontas (Próximo e direto, Formal, Leve com emoji), com prévia
       de uma mensagem em cada uma.
       Distribuição de leads: rodízio entre corretores ativos ou atribuição manual pelo gestor.
       Acesso: só o gestor edita esta tela.
    Tela P-11 · Equipe
       Layout: lista de pessoas com nome, e-mail, papel (gestor ou corretor), CRECI, status
       (ativo, convite pendente) e se está no rodízio; botão "Convidar corretor".
       Ações: convidar, reenviar convite, tirar do rodízio (férias), desativar. Leads de um
       corretor desativado vão para o gestor redistribuir.

    Tela do protótipo que fica fora do MVP: "Inteligência de procura" (o que os clientes
    pedem por região). Depende de volume de conversas que o piloto ainda não terá; entra
    quando houver dados suficientes para não mostrar conclusões baseadas em meia dúzia de
    clientes.

    Padrões de interface
    Todas as telas seguem as mesmas regras visuais e de comportamento, para o dev não
    decidir caso a caso. O protótipo navegável é a referência visual.

    Visual

       Preto e branco, muito espaço em branco, fonte Montserrat, ícones de linha simples
       (traço fino, cantos arredondados).
       Cor só com significado: verde para o que atende ao perfil, amarelo para atenção,
       vermelho para o que não atende ou para erro.
       Botão principal: preto, texto branco, cantos totalmente arredondados, altura mínima de
       44 px. Botão secundário: contorno preto, fundo branco. Um único botão principal por
       tela.
       Cartões com borda fina cinza e cantos arredondados; ao passar o mouse ou tocar, a
       borda fica preta.
       Textos em português do Brasil, usando "para", nunca "pra". O slogan aparece com
       discrição (boas-vindas e login), não em todas as telas.

    Comportamento

       Carregando: blocos cinza no formato do conteúdo (esqueleto), nunca tela branca; na
       conversa, os três pontos de "digitando".
       Vazio: quadro tracejado com uma frase do que falta e um botão que leva à ação ("Voltar
       para a conversa").
       Erro: frase simples do que deu errado e o que fazer, com botão "Tentar de novo". Nunca
       código técnico na tela.
       Sem internet: faixa no topo "Você está sem conexão"; mensagens escritas ficam na fila
       e saem quando a conexão volta.
       Avisos rápidos (toasts): caixa preta na parte de baixo da tela por 3 segundos, para
       confirmações ("Salvo", "Mensagem enviada para a Marina", "Visita agendada").
       Confirmações: só para ações que não dá para desfazer (excluir conta, marcar como
       perdido, desativar corretor).
       Acessibilidade: contraste alto, área de toque mínima de 44 px, foco visível no teclado,
       textos alternativos nas fotos dos imóveis.
       Links profundos: todo alerta (WhatsApp ou e-mail) abre a tela exata: a ficha do imóvel,
       a conversa com o corretor ou o lead no painel.

    Responsivo

       App do cliente: desenhado para celular de 360 a 430 px de largura; no computador, fica
       centralizado numa coluna estreita.
       Painel: desenhado para computador a partir de 1280 px; no celular, menu lateral vira
       barra inferior, tabelas viram cartões e o Lead aberto vira abas.

    Requisitos técnicos e arquitetura
    Um único web app responsivo (PWA) serve cliente e imobiliária, com um backend
    gerenciado. É a forma mais barata de entregar os dois lados com um dev só. A stack abaixo
    é uma sugestão; o dev pode propor outra, desde que justifique custo e prazo.

    Componentes:

     Camada           Sugestão                          Função

                                                        App do cliente e painel da imobiliária,
     Front-end        Next.js ou React + PWA
                                                        com rotas e permissões separadas

                      Supabase (Postgres,
     Backend e                                          Usuários, imóveis, leads, mensagens,
                      autenticação, storage) ou
     banco                                              fotos
                      Firebase

                      API de LLM (Claude ou             Chat de perfil, resumo do lead,
     IA
                      equivalente)                      mensagem sugerida, comparação

     Mapas e          Google Maps Platform ou           Mapa Vivo, tempo de deslocamento,
     rotas            Mapbox                            pontos de interesse

                      API oficial da Meta, direta ou
     WhatsApp                                           Alertas e notificações
                      via BSP

                      Serviço transacional (Resend,
      E-mail            SendGrid etc.)                    Login, avisos, lembretes

      Hospedagem        Vercel ou equivalente             Deploy do front-end

    Requisitos não funcionais:

       Funcionar bem em celular Android de entrada; o painel funciona em computador e
       celular.
       Recomendações carregando em até 3 segundos.
       Isolamento de dados: uma imobiliária nunca vê leads, imóveis privados ou métricas de
       outra (regras de acesso no banco, não só na tela).
       Registro (log) de toda ação da IA que chega ao cliente, para auditar erros.
       Controle de custo: limite de mensagens de IA por usuário por dia e cache de rotas.
       Identidade visual: preto e branco, Montserrat, ícones de linha, muito espaço em branco,
       conforme o protótipo.

    Regras para a IA:

       Responder só com base nos imóveis da base e no perfil; nunca inventar imóvel, preço
       ou atributo.
       Sempre deixar claro quando algo é estimativa.
       Nenhuma mensagem ao cliente sai em nome do corretor sem aprovação dele.

    Entregáveis do dev: código em repositório da Konexya (não do dev), documentação de
    instalação, acesso a todas as contas de serviço em nome da Konexya, e ambiente de teste
    separado do de produção.

    LGPD e conformidade
    A Konexya trata dados pessoais sensíveis para o negócio (renda, endereço de trabalho,
    rotina), então a privacidade faz parte do produto e não é um anexo. Esta seção é um ponto
    de partida, não um parecer jurídico.

       Consentimentos separados: termos de uso; compartilhamento do perfil com cada
       imobiliária (por contato); alertas por WhatsApp.
       Minimização: a imobiliária recebe só o necessário para atender. Endereços exatos da
       rotina não são enviados ao corretor, só o tempo de deslocamento.
       Direitos do titular: o usuário vê, corrige, exporta e exclui seus dados pelo app.
       Contratos: termo com cada imobiliária parceira definindo papéis (controlador e
       operador) e proibindo uso dos leads fora da finalidade.
        Fornecedores: lista dos serviços que recebem dados (IA, mapas, WhatsApp,
        hospedagem), com os dados enviados a cada um.
        Política de privacidade e termos publicados antes do primeiro usuário real.
        Regras do mercado imobiliário: confirmar com o CRECI que a Konexya, como
        plataforma, não exerce intermediação, e que os anúncios exibem os dados obrigatórios
        do corretor ou imobiliária responsável.

    Pendência: a Konexya ainda não tem empresa formalizada nem contrato social entre os
    sócios. Termos, contratos com imobiliárias e contas de serviço precisam de um CNPJ antes
    do piloto.

    Métricas de sucesso do piloto
    O piloto dá certo se as imobiliárias respondem mais rápido aos leads da Konexya do que aos
    dos canais atuais e aceitam pagar para continuar. Antes de começar, é preciso medir a linha
    de base de cada imobiliária (tempo de resposta e conversão atuais). Sem esse número, não
    há como provar melhora.

      Métrica                    O que mede                  Meta proposta (a validar)

                                 Parceiras que entram no
      Imobiliárias ativas                                    3a5
                                 painel toda semana

      Tempo até a primeira       Agilidade do corretor com   Menor que a linha de base da
      resposta                   lead da Konexya             própria imobiliária

      Lead → visita              Qualidade da qualificação   Maior que a linha de base

      Mensagens da IA            Confiança do corretor na    Acompanhar a tendência; meta
      aprovadas sem edição       IA                          após 4 semanas

      Clientes que concluem                                  Acompanhar; meta após 4
                                 Se o chat de IA funciona
      o perfil                                               semanas

      Cliente que volta ao app   Se o WhatsApp traz o        Acompanhar; meta após 4
      após um alerta             usuário de volta            semanas

                                                             Ao menos 1 imobiliária disposta a
      Intenção de pagar          Validação comercial
                                                             pagar ao fim do piloto

    Além dos números, cada parceira deve passar por uma conversa estruturada ao fim do
    piloto: o que usou, o que ignorou e o que faria pagar.
    Aquisição dos primeiros clientes — decisão pendente
    Este é o maior risco do MVP. A imobiliária só vê valor se chegarem leads, e um app novo
    começa sem usuários. A decisão precisa ser tomada antes de fechar o escopo com o dev,
    porque algumas opções exigem funcionalidades extras.

      Opção          Como funciona                       A favor             Contra

                     Anúncios no Instagram e             A Konexya           Exige verba de
      Tráfego
                     Google para quem busca              controla o volume   mídia fora dos R$ 6
      pago da
                     imóvel em Fortaleza, levando        e mede o custo      mil; concorre com
      Konexya
                     direto ao chat de perfil            por lead            portais grandes

      Divulgação                                         Custo zero para a   A imobiliária pode
                     A imobiliária divulga a
      pelas                                              Konexya; usa a      não priorizar; os
                     Konexya no site, no Instagram
      imobiliárias                                       audiência que a     leads seriam dela
                     e nos anúncios que já faz
      parceiras                                          parceira já tem     de qualquer forma

                     Perfis próprios com conteúdo                            Lento para gerar
      Conteúdo                                           Barato e constrói
                     sobre bairros e compra de                               volume no prazo do
      orgânico                                           marca
                     imóvel em Fortaleza                                     piloto

                     Parceiras divulgam + verba          Reduz a             Exige alguém
      Combinação     pequena de teste em mídia           dependência de      dedicado a
                     paga                                um canal só         marketing

    A opção de o corretor mandar um link da Konexya por WhatsApp ao cliente foi descartada
    pelo modelo do produto e não está na lista.

       ☐︎ Escolher a estratégia de aquisição do piloto
       ☐︎ Definir a verba de mídia (se houver), separada do orçamento de desenvolvimento

    Modelo de negócio e preço
    A hipótese atual é uma assinatura de R$ 500/mês por imobiliária. O cliente final usa a
    Konexya de graça.

    O que testar no piloto:

       Se R$ 500/mês é aceito, e para qual porte de imobiliária.
       Se faz mais sentido cobrar por imobiliária, por corretor ativo ou por lead qualificado
       entregue.
       Se o pagamento simbólico durante o piloto (ou uma carta de intenção) é aceito, o que
       separa o interesse educado do interesse real.

    Custos variáveis que o preço precisa cobrir: chamadas à IA, cálculos de rota no Mapa
    Vivo e conversas no WhatsApp. Esses custos crescem com o número de clientes e de
    alertas, não com o número de imobiliárias. A planilha de custo por usuário ativo deve ser
    montada no primeiro mês de piloto, com os dados reais de uso.

    Orçamento, cronograma e prioridade de corte
    O orçamento disponível é de R$ 6 mil, e o escopo completo deste documento
    provavelmente passa disso com um dev competente. Por isso o desenvolvimento vai em
    fases, e cada fase precisa terminar com algo utilizável.

    Propostas recebidas até agora: Felipe, R$ 2.200 em cerca de 25 dias; Otávio, R$ 1.000
    em cerca de 25 dias. Para este escopo, esses valores e prazos são um sinal de alerta: ou o
    dev não leu o escopo inteiro, ou vai entregar algo bem menor. Qualquer proposta deve ser
    refeita com base neste documento, item por item.

    Fases de entrega:

     1. Base: login, cadastro e importação de imóveis, ficha do imóvel, painel com conta da
       imobiliária e equipe.
     2. Núcleo de valor: chat de perfil, recomendações com nota, "Falar com o corretor" com
       consentimento, caixa de leads com resumo e mensagem sugerida, funil.
     3. Diferenciais: Mapa Vivo, comparação por IA, selo de anúncio completo, agenda de
       visitas, métricas.
     4. Retenção: alertas e notificações por WhatsApp (começar o processo de aprovação dos
       templates na Meta já na fase 1, porque leva tempo).

    Se o dinheiro acabar, a ordem do corte é (o primeiro da lista sai primeiro):

     1. Comparação por IA (o chat pode responder comparações de forma simples)
     2. Nota de bairro do Mapa Vivo (mantém pins e tempo de deslocamento)
     3. Importação por XML (mantém a planilha)
     4. Alertas de imóvel novo por WhatsApp (mantém avisos de mensagem por e-mail)
     5. Métricas além do tempo de resposta

    O que não sai em nenhum cenário: chat de perfil, recomendações, consentimento, caixa de
    leads com resumo da IA e tempo de primeira resposta. Sem isso, o piloto não prova nada.

    Formas de pagar o dev que reduzem o risco: pagamento por fase entregue e testada,
    nunca adiantado integral; código no repositório da Konexya desde o primeiro dia.

    Riscos e mitigação
    Os três maiores riscos não são técnicos: falta de clientes no app, falta de dev na equipe e
    escopo maior que o orçamento.

      Risco            Consequência                           Mitigação

      App sem
                       Painel vazio; imobiliária perde o      Decidir a estratégia de aquisição
      clientes no
                       interesse                              antes do desenvolvimento
      piloto

      Ninguém na       Dependência total de um                Código no repositório da Konexya,
      equipe           freelancer; dificuldade para avaliar   pagamento por fase, revisão por um
      programa         a qualidade do código                  dev de confiança

      Escopo maior                                            Fases com entrega utilizável e lista
                       Projeto parado no meio
      que R$ 6 mil                                            de corte definida

      Imobiliárias
      não                                                     Importação por planilha e ajuda da
                       Recomendações vazias
      cadastram                                               Konexya no primeiro cadastro
      imóveis

      IA inventa
                       Perda de confiança do cliente e do     IA restrita à base, logs e aprovação
      dados ou erra
                       corretor                               humana nas mensagens
      o perfil

      Bloqueio ou                                             Opt-in, limite de frequência,
      custo alto no    Alertas param de funcionar             templates aprovados com
      WhatsApp                                                antecedência

      Custo de API
                                                              Cache de rotas, limite diário de IA,
      cresce com o     Margem negativa
                                                              planilha de custo por usuário
      uso

      Sociedade        Conflito sobre propriedade do          Formalizar empresa e acordo de
      sem contrato     código e da marca                      sócios antes de contratar o dev

      Interesse                                               Pedir carta de intenção ou
      sem              Validação que não vira receita
                                                              pagamento simbólico no piloto
      compromisso
    Próximos passos
      ☐︎ Decidir a estratégia de aquisição dos primeiros clientes
      ☐︎ Formalizar a empresa e o acordo de sócios entre Samuel e Pedro
      ☐︎ Validar com a RE/MAX e mais 2 imobiliárias: critérios do selo, etapas do funil e o que o
      resumo do lead precisa ter
      ☐︎ Medir a linha de base (tempo de resposta e conversão) das imobiliárias do piloto
      ☐︎ Enviar este documento a pelo menos 3 devs e pedir orçamento por fase
      ☐︎ Iniciar a conta do WhatsApp Business e a aprovação dos templates
      ☐︎ Redigir termos de uso, política de privacidade e termo de parceria com imobiliárias
      ☐︎ Consultar o CRECI sobre o papel da plataforma e os dados obrigatórios nos anúncios
