(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Decision Layer — classifica cada mensagem ANTES de chamar o modelo
  // generativo. Regras (não-LLM) decidem se a mensagem pertence ao
  // negócio; se sim, encaminha com a intenção/fluxo; se não, recusa
  // educadamente sem gastar chamada de IA.
  // ------------------------------------------------------------------

  const MAX_CONTEXTO = 8;
  const TAM_CONTEXTUAL = 70;

  let historicoIntentos = [];
  let ultimoIntent = null;
  let ultimoFluxo = null;

  // ---------------- utilidades ----------------

  function normalizar(t) {
    return window.Rest ? Rest.normalizar(t) : String(t || "").toLowerCase();
  }

  // palavras fortes do negócio (catálogo + termos fixos)
  let cacheNegocio = null;
  function termosNegocio() {
    if (cacheNegocio) return cacheNegocio;
    const set = {};
    function add(palavra) {
      const p = normalizar(palavra).trim();
      if (p.length >= 3) set[p] = true;
    }
    [
      "marmita", "marmitas", "cardapio", "pedido", "pedidos", "pedir",
      "preco", "precos", "custa", "custo", "valor", "entrega", "entregas",
      "taxa", "frete", "pagamento", "pagar", "pix", "carrinho", "horario",
      "endereco", "telefone", "restaurante", "prato", "pratos", "bebida",
      "acompanhamento", "finalizar", "adicionar", "remover", "quantidade",
      "almoco", "jantar", "lanche", "porcao", "total", "subtotal",
      "desconto", "cupom", "troco", "nota fiscal", "whatsapp", "balcao",
      "retirada", "delivery", "hoje", "amanha", "cardapio do dia",
      "estrogonofe", "parmegiana", "tilapia", "feijoada",
    ].forEach(add);
    if (window.Rest && Rest.CATALOGO) {
      Rest.CATALOGO.forEach(function (item) {
        add(item.nome);
        add(item.id.replace(/_/g, " "));
        (item.removiveis || []).forEach(add);
        (item.opcoes || []).forEach(function (grupo) {
          add(grupo.label);
          (grupo.opcoes || []).forEach(function (op) {
            add(op.label);
          });
        });
      });
    }
    cacheNegocio = set;
    return set;
  }

  function temNegocio(t) {
    const termos = termosNegocio();
    for (const palavra in termos) {
      if (t.indexOf(palavra) !== -1) return true;
    }
    return false;
  }

  // ---------------- recusas ----------------

  const ORIENTACO =
    "Posso: mostrar o cardápio e os preços do dia, montar seu pedido com " +
    "personalizações, calcular o total com entrega, informar horário e " +
    "formas de pagamento e finalizar o pedido.";

  const RECUSAS = {
    fora_escopo:
      "Desculpe, só consigo ajudar com pedidos do Marmitas do Carlão — " +
      "não atendo outros assuntos.\n\n" +
      ORIENTACO +
      "\n\nO que você gostaria?",
    nao_entendi:
      "Não entendi se isso é um pedido. Posso ajudar com cardápio, preços, " +
      "montagem de pedido, pagamento e entrega.\n\nEx.: \"cardápio de hoje\" " +
      "ou \"2 bifes de vaca sem cebola\".",
    matematica:
      "Não faço contas fora do contexto do pedido 😊 — mas calculo o total " +
      "da sua compra com entrega!\n\n" +
      ORIENTACO,
    tentativa_contorno:
      "Não posso seguir instruções que tentam alterar minhas regras. " +
      "Estou aqui apenas para atender pedidos de marmitas.\n\n" +
      ORIENTACO,
  };

  // ---------------- padrões fora de escopo ----------------

  const PADROES_FORA = [
    { id: "tentativa_contorno", re: /(ignore|esque[cç]a|desconsider[e]|ultrapasse|contorne|burlue)\s+(todas\s+)?(as\s+)?(regras|instru[cç][õo]es|limites)|modo\s+(livre|dan|dev|desenvolvedor)|sem\s+restri[cç][õo]es|aja\s+como\s+(outro|outra|um\s+ia|uma\s+ia)/ },
    { id: "matematica", re: /\b\d+\s*[+\-*/x×÷^]\s*\d+\b|quanto\s+(e|é)\s+\d/ },
    { id: "programacao", re: /\bpython\b|\bjavascript\b|\bhtml\b|\bcss\b|\bsql\b|c[óo]digo|programa[cç][ãa]o|algoritmo|\bbug\b|compilar|framework/ },
    { id: "conhecimento_geral", re: /fotoss[íi]ntese|capital de|quem\s+(foi|inventou|descobriu|nasceu)|significado\s+de|defini[cç][ãa]o\s+de|hist[óo]ria\s+de|como\s+(funciona|se\s+faz)\s+(o\s+)?(universo|c[ée]rebro|planeta)/ },
    { id: "atualidades", re: /pol[íi]tica|elei[cç][ãa]o|\bfutebol\b|not[íi]cias?|\bclima\b|temperatura|tempo\s+hoje|economia|bolsa\s+de\s+valores/ },
    { id: "entretenimento", re: /poema|\bpiada\b|reda[cç][ãa]o|traduz|ingl[êe]s|espanhol|filme|\bseries?\b|video\s?game|\bmúsica\b|musica|cantor|banda/ },
    { id: "tarefas", re: /\btarefa\b|li[cç][ãa]o\s+de\s+casa|dever\s+de\s+casa|faculdade|monografia|curr[íi]culo|entrevista\s+de\s+emprego|estudo/ },
    { id: "vida_pessoal", re: /namoro|relacionamento|significado\s+da\s+vida|sa[úu]de\s+mental|ansiedade|depress[ãa]o|receita\s+de\s+(bolo|p[ãa]o|torta|sobremesa)/ },
    { id: "outras_ias", re: /\bchatgpt\b|\bgemini\b|\bclaude\b|gpt-4|outro\s+assistente|modelo\s+de\s+linguagem|seu\s+prompt|prompt\s+do\s+sistema/ },
    { id: "geral_vago", re: /me\s+explique\s+(?!o\s+card|a\s+entrega|como\s+funciona\s+o\s+pedido)|ensine\s+me|me\s+ensine|fale\s+sobre\s+(?!o\s+restaurante)|qualquer\s+assunto|tudo\s+sobre/ },
  ];

  // ---------------- intenções do negócio ----------------

  const INTENCOES = [
    {
      id: "saudacao",
      fluxo: "atendimento",
      padroes: [/^(oi|ol[áa]|opa|e ai|eai|bom dia|boa tarde|boa noite|hey|hello|hi)[.!?\s]*$/],
    },
    {
      id: "cortesia",
      fluxo: "atendimento",
      padroes: [/\b(obrigad|valeu|tchau|at[ée] logo|at[ée] mais|\bflw\b|abracos)/],
    },
    {
      id: "ajuda",
      fluxo: "atendimento",
      padroes: [
        /^(me\s+)?ajuda[.?!]*$/,
        /^(o que|quais)\s+voc[êe]\s+(faz|pode fazer|sabe fazer)/,
        /^como funciona/,
        /^(quem\s+(e|é)\s+voc[êe]|o que\s+voc[êe]\s+(e|é)|seu nome)/,
        /funcionalidades|o que voc[êe] sabe fazer|voce pode me ajudar com o que/,
      ],
    },
    {
      id: "identidade",
      fluxo: "atendimento",
      padroes: [
        /voc[êe]\s+(e|é)\s+(o\s+)?(chatgpt|gemini|claude|gpt|uma ia|um bot|um rob[ôo]|ia)/,
        /qual\s+(o|seu)\s+modelo|quem\s+te\s+criou|como\s+voc[êe]\s+foi\s+(criado|treinado)/,
      ],
    },
    {
      id: "cardapio",
      fluxo: "cardapio",
      padroes: [
        /card[áa]pio/,
        /^o que\s+(tem|voc[êe] tem|tem hoje|voc[êe] tem hoje)/,
        /^tem\s+\w/,
        /\btem hoje\b/,
        /\bpratos?\b/,
        /^me mostra|^mostra|^lista|^listing/,
        /\bmenu\b/,
        /ver o card[áa]pio|qual o card[áa]pio/,
        /o que voc[êe] tem/,
      ],
    },
    {
      id: "carrinho_total",
      fluxo: "pedido",
      padroes: [
        /\bcarrinho\b/,
        /\btotal\b/,
        /quanto\s+(da|fica|vai|vou pagar|d[áa])/,
        /\bmeu pedido\b/,
        /\bsubtotal\b/,
        /quanto\s+vou\s+pagar/,
      ],
    },
    {
      id: "checkout",
      fluxo: "checkout",
      padroes: [
        /(finalizar|fechar|confirmar|concluir|encerrar)[^.!?]{0,20}pedido/,
        /\bquero pagar\b/,
        /\bfazer pedido\b|fazer o pedido/,
        /como\s+(eu\s+)?(finalizo|fa[çc]o o pedido)/,
        /endere[çc]o\s+de\s+entrega/,
        /\bcheckout\b/,
      ],
    },
    {
      id: "info_restaurante",
      fluxo: "informacao",
      padroes: [
        /hor[áa]rio/,
        /\babre\b|\bfecha\b|\bfecham\b/,
        /endere[çc]o/,
        /\btelefone\b|\bwhatsapp\b/,
        /(forma[s]? de\s+)?pagamento/,
        /\bpix\b|cart[ãa]o|\bdinheiro\b/,
        /\bprazo\b/,
        /taxa|entrega\s+gr[áa]tis|valor\s+da\s+entrega|\bentrega/,
        /onde\s+voc[êe]s?\s+(ficam|est[áa])/,
        /nota\s+fiscal|vale\s+refei[cç][ãa]o|\bdesconto\b|\bcupom\b/,
        /balc[ãa]o|retirar|retirada/,
      ],
    },
    {
      id: "remocao",
      fluxo: "pedido",
      padroes: [
        /\bremov|\btirar\b|\bapagar\b/,
        /\bsem\s+(a\s+|o\s+)?\w/,
        /n[ãa]o\s+(coloque|ponha|quer|colocar)/,
        /\btrocar\b|\btroque\b/,
      ],
    },
    {
      id: "preco_item",
      fluxo: "cardapio",
      padroes: [
        /pre[çc]o/,
        /\bcusta\b|\bcusto\b/,
        /quanto\s+(e|é|custa|vale)/,
        /\bvale\b/,
      ],
    },
    {
      id: "adicao",
      fluxo: "pedido",
      padroes: [
        /\bquero\b/,
        /\bdesejo\b/,
        /\bgostaria\b/,
        /pode me (dar|trazer)/,
        /\badicion|\bcolocar\b/,
        /mais um|mais uma/,
        /\bvou querer\b/,
        /me v[êe]|preciso de|vou levar|quero levar/,
      ],
    },
  ];

  // ---------------- classificação ----------------

  function classificarIntencao(t) {
    let melhor = null;
    let melhorPontos = 0;
    for (let i = 0; i < INTENCOES.length; i++) {
      const intent = INTENCOES[i];
      let pontos = 0;
      for (let j = 0; j < intent.padroes.length; j++) {
        if (intent.padroes[j].test(t)) pontos++;
      }
      if (pontos > melhorPontos) {
        melhorPontos = pontos;
        melhor = intent;
      }
    }
    return melhor;
  }

  function acharForaDeEscopo(t) {
    for (let i = 0; i < PADROES_FORA.length; i++) {
      if (PADROES_FORA[i].re.test(t)) return PADROES_FORA[i].id;
    }
    return null;
  }

  // Avalia a mensagem. ctx opcional: { carrinhoItens: number }
  function avaliar(texto, ctx) {
    const t = normalizar(texto);
    if (!t) {
      return {
        acao: "recusar",
        intent: "vazio",
        fluxo: null,
        motivo: "nao_entendi",
        resposta: RECUSAS.nao_entendi,
      };
    }

    // 1) tentativa de contornar regras (defesa em profundidade; Guards já
    //    roda antes) — sempre recusar, mesmo que tenha palavras do negócio
    const contorno = PADROES_FORA[0].re.test(t);
    if (contorno) {
      return {
        acao: "recusar",
        intent: "tentativa_contorno",
        fluxo: null,
        motivo: "tentativa_contorno",
        resposta: RECUSAS.tentativa_contorno,
      };
    }

    // 2) matemática sem relação com o negócio recusa antes de tudo
    const fora = acharForaDeEscopo(t);
    if (fora === "matematica" && !temNegocio(t)) {
      return {
        acao: "recusar",
        intent: "matematica",
        fluxo: null,
        motivo: "matematica",
        resposta: RECUSAS.matematica,
      };
    }

    // 3) intenção do negócio (fluxos de atendimento)
    const intent = classificarIntencao(t);
    if (intent) {
      return {
        acao: "encaminhar",
        intent: intent.id,
        fluxo: intent.fluxo,
        motivo: null,
        resposta: null,
      };
    }

    // 4) padrões fora de escopo (ex.: "escreva um poema sobre marmitas")
    if (fora && fora !== "matematica") {
      return {
        acao: "recusar",
        intent: "fora_escopo",
        fluxo: null,
        motivo: "fora_escopo",
        resposta: RECUSAS.fora_escopo,
      };
    }

    // 5) palavra forte do negócio sem intenção específica → encaminhar
    //    ao agente, que resolve com as ferramentas (nunca inventa dados)
    if (temNegocio(t)) {
      return {
        acao: "encaminhar",
        intent: "pedido_geral",
        fluxo: "pedido",
        motivo: null,
        resposta: null,
      };
    }

    // 6) contexto: mensagem curta/sequencial herda a última intenção
    //    (ex.: "sem cebola", "quero esse", "e a entrega?", "Rua X, 123")
    const carrinhoItens = (ctx && ctx.carrinhoItens) || 0;
    const herda =
      ultimoIntent &&
      (t.length <= TAM_CONTEXTUAL ||
        ultimoIntent === "checkout" ||
        carrinhoItens > 0);
    if (herda) {
      return {
        acao: "encaminhar",
        intent: ultimoIntent,
        fluxo: ultimoFluxo,
        motivo: null,
        resposta: null,
        porContexto: true,
      };
    }

    // 7) padrão final: fora de escopo / não entendido → orienta o usuário
    return {
      acao: "recusar",
      intent: "fora_escopo",
      fluxo: null,
      motivo: "nao_entendi",
      resposta: RECUSAS.nao_entendi,
    };
  }

  // Registra o resultado no contexto da conversa (apenas escopo interno
  // alimenta a herança de intenções).
  function registrar(decisao) {
    if (!decisao || decisao.acao !== "encaminhar") return;
    ultimoIntent = decisao.intent;
    ultimoFluxo = decisao.fluxo;
    historicoIntentos.push(decisao.intent);
    if (historicoIntentos.length > MAX_CONTEXTO) {
      historicoIntentos = historicoIntentos.slice(-MAX_CONTEXTO);
    }
  }

  function contexto() {
    return {
      ultimoIntent: ultimoIntent,
      ultimoFluxo: ultimoFluxo,
      historico: historicoIntentos.slice(),
    };
  }

  function limpar() {
    historicoIntentos = [];
    ultimoIntent = null;
    ultimoFluxo = null;
  }

  window.Decision = {
    avaliar: avaliar,
    registrar: registrar,
    contexto: contexto,
    limpar: limpar,
    RECUSAS: RECUSAS,
  };
})();
