import { EntidadeCombate } from "./entidadeCombate";
import { StatusLeitura } from "./interfaces";

export class InimigoLivro extends EntidadeCombate {
  private paginasLidas: number = 0;
  private status: StatusLeitura = "QUERO_LER";

  constructor(
    public readonly id: string,
    public readonly titulo: string,
    public readonly autor: string,
    public readonly totalPaginas: number,
    public readonly googleBooksId?: string,
    public readonly capaUrl?: string
  ) {
    super(titulo, totalPaginas, totalPaginas);
  }

  public receberLeitura(paginas: number): { danoCausado: number; finalizado: boolean } {
    if (!this.estaVivo()) {
      throw new Error(`O livro "${this.titulo}" já foi concluído/derrotado!`);
    }

    if (paginas <= 0) {
      throw new Error("A quantidade de páginas lidas deve ser maior que zero.");
    }

    // O dano real não pode ultrapassar a vida (páginas restantes) do livro
    const danoReal = Math.min(paginas, this.vida);

    // Incrementa o histórico de páginas lidas
    this.paginasLidas += danoReal;

    // Aplica o dano herdado da EntidadeCombate (reduz a vida)
    this.receberDano(danoReal);

    // Se o livro ainda estava apenas na lista de desejos, passa a estar sendo lido
    if (this.status === "QUERO_LER") {
      this.status = "LENDO";
    }

    // Se a vida zerou, o livro foi finalizado (derrotado)
    const finalizado = !this.estaVivo();
    if (finalizado) {
      this.status = "LIDO";
    }

    return {
      danoCausado: danoReal,
      finalizado,
    };
  }

  public getPaginasLidas(): number {
    return this.paginasLidas;
  }

  public getStatus(): StatusLeitura {
    return this.status;
  }

  public restaurarEstado(paginasLidas: number, vida: number, status: StatusLeitura): void {
    this.paginasLidas = paginasLidas;
    this.vida = Math.min(this.vidaMaxima, Math.max(0, vida));
    this.status = status;
  }
}

export class LivroChefe extends InimigoLivro {
  constructor(
    id: string,
    titulo: string,
    autor: string,
    totalPaginas: number,
    public readonly genero: string,
    public readonly multiplicadorXP: number = 1.5,
    googleBooksId?: string,
    capaUrl?: string
  ) {
    super(id, titulo, autor, totalPaginas, googleBooksId, capaUrl);
  }

  public calcularBonusXP(xpBase: number): number {
    return Math.round(xpBase * this.multiplicadorXP);
  }
}
