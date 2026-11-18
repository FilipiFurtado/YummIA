# YummIA

**Marketplace de restaurantes com assistente de compras baseado em inteligência artificial local.** \
**Este projeto ainda está em desenvolvimento, melhorias e correções ainda serão aplicadas.**

O **YummIA** é um projeto full-stack que reúne uma aplicação de delivery, gerenciamento de carrinho, checkout e um assistente conversacional capaz de pesquisar o catálogo, recomendar produtos e **preparar alterações no carrinho mediante confirmação explícita do usuário**.

A solução utiliza **Next.js**, **NestJS**, **PostgreSQL**, **Prisma** e **Ollama**, com o modelo **Qwen3 4B Instruct** para conversação e *tool calling*. A busca semântica utiliza embeddings locais do **EmbeddingGemma**.

> **Status:** projeto em desenvolvimento, voltado à demonstração e ao aprendizado de engenharia de software e aplicações com LLMs. Os restaurantes, produtos e preços do catálogo inicial são fictícios. Não há integração de pagamento real documentada nesta versão.

# Funcionalidades

### Marketplace

- Cadastro e autenticação de usuários com JWT.
- Navegação por restaurantes e seus respectivos cardápios.
- Produtos com variantes (como tamanho ou porção), preços e disponibilidade.
- Carrinho para visitantes e usuários autenticados, com possibilidade de associar o carrinho do visitante após o login.
- Inclusão, remoção, alteração de quantidades e esvaziamento do carrinho.
- **Carrinho reativo:** itens, subtotal e contador do cabeçalho são atualizados após alterações, sem recarregar a página.
- Endereços de entrega, cálculo de cotação e criação de pedidos.
- Histórico de pedidos e página de perfil.
- Interface responsiva.

### Assistente de IA

- Conversa em português com o **Qwen3 4B Instruct** executado localmente pelo Ollama.
- Consulta de restaurantes, produtos, variantes, preços e carrinho usando ferramentas (*tool calling*).
- Busca textual e busca semântica por descrição ou intenção, quando o índice de embeddings está configurado.
- Preparação de propostas para adicionar produtos, definir a quantidade final, remover unidades ou esvaziar o carrinho.
- **Confirmação obrigatória:** a IA prepara a proposta, mas a mudança só é efetivada pelo backend após o clique do usuário em **Confirmar**.
- Histórico de conversas armazenado no PostgreSQL.
- **Chat flutuante global**, minimizável, com atalho para a página `/assistant`.
- Sincronização do histórico entre o widget, a página do assistente e abas do mesmo navegador.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React |
| Backend | NestJS, TypeScript, API REST, Swagger |
| Banco de dados | PostgreSQL, Prisma ORM 7 |
| Autenticação | JWT, Argon2, cookies `HttpOnly` na integração web |
| Inteligência artificial | Ollama, Qwen3 4B Instruct, ferramentas estruturadas |
| Busca semântica | EmbeddingGemma, embeddings armazenados no PostgreSQL |
| Infraestrutura local | Docker Compose e Node.js |

## Arquitetura

```text
                       ┌─────────────────────────┐
                       │         Usuário         │
                       └────────────┬────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Next.js / React   │
                         │   localhost:3001     │
                         │  Site + chat + cart │
                         └──────────┬──────────┘
                                    │ BFF /api/*
                         ┌──────────▼──────────┐
                         │      NestJS API     │
                         │   localhost:3000     │
                         └───────┬─────┬───────┘
                                 │     │
                    ┌────────────▼─┐ ┌─▼────────────────────┐
                    │ Prisma ORM   │ │ Assistente / Tools   │
                    └──────┬───────┘ └─┬────────────────────┘
                           │           │
                    ┌──────▼───────┐ ┌─▼────────────────────┐
                    │ PostgreSQL   │ │ Ollama               │
                    │ localhost:   │ │ Qwen3 + EmbeddingGemma│
                    │ 5433*        │ │ localhost:11434      │
                    └──────────────┘ └──────────────────────┘
```

\* Porta PostgreSQL de desenvolvimento utilizada neste projeto; confira o mapeamento no seu `docker-compose.yml`.

O frontend usa rotas de API próprias (*Backend for Frontend*) para encaminhar requisições autenticadas ao NestJS. O backend consulta o banco de dados e executa as alterações; **o modelo de linguagem não acessa diretamente o PostgreSQL nem modifica o carrinho sem validação**.

## Estrutura do repositório

