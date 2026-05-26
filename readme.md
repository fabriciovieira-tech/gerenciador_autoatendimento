# Documentação técnica do projeto: sistema otimizado de gerenciamento de filas e senhas

Este documento descreve detalhadamente o funcionamento, a arquitetura e as tecnologias do sistema híbrido de atendimento e controle de filas com integração física e digital.

---

## 1. Visão geral do sistema

O projeto consiste em um simulado de um ecossistema automatizado para controle de filas de atendimento, projetado para operar com **duas entidades independentes** (cliente e atendente) intermediadas por um backend centralizador. O sistema substitui os tradicionais rolos de senha de papel por um fluxo dinâmico capaz de emitir senhas tanto de forma física/local quanto de forma digital e remota.

### Dinâmica de funcionamento:
* **Estado inicial:** o painel inicia exibindo o marcador padrão `000`.
* **Geração sequencial:** o primeiro cliente a interagir com o sistema dispara o contador global, recebendo a senha `001`. Os subsequentes recebem `002`, `003` e assim por diante de forma incremental e estritamente sem repetições.
* **Ciclo de atendimento:** o atendente atua de forma manual e sob demanda. Ao finalizar um atendimento, aciona um gatilho ("chamar próxima senha") que altera o estado interno da fila e atualiza o painel principal em tempo real.

---

## 2. Tecnologias utilizadas

O sistema foi construído utilizando uma arquitetura unificada em **javascript**, dividida entre o ecossistema node.js no backend e uma interface reativa no frontend.

* **Node.js:** ambiente de execução assíncrono para o servidor backend.
* **Express.js:** framework web para gerenciamento de rotas restful api e disponibilização de arquivos estáticos.
* **Whatsapp-web.js:** biblioteca que encapsula a engine do puppeteer para injetar comandos e simular o whatsapp web, permitindo a criação do bot de atendimento automatizado.
* **NeDB:** banco de dados nosql embarcado escrito em javascript, operando diretamente na memória do servidor para garantir persistência ultra-rápida do estado da fila durante a sessão.
* **HTML5 & CSS3:** tecnologias de frontend para estruturação e estilização da interface visual, utilizando variáveis nativas css (`:root`) e flexbox para design responsivo.
* **Javascript (vanilla/es6):** utilizado no frontend para chamadas assíncronas via `fetch api` e manipulação assíncrona do dom através do mecanismo de *polling* estável.
* **QR server api:** api externa de terceiros utilizada para a renderização visual dinâmica e instantânea do código de autenticação do whatsapp.

---

## 3. Interfaces de interação (front-end)

O sistema centraliza em uma única página web três visões cruciais do negócio:

### A. Telão/painel principal
Um monitor de alta visibilidade voltado para o público em geral.
* Exibe em destaque (`font-size: 6rem`) a senha que está sendo atendida no momento.
* Informa em tempo real a quantidade total de pessoas aguardando na fila.
* Mostra de forma preditiva qual será o número da próxima senha a ser gerada, mitigando a ansiedade da fila de espera.

### B. Totem do cliente (interface física/digital)
* Permite ao cliente a retirada manual de sua senha por meio de um botão físico em uma tela de autoatendimento (totem).
* Emite alertas dinâmicos na tela exibindo a confirmação do número gerado.
* **Alternativa qr code:** fornece o ponto de entrada para o atendimento digital. O cliente pode escanear um qr code para migrar o processo para o celular.

### C. Painel do atendente
* Interface privativa de controle humano.
* Contém o botão de ação que consome a fila e faz o chamamento da próxima senha em espera.
* Exibe alertas contextuais em caso de erro ou aviso de "fila vazia" (status 404).

---

## 4.  Como executar?

Requisitos:
* [Git](https://git-scm.com/) (para clonar o repositório).
* [Node.js](https://nodejs.org/) (versão 16 ou superior recomendada, para executar o ambiente JavaScript).

---

## 🛠️ Passo a Passo para Execução

### a). Clonar o Repositório
Abra o seu terminal (Prompt de Comando, PowerShell ou Terminal do Linux/Mac) e execute o comando abaixo para clonar o projeto:
```bash
git clone [https://github.com/fabriciovieira-tech/NOME_DO_REPOSITORIO.git](https://github.com/fabriciovieira-tech/NOME_DO_REPOSITORIO.git)
````

 b). Acessar a Pasta do Projeto
Navegue para dentro do diretório que foi criado na sua máquina após a clonagem do repositório:
```bash
cd NOME_DO_REPOSITORIO
```

### 3. Instalar as Dependências
Execute o comando abaixo para instalar todas as bibliotecas necessárias que o código utiliza (como o `express`, `whatsapp-web.js` e o `nedb`):
```bash
npm install
```

### 4. Iniciar o Servidor
Com todas as dependências devidamente instaladas, inicialize a aplicação com o comando:
```bash
node index.js
```
Assim que o terminal exibir a mensagem 🖥️ Painel e API rodando em: http://localhost:3000, o sistema estará totalmente pronto para uso.