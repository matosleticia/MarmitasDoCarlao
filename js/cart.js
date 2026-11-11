(function () {
  "use strict";

  const CHAVE = "marmitas_cart_v1";
  let seq = 1;
  let linhas = [];

  function salvar() {
    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify({ seq: seq, linhas: linhas })
      );
    } catch (e) {
      /* armazenamento indisponível */
    }
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (!raw) return;
      const dados = JSON.parse(raw);
      if (dados && Array.isArray(dados.linhas)) {
        linhas = dados.linhas;
        seq = dados.seq || linhas.length + 1;
      }
    } catch (e) {
      linhas = [];
    }
  }

  function precoUnitario(item, opcoes) {
    let preco = item.preco;
    const op = opcoes || {};
    item.opcoes.forEach(function (grupo) {
      const escolhido = op[grupo.id];
      if (escolhido == null) return;
      if (grupo.tipo === "unica") {
        const alvo = grupo.opcoes.find(function (o) {
          return o.id === escolhido;
        });
        if (alvo) preco += alvo.delta;
      } else {
        const lista = Array.isArray(escolhido) ? escolhido : [escolhido];
        lista.forEach(function (id) {
          const alvo = grupo.opcoes.find(function (o) {
            return o.id === id;
          });
          if (alvo) preco += alvo.delta;
        });
      }
    });
    return preco;
  }

  function descreverOpcoes(item, opcoes, remover) {
    const partes = [];
    const op = opcoes || {};
    item.opcoes.forEach(function (grupo) {
      const escolhido = op[grupo.id];
      if (escolhido == null) return;
      if (grupo.tipo === "unica") {
        const alvo = grupo.opcoes.find(function (o) {
          return o.id === escolhido;
        });
        if (alvo && alvo.id !== grupo.opcoes[0].id) {
          partes.push(grupo.label.toLowerCase() + ": " + alvo.label);
        } else if (alvo && grupo.id === "ponto") {
          partes.push("ponto: " + alvo.label);
        } else if (alvo && grupo.id === "tempero") {
          partes.push("tempero: " + alvo.label);
        } else if (alvo && grupo.id !== "tamanho") {
          partes.push(alvo.label);
        } else if (alvo) {
          partes.push("tamanho " + alvo.id);
        }
      } else {
        const lista = Array.isArray(escolhido) ? escolhido : [escolhido];
        lista.forEach(function (id) {
          const alvo = grupo.opcoes.find(function (o) {
            return o.id === id;
          });
          if (alvo) partes.push(alvo.label);
        });
      }
    });
    (remover || []).forEach(function (r) {
      partes.push("sem " + r);
    });
    return partes;
  }

  function adicionar(item, quantidade, opcoes, remover, observacao) {
    const qtd = quantidade;
    const unit = precoUnitario(item, opcoes);
    const linha = {
      linha_id: "L" + seq++,
      item_id: item.id,
      nome: item.nome,
      quantidade: qtd,
      opcoes: opcoes || {},
      remover: remover || [],
      observacao: observacao || "",
      preco_unitario: unit,
      detalhes: descreverOpcoes(item, opcoes, remover),
      total: Math.round(unit * qtd * 100) / 100,
    };
    // fundir com linha idêntica
    const igual = linhas.find(function (l) {
      return (
        l.item_id === linha.item_id &&
        JSON.stringify(l.opcoes) === JSON.stringify(linha.opcoes) &&
        JSON.stringify(l.remover) === JSON.stringify(linha.remover) &&
        l.observacao === linha.observacao
      );
    });
    if (igual) {
      igual.quantidade += qtd;
      igual.total = Math.round(igual.preco_unitario * igual.quantidade * 100) / 100;
      salvar();
      return igual;
    }
    linhas.push(linha);
    salvar();
    return linha;
  }

  function removerPorId(linhaId) {
    const idx = linhas.findIndex(function (l) {
      return l.linha_id === linhaId;
    });
    if (idx === -1) return null;
    const removida = linhas.splice(idx, 1)[0];
    salvar();
    return removida;
  }

  function alterarQuantidade(linhaId, quantidade) {
    const l = linhas.find(function (x) {
      return x.linha_id === linhaId;
    });
    if (!l) return null;
    if (quantidade <= 0) return removerPorId(linhaId);
    l.quantidade = quantidade;
    l.total = Math.round(l.preco_unitario * quantidade * 100) / 100;
    salvar();
    return l;
  }

  function limpar() {
    linhas = [];
    salvar();
  }

  function resumo() {
    const subtotal = linhas.reduce(function (s, l) {
      return s + l.total;
    }, 0);
    const r = window.Rest.RESTAURANTE;
    const gratis = subtotal > 0 && subtotal >= r.entregaGratisAcima;
    const taxa = linhas.length === 0 ? 0 : gratis ? 0 : r.taxaEntrega;
    const total = Math.round((subtotal + taxa) * 100) / 100;
    return {
      itens: linhas.slice(),
      quantidadeItens: linhas.reduce(function (s, l) {
        return s + l.quantidade;
      }, 0),
      subtotal: Math.round(subtotal * 100) / 100,
      taxaEntrega: taxa,
      entregaGratis: gratis,
      entregaGratisAcima: r.entregaGratisAcima,
      total: total,
    };
  }

  carregar();

  window.Cart = {
    adicionar: adicionar,
    removerPorId: removerPorId,
    alterarQuantidade: alterarQuantidade,
    limpar: limpar,
    resumo: resumo,
    precoUnitario: precoUnitario,
    get linhas() {
      return linhas;
    },
  };
})();