```text
YummIA/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   ├── seed.ts                 # Catálogo demonstrativo (reset opcional)
│   │   └── index-catalog.ts        # Indexação semântica
│   ├── src/
│   │   ├── assistant/              # Conversas, tools e propostas
│   │   ├── auth/                   # Autenticação e autorização
│   │   ├── cart/                   # Carrinho
│   │   ├── checkout/               # Cotação e pedidos
│   │   ├── restaurants/            # Restaurantes
│   │   ├── products/               # Produtos e variantes
│   │   ├── prisma/                 # Serviço Prisma
│   │   └── generated/prisma/       # Código gerado (não versionado)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Páginas e rotas BFF
│   │   ├── components/             # Interface, chat e carrinho
│   │   └── lib/                    # Clientes, utilitários e sincronização
│   ├── public/
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
└── README.md
```

> A estrutura representa os módulos principais. Algumas pastas e nomes podem variar conforme a organização local do projeto.

## Executando localmente

### Pré-requisitos

- **Node.js** e **npm** compatíveis com as versões de Next.js e NestJS do `package.json`.
- **Docker** com suporte ao Docker Compose.
- **Ollama** instalado e acessível localmente.
- Git (opcional, para clonar o repositório).

Os comandos abaixo foram escritos para **PowerShell no Windows**. Utilize terminais separados para os processos de longa duração.

### 1. Obter o projeto

```powershell
git clone https://github.com/FilipiFurtado/YummIA.git
cd YummIA
```

### 2. Iniciar o PostgreSQL

Na raiz do projeto, onde estiver o arquivo `docker-compose.yml`:

```powershell
docker compose up -d
```

Confira o contêiner e as credenciais definidas no `docker-compose.yml`. No ambiente de desenvolvimento utilizado, a conexão externa do PostgreSQL está na porta **5433**.

### 3. Instalar e configurar o backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Se não houver `.env.example`, crie `backend/.env` manualmente a partir das variáveis utilizadas na aplicação. Exemplo **sem credenciais reais**:

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5433/NOME_BANCO?schema=public"
JWT_SECRET="SUBSTITUA_POR_UM_SEGREDO_FORTE"
OLLAMA_HOST="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen3:4b-instruct"
OLLAMA_EMBED_MODEL="embeddinggemma"
PORT=3000
```

Ajuste `DATABASE_URL`, o segredo JWT e quaisquer outras variáveis exigidas pela configuração local.

Gere o Prisma Client e aplique as migrations existentes:

```powershell
npx prisma generate
npx prisma migrate dev
```

> Não utilize `prisma migrate reset` em bancos com dados que deseja preservar.

### 4. Configurar os modelos no Ollama

Com o Ollama instalado, baixe os modelos:

```powershell
ollama pull qwen3:4b-instruct
ollama pull embeddinggemma
ollama list
```

Se o servidor Ollama não estiver ativo, inicie-o em outro terminal:

```powershell
ollama serve
```

Em instalações nas quais o Ollama já inicia automaticamente, não é necessário executar `ollama serve` novamente.

### 5. Criar o catálogo demonstrativo (opcional)

O projeto inclui um seed com **três restaurantes, 36 produtos e 84 variantes**.

> **Atenção:** `prisma/seed.ts` é um script de **substituição de dados demonstrativos**, não uma carga incremental. Ele remove dados relacionados ao catálogo anterior, carrinhos e conversas/propostas da IA. Faça backup antes de executar e **não o utilize em produção**.

Somente em um banco de desenvolvimento que pode ser limpo:

```powershell
$env:YUMMIA_RESET_DEMO = 'SIM'
npx tsx .\prisma\seed.ts
Remove-Item Env:YUMMIA_RESET_DEMO
```

Se existirem pedidos cadastrados, o script interrompe a execução. A exclusão de pedidos demanda autorização explícita adicional (`YUMMIA_APAGAR_PEDIDOS=SIM`) e deve ser usada **apenas para pedidos de teste**. Usuários e endereços são preservados pelo seed preparado para este projeto.

### 6. Indexar o catálogo para busca semântica (opcional)

Com PostgreSQL, Ollama e o modelo `embeddinggemma` disponíveis:

```powershell
npx tsx .\prisma\index-catalog.ts
```

Reexecute a indexação após mudanças relevantes nos produtos ou no catálogo. Os embeddings são armazenados no PostgreSQL; **a implementação atual não exige pgvector**. Sem a indexação concluída, as buscas tradicionais podem funcionar, mas as recomendações semânticas não estarão completas.

### 7. Iniciar o backend

Na pasta `backend`:

```powershell
npm run start:dev
```

**API:** http://localhost:3000  
**Swagger:** http://localhost:3000/api/docs

### 8. Instalar e iniciar o frontend

Em outro terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
```

