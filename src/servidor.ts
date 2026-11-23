// Backend REST do RPG Literário (ReadingPG)
// Rodar com: deno run -A src/servidor.ts (porta 3000)

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { URL } from "node:url";

import { Leitor } from "./models/leitor.ts";
import { InimigoLivro, LivroChefe } from "./models/livroModel.ts";
import { Batalha } from "./models/batalha.ts";
import { Jogo } from "./models/jogo.ts";
import { ItemLoja } from "./models/interfaces.ts";
import { PrismaJogoRepository } from "./models/prismaRepository.ts";

import { GoogleBooksService } from "./googleBooks.ts";

const PORT = 3000;
const googleBooksService = new GoogleBooksService();
const batalhaService = new Batalha();
const repository = new PrismaJogoRepository();

// Catálogo da Loja de Itens e Recompensas
const ITENS_LOJA: ItemLoja[] = [
  {
    id: "cafe-elfico",
    nome: "Café Élfico Aromático",
    descricao: "Restaura instantaneamente +35 de Vida/Energia do Leitor",
    custoXP: 40,
    tipo: "CURA",
    valor: 35,
  },
  {
    id: "cha-camomila",
    nome: "Infusão de Foco e Serenidade",
    descricao: "Alivia o cansaço mental e recupera +20 de Vida/Energia",
    custoXP: 25,
    tipo: "CURA",
    valor: 20,
  },
  {
    id: "grimorio-foco",
    nome: "Tomo da Mente Blindada",
    descricao: "Expande a capacidade de concentração: +40 HP Máximo",
    custoXP: 100,
    tipo: "MAX_VIDA",
    valor: 40,
  },
  {
    id: "oculos-erudito",
    nome: "Óculos do Erudito Ávido",
    descricao: "Estudo aprofundado: concede +25% de XP bônus em todas as leituras",
    custoXP: 120,
    tipo: "BONUS_XP",
    valor: 0.25,
  },
  {
    id: "monoculo-arcano",
    nome: "Monóculo Arcano de Análise",
    descricao: "Compreensão suprema: concede +50% de XP bônus em todas as leituras",
    custoXP: 220,
    tipo: "BONUS_XP",
    valor: 0.5,
  },
  // Títulos Honoríficos comprados com Pontos de Sabedoria (conquistados ao derrotar livros)
  {
    id: "titulo-rato-biblioteca",
    nome: "Título: Rato de Biblioteca",
    descricao: "Título de prestígio para leitores devotos. Requer derrotar ao menos 1 livro.",
    custoXP: 0,
    custoSabedoria: 1,
    tipo: "TITULO",
    valor: "Rato de Biblioteca",
  },
  {
    id: "titulo-conquistador-tomos",
    nome: "Título: Conquistador de Tomos",
    descricao: "Condecoração dada a quem desafia obras densas. Requer 3 pontos de Sabedoria.",
    custoXP: 0,
    custoSabedoria: 3,
    tipo: "TITULO",
    valor: "Conquistador de Tomos",
  },
  {
    id: "titulo-sabio-ancestral",
    nome: "Título: Sábio das Letras Ancestrais",
    descricao: "Título supremo para mestres da literatura. Requer 5 pontos de Sabedoria.",
    custoXP: 0,
    custoSabedoria: 5,
    tipo: "TITULO",
    valor: "Sábio das Letras Ancestrais",
  },
];

// Sessão em memória do Jogo para desenvolvimento imediato
// Inicia como null se nenhum jogador foi criado ainda
let leitorAtual: Leitor | null = null;
let jogoAtual: Jogo | null = null;

async function inicializarEstado(): Promise<void> {
  try {
    const ultimoLeitor = await repository.carregarUltimoLeitor();
    if (ultimoLeitor) {
      leitorAtual = ultimoLeitor;
      jogoAtual = new Jogo(leitorAtual);
      const livros = await repository.listarLivrosDoLeitor(leitorAtual.id);
      for (const livro of livros) {
        jogoAtual.adicionarLivro(livro);
      }
      console.log(`[Banco de Dados] Estado restaurado para o herói: ${leitorAtual.nome} (${livros.length} livros)`);
    }
  } catch (err) {
    console.error("[Banco de Dados] Erro ao carregar estado inicial:", err);
  }
}

