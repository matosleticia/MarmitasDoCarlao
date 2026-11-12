# Marmitas do Carlão — Chat de Vendas

Chatbot de atendimento e vendas para o restaurante **Marmitas do Carlão**. O cliente conversa em linguagem natural ("2 bifes de vaca sem cebola, ponto mal passado"), o bot monta o pedido no carrinho, calcula o total com entrega e finaliza com endereço e pagamento.

Aplicação **100% client-side**: sem servidor, sem build, sem dependências. Cardápio, carrinho e guardrails rodam no navegador; a IA é chamada direto do dispositivo para o provedor escolhido.

## Como executar

Basta abrir o `index.html` no navegador (duplo clique). Tudo funciona via `file://`.

Para evitar qualquer restrição de CORS na chamada à API de IA, pode-se servir localmente:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Modos de IA (botão "Configurações")

| Modo | Descrição | Requisitos |
|---|---|---|
| **Regras** (padrão) | Interpretação por regras/regex, offline, sem IA | Nenhum |
| **API OpenAI-compatível** | Chamada `fetch` direto do navegador com tool calling | Chave de API + internet |
| **WebLLM** | Modelo local rodando no navegador | WebGPU (Chrome/Edge atualizado), download de ~1–5 GB |

Presets de API: OpenAI, Groq, OpenRouter, DeepSeek ou endpoint personalizado (base URL + modelo + temperatura).

A chave de API fica **apenas no `localStorage`** deste navegador — não há servidor nesta aplicação.

## Funcionalidades

- **Chat de vendas** com chips de atalho e indicador de digitação
- **Agent com tool calling** (`js/agent.js`): `obter_cardapio`, `obter_item`, `adicionar_ao_carrinho`, `remover_do_carrinho`, `obter_carrinho`, `finalizar_pedido` — preços e disponibilidade sempre calculados pelo sistema, nunca pela IA
- **Cardápio por dia da semana** com itens, preços, opções (tamanho, ponto, extras) e ingredientes removíveis
- **Carrinho** persistente com subtotal, taxa de entrega (grátis acima de R$ 70) e total
- **Checkout** com endereço, forma de pagamento e telefone → gera protocolo `PED-xxxxxx-xx` (pedido é **simulação de venda**)
- **Guardrails** (`js/guards.js`): sanitização de entrada/saída, detecção de jailbreak e injeção, limites de tamanho e rate limit
- **Fallback por regras** (`js/fallback.js`): se a IA falhar ou no modo regras, um interpretador local responde pedidos, cardápio, totais e finalização

## Estrutura

```
index.html      Layout: chat, painel do pedido, modais (config/checkout)
style.css       Estilos e responsividade
js/menu.js      Rest — restaurante, cardápio (CATALOGO), dias, formatação BRL
js/cart.js      Cart — linhas do carrinho, cálculo de preços e totais (localStorage)
js/guards.js    Guards — sanitização, anti-jailbreak/anti-injeção, validações
js/llm.js       LLM — presets, config salva, chat OpenAI-compatível e WebLLM
js/fallback.js  Fallback — interpretador offline por regras
js/agent.js     Agent — prompt de sistema, tools, loop de execução (máx. 6 passos)
js/app.js       UI — mensagens, carrinho, modais, chips, fluxo de checkout
```

Ordem de carregamento dos scripts importa (`index.html:198-205`): cada módulo expõe uma global (`window.Rest`, `window.Cart`, `window.Guards`, `window.LLM`, `window.Fallback`, `window.Agent`).

## Chaves de `localStorage`

- `marmitas_cart_v1` — carrinho
- `marmitas_llm_cfg_v1` — configuração do provedor de IA (inclui chave)

## Segurança

- Nenhuma requisição para servidor próprio — tudo acontece no navegador
- Mensagens do usuário são sanitizadas antes de chegar à IA; respostas são filtradas na saída
- Instruções de sistema (prompt do atendente) tentam ser protegidas contra extração e jailbreak
- A chave de API é responsabilidade do usuário: use chaves de baixo risco/restritas ao navegador
