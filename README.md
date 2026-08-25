# Order Events System

Projeto de portfólio demonstrando arquitetura de backend orientada a eventos:
três microsserviços independentes em Node.js/TypeScript que se comunicam de
forma assíncrona via RabbitMQ, cada um com seu próprio banco PostgreSQL,
totalmente containerizados, testados e com pipeline de CI.

## Por que esse projeto existe

Construído para demonstrar habilidades de backend que não aparecem no dia a
dia de trabalho com SaaS multi-tenant: arquitetura orientada a eventos,
containerização, testes automatizados e CI/CD — a diferença entre "sabe
escrever uma API" e "sabe entregar algo pronto pra produção".

## Arquitetura

```
                     ┌──────────────────┐
        HTTP ───────▶│  orders-service   │
                     │  (Postgres próprio)│
                     └─────────┬─────────┘
                               │ publica: order.created
                               │ consome: inventory.reserved / rejected
                               ▼
                     ┌──────────────────┐
                     │     RabbitMQ      │
                     │ (exchange topic   │
                     │  order_events)    │
                     └───┬──────────┬────┘
                         │          │
          consome:       │          │      consome:
          order.created  │          │      inventory.reserved/rejected
                         ▼          ▼
            ┌──────────────────┐  ┌───────────────────────┐
            │ inventory-service │  │ notifications-service  │
            │  (Postgres próprio)│  │  (Postgres próprio)    │
            └──────────────────┘  └───────────────────────┘
```

Cada serviço é implantável de forma independente, tem seu próprio banco de
dados e nunca se comunica diretamente com outro serviço — toda a coordenação
acontece através de eventos no RabbitMQ.

## Regras de arquitetura

- **Sem imports entre serviços.** `orders-service`, `inventory-service` e
  `notifications-service` são totalmente independentes.
- **Sem acesso a banco entre serviços.** Cada serviço é dono do seu próprio
  Postgres.
- **Toda comunicação entre serviços passa pelo RabbitMQ**, em um exchange do
  tipo topic (`order_events`), com routing keys `order.created`,
  `inventory.reserved` e `inventory.rejected`.
- **Formato fixo de mensagem:**
  `{ orderId: string, type: string, payload: object, occurredAt: string }`
  (timestamp ISO 8601).
- **Toda entrada HTTP é validada com `zod`**, retornando 400 em caso de dado
  inválido.
- **Falha no processamento de mensagem é descartada sem reenvio (nack sem
  requeue)** — log e descarte, sem fila de retry/dead-letter nesta versão.

## Rodando localmente

```bash
docker compose up --build
```

Isso sobe o RabbitMQ (painel de gerência em http://localhost:15672,
usuário/senha `guest`/`guest`), os 3 bancos Postgres e os 3 serviços.

| Serviço                 | Porta |
|--------------------------|------|
| orders-service           | 3001 |
| inventory-service         | 3002 |
| notifications-service     | 3003 |

### Testando o fluxo completo

```bash
# Cadastra um produto
curl -X POST http://localhost:3002/products \
  -H "Content-Type: application/json" \
  -d '{"id":"p1","name":"Widget","stock":10}'

# Cria um pedido
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"p1","quantity":2}]}'
# → copie o "id" retornado

# Confere o status do pedido (deve virar "confirmed" em ~1s)
curl http://localhost:3001/orders/<id>

# Confere o histórico de notificações desse pedido
curl http://localhost:3003/notifications/<id>
```

## Rodando os testes

Cada serviço tem sua própria suíte de testes:

```bash
cd services/orders-service   # ou inventory-service / notifications-service
npm install
npm test
```

O CI roda isso automaticamente para os 3 serviços em cada push/PR — veja
`.github/workflows/ci.yml`.

## Stack

Node.js 20, TypeScript, Express, PostgreSQL (`pg`), RabbitMQ (`amqplib`),
`zod` para validação de entrada, Jest + Supertest para testes, Docker Compose
para orquestração local, GitHub Actions para CI.

## Limitações conhecidas (cortes de escopo intencionais)

- Sem deploy em nuvem — apenas Docker Compose local.
- Sem fila de dead-letter / política de retry — mensagens que falham no
  processamento são logadas e descartadas (`nack` sem requeue), sem
  reprocessamento.
- Sem autenticação entre serviços ou nas APIs HTTP.

Esses cortes foram decisões deliberadas para manter o escopo focado na
arquitetura orientada a eventos, que é o objetivo central do projeto.