// Classes de erro para controle de respostas HTTP
export class NaoEncontradoError extends Error {}
export class RegraNegocioError extends Error {}

/**
 * Função roteadora que recebe o método HTTP, a URL e o Body da requisição
 * e devolve a tupla [StatusCode, RespostaJSON]
 */
async function rotear(
  metodo: string,
  pathname: string,
  urlObj: URL,
  body: any
): Promise<[number, unknown]> {
  const partes = pathname.split("/").filter(Boolean);
  const [prefixo, recurso, id, acao] = partes;

  // Garante que todas as rotas comecem com /api
  if (prefixo !== "api") {
    return [404, { erro: "Rota não encontrada. Use o prefixo /api" }];
  }

  // --------------------------------------------------------------------------
  // 1. ROTAS DO USUÁRIO / LEITOR: /api/usuario
  // --------------------------------------------------------------------------
  if (recurso === "usuario") {
    // GET /api/usuario -> Retorna os dados do leitor ativo ou null se não cadastrado
    if (metodo === "GET" && !id) {
      if (!leitorAtual) {
        return [200, { leitor: null, precisaCadastro: true }];
      }

      return [
        200,
        {
          id: leitorAtual.id,
          nome: leitorAtual.nome,
          vida: leitorAtual.getVida(),
          vidaMaxima: leitorAtual.getVidaMaxima(),
          experiencia: leitorAtual.getExperiencia(),
          totalXpGanho: leitorAtual.getTotalXpGanho(),
          sabedoria: leitorAtual.getSabedoria(),
          multiplicadorXP: leitorAtual.getMultiplicadorXP(),
          titulo: leitorAtual.getTitulo(),
          nivel: leitorAtual.getNivel(),
          danoPorPagina: leitorAtual.getDanoPorPagina(),
          inventario: leitorAtual.getInventario(),
          estaVivo: leitorAtual.estaVivo(),
          precisaCadastro: false,
        },
      ];
    }

    // PUT /api/usuario -> Atualiza o nome do herói atual sem perder progresso
    if (metodo === "PUT" && !id) {
      if (!leitorAtual) {
        throw new RegraNegocioError("Nenhum aventureiro ativo para atualizar.");
      }
      const novoNome = String(body?.nome ?? "").trim();
      if (!novoNome) {
        throw new RegraNegocioError("O novo nome não pode ser vazio.");
      }

      leitorAtual.setNome(novoNome);
      await repository.salvarLeitor(leitorAtual);

      return [
        200,
        {
          mensagem: `Nome do herói alterado com sucesso para "${leitorAtual.nome}"!`,
          leitor: {
            id: leitorAtual.id,
            nome: leitorAtual.nome,
            vida: leitorAtual.getVida(),
            vidaMaxima: leitorAtual.getVidaMaxima(),
            nivel: leitorAtual.getNivel(),
            experiencia: leitorAtual.getExperiencia(),
            totalXpGanho: leitorAtual.getTotalXpGanho(),
            sabedoria: leitorAtual.getSabedoria(),
            multiplicadorXP: leitorAtual.getMultiplicadorXP(),
            titulo: leitorAtual.getTitulo(),
            danoPorPagina: leitorAtual.getDanoPorPagina(),
            inventario: leitorAtual.getInventario(),
            estaVivo: leitorAtual.estaVivo(),
            precisaCadastro: false,
          },
        },
      ];
    }

    // POST /api/usuario -> Cria ou carrega o jogador pelo nome
    if (metodo === "POST" && !id) {
      const nome = String(body?.nome ?? "").trim();
      if (!nome) {
        throw new RegraNegocioError("O campo 'nome' é obrigatório.");
      }

      // Consulta se o leitor já existe no banco de dados para não sobrescrever nem zerar a estante
      const leitorExistente = await repository.carregarLeitorPorNome(nome);
      if (leitorExistente) {
        leitorAtual = leitorExistente;
        jogoAtual = new Jogo(leitorAtual);
        const livros = await repository.listarLivrosDoLeitor(leitorAtual.id);
        for (const l of livros) {
          jogoAtual.adicionarLivro(l);
        }

        return [
          200,
          {
            mensagem: `Bem-vindo de volta, nobre ${leitorAtual.nome}! Seu progresso foi carregado.`,
            leitor: {
              id: leitorAtual.id,
              nome: leitorAtual.nome,
              vida: leitorAtual.getVida(),
              vidaMaxima: leitorAtual.getVidaMaxima(),
              nivel: leitorAtual.getNivel(),
              experiencia: leitorAtual.getExperiencia(),
              totalXpGanho: leitorAtual.getTotalXpGanho(),
              sabedoria: leitorAtual.getSabedoria(),
              multiplicadorXP: leitorAtual.getMultiplicadorXP(),
              titulo: leitorAtual.getTitulo(),
              danoPorPagina: leitorAtual.getDanoPorPagina(),
              inventario: leitorAtual.getInventario(),
              estaVivo: leitorAtual.estaVivo(),
              precisaCadastro: false,
            },
          },
        ];
      }

      leitorAtual = new Leitor(String(Date.now()), nome);
      jogoAtual = new Jogo(leitorAtual);
      await repository.salvarLeitor(leitorAtual);

      return [
        201,
        {
          mensagem: `Bem-vindo à aventura, ${leitorAtual.nome}!`,
          leitor: {
            id: leitorAtual.id,
            nome: leitorAtual.nome,
            vida: leitorAtual.getVida(),
            vidaMaxima: leitorAtual.getVidaMaxima(),
            nivel: leitorAtual.getNivel(),
            experiencia: leitorAtual.getExperiencia(),
            totalXpGanho: leitorAtual.getTotalXpGanho(),
            sabedoria: leitorAtual.getSabedoria(),
            multiplicadorXP: leitorAtual.getMultiplicadorXP(),
            titulo: leitorAtual.getTitulo(),
            danoPorPagina: leitorAtual.getDanoPorPagina(),
            inventario: leitorAtual.getInventario(),
            estaVivo: leitorAtual.estaVivo(),
            precisaCadastro: false,
          },
        },
      ];
    }
  }

  // --------------------------------------------------------------------------
  // 2. BUSCA DE LIVROS NO GOOGLE: /api/livros/busca?q={termo}
  // --------------------------------------------------------------------------
  if (recurso === "livros" && id === "busca") {
    if (metodo === "GET") {
      const termo = urlObj.searchParams.get("q") ?? "";
      if (!termo.trim()) {
        throw new RegraNegocioError("Parâmetro de busca 'q' é obrigatório.");
      }

      const resultados = await googleBooksService.buscar(termo);
      return [200, resultados];
    }
  }

  // --------------------------------------------------------------------------
  // 3. ESTANTE / BIBLIOTECA PESSOAL: /api/estante
  // --------------------------------------------------------------------------
  if (recurso === "estante") {
    if (!jogoAtual || !leitorAtual) {
      throw new RegraNegocioError("Nenhum herói encontrado. Cadastre um herói primeiro.");
    }

    // GET /api/estante -> Lista todos os livros na estante do jogador
    if (metodo === "GET" && !id) {
      const livros = jogoAtual.listarLivros().map((livro) => ({
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        hpAtual: livro.getVida(),
        hpMaximo: livro.getVidaMaxima(),
        paginasLidas: livro.getPaginasLidas(),
        status: livro.getStatus(),
        derrotado: !livro.estaVivo(),
        isBoss: livro instanceof LivroChefe,
        capaUrl: livro.capaUrl,
      }));

      return [
        200,
        {
          leitor: {
            id: leitorAtual.id,
            nome: leitorAtual.nome,
            nivel: leitorAtual.getNivel(),
            experiencia: leitorAtual.getExperiencia(),
          },
          estante: livros,
        },
      ];
    }

    // POST /api/estante -> Adiciona um livro à estante (Invoca Monstro)
    if (metodo === "POST" && !id) {
      const { id: livroId, titulo, autor, totalPaginas, capaUrl, isBoss, genero } = body ?? {};

      if (!titulo || totalPaginas === undefined || totalPaginas === null) {
        throw new RegraNegocioError("Os campos 'titulo' e 'totalPaginas' são obrigatórios.");
      }

      const paginasNum = Number(totalPaginas);
      if (!Number.isInteger(paginasNum) || paginasNum <= 0) {
        throw new RegraNegocioError("O campo 'totalPaginas' deve ser um número inteiro positivo maior que zero.");
      }

      const novoId = livroId ? String(livroId) : String(Date.now());
      if (jogoAtual.buscarLivro(novoId)) {
        throw new RegraNegocioError(`Livro com ID '${novoId}' já existe na estante.`);
      }

      let novoLivro: InimigoLivro;

      if (isBoss) {
        novoLivro = new LivroChefe(
          novoId,
          String(titulo),
          String(autor || "Autor desconhecido"),
          paginasNum,
          String(genero || "Clássico"),
          1.5,
          livroId,
          capaUrl
        );
      } else {
        novoLivro = new InimigoLivro(
          novoId,
          String(titulo),
          String(autor || "Autor desconhecido"),
          paginasNum,
          livroId,
          capaUrl
        );
      }

      jogoAtual.adicionarLivro(novoLivro);
      await repository.salvarLivro(novoLivro, leitorAtual.id);

      return [
        201,
        {
          mensagem: `Livro "${novoLivro.titulo}" invocado com ${novoLivro.getVidaMaxima()} HP!`,
          livro: {
            id: novoLivro.id,
            titulo: novoLivro.titulo,
            hp: novoLivro.getVida(),
            status: novoLivro.getStatus(),
          },
        },
      ];
    }

    // GET /api/estante/:id -> Detalhes de um livro específico
    if (metodo === "GET" && id && !acao) {
      const livro = jogoAtual.buscarLivro(id);
      if (!livro) throw new NaoEncontradoError(`Livro com ID ${id} não encontrado.`);

      return [
        200,
        {
          id: livro.id,
          titulo: livro.titulo,
          autor: livro.autor,
          hpAtual: livro.getVida(),
          hpMaximo: livro.getVidaMaxima(),
          paginasLidas: livro.getPaginasLidas(),
          status: livro.getStatus(),
          derrotado: !livro.estaVivo(),
        },
      ];
    }

    // POST /api/estante/:id/ler -> Registra leitura e aplica dano ao livro
    if (metodo === "POST" && id && acao === "ler") {
      const paginas = Number(body?.paginas);
      if (!Number.isInteger(paginas) || paginas <= 0) {
        throw new RegraNegocioError("O campo 'paginas' deve ser um número inteiro positivo maior que zero.");
      }

      const livro = jogoAtual.buscarLivro(id);
      if (!livro) throw new NaoEncontradoError(`Livro com ID ${id} não encontrado.`);

      const resultado = batalhaService.processarTurnoLeitura(leitorAtual, livro, paginas);

      // Persiste o progresso do livro e do leitor (XP, vida, sabedoria)
      await repository.salvarLivro(livro, leitorAtual.id);
      await repository.salvarLeitor(leitorAtual);

      return [200, resultado];
    }

    // DELETE /api/estante/:id -> Remove o livro da estante
    if (metodo === "DELETE" && id) {
      const removido = jogoAtual.removerLivro(id);
      if (!removido) throw new NaoEncontradoError(`Livro com ID ${id} não encontrado.`);

      await repository.removerLivro(id);

      return [200, { mensagem: `Livro ${id} removido da estante.` }];
    }
  }

  // --------------------------------------------------------------------------
  // 4. LOJA DE ITENS COM XP: /api/loja
  // --------------------------------------------------------------------------
  if (recurso === "loja") {
    // GET /api/loja -> Retorna os itens disponíveis na loja e os saldos do usuário
    if (metodo === "GET" && !id) {
      return [
        200,
        {
          saldoXP: leitorAtual ? leitorAtual.getExperiencia() : 0,
          saldoSabedoria: leitorAtual ? leitorAtual.getSabedoria() : 0,
          itens: ITENS_LOJA,
          inventario: leitorAtual ? leitorAtual.getInventario() : [],
        },
      ];
    }

    // POST /api/loja/comprar -> Compra um item usando XP do leitor
    if (metodo === "POST" && id === "comprar") {
      if (!leitorAtual) {
        throw new RegraNegocioError("Cadastre um herói primeiro antes de comprar itens.");
      }

      const itemId = String(body?.itemId ?? "").trim();
      const item = ITENS_LOJA.find((i) => i.id === itemId);

      if (!item) {
        throw new NaoEncontradoError(`Item com ID '${itemId}' não encontrado no catálogo.`);
      }

      leitorAtual.comprarItem(item);
      await repository.salvarLeitor(leitorAtual);

      return [
        200,
        {
          mensagem: `Você comprou "${item.nome}" com sucesso!`,
          item,
          leitor: {
            experiencia: leitorAtual.getExperiencia(),
            totalXpGanho: leitorAtual.getTotalXpGanho(),
            nivel: leitorAtual.getNivel(),
            sabedoria: leitorAtual.getSabedoria(),
            multiplicadorXP: leitorAtual.getMultiplicadorXP(),
            titulo: leitorAtual.getTitulo(),
            vida: leitorAtual.getVida(),
            vidaMaxima: leitorAtual.getVidaMaxima(),
            danoPorPagina: leitorAtual.getDanoPorPagina(),
            inventario: leitorAtual.getInventario(),
          },
        },
      ];
    }
  }

  return [404, { erro: "Rota não encontrada." }];
}

