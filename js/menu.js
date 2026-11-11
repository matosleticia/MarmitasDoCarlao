(function () {
  "use strict";

  const DIAS = {
    0: "domingo",
    1: "segunda-feira",
    2: "terça-feira",
    3: "quarta-feira",
    4: "quinta-feira",
    5: "sexta-feira",
    6: "sábado",
  };

  const DIAS_CURTO = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };

  const RESTAURANTE = {
    nome: "Marmitas do Carlão",
    taxaEntrega: 6.0,
    entregaGratisAcima: 70.0,
    horario: "Seg a Sex, 11:00–14:30 e 18:00–21:00 | Sáb, 11:00–14:30",
    endereco: "Rua das Acácias, 123 – Centro",
    pagamentos: ["Pix", "Cartão de crédito/débito", "Dinheiro"],
    prazoEntrega: "35 a 50 minutos",
    telefone: "(35) 99999-0000",
  };

  const TODOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

  const CATALOGO = [
    // ---------- Marmitas ----------
    {
      id: "feijoada",
      nome: "Marmita de Feijoada",
      categoria: "marmita",
      preco: 24.9,
      dias: [1, 5],
      descricao: "Feijoada completa com arroz, couve, farofa e laranja.",
      opcoes: [
        {
          id: "tamanho",
          label: "Tamanho",
          tipo: "unica",
          opcoes: [
            { id: "P", label: "P – 300 g", delta: 0 },
            { id: "M", label: "M – 450 g", delta: 0 },
            { id: "G", label: "G – 600 g", delta: 4.0 },
          ],
        },
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [
            { id: "banana", label: "banana frita", delta: 3.0 },
            { id: "couve", label: "couve extra", delta: 2.0 },
            { id: "farofa", label: "farofa extra", delta: 2.0 },
          ],
        },
      ],
      removiveis: ["pimenta", "cebola"],
    },
    {
      id: "bife_vaca",
      nome: "Bife de Vaca Acebolado",
      categoria: "marmita",
      preco: 27.9,
      dias: [1, 2, 3, 4],
      descricao: "Bife de vaca grelhado com cebola, arroz e feijão.",
      opcoes: [
        {
          id: "ponto",
          label: "Ponto de cozimento",
          tipo: "unica",
          opcoes: [
            { id: "mal_passado", label: "mal passado", delta: 0 },
            { id: "ao_ponto", label: "ao ponto", delta: 0 },
            { id: "bem_passado", label: "bem passado", delta: 0 },
          ],
        },
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [
            { id: "batata", label: "batata frita", delta: 5.0 },
            { id: "ovo", label: "ovo frito", delta: 2.5 },
          ],
        },
      ],
      removiveis: ["cebola", "alho"],
    },
    {
      id: "frango_grelhado",
      nome: "Frango Grelhado",
      categoria: "marmita",
      preco: 23.9,
      dias: [1, 2, 3, 4, 5],
      descricao: "Filé de frango grelhado, arroz, feijão e salada.",
      opcoes: [
        {
          id: "tempero",
          label: "Tempero do frango",
          tipo: "unica",
          opcoes: [
            { id: "limao_alho", label: "limão e alho", delta: 0 },
            { id: "paprica", label: "páprica defumada", delta: 0 },
            { id: "só_sal", label: "só sal", delta: 0 },
          ],
        },
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [
            { id: "salada", label: "salada extra", delta: 4.0 },
            { id: "queijo", label: "queijo", delta: 3.0 },
          ],
        },
      ],
      removiveis: ["cebola", "alho"],
    },
    {
      id: "parmegiana",
      nome: "Frango à Parmegiana",
      categoria: "marmita",
      preco: 26.9,
      dias: [2, 4],
      descricao: "Frango empanado ao molho tomate com queijo, arroz e fritas.",
      opcoes: [
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [
            { id: "queijo", label: "queijo extra", delta: 3.0 },
            { id: "batata", label: "batata frita", delta: 5.0 },
          ],
        },
      ],
      removiveis: ["orégano", "cebola"],
    },
    {
      id: "carne_suina",
      nome: "Carne Suína ao Molho",
      categoria: "marmita",
      preco: 25.9,
      dias: [3, 6],
      descricao: "Carne suína desfiada ao molho, arroz e feijão.",
      opcoes: [
        {
          id: "ponto",
          label: "Ponto de cozimento",
          tipo: "unica",
          opcoes: [
            { id: "macio", label: "macio", delta: 0 },
            { id: "bem_passado", label: "bem passado", delta: 0 },
          ],
        },
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [{ id: "batata", label: "batata frita", delta: 5.0 }],
        },
      ],
      removiveis: ["cebola", "pimenta"],
    },
    {
      id: "tilapia",
      nome: "Filé de Tilápia",
      categoria: "marmita",
      preco: 28.9,
      dias: [4, 6],
      descricao: "Tilápia grelhada com arroz, feijão e legumes.",
      opcoes: [
        {
          id: "ponto",
          label: "Ponto de cozimento",
          tipo: "unica",
          opcoes: [
            { id: "mal_passado", label: "mal passado", delta: 0 },
            { id: "ao_ponto", label: "ao ponto", delta: 0 },
            { id: "bem_passado", label: "bem passado", delta: 0 },
          ],
        },
      ],
      removiveis: ["cebola", "alho"],
    },
    {
      id: "lasanha",
      nome: "Lasanha à Bolonhesa",
      categoria: "marmita",
      preco: 25.9,
      dias: [2, 5],
      descricao: "Lasanha artesanal com molho bolonhesa e queijo.",
      opcoes: [
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [{ id: "salada", label: "salada extra", delta: 4.0 }],
        },
      ],
      removiveis: ["orégano", "cebola"],
    },
    {
      id: "strogonoff",
      nome: "Strogonoff de Frango",
      categoria: "marmita",
      preco: 26.9,
      dias: [3, 6],
      descricao: "Strogonoff cremoso com arroz e batata palha.",
      opcoes: [
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [
            { id: "batata_palha", label: "batata palha extra", delta: 3.0 },
            { id: "arroz", label: "arroz extra", delta: 3.0 },
          ],
        },
      ],
      removiveis: ["cebola", "pimenta"],
    },
    {
      id: "vegetariana",
      nome: "Marmita Vegetariana",
      categoria: "marmita",
      preco: 22.9,
      dias: [1, 2, 3, 4, 5],
      descricao: "Grão-de-bico, legumes, arroz integral e salada.",
      opcoes: [
        {
          id: "extras",
          label: "Extras",
          tipo: "multi",
          opcoes: [{ id: "queijo", label: "queijo", delta: 3.0 }],
        },
      ],
      removiveis: ["cebola"],
    },

    // ---------- Acompanhamentos ----------
    {
      id: "arroz",
      nome: "Arroz (porção)",
      categoria: "acompanhamento",
      preco: 4.0,
      dias: TODOS_DIAS,
      descricao: "Porção de arroz branco.",
      opcoes: [],
      removiveis: [],
    },
    {
      id: "feijao",
      nome: "Feijão Carioca (porção)",
      categoria: "acompanhamento",
      preco: 4.5,
      dias: TODOS_DIAS,
      descricao: "Porção de feijão temperado.",
      opcoes: [],
      removiveis: [],
    },
    {
      id: "batata_frita",
      nome: "Batata Frita",
      categoria: "acompanhamento",
      preco: 8.0,
      dias: TODOS_DIAS,
      descricao: "Batata frita crocante (250 g).",
      opcoes: [],
      removiveis: ["sal"],
    },
    {
      id: "farofa",
      nome: "Farofa",
      categoria: "acompanhamento",
      preco: 5.0,
      dias: TODOS_DIAS,
      descricao: "Farofa de bacon.",
      opcoes: [],
      removiveis: ["bacon"],
    },
    {
      id: "couve",
      nome: "Couve Refogada",
      categoria: "acompanhamento",
      preco: 5.0,
      dias: TODOS_DIAS,
      descricao: "Couve refogada no alho.",
      opcoes: [],
      removiveis: ["alho"],
    },
    {
      id: "salada",
      nome: "Salada da Casa",
      categoria: "acompanhamento",
      preco: 6.0,
      dias: TODOS_DIAS,
      descricao: "Folhas, tomate, cenoura e molho à escolha.",
      opcoes: [
        {
          id: "molho",
          label: "Molho",
          tipo: "unica",
          opcoes: [
            { id: "vinegrete", label: "vinagrete", delta: 0 },
            { id: "sem_molho", label: "sem molho", delta: 0 },
          ],
        },
      ],
      removiveis: ["cebola", "tomate"],
    },

    // ---------- Bebidas ----------
    {
      id: "agua",
      nome: "Água Mineral 500 ml",
      categoria: "bebida",
      preco: 4.0,
      dias: TODOS_DIAS,
      descricao: "Água mineral com ou sem gás.",
      opcoes: [
        {
          id: "tipo",
          label: "Tipo",
          tipo: "unica",
          opcoes: [
            { id: "com_gas", label: "com gás", delta: 0 },
            { id: "sem_gas", label: "sem gás", delta: 0 },
          ],
        },
      ],
      removiveis: [],
    },
    {
      id: "suco",
      nome: "Suco Natural 400 ml",
      categoria: "bebida",
      preco: 7.0,
      dias: TODOS_DIAS,
      descricao: "Suco natural feito na hora.",
      opcoes: [
        {
          id: "sabor",
          label: "Sabor",
          tipo: "unica",
          opcoes: [
            { id: "laranja", label: "laranja", delta: 0 },
            { id: "maracuja", label: "maracujá", delta: 0 },
            { id: "limao", label: "limão", delta: 0 },
            { id: "abacaxi", label: "abacaxi com hortelã", delta: 1.0 },
          ],
        },
      ],
      removiveis: [],
    },
    {
      id: "refri",
      nome: "Refrigerante Lata 350 ml",
      categoria: "bebida",
      preco: 6.0,
      dias: TODOS_DIAS,
      descricao: "Coca-Cola, Guaraná ou Fanta.",
      opcoes: [
        {
          id: "sabor",
          label: "Sabor",
          tipo: "unica",
          opcoes: [
            { id: "coca", label: "Coca-Cola", delta: 0 },
            { id: "guarana", label: "Guaraná", delta: 0 },
            { id: "fanta", label: "Fanta Laranja", delta: 0 },
          ],
        },
      ],
      removiveis: [],
    },
    {
      id: "cerveja",
      nome: "Cerveja Long Neck 355 ml",
      categoria: "bebida",
      preco: 9.0,
      dias: TODOS_DIAS,
      descricao: "Heineken ou Original, gelada.",
      opcoes: [
        {
          id: "marca",
          label: "Marca",
          tipo: "unica",
          opcoes: [
            { id: "heineken", label: "Heineken", delta: 0 },
            { id: "original", label: "Original", delta: 0 },
          ],
        },
      ],
      removiveis: [],
    },
  ];

  const ITENS = {};
  CATALOGO.forEach(function (item) {
    ITENS[item.id] = item;
  });

  function hoje() {
    return new Date().getDay();
  }

  function normalizar(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function itensDoDia(dia) {
    const d = typeof dia === "number" ? dia : hoje();
    return CATALOGO.filter(function (item) {
      return item.dias.indexOf(d) !== -1;
    });
  }

  function disponivelHoje(item) {
    return item.dias.indexOf(hoje()) !== -1;
  }

  function parseDia(texto) {
    if (!texto) return hoje();
    const t = normalizar(texto);
    if (t === "hoje") return hoje();
    if (t === "amanha" || t === "amanhã") return (hoje() + 1) % 7;
    if (t === "depois de amanha") return (hoje() + 2) % 7;
    for (let i = 0; i <= 6; i++) {
      if (normalizar(DIAS[i]) === t || normalizar(DIAS[i]).indexOf(t) === 0) {
        return i;
      }
    }
    for (const curto in DIAS_CURTO) {
      if (normalizar(curto) === t) return DIAS_CURTO[curto];
    }
    const m = t.match(/\b(seg|ter|qua|qui|sex|sab|dom)\b/);
    if (m) return DIAS_CURTO[m[1]];
    return hoje();
  }

  function brl(valor) {
    return (
      "R$ " +
      Number(valor).toFixed(2).replace(".", ",")
    );
  }

  function resumoItem(item) {
    return {
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      preco: item.preco,
      precoTexto: brl(item.preco),
      descricao: item.descricao,
      dias: item.dias.map(function (d) {
        return DIAS[d];
      }),
      disponivelHoje: disponivelHoje(item),
      opcoes: item.opcoes.map(function (g) {
        return {
          id: g.id,
          label: g.label,
          tipo: g.tipo,
          opcoes: g.opcoes.map(function (o) {
            return { id: o.id, label: o.label, delta: o.delta };
          }),
        };
      }),
      removiveis: item.removiveis.slice(),
    };
  }

  window.Rest = {
    DIAS: DIAS,
    RESTAURANTE: RESTAURANTE,
    CATALOGO: CATALOGO,
    ITENS: ITENS,
    hoje: hoje,
    itensDoDia: itensDoDia,
    disponivelHoje: disponivelHoje,
    parseDia: parseDia,
    brl: brl,
    normalizar: normalizar,
    resumoItem: resumoItem,
  };
})();
