import { EntidadeCombate } from "./entidadeCombate.ts";
import { ItemLoja } from "./interfaces.ts";

export class Leitor extends EntidadeCombate {
  private exp: number = 0;
  private totalXpGanho: number = 0;
  private sabedoria: number = 0;
  private multiplicadorXP: number = 1.0;
  private tituloAtivo: string = "Leitor Novato";
  private inventario: ItemLoja[] = [];

  constructor(
    public readonly id: string,
    nome: string,
    vidaMaxima: number = 100
  ) {
    super(nome, vidaMaxima, vidaMaxima);
  }

  public setNome(novoNome: string): void {
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) {
      throw new Error("O nome do leitor não pode ser vazio.");
    }
    this.nome = nomeLimpo;
  }

  /**
   * O nível do leitor é calculado com base no total acumulado histórico de XP
   * ganho pelo personagem (cada 100 XP acumulados = +1 Nível).
   * Gastar XP na loja não diminui o nível do herói!
   */
  public getNivel(): number {
    return Math.floor(this.totalXpGanho / 100) + 1;
  }

  public getExperiencia(): number {
    return this.exp;
  }

  public getExp(): number {
    return this.exp;
  }

  public getTotalXpGanho(): number {
    return this.totalXpGanho;
  }

  public getSabedoria(): number {
    return this.sabedoria;
  }

  public getMultiplicadorXP(): number {
    return this.multiplicadorXP;
  }

  public getTitulo(): string {
    return this.tituloAtivo;
  }

  public getDanoPorPagina(): number {
    return 1;
  }

  public getInventario(): ItemLoja[] {
    return [...this.inventario];
  }

  public ganharExperiencia(quantidade: number): void {
    if (quantidade > 0) {
      this.exp += quantidade;
      this.totalXpGanho += quantidade;
    }
  }

  public ganharSabedoria(quantidade: number): void {
    if (quantidade > 0) {
      this.sabedoria += quantidade;
    }
  }

  public calcularDano(paginas: number): number {
    // 1 página lida é sempre 1 ponto de dano no livro
    return paginas;
  }

  public comprarItem(item: ItemLoja): void {
    const custoSab = item.custoSabedoria ?? 0;
    const custoXP = item.custoXP ?? 0;

    // 1. Verificações de saldo
    if (custoXP > 0 && this.exp < custoXP) {
      throw new Error(`XP insuficiente! Você possui ${this.exp} XP e o item custa ${custoXP} XP.`);
    }

    if (custoSab > 0 && this.sabedoria < custoSab) {
      throw new Error(
        `Sabedoria insuficiente! Você possui ${this.sabedoria} Sabedoria e o item requer ${custoSab}.`
      );
    }

    // 2. Regras de negócio por tipo de item antes de debitar
    if (item.tipo === "CURA") {
      if (this.vida >= this.vidaMaxima) {
        throw new Error("Sua energia/vida já está no máximo! Não é necessário se curar agora.");
      }
    } else if (item.tipo === "TITULO") {
      const nomeTitulo = String(item.valor);
      const jaPossui =
        this.tituloAtivo === nomeTitulo ||
        this.inventario.some((i) => i.tipo === "TITULO" && String(i.valor) === nomeTitulo);
      if (jaPossui) {
        throw new Error(`Você já possui o título "${nomeTitulo}" desbloqueado!`);
      }
    } else if (item.tipo === "BONUS_XP") {
      const jaPossuiEquipamento = this.inventario.some((i) => i.id === item.id);
      if (jaPossuiEquipamento) {
        throw new Error(`Você já possui o equipamento "${item.nome}" equipado!`);
      }
    }

    // Debita recursos
    this.exp -= custoXP;
    this.sabedoria -= custoSab;
    this.inventario.push(item);

    // Aplica efeito
    if (item.tipo === "CURA") {
      this.curar(Number(item.valor));
    } else if (item.tipo === "MAX_VIDA") {
      const valor = Number(item.valor);
      this.vidaMaxima += valor;
      this.vida += valor;
    } else if (item.tipo === "BONUS_XP") {
      this.multiplicadorXP += Number(item.valor);
    } else if (item.tipo === "TITULO") {
      this.tituloAtivo = String(item.valor);
    }
  }

  public restaurarEstado(
    exp: number,
    vida?: number,
    sabedoria?: number,
    titulo?: string,
    totalXpGanho?: number,
    multiplicadorXP?: number,
    inventario?: ItemLoja[],
    vidaMaxima?: number
  ): void {
    this.exp = exp;
    this.totalXpGanho = typeof totalXpGanho === "number" ? totalXpGanho : Math.max(exp, this.totalXpGanho);
    if (typeof vidaMaxima === "number") {
      this.vidaMaxima = vidaMaxima;
    }
    if (typeof vida === "number") {
      this.vida = Math.min(this.vidaMaxima, Math.max(0, vida));
    }
    if (typeof sabedoria === "number") {
      this.sabedoria = sabedoria;
    }
    if (titulo) {
      this.tituloAtivo = titulo;
    }
    if (typeof multiplicadorXP === "number") {
      this.multiplicadorXP = multiplicadorXP;
    }
    if (Array.isArray(inventario)) {
      this.inventario = [...inventario];
    }
  }
}
