(function () {
  "use strict";

  const MAX_INPUT = 800;
  const MAX_NOTA = 140;
  const MAX_SAIDA = 4000;
  const MIN_INTERVALO_MS = 700;

  const PADROES_JAILBREAK = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|rules?)/i,
    /ignore\s+(all\s+)?(previous|as|suas)?\s*(instru[cç][oõ]es|regras|prompts?)/i,
    /esque[cç]a\s+(tudo\s+o\s+que|suas|as|todas\s+as)\s+(instru[cç][oõ]es|regras|antecedentes)/i,
    /voc[êe]\s+(agora|passa\s+a|deve)\s+(ser|atuar\s+como|agir\s+como)/i,
    /modo\s+(dan|dev|desenvolvedor|jailbreak|hacker|livre)/i,
    /\bjailbreak\b/i,
    /\bDAN\b(?!\w)/i,
    /revele\s+(suas|as|minhas)\s+(instru[cç][oõ]es|regras|prompts?|configura[cç][aã]o)/i,
    /system\s*prompt/i,
    /prompt\s+do\s+sistema/i,
    /como\s+voc[êe]\s+(foi\s+)?(treinado|programado|criado)/i,
    /sem\s+restri[cc][oõ]es/i,
    /ignore\s+(all\s+)?(rules|guardrails|filter)/i,
    /you\s+are\s+now\s+(a|an|the)/i,
    /new\s+instructions?\s*:/i,
    /atue\s+como\s+(um\s+)?(outra|outro)\s+(ia|assistente|modelo|chat)/i,
    /aja\s+sem\s+(censura|filtros|regras)/i,
    /desbloqueie|destrav(e|ar)\s+(o\s+)?(chat|modelo|assistente)/i,
    /fa[cç]a\s+uma\s+(exce[cç][aã]o|quebra)\s+para\s+(esta|as)\s+regras/i,
    /do\s+anything\s+now/i,
    /pretend\s+(to\s+be|you\s+are)\s+(not|without)/i,
    /disregard\s+(all\s+)?(previous|prior|above)/i,
    /(print|exiba|mostre|reproduza)\s+(a\s+)?(mensagem\s+)?(de\s+)?sistema/i,
    /seu\s+novo\s+(papel|prompt|nome)\s+[eé]/i,
  ];

  const PADROES_INJECAO = [
    /<\s*script/i,
    /javascript\s*:/i,
    /on(error|load|click|mouseover)\s*=/i,
    /<\s*(iframe|object|embed|svg|img|link|meta|form|style|base|input)\b/i,
    /\b(eval|Function|document\.cookie|localStorage|fetch\s*\(|XMLHttpRequest)\s*\(/i,
    /(^|\n)\s*\[?(system|admin|developer)\]?\s*:/i,
    /<<\s*(SYS|SYSTEM|INST)/i,
    /###\s*(system|instruction)/i,
    /\{\{\s*(system|prompt|instruction)/i,
  ];

  let ultimaChamada = 0;

  function sanitizeInput(texto) {
    let t = String(texto == null ? "" : texto);
    t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
    t = t.replace(/\r\n?/g, "\n");
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");
    t = t.trim();
    if (t.length > MAX_INPUT) t = t.slice(0, MAX_INPUT);
    return t;
  }

  function sanitizeNota(texto) {
    let t = sanitizeInput(texto);
    t = t.replace(/[<>]/g, "");
    t = t.replace(/\s+/g, " ").trim();
    if (t.length > MAX_NOTA) t = t.slice(0, MAX_NOTA);
    return t;
  }

  function detectarJailbreak(texto) {
    const t = String(texto || "");
    for (let i = 0; i < PADROES_JAILBREAK.length; i++) {
      if (PADROES_JAILBREAK[i].test(t)) {
        return { bloqueado: true, motivo: "padrao_jailbreak", padrao: i };
      }
    }
    return { bloqueado: false };
  }

  function detectarInjecao(texto) {
    const t = String(texto || "");
    for (let i = 0; i < PADROES_INJECAO.length; i++) {
      if (PADROES_INJECAO[i].test(t)) {
        return { bloqueado: true, motivo: "padrao_injecao", padrao: i };
      }
    }
    return { bloqueado: false };
  }

  function avaliarEntrada(texto) {
    const sanitizado = sanitizeInput(texto);
    if (!sanitizado) {
      return { ok: false, motivo: "vazio", texto: "" };
    }
    const jail = detectarJailbreak(sanitizado);
    if (jail.bloqueado) {
      return { ok: false, motivo: "jailbreak", texto: sanitizado };
    }
    const inj = detectarInjecao(sanitizado);
    if (inj.bloqueado) {
      return { ok: false, motivo: "injecao", texto: sanitizado };
    }
    return { ok: true, texto: sanitizado };
  }

  function podeChamarLLM() {
    const agora = Date.now();
    if (agora - ultimaChamada < MIN_INTERVALO_MS) return false;
    ultimaChamada = agora;
    return true;
  }

  function filtrarSaida(texto) {
    let t = String(texto == null ? "" : texto);
    t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
    if (t.length > MAX_SAIDA) {
      t = t.slice(0, MAX_SAIDA) + "\n…";
    }
    return t.trim();
  }

  function ehInteiro(v, min, max) {
    const n = typeof v === "number" ? v : parseInt(v, 10);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return false;
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
    return true;
  }

  function ehTextoSeguro(v, min, max) {
    if (typeof v !== "string") return false;
    const t = v.trim();
    if (t.length < min) return false;
    if (t.length > max) return false;
    if (/[<>]/.test(t)) return false;
    return true;
  }

  function ehListaStrings(v, maxItens, maxTam) {
    if (!Array.isArray(v)) return false;
    if (v.length > maxItens) return false;
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== "string") return false;
      if (v[i].length > maxTam) return false;
    }
    return true;
  }

  const RESPOSTAS_RECUSA = {
    jailbreak:
      "Peço desculpas, mas não posso seguir instruções que tentam alterar minhas regras.\nPosso continuar com seu pedido de marmitas?",
    injecao:
      "Sua mensagem contém conteúdo que não consigo processar. Envie novamente de forma simples — estou aqui para ajudar com seu pedido!",
    vazio: "Não entendi. Pode digitar sua mensagem novamente?",
  };

  window.Guards = {
    MAX_INPUT: MAX_INPUT,
    MAX_NOTA: MAX_NOTA,
    sanitizeInput: sanitizeInput,
    sanitizeNota: sanitizeNota,
    detectarJailbreak: detectarJailbreak,
    detectarInjecao: detectarInjecao,
    avaliarEntrada: avaliarEntrada,
    podeChamarLLM: podeChamarLLM,
    filtrarSaida: filtrarSaida,
    ehInteiro: ehInteiro,
    ehTextoSeguro: ehTextoSeguro,
    ehListaStrings: ehListaStrings,
    RESPOSTAS_RECUSA: RESPOSTAS_RECUSA,
  };
})();