// ----------------------------------------------------------------------------
// SERVIDOR HTTP NATIVO (Com suporte a CORS e JSON)
// ----------------------------------------------------------------------------
const servidor = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Configuração global de CORS para permitir que qualquer Front-end acesse
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const pedacos: Uint8Array[] = [];

  req.on("data", (chunk: Uint8Array) => pedacos.push(chunk));

  req.on("end", async () => {
    let status = 500;
    let corpo: unknown = { erro: "Erro interno do servidor." };

    try {
      const texto = Buffer.concat(pedacos).toString("utf-8");
      const body = texto ? JSON.parse(texto) : {};
      const urlCompleta = new URL(req.url ?? "/", "http://localhost");

      [status, corpo] = await rotear(
        req.method ?? "GET",
        urlCompleta.pathname,
        urlCompleta,
        body
      );
    } catch (e: any) {
      if (e instanceof NaoEncontradoError) {
        status = 404;
      } else if (e instanceof RegraNegocioError || e instanceof SyntaxError) {
        status = 400;
      }
      corpo = { erro: e instanceof SyntaxError ? "JSON inválido." : e.message };
    }

    console.log(`${req.method} ${req.url} -> ${status}`);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(corpo, null, 2));
  });
});

servidor.listen(PORT, async () => {
  await inicializarEstado();
  console.log(`
======================================================
  ⚔️  READINGPG (RPG LITERÁRIO) - BACKEND REST INICIADO
  📡  Rodando em: http://localhost:${PORT}
  🦕  Deno Runtime
======================================================
  Rotas disponíveis:
  - POST /api/usuario             (Criar Herói / 1º acesso)
  - GET  /api/usuario             (Status do Herói / Nível)
  - GET  /api/livros/busca?q=...  (Busca no Google Books)
  - GET  /api/estante             (Listar Livros / Skoob)
  - POST /api/estante             (Invocar Livro/Boss)
  - POST /api/estante/:id/ler     (Atacar Livro / Ler Páginas)
======================================================
`);
});
