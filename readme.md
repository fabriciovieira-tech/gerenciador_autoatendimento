# Documentação técnica do projeto: Sistema otimizado de gerenciamento de filas e senhas

Este documento descreve detalhadamente o funcionamento, a arquitetura e as tecnologias do sistema híbrido de atendimento e controle de filas com integração física e digital.

---

## 1. Visão Geral do Sistema

O projeto consiste em um ecossistema automatizado para controle de filas de atendimento, projetado para operar com **duas entidades independentes** (Cliente e Atendente) intermediadas por um backend centralizador. O sistema substitui os tradicionais rolos de senha de papel por um fluxo dinâmico capaz de emitir senhas tanto de forma física/local quanto de forma digital e remota.

### Dinâmica de Funcionamento:
* **Estado Inicial:** O painel inicia exibindo o marcador padrão `000`.
* **Geração Sequencial:** O primeiro cliente a interagir com o sistema dispara o contador global, recebendo a senha `001`. Os subsequentes recebem `002`, `003` e assim por diante de forma incremental e estritamente sem repetições.
* **Ciclo de Atendimento:** O atendente atua de forma manual e sob demanda. Ao finalizar um atendimento, aciona um gatilho ("Chamar Próxima Senha") que altera o estado interno da fila e atualiza o painel principal em tempo real.

---

## 2. Tecnologias Utilizadas

O sistema foi construído utilizando uma arquitetura unificada em **JavaScript**, dividida entre o ecossistema Node.js no backend e uma interface reativa no frontend.

* **Node.js:** Ambiente de execução assíncrono para o servidor backend.
* **Express.js:** Framework web para gerenciamento de rotas RESTful API e disponibilização de arquivos estáticos.
* **whatsapp-web.js:** Biblioteca que encapsula a engine do Puppeteer para injetar comandos e simular o WhatsApp Web, permitindo a criação do Bot de atendimento automatizado.
* **NeDB:** Banco de dados NoSQL embarcado escrito em JavaScript, operando diretamente na memória do servidor para garantir persistência ultra-rápida do estado da fila durante a sessão.
* **HTML5 & CSS3:** Tecnologias de frontend para estruturação e estilização da interface visual, utilizando variáveis nativas CSS (`:root`) e Flexbox para design responsivo.
* **JavaScript (Vanilla/ES6):** Utilizado no frontend para chamadas assíncronas via `Fetch API` e manipulação assíncrona do DOM através do mecanismo de *Polling* estável.
* **QR Server API:** API externa de terceiros utilizada para a renderização visual dinâmica e instantânea do código de autenticação do WhatsApp.

---

## 3. Interfaces de Interação (Front-End)

O sistema centraliza em uma única página web três visões cruciais do negócio:

### A. Telão/Painel Principal
Um monitor de alta visibilidade voltado para o público em geral.
* Exibe em destaque (`font-size: 6rem`) a senha que está sendo atendida no momento.
* Informa em tempo real a quantidade total de pessoas aguardando na fila.
* Mostra de forma preditiva qual será o número da próxima senha a ser gerada, mitigando a ansiedade da fila de espera.

### B. Totem do Cliente (Interface física/digital)
* Permite ao cliente a retirada manual de sua senha por meio de um botão físico em uma tela de autoatendimento (Totem).
* Emite alertas dinâmicos na tela exibindo a confirmação do número gerado.
* **Alternativa QR Code:** Fornece o ponto de entrada para o atendimento digital. O cliente pode escanear um QR Code para migrar o processo para o celular.

### C. Painel do atendente
* Interface privativa de controle humano.
* Contém o botão de ação que consome a fila e faz o chamamento da próxima senha em espera.
* Exibe alertas contextuais em caso de erro ou aviso de "Fila Vazia" (Status 404).

---

## 4. Arquitetura do Backend e Regras de Negócio

O backend atua como o cérebro da aplicação, mantendo o estado global do sistema protegido e consistente.

### Estado Global Controlado:
* `contadorSenha`: Variável de controle incremental estrito.
* `senhaAtualNoPainel`: Armazena a string exata exibida no monitor de atendimento.
* `whatsappConectado`: Trava de segurança tipo booleana que impede o disparo de requisições de mensagens caso a API do WhatsApp sofra alguma desconexão.

### O Fluxo Híbrido de Geração de Senhas:
O sistema possui dois canais de entrada concorrentes:

1. **Via WhatsApp (Canal Digital):** O cliente envia uma mensagem inicial e o bot responde com uma mensagem de boas-vindas estruturada, instruindo-o a digitar `1`. Ao enviar o comando `1`, o backend calcula em tempo real o tamanho da fila com o status `'aguardando'`, formata a senha com três dígitos (ex: `007`) usando `.padStart(3, '0')` e responde o usuário no chat privado informando o seu número e a quantidade exata de pessoas que estão na frente dele.
2. **Via Totem Web (Canal Físico):** O endpoint `POST /api/gerar` incrementa o mesmo contador global, cria um documento no NeDB marcando a origem como `'totem'` e devolve a informação estruturada para a tela local.

### Mecanismo de Chamada e Notificação Ativa (*Push Notification*):
Quando o atendente faz a requisição no endpoint `POST /api/chamar`, o NeDB executa uma busca ordenada (`sort({ data: 1 })`), aplicando um conceito de **Fila FIFO (First-In, First-Out)** limitando o resultado a apenas uma pessoa (`limit(1)`). 

O status dessa senha muda de `'aguardando'` para `'chamado'`. Se o backend detectar que essa senha específica originou-se do WhatsApp, ele usa o gatilho automático `client.sendMessage()` para notificar ativamente o smartphone do cliente em formato *push*, informando que chegou a vez dele e que ele deve se dirigir ao balcão.

### Sincronização em Tempo Real:
Para evitar a necessidade de carregamento de frameworks pesados de WebSockets, o frontend utiliza uma estratégia de **Polling Estável**, realizando requisições HTTP do tipo `GET /api/status` a cada 1,5 segundos (`1500ms`), garantindo que o painel principal, o totem e o atendente estejam sempre perfeitamente sincronizados com o banco de dados NeDB.