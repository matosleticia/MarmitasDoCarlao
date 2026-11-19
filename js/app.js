(function () {
  "use strict";

  const $ = function (sel) {
    return document.querySelector(sel);
  };

  const els = {
    messages: $("#messages"),
    chips: $("#chips"),
    composer: $("#composer"),
    input: $("#input"),
    btnSend: $("#btn-send"),
    statusChip: $("#status-chip"),
    cartList: $("#cart-list"),
    tSubtotal: $("#t-subtotal"),
    tEntrega: $("#t-entrega"),
    tTotal: $("#t-total"),
    tAviso: $("#t-aviso"),
    btnCheckout: $("#btn-checkout"),
    btnClear: $("#btn-clear"),
    btnConfig: $("#btn-config"),
    modalConfig: $("#modal-config"),
    modalCheckout: $("#modal-checkout"),
    cfgProvider: $("#cfg-provider"),
    cfgPreset: $("#cfg-preset"),
    cfgBaseurl: $("#cfg-baseurl"),
    cfgApikey: $("#cfg-apikey"),
    cfgModel: $("#cfg-model"),
    cfgTemp: $("#cfg-temp"),
    cfgTempVal: $("#cfg-temp-val"),
    cfgWebllmModel: $("#cfg-webllm-model"),
    groupOpenai: $("#group-openai"),
    groupWebllm: $("#group-webllm"),
    btnSaveConfig: $("#btn-save-config"),
    cfgErro: $("#cfg-erro"),
    btnLoadModel: $("#btn-load-model"),
    webllmProgress: $("#webllm-progress"),
    webllmBar: $("#webllm-bar"),
    webllmText: $("#webllm-progress-text"),
    coEndereco: $("#co-endereco"),
    coPagamento: $("#co-pagamento"),
    coTelefone: $("#co-telefone"),
    coTotal: $("#co-total"),
    btnConfirmCheckout: $("#btn-confirm-checkout"),
    infoHorario: $("#info-horario"),
    infoEntrega: $("#info-entrega"),
    infoPagamento: $("#info-pagamento"),
  };

  const CHIPS = [
    "Cardápio de hoje",
    "Quero uma feijoada",
    "2 bifes de vaca sem cebola",
    "Qual é o total da minha compra?",
    "Quanto custa a entrega?",
  ];

  let historico = [];
  let ocupado = false;

  // ---------------- mensagens ----------------

  function addMsg(texto, classe) {
    const div = document.createElement("div");
    div.className = "msg " + (classe || "bot");
    div.textContent = texto;
    els.messages.appendChild(div);
    rolar();
    return div;
  }

  function rolar() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function mostrarTyping() {
    const div = document.createElement("div");
    div.className = "typing";
    div.id = "typing";
    div.innerHTML = "<i></i><i></i><i></i>";
    els.messages.appendChild(div);
    rolar();
    return div;
  }

  function esconderTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

  function addToolEvent(evt) {
    const nomes = {
      obter_cardapio: "consultou o cardápio",
      obter_item: "consultou um item",
      adicionar_ao_carrinho: "atualizou o carrinho",
      remover_do_carrinho: "removeu um item do carrinho",
      obter_carrinho: "calculou o total",
      finalizar_pedido: "finalizou o pedido",
    };
    let txt = "→ " + (nomes[evt.nome] || evt.nome);
    if (evt.ok && evt.dados && evt.dados.adicionado) {
      const a = evt.dados.adicionado;
      txt =
        "→ adicionou " +
        a.quantidade +
        "x " +
        a.nome +
        " · " +
        a.total_linha;
    } else if (!evt.ok) {
      txt = "→ " + (evt.dados.erro || "ação recusada");
    }
    addMsg(txt, evt.ok ? "tool" : "tool");
  }

  // ---------------- carrinho (UI) ----------------

  function renderCart() {
    const r = Cart.resumo();
    els.cartList.innerHTML = "";

    if (!r.itens.length) {
      const p = document.createElement("p");
      p.className = "cart-vazio";
      p.textContent = "Carrinho vazio.";
      els.cartList.appendChild(p);
    } else {
      r.itens.forEach(function (l) {
        const box = document.createElement("div");
        box.className = "cart-item";

        const nome = document.createElement("div");
        nome.className = "nome";
        const nomeSpan = document.createElement("span");
        nomeSpan.textContent = l.nome;
        const totalSpan = document.createElement("span");
        totalSpan.textContent = Rest.brl(l.total);
        nome.appendChild(nomeSpan);
        nome.appendChild(totalSpan);
        box.appendChild(nome);

        if (l.detalhes.length || l.observacao) {
          const det = document.createElement("div");
          det.className = "det";
          det.textContent =
            (l.detalhes.length ? l.detalhes.join(" · ") : "") +
            (l.observacao ? " | obs: " + l.observacao : "");
          box.appendChild(det);
        }

        const baixo = document.createElement("div");
        baixo.className = "linha-baixo";

        const qty = document.createElement("div");
        qty.className = "qty";
        const menos = document.createElement("button");
        menos.type = "button";
        menos.textContent = "−";
        menos.title = "Diminuir";
        const valor = document.createElement("span");
        valor.textContent = String(l.quantidade);
        const mais = document.createElement("button");
        mais.type = "button";
        mais.textContent = "+";
        mais.title = "Aumentar";
        menos.addEventListener("click", function () {
          Cart.alterarQuantidade(l.linha_id, l.quantidade - 1);
          renderCart();
        });
        mais.addEventListener("click", function () {
          Cart.alterarQuantidade(l.linha_id, l.quantidade + 1);
          renderCart();
        });
        qty.appendChild(menos);
        qty.appendChild(valor);
        qty.appendChild(mais);

        const remover = document.createElement("button");
        remover.className = "link-remover";
        remover.type = "button";
        remover.textContent = "remover";
        remover.addEventListener("click", function () {
          Cart.removerPorId(l.linha_id);
          renderCart();
        });

        baixo.appendChild(qty);
        baixo.appendChild(remover);
        box.appendChild(baixo);
        els.cartList.appendChild(box);
      });
    }

    els.tSubtotal.textContent = Rest.brl(r.subtotal);
    els.tEntrega.textContent = r.subtotal > 0 && r.entregaGratis
      ? "grátis"
      : Rest.brl(r.taxaEntrega);
    els.tTotal.textContent = Rest.brl(r.total);
    els.tAviso.textContent =
      r.subtotal > 0 && !r.entregaGratis
        ? "Faltam " +
          Rest.brl(r.entregaGratisAcima - r.subtotal) +
          " para entrega grátis."
        : r.entregaGratis
        ? "Você ganhou entrega grátis!"
        : "";
    els.btnCheckout.disabled = r.itens.length === 0;
  }

  // ---------------- envio de mensagens ----------------

  function sleep(ms) {
    return new Promise(function (res) {
      setTimeout(res, ms);
    });
  }

  async function enviar(texto) {
    const bruto = texto != null ? texto : els.input.value;
    if (ocupado) return;
    const entrada = Guards.avaliarEntrada(bruto);
    if (!entrada.ok) {
      addMsg(
        Guards.RESPOSTAS_RECUSA[entrada.motivo] || Guards.RESPOSTAS_RECUSA.vazio,
        "error"
      );
      els.input.value = "";
      ajustarInput();
      return;
    }

    ocupado = true;
    els.btnSend.disabled = true;
    els.input.value = "";
    ajustarInput();

    addMsg(entrada.texto, "user");

    // Camada de decisão: valida escopo ANTES de chamar o modelo generativo.
    const decisao = Decision.avaliar(entrada.texto, {
      carrinhoItens: Cart.resumo().itens.length,
    });

    if (decisao.acao === "recusar") {
      Decision.registrar(decisao);
      addMsg(decisao.resposta, "bot");
      historico.push({ role: "user", content: entrada.texto });
      historico.push({ role: "assistant", content: decisao.resposta });
      if (historico.length > 32) historico = historico.slice(-32);
      ocupado = false;
      els.btnSend.disabled = false;
      els.input.focus();
      return;
    }

    Decision.registrar(decisao);
    const typing = mostrarTyping();

    let resultado;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      resultado = await Agent.run(entrada.texto, historico, {
        intencao: decisao.intent,
        fluxo: decisao.fluxo,
        onTool: function (evt) {
          addToolEvent(evt);
          renderCart();
        },
        onProgresso: function (p) {
          if (p && typeof p.progress === "number") {
            els.statusChip.textContent =
              "WebLLM " + Math.round(p.progress * 100) + "%";
          }
        },
      });
      if (!resultado.retry) break;
      esconderTyping();
      mostrarTyping();
      await sleep(900);
    }

    esconderTyping();
    addMsg(resultado.reply, resultado.erro ? "error" : "bot");

    if (!resultado.retry && !resultado.bloqueado) {
      historico.push({ role: "user", content: entrada.texto });
      historico.push({ role: "assistant", content: resultado.reply });
      if (historico.length > 32) historico = historico.slice(-32);
    }

    renderCart();
    atualizarStatus();
    ocupado = false;
    els.btnSend.disabled = false;
    els.input.focus();
  }

  function ajustarInput() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
  }

  // ---------------- status / config ----------------

  function atualizarStatus() {
    els.statusChip.textContent = LLM.descricao();
  }

  function preencherConfig() {
    const cfg = LLM.obter();
    els.cfgProvider.value = cfg.provider;
    els.cfgPreset.value = cfg.preset;
    els.cfgBaseurl.value = cfg.baseUrl;
    els.cfgApikey.value = cfg.apiKey;
    els.cfgModel.value = cfg.model;
    els.cfgTemp.value = cfg.temperature;
    els.cfgTempVal.textContent = cfg.temperature;
    els.cfgWebllmModel.value = cfg.webllmModel;
    els.cfgErro.textContent = "";
    alternarGrupos();
  }

  function alternarGrupos() {
    const p = els.cfgProvider.value;
    els.groupOpenai.classList.toggle("hidden", p !== "openai");
    els.groupWebllm.classList.toggle("hidden", p !== "webllm");
    if (els.cfgErro) els.cfgErro.textContent = "";
  }

  async function salvarConfig() {
    const provider = els.cfgProvider.value;
    if (provider === "openai" && !els.cfgApikey.value.trim()) {
      els.cfgErro.textContent = "Informe a chave de API ou escolha outro provedor.";
      return;
    }
    els.cfgErro.textContent = "";
    LLM.salvar({
      provider: provider,
      preset: els.cfgPreset.value,
      baseUrl: els.cfgBaseurl.value.trim(),
      apiKey: els.cfgApikey.value.trim(),
      model: els.cfgModel.value.trim(),
      temperature: parseFloat(els.cfgTemp.value) || 0.4,
      webllmModel: els.cfgWebllmModel.value.trim() || LLM.obter().webllmModel,
    });
    atualizarStatus();

    if (provider === "webllm") {
      els.btnLoadModel.disabled = true;
      els.webllmProgress.classList.remove("hidden");
      try {
        await LLM.garantirEngine(function (p) {
          const pct = Math.round((p && p.progress ? p.progress : 0) * 100);
          els.webllmBar.style.width = pct + "%";
          els.webllmText.textContent = (p && p.text ? p.text : "carregando") + " " + pct + "%";
        });
        els.webllmBar.style.width = "100%";
        els.webllmText.textContent = "modelo pronto";
        addMsg("Modelo local carregado. Pode conversar com o agente!", "system");
        fecharModal("modal-config");
      } catch (e) {
        els.webllmText.textContent = "falha: " + (e.message || e);
      }
      els.btnLoadModel.disabled = false;
      return;
    }

    addMsg(
      "Configurações salvas. Provedor ativo: " + LLM.descricao() + ".",
      "system"
    );
    fecharModal("modal-config");
  }

  // ---------------- modais ----------------

  function abrirModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function fecharModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  // ---------------- checkout ----------------

  function abrirCheckout() {
    const r = Cart.resumo();
    if (!r.itens.length) return;
    els.coPagamento.innerHTML = "";
    Rest.RESTAURANTE.pagamentos.forEach(function (p) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      els.coPagamento.appendChild(opt);
    });
    els.coTotal.textContent = "Total com entrega: " + Rest.brl(r.total);
    els.coEndereco.value = "";
    els.coTelefone.value = "";
    abrirModal("modal-checkout");
    els.coEndereco.focus();
  }

  function confirmarCheckout() {
    const resultado = Agent.finalizarPedido({
      endereco: els.coEndereco.value,
      pagamento: els.coPagamento.value,
      telefone: els.coTelefone.value,
    });
    if (resultado.erro) {
      els.coTotal.textContent = resultado.erro;
      return;
    }
    const p = resultado.pedido;
    fecharModal("modal-checkout");
    renderCart();
    addMsg(
      "Pedido confirmado!\nProtocolo: " +
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
        p.prazo,
      "bot"
    );
    historico.push({
      role: "assistant",
      content: "Pedido " + p.pedido_id + " confirmado no valor de " + p.total + ".",
    });
  }

  // ---------------- chips ----------------

  function montarChips() {
    els.chips.innerHTML = "";
    CHIPS.forEach(function (texto) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = texto;
      b.addEventListener("click", function () {
        enviar(texto);
      });
      els.chips.appendChild(b);
    });
  }

  // ---------------- eventos ----------------

  els.composer.addEventListener("submit", function (e) {
    e.preventDefault();
    enviar();
  });

  els.input.addEventListener("input", ajustarInput);
  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  });

  els.btnConfig.addEventListener("click", function () {
    preencherConfig();
    abrirModal("modal-config");
  });

  els.cfgProvider.addEventListener("change", alternarGrupos);
  els.cfgPreset.addEventListener("change", function () {
    const p = LLM.PRESETS[els.cfgPreset.value];
    if (p && els.cfgPreset.value !== "custom") {
      els.cfgBaseurl.value = p.baseUrl;
      els.cfgModel.value = p.model;
    }
  });
  els.cfgTemp.addEventListener("input", function () {
    els.cfgTempVal.textContent = els.cfgTemp.value;
  });
  els.btnSaveConfig.addEventListener("click", salvarConfig);
  els.btnLoadModel.addEventListener("click", async function () {
    LLM.salvar({ webllmModel: els.cfgWebllmModel.value.trim() || LLM.obter().webllmModel });
    els.btnLoadModel.disabled = true;
    els.webllmProgress.classList.remove("hidden");
    try {
      await LLM.garantirEngine(function (p) {
        const pct = Math.round((p && p.progress ? p.progress : 0) * 100);
        els.webllmBar.style.width = pct + "%";
        els.webllmText.textContent = (p && p.text ? p.text : "carregando") + " " + pct + "%";
      });
      els.webllmText.textContent = "modelo pronto";
    } catch (e) {
      els.webllmText.textContent = "falha: " + (e.message || e);
    }
    els.btnLoadModel.disabled = false;
  });

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      fecharModal(btn.getAttribute("data-close"));
    });
  });

  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });

  els.btnCheckout.addEventListener("click", abrirCheckout);
  els.btnConfirmCheckout.addEventListener("click", confirmarCheckout);
  els.btnClear.addEventListener("click", function () {
    Cart.limpar();
    renderCart();
  });

  // ---------------- init ----------------

  function init() {
    LLM.carregar();
    atualizarStatus();
    montarChips();
    renderCart();
    els.infoHorario.textContent = "Horário: " + Rest.RESTAURANTE.horario;
    els.infoEntrega.textContent =
      "Entrega: " +
      Rest.brl(Rest.RESTAURANTE.taxaEntrega) +
      " · grátis acima de " +
      Rest.brl(Rest.RESTAURANTE.entregaGratisAcima) +
      " · " +
      Rest.RESTAURANTE.prazoEntrega;
    els.infoPagamento.textContent =
      "Pagamentos: " + Rest.RESTAURANTE.pagamentos.join(", ");

    addMsg(
      "Olá! Aqui é o atendente do " +
        Rest.RESTAURANTE.nome +
        ".\n" +
        "Posso informar o cardápio e preços do dia, montar seu pedido por texto, aplicar personalizações (ponto, temperos, remover ingredientes) e calcular o total com entrega.\n\n" +
        "Dica: use Configurações para ativar o agente de IA (API com chave ou WebLLM local). Sem IA, o modo regras já atende o cardápio e o carrinho.",
      "bot"
    );
  }

  init();
})();
