(function () {
  "use strict";

  const CHAVE = "marmitas_llm_cfg_v1";

  const PRESETS = {
    openai: {
      rotulo: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    },
    groq: {
      rotulo: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-120b",
    },
    openrouter: {
      rotulo: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-mini",
    },
    deepseek: {
      rotulo: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
    custom: { rotulo: "Personalizado", baseUrl: "", model: "" },
  };

  const PADRAO = {
    provider: "regras", // regras | openai | webllm
    preset: "openai",
    baseUrl: PRESETS.openai.baseUrl,
    apiKey: "",
    model: PRESETS.openai.model,
    temperature: 0.4,
    webllmModel: "Hermes-3-Llama-3.2-3B-q4f16_1-MLC",
  };

  let cfg = Object.assign({}, PADRAO);
  let engine = null;
  let engineModel = null;
  let webllmMod = null;

  const MODELOS_OBRIGATOS = {
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b": "qwen/qwen3.8-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct": "openai/gpt-oss-120b",
    "qwen/qwen3-32b": "qwen/qwen3.8-27b",
  };

  function migrar(cfg) {
    const sub = MODELOS_OBRIGATOS[cfg.model];
    if (sub) cfg.model = sub;
    return cfg;
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (raw) cfg = Object.assign({}, PADRAO, JSON.parse(raw));
    } catch (e) {
      cfg = Object.assign({}, PADRAO);
    }
    cfg = migrar(cfg);
    return cfg;
  }

  function salvar(novo) {
    cfg = Object.assign({}, cfg, novo || {});
    try {
      localStorage.setItem(CHAVE, JSON.stringify(cfg));
    } catch (e) {
      /* ignore */
    }
    return cfg;
  }

  function obter() {
    return cfg;
  }

  async function importarWebLLM() {
    if (webllmMod) return webllmMod;
    webllmMod = await import("https://esm.run/@mlc-ai/web-llm");
    return webllmMod;
  }

  async function garantirEngine(onProgresso) {
    const modelo = cfg.webllmModel;
    const mod = await importarWebLLM();
    if (engine && engineModel === modelo) return engine;
    if (engine) {
      try {
        await engine.unload();
      } catch (e) {
        /* ignore */
      }
      engine = null;
    }
    engine = await mod.CreateMLCEngine(modelo, {
      initProgressCallback: function (p) {
        if (onProgresso) onProgresso(p);
      },
    });
    engineModel = modelo;
    return engine;
  }

  function erroAmigavel(status, corpo) {
    if (status === 401 || status === 403) {
      return "Chave de API inválida ou sem permissão. Verifique em Configurações.";
    }
    if (status === 402) {
      return (
        "Saldo insuficiente na conta deste provedor. Recarregue créditos ou use um provedor gratuito " +
        "(Groq, OpenRouter com modelo :free ou WebLLM) em Configurações."
      );
    }
    if (status === 429) {
      return "Limite de requisições atingido no provedor de IA. Tente novamente em instantes.";
    }
    if (status === 404) {
      return "Modelo ou endpoint não encontrado. Confira o nome do modelo em Configurações.";
    }
    if (status >= 500) {
      return "O provedor de IA está com instabilidade. Tente novamente em alguns instantes.";
    }
    let detalhe = "";
    try {
      const j = JSON.parse(corpo);
      detalhe = (j.error && j.error.message) || "";
    } catch (e) {
      detalhe = String(corpo || "").slice(0, 200);
    }
    return "Falha na chamada de IA (" + status + "). " + detalhe;
  }

  async function chatOpenAI(messages, tools, onProgresso) {
    const base = String(cfg.baseUrl || "").replace(/\/+$/, "");
    if (!cfg.apiKey) {
      throw new Error(
        "Nenhuma chave de API configurada. Abra Configurações e informe sua chave."
      );
    }
    const payload = {
      model: cfg.model,
      messages: messages,
      temperature: cfg.temperature,
      stream: false,
    };
    if (tools && tools.length) payload.tools = tools;

    let res;
    try {
      res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new Error(
        "Não consegui conectar ao provedor de IA. Verifique sua conexão ou o endereço da API."
      );
    }
    const corpo = await res.text();
    if (!res.ok) throw new Error(erroAmigavel(res.status, corpo));
    let dados;
    try {
      dados = JSON.parse(corpo);
    } catch (e) {
      throw new Error("Resposta inválida do provedor de IA.");
    }
    const msg = dados.choices && dados.choices[0] && dados.choices[0].message;
    if (!msg) throw new Error("Resposta vazia do provedor de IA.");
    if (onProgresso) onProgresso({ progress: 1, text: "ok" });
    return normalizarMensagem(msg);
  }

  async function chatWebLLM(messages, tools, onProgresso) {
    if (!window.WebGPU || !navigator.gpu) {
      throw new Error(
        "WebGPU não está disponível neste navegador. Use Chrome/Edge atualizado ou escolha a opção de API."
      );
    }
    const engineLocal = await garantirEngine(onProgresso);
    const payload = {
      messages: messages,
      temperature: cfg.temperature,
      stream: false,
    };
    if (tools && tools.length) payload.tools = tools;
    const reply = await engineLocal.chat.completions.create(payload);
    const msg = reply.choices && reply.choices[0] && reply.choices[0].message;
    if (!msg) throw new Error("Resposta vazia do modelo local.");
    return normalizarMensagem(msg);
  }

  function normalizarMensagem(msg) {
    const resultado = { content: msg.content || "", tool_calls: null };
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      resultado.tool_calls = msg.tool_calls.map(function (tc, i) {
        const fn = tc.function || {};
        let args = fn.arguments;
        if (typeof args === "string") {
          try {
            args = JSON.parse(args);
          } catch (e) {
            args = {};
          }
        }
        return {
          id: tc.id || "call_" + i,
          name: fn.name || "",
          arguments: args && typeof args === "object" ? args : {},
        };
      });
    }
    return resultado;
  }

  async function chat(messages, tools, onProgresso) {
    if (cfg.provider === "webllm") {
      return chatWebLLM(messages, tools, onProgresso);
    }
    return chatOpenAI(messages, tools, onProgresso);
  }

  window.LLM = {
    PRESETS: PRESETS,
    carregar: carregar,
    salvar: salvar,
    obter: obter,
    chat: chat,
    garantirEngine: garantirEngine,
    temChave: function () {
      return !!cfg.apiKey;
    },
    descricao: function () {
      if (cfg.provider === "webllm") return "WebLLM · " + cfg.webllmModel;
      if (cfg.provider === "openai")
        return "API · " + (cfg.model || "?") + " (" + (cfg.preset || "custom") + ")";
      return "Modo regras (sem IA)";
    },
  };
})();
