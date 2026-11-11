(function () {
  "use strict";

  const ALIAS = [
    { id: "feijoada", termos: ["feijoada"] },
    { id: "bife_vaca", termos: ["bife", "bife de vaca", "acém"] },
    { id: "frango_grelhado", termos: ["frango grelhado", "frango"] },
    { id: "parmegiana", termos: ["parmegiana", "parmegiana"] },
    { id: "carne_suina", termos: ["carne suina", "suina", "porco"] },
    { id: "tilapia", termos: ["tilapia", "tilápia", "peixe"] },
    { id: "lasanha", termos: ["lasanha"] },
    { id: "strogonoff", termos: ["strogonoff", "estrogonofe"] },
    { id: "vegetariana", termos: ["vegetariana", "vegana", "veggie"] },
    { id: "arroz", termos: ["arroz"] },
    { id: "feijao", termos: ["feijao", "feijão"] },
    { id: "batata_frita", termos: ["batata frita", "batata"] },
    { id: "farofa", termos: ["farofa"] },
    { id: "couve", termos: ["couve"] },
    { id: "salada", termos: ["salada"] },
    { id: "agua", termos: ["agua", "água"] },
    { id: "suco", termos: ["suco"] },
    { id: "refri", termos: ["refri", "refrigerante", "coca", "guarana"] },
    { id: "cerveja", termos: ["cerveja", "long neck"] },
  ];

  function acharItem(texto) {
    const t = Rest.normalizar(texto);
    for (let i = 0; i < ALIAS.length; i++) {
      for (let j = 0; j < ALIAS[i].termos.length; j++) {
        const termo = Rest.normalizar(ALIAS[i].termos[j]);
        if (t.indexOf(termo) !== -1) {
          const item = Rest.ITENS[ALIAS[i].id];
          if (item) return item;
        }
      }
    }
    return null;
  }

  function acharQuantidade(texto) {
    const t = Rest.normalizar(texto);
    const porExtenso = {
      uma: 1,
      um: 1,
      duas: 2,
      dois: 2,
      tres: 3,
      quatro: 4,
      cinco: 5,
    };
    const mNum = t.match(/(\d{1,2})\s*(x\b)?/);
    if (mNum) {
      const n = parseInt(mNum[1], 10);
      if (n >= 1 && n <= 30) return n;
    }
    for (const p in porExtenso) {
      if (new RegExp("\\b" + p + "\\b").test(t)) return porExtenso[p];
    }
    return 1;
  }

  function listarCardapio(dia) {
    const d = dia == null ? Rest.hoje() : dia;
    const itens = Rest.itensDoDia(d);
    const linhas = itens.map(function (i) {
      return "• " + i.nome + " — " + Rest.brl(i.preco);
    });
    return (
      "Cardápio de " +
      Rest.DIAS[d].toUpperCase() +
      " (" +
      Rest.RESTAURANTE.nome +
      "):\n\n" +
      linhas.join("\n") +
      "\n\nTaxa de entrega: " +
      Rest.brl(Rest.RESTAURANTE.taxaEntrega) +
      " (grátis acima de " +
      Rest.brl(Rest.RESTAURANTE.entregaGratisAcima) +
      ").\nPersonalizações (ponto, tempero, remover cebola etc.) funcionam no modo completo do chat."
    );
  }

  function resumoCarrinho() {
    const r = Cart.resumo();
    if (!r.itens.length) return "Seu carrinho está vazio. Peça algo do cardápio!";
    const linhas = r.itens.map(function (l) {
      const det = l.detalhes.length ? " (" + l.detalhes.join(", ") + ")" : "";
      return "• " + l.quantidade + "x " + l.nome + det + " — " + Rest.brl(l.total);
    });
    return (
      "Seu pedido:\n" +
      linhas.join("\n") +
      "\n\nSubtotal: " +
      Rest.brl(r.subtotal) +
      "\nEntrega: " +
      (r.entregaGratis ? "grátis" : Rest.brl(r.taxaEntrega)) +
      "\nTOTAL COM ENTREGA: " +
      Rest.brl(r.total)
    );
  }

  function processarAdicao(texto) {
    const item = acharItem(texto);
    if (!item) return null;
    if (!Rest.disponivelHoje(item)) {
      return (
        "O item " +
        item.nome +
        " não está disponível hoje. Disponível em: " +
        item.dias
          .map(function (d) {
            return Rest.DIAS[d];
          })
          .join(", ") +
        "."
      );
    }
    const qtd = acharQuantidade(texto);
    const t = Rest.normalizar(texto);

    const remover = item.removiveis.filter(function (r) {
      const rn = Rest.normalizar(r);
      return (
        new RegExp("\\bsem\\s+" + rn).test(t) ||
        new RegExp("remov(er|a)\\w*\\s+(o\\s+)?" + rn).test(t)
      );
    });

    const opcoes = {};
    const mPonto = t.match(
      /ponto\s+(mal\s+passad\w+|ao\s+ponto|bem\s+passad\w+|ao\s+ponto)/
    );
    if (mPonto && item.opcoes.some(function (g) { return g.id === "ponto"; })) {
      const p = mPonto[1];
      let id = "ao_ponto";
      if (p.indexOf("mal") !== -1) id = "mal_passado";
      else if (p.indexOf("bem") !== -1) id = "bem_passado";
      opcoes.ponto = id;
    }

    const linha = Cart.adicionar(item, qtd, opcoes, remover, "");
    const det = linha.detalhes.length ? " (" + linha.detalhes.join(", ") + ")" : "";
    const r = Cart.resumo();
    return (
      "Adicionei " +
      linha.quantidade +
      "x " +
      linha.nome +
      det +
      " — " +
      Rest.brl(linha.total) +
      "\n\n" +
      resumoCarrinho()
    );
  }

  function processarRemocao(texto) {
    const t = Rest.normalizar(texto);
    if (t.indexOf("remover") === -1 && t.indexOf("tirar") === -1 && t.indexOf("apagar") === -1) {
      return null;
    }
    if (t.indexOf("carrinho") !== -1 && (t.indexOf("tudo") !== -1 || t.indexOf("limpar") !== -1 || t.indexOf("esvaziar") !== -1)) {
      Cart.limpar();
      return "Carrinho esvaziado.";
    }
    const item = acharItem(texto);
    if (!item) {
      const r = Cart.resumo();
      if (!r.itens.length) return "O carrinho já está vazio.";
      // remove a última linha
      const ultima = r.itens[r.itens.length - 1];
      Cart.removerPorId(ultima.linha_id);
      return "Removi " + ultima.nome + " do carrinho.\n\n" + resumoCarrinho();
    }
    const alvo = Cart.linhas.find(function (l) {
      return l.item_id === item.id;
    });
    if (!alvo) return "Não encontrei " + item.nome + " no carrinho.";
    Cart.removerPorId(alvo.linha_id);
    return "Removi " + alvo.nome + " do carrinho.\n\n" + resumoCarrinho();
  }

  function processarFinalizar(texto) {
    const t = Rest.normalizar(texto);
    const r = Cart.resumo();
    if (!r.itens.length) {
      return "Seu carrinho está vazio. Adicione itens antes de finalizar.";
    }
    const temEndereco = /rua|avenida|av\.|travessa|roda|alameda|praça|n[º°o]?\s*\d|bairro|centro/.test(
      t
    );
    if (!temEndereco) {
      return (
        "Para finalizar, envie: finalizar <endereço com número e bairro> com <pagamento>.\n" +
        "Pagamentos: " +
        Rest.RESTAURANTE.pagamentos.join(", ") +
        ".\n\n" +
        resumoCarrinho()
      );
    }
    let pagamento = "Pix";
    if (t.indexOf("cartao") !== -1 || t.indexOf("crédito") !== -1 || t.indexOf("credito") !== -1) {
      pagamento = "Cartão de crédito/débito";
    } else if (t.indexOf("dinheiro") !== -1) pagamento = "Dinheiro";
    const mEnd = texto.match(
      /finalizar\s+((?:rua|avenida|av\.?|travessa|rodovia|alameda|praça|est\.?|estrada)[^,]*(?:,\s*[^,]+)?(?:,\s*[^,]+)?)/i
    );
    const endereco = mEnd ? mEnd[1].trim() : texto.replace(/finalizar/i, "").trim();
    const resultado = Agent.finalizarPedido({ endereco: endereco, pagamento: pagamento });
    if (resultado.erro) return resultado.erro;
    const p = resultado.pedido;
    return (
      "Pedido confirmado! \n\n" +
      "Protocolo: " +
      p.pedido_id +
      "\nItens: " +
      p.itens.join("; ") +
      "\nEntrega: " +
      p.endereco +
      "\nPagamento: " +
      p.pagamento +
      "\nTotal: " +
      p.total +
      "\nPrazo: " +
      p.prazo
    );
  }

  function responder(texto) {
    const t = Rest.normalizar(texto);

    if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|e ai|eai)\b/.test(t)) {
      return (
        "Olá! Sou o atendente do " +
        Rest.RESTAURANTE.nome +
        ".\nPosso mostrar o cardápio de hoje, montar seu pedido e informar o total com entrega.\n\nEx.: \"quero 2 feijoadas\" ou \"cardápio de hoje\"."
      );
    }
    if (/(cardapio|cardápio|o que tem|pratos|hoje tem|menu)/.test(t)) {
      return listarCardapio(Rest.hoje());
    }
    if (/(horario|horário|abre|fecha)/.test(t)) {
      return "Nosso horário: " + Rest.RESTAURANTE.horario + ".";
    }
    if (/(entrega|taxa|frete|quanto custa o delivery)/.test(t) && !acharItem(t)) {
      return (
        "Taxa de entrega: " +
        Rest.brl(Rest.RESTAURANTE.taxaEntrega) +
        ". Pedidos acima de " +
        Rest.brl(Rest.RESTAURANTE.entregaGratisAcima) +
        " têm entrega grátis. Prazo: " +
        Rest.RESTAURANTE.prazoEntrega +
        "."
      );
    }
    if (/(carrinho|meu pedido|quanto (da|fica|vai)|total|valor)/.test(t) && !acharItem(t)) {
      if (/(finalizar|fechar|confirmar)/.test(t)) return processarFinalizar(texto);
      return resumoCarrinho();
    }
    if (/(limpar|esvaziar).*(carrinho)|limpar carrinho|esvaziar carrinho/.test(t)) {
      Cart.limpar();
      return "Carrinho esvaziado.";
    }
    if (/(remov|tirar|apagar)/.test(t)) {
      const r = processarRemocao(texto);
      if (r) return r;
    }
    if (/(finalizar|fechar pedido|confirmar pedido|quero pagar|fazer pedido)/.test(t)) {
      return processarFinalizar(texto);
    }
    const adicao = processarAdicao(texto);
    if (adicao) return adicao;

    if (/(pre[çc]o|custa|quanto)/.test(t)) {
      const item = acharItem(t);
      if (item) return item.nome + ": " + Rest.brl(item.preco) + " (unidade).";
      return "Digite \"cardápio\" para ver os preços de hoje.";
    }

    if (/(obrigad|valeu|tchau|at[ée] logo)/.test(t)) {
      return "De nada! Sempre à disposição para seu pedido.";
    }

    return (
      "No momento estou no modo simples (sem IA configurada).\n" +
      "Posso: listar o cardápio, adicionar itens (ex.: \"2 feijoadas\"), mostrar o total e finalizar.\n" +
      "Para personalizações avançadas (remover cebola, ponto, temperos) e atendimento por IA, configure um LLM em Configurações."
    );
  }

  window.Fallback = { responder: responder };
})();
