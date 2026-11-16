import { EntidadeCombate } from "./entidadeCombate.ts";
import { ItemLoja } from "./interfaces.ts";

export class Leitor extends EntidadeCombate {
  private exp: number = 0;
  private inventario: ItemLoja[] = [];

  constructor(
    public readonly id: string,
    nome: string,
    vidaMaxima: number = 100,
    private danoPorPagina: number = 1
  ) {
    super(nome, vidaMaxima, vidaMaxima);
  }

  public getNivel(): number {
    return Math.floor(this.exp / 100) + 1;
  }

  public getExperiencia(): number {
    return this.exp;
  }

  public getExp(): number {
    return this.exp;
  }

  public getDanoPorPagina(): number {
    return this.danoPorPagina;
  }

  public getInventario(): ItemLoja[] {
    return [...this.inventario];
  }

  public ganharExperiencia(quantidade: number): void {
    if (quantidade > 0) {
      this.exp += quantidade;
    }
  }

  public calcularDano(paginas: number): number {
    return paginas * this.danoPorPagina;
  }

  public comprarItem(item: ItemLoja): void {
    if (this.exp < item.custoXP) {
      throw new Error(`XP insuficiente! Você possui ${this.exp} XP e o item custa ${item.custoXP} XP.`);
    }

    this.exp -= item.custoXP;
    this.inventario.push(item);

    if (item.tipo === "DANO") {
      this.danoPorPagina += item.valor;
    } else if (item.tipo === "CURA") {
      this.curar(item.valor);
    } else if (item.tipo === "MAX_VIDA") {
      this.vidaMaxima += item.valor;
      this.vida += item.valor;
    }
  }

  public restaurarEstado(exp: number, vida?: number): void {
    this.exp = exp;
    if (typeof vida === "number") {
      this.vida = Math.min(this.vidaMaxima, Math.max(0, vida));
    }
  }
}