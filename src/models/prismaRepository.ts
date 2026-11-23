import pkg from "../../node_modules/@prisma/client/index.js";
const { PrismaClient } = pkg;
import { Leitor } from "./leitor.ts";
import { InimigoLivro, LivroChefe } from "./livroModel.ts";
import { JogoRepository, StatusLeitura, ItemLoja } from "./interfaces.ts";

export class PrismaJogoRepository implements JogoRepository {
  private prisma: any;

  constructor(prismaInstance?: any) {
    this.prisma = prismaInstance ?? new PrismaClient();
  }

  public async salvarLeitor(leitor: Leitor): Promise<void> {
    const inventarioJson = JSON.stringify(leitor.getInventario());

    await this.prisma.leitor.upsert({
      where: { id: leitor.id },
      update: {
        nome: leitor.nome,
        vida: leitor.getVida(),
        vidaMaxima: leitor.getVidaMaxima(),
        experiencia: leitor.getExperiencia(),
        totalXpGanho: leitor.getTotalXpGanho(),
        sabedoria: leitor.getSabedoria(),
        multiplicadorXP: leitor.getMultiplicadorXP(),
        tituloAtivo: leitor.getTitulo(),
        inventarioJson,
      },
      create: {
        id: leitor.id,
        nome: leitor.nome,
        vida: leitor.getVida(),
        vidaMaxima: leitor.getVidaMaxima(),
        experiencia: leitor.getExperiencia(),
        totalXpGanho: leitor.getTotalXpGanho(),
        sabedoria: leitor.getSabedoria(),
        multiplicadorXP: leitor.getMultiplicadorXP(),
        tituloAtivo: leitor.getTitulo(),
        inventarioJson,
      },
    });
  }

  public async carregarLeitor(id: string): Promise<Leitor | null> {
    const reg = await this.prisma.leitor.findUnique({
      where: { id },
    });
    if (!reg) return null;

    return this.converterParaLeitor(reg);
  }

  public async carregarLeitorPorNome(nome: string): Promise<Leitor | null> {
    const reg = await this.prisma.leitor.findFirst({
      where: { nome },
      orderBy: { criadoEm: "desc" },
    });
    if (!reg) return null;

    return this.converterParaLeitor(reg);
  }

  public async carregarUltimoLeitor(): Promise<Leitor | null> {
    const reg = await this.prisma.leitor.findFirst({
      orderBy: { criadoEm: "desc" },
    });
    if (!reg) return null;

    return this.converterParaLeitor(reg);
  }

  public async salvarLivro(livro: InimigoLivro, leitorId: string): Promise<void> {
    const isBoss = livro instanceof LivroChefe;
    const genero = isBoss ? (livro as LivroChefe).genero : null;
    const multiplicadorXP = isBoss ? (livro as LivroChefe).multiplicadorXP : 1.0;

    await this.prisma.livro.upsert({
      where: { id: livro.id },
      update: {
        titulo: livro.titulo,
        autor: livro.autor,
        totalPaginas: livro.totalPaginas,
        hpAtual: livro.getVida(),
        paginasLidas: livro.getPaginasLidas(),
        status: livro.getStatus(),
        isBoss,
        genero,
        multiplicadorXP,
        capaUrl: livro.capaUrl ?? null,
        googleId: livro.googleBooksId ?? null,
        leitorId,
      },
      create: {
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        totalPaginas: livro.totalPaginas,
        hpAtual: livro.getVida(),
        paginasLidas: livro.getPaginasLidas(),
        status: livro.getStatus(),
        isBoss,
        genero,
        multiplicadorXP,
        capaUrl: livro.capaUrl ?? null,
        googleId: livro.googleBooksId ?? null,
        leitorId,
      },
    });
  }

  public async carregarLivro(id: string): Promise<InimigoLivro | null> {
    const reg = await this.prisma.livro.findUnique({
      where: { id },
    });
    if (!reg) return null;

    return this.converterParaLivro(reg);
  }

  public async listarLivrosDoLeitor(leitorId: string): Promise<InimigoLivro[]> {
    const registros = await this.prisma.livro.findMany({
      where: { leitorId },
    });

    return registros.map((r: any) => this.converterParaLivro(r));
  }

  public async removerLivro(id: string): Promise<boolean> {
    try {
      await this.prisma.livro.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  private converterParaLeitor(reg: any): Leitor {
    const leitor = new Leitor(reg.id, reg.nome, reg.vidaMaxima);
    let inventario: ItemLoja[] = [];
    try {
      if (reg.inventarioJson) {
        inventario = JSON.parse(reg.inventarioJson);
      }
    } catch {
      inventario = [];
    }

    leitor.restaurarEstado(
      reg.experiencia,
      reg.vida,
      reg.sabedoria,
      reg.tituloAtivo,
      reg.totalXpGanho,
      reg.multiplicadorXP,
      inventario,
      reg.vidaMaxima
    );

    return leitor;
  }

  private converterParaLivro(reg: any): InimigoLivro {
    let livro: InimigoLivro;

    if (reg.isBoss) {
      livro = new LivroChefe(
        reg.id,
        reg.titulo,
        reg.autor,
        reg.totalPaginas,
        reg.genero ?? "Geral",
        reg.multiplicadorXP ?? 1.5,
        reg.googleId ?? undefined,
        reg.capaUrl ?? undefined
      );
    } else {
      livro = new InimigoLivro(
        reg.id,
        reg.titulo,
        reg.autor,
        reg.totalPaginas,
        reg.googleId ?? undefined,
        reg.capaUrl ?? undefined
      );
    }

    livro.restaurarEstado(reg.paginasLidas, reg.hpAtual, reg.status as StatusLeitura);
    return livro;
  }
}