Se o arquivo `frontend/.env.example` ainda não existir, crie `frontend/.env.local` manualmente.

Confira o conteúdo de `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://127.0.0.1:3000
APP_ORIGIN=http://localhost:3001
```

Depois:

```powershell
npm run dev -- -p 3001
```

**Aplicação:** http://localhost:3001

> No Next.js o comando de desenvolvimento é `npm run dev`; `npm run start:dev` é o script utilizado pelo backend NestJS.

## Catálogo inicial

| Restaurante | Categoria | Produtos | Variantes |
| --- | --- | ---: | ---: |
| **Forno da Vila** | Pizzaria | 10 | 29 |
| **Ponto do Hambúrguer** | Lanchonete | 12 | 26 |
| **Panela da Vó** | Comida caseira | 14 | 29 |
| **Total** | | **36** | **84** |

O catálogo de testes inclui pizzas com diferentes tamanhos, hambúrgueres e acompanhamentos, refeições caseiras, bebidas e sobremesas. Os preços e a disponibilidade vêm do banco de dados.

## Exemplos de uso do assistente

**Consulta ao catálogo**

> Quais restaurantes estão disponíveis?  
> Quais pizzas grandes custam até R$ 50?

**Busca por intenção**

> Quero uma refeição caseira com carne.  
> Estou procurando um lanche com bacon e queijo.

**Proposta de compra**

> Adicione duas pizzas grandes de calabresa e uma média de muçarela ao carrinho.

**Ajustes do carrinho**

> Quero ficar com três pizzas grandes no total.  
> Remova uma pizza do carrinho.  
> Esvazie o carrinho.

O assistente deve consultar os dados reais e preparar uma proposta. **Nenhuma alteração é aplicada antes da confirmação na interface.** O carrinho e seu subtotal são atualizados após a confirmação bem-sucedida.

## Páginas disponíveis

| Página | Rota |
| --- | --- |
| Início | `/` |
| Restaurantes | `/restaurants` |
| Cardápio | `/restaurants/[id]` |
| Carrinho | `/cart` |
| Checkout | `/checkout` |
| Pedidos | `/orders` |
| Assistente | `/assistant` |
| Login | `/login` |
| Cadastro | `/register` |
| Perfil | `/profile` |

Na navegação superior, as opções **Entrar/Cadastrar** são substituídas pelo acesso ao **Perfil** após a autenticação.

## Principais endpoints do backend

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/restaurants` | Listar restaurantes |
| `GET` | `/products` | Consultar produtos |
| `POST` | `/auth/register` | Cadastrar usuário |
| `POST` | `/auth/login` | Autenticar usuário |
| `GET` | `/cart/me` | Consultar carrinho autenticado |
| `POST` | `/checkout/quote` | Calcular cotação |
| `POST` | `/orders` | Criar pedido com chave de idempotência |
| `GET` | `/orders` | Histórico de pedidos |
| `POST` | `/assistant/chat` | Enviar mensagem ao assistente |
| `GET` | `/assistant/conversations/:id` | Recuperar conversa |
| `POST` | `/assistant/proposals/:id/confirm` | Confirmar proposta |

As rotas autenticadas exigem JWT. No navegador, o frontend encaminha as requisições pelas rotas próprias `/api/*`. Consulte o **Swagger** para conferir o contrato completo dos endpoints disponíveis na versão instalada.

## Segurança e integridade

- Senhas protegidas com **Argon2**.
- Rotas autenticadas com **JWT** e validação de permissões no NestJS.
- Sessão web armazenada em cookie `HttpOnly`, com encaminhamento pelo BFF.
- Consultas e ações da IA limitadas a ferramentas definidas pelo backend.
- Propostas de carrinho armazenadas no banco e associadas ao usuário autenticado.
- Revalidação de preços, disponibilidade e quantidades durante a confirmação.
- Checkout com cotação e mecanismo de **idempotência** na criação de pedidos.
- Variáveis de ambiente e chaves privadas devem permanecer fora do repositório Git.

> **Limites atuais:** a recomendação semântica indica produtos relacionados, mas não certifica composição nutricional, alergênicos ou restrições alimentares sem dados explícitos. O projeto ainda precisa de testes de integração, revisão de segurança e infraestrutura de produção antes de atender clientes reais.

## Verificações úteis

Na pasta `backend`:

```powershell
npx prisma validate
npx prisma generate
npx tsc --noEmit
```

Na pasta `frontend`:

```powershell
npx tsc --noEmit
```

Teste manualmente a navegação, autenticação, criação de propostas, confirmação, atualização do carrinho, checkout e sincronização do chat flutuante com a página `/assistant`.
