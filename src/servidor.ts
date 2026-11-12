// Backend REST do RPG Literário (BookQuest)
// Rodar com: deno run -A src/servidor.ts (porta 3000)

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { URL } from "node:url";

import {
  Leitor,
  InimigoLivro,
  LivroChefe,
  Batalha,
  Jogo,
} from "./jogo.ts";
import { GoogleBooksService } from "./googleBooks.ts";

const PORT = 3000;
const googleBooksService = new GoogleBooksService();
const batalhaService = new Batalha();

// Sessão em memória do Jogo para desenvolvimento imediato
// (Assim que você implementar o PrismaJogoRepository, pode plugar aqui)
let leitorAtual = new Leitor("player-1", "Aventureiro Leitor");
let jogoAtual = new Jogo(leitorAtual);

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
    // GET /api/usuario -> Retorna os dados do leitor ativo
    if (metodo === "GET" && !id) {
      return [
        200,
        {
          id: leitorAtual.id,
          nome: leitorAtual.nome,
          vida: leitorAtual.getVida(),
          vidaMaxima: leitorAtual.getVidaMaxima(),
          experiencia: leitorAtual.getExperiencia(),
          nivel: leitorAtual.getNivel(),
          estaVivo: leitorAtual.estaVivo(),
        },
      ];
    }

    // POST /api/usuario -> Cria ou redefine o nome do jogador (Primeiro Acesso)
    if (metodo === "POST" && !id) {
      const nome = String(body?.nome ?? "").trim();
      if (!nome) {
        throw new RegraNegocioError("O campo 'nome' é obrigatório.");
      }

      leitorAtual = new Leitor(String(Date.now()), nome);
      jogoAtual = new Jogo(leitorAtual);

      return [
        201,
        {
          mensagem: `Bem-vindo à aventura, ${leitorAtual.nome}!`,
          leitor: {
            id: leitorAtual.id,
            nome: leitorAtual.nome,
            vida: leitorAtual.getVida(),
            nivel: leitorAtual.getNivel(),
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

      if (!titulo || !totalPaginas) {
        throw new RegraNegocioError("Os campos 'titulo' e 'totalPaginas' são obrigatórios.");
      }

      const novoId = livroId ? String(livroId) : String(Date.now());
      let novoLivro: InimigoLivro;

      if (isBoss) {
        novoLivro = new LivroChefe(
          novoId,
          String(titulo),
          String(autor || "Autor desconhecido"),
          Number(totalPaginas),
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
          Number(totalPaginas),
          livroId,
          capaUrl
        );
      }

      jogoAtual.adicionarLivro(novoLivro);

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
      if (!paginas || paginas <= 0) {
        throw new RegraNegocioError("O campo 'paginas' deve ser um número maior que zero.");
      }

      const livro = jogoAtual.buscarLivro(id);
      if (!livro) throw new NaoEncontradoError(`Livro com ID ${id} não encontrado.`);

      const resultado = batalhaService.processarTurnoLeitura(leitorAtual, livro, paginas);

      return [200, resultado];
    }

    // DELETE /api/estante/:id -> Remove o livro da estante
    if (metodo === "DELETE" && id) {
      const removido = jogoAtual.removerLivro(id);
      if (!removido) throw new NaoEncontradoError(`Livro com ID ${id} não encontrado.`);

      return [200, { mensagem: `Livro ${id} removido da estante.` }];
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

servidor.listen(PORT, () => {
  console.log(`
======================================================
  ⚔️  BOOKQUEST (RPG LITERÁRIO) - BACKEND REST INICIADO
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
