export abstract class EntidadeCombate {
  constructor(
    public readonly nome: string,
    protected vidaMaxima: number,
    protected vida: number
  ) {}

  public getVida(): number {
    return this.vida;
  }

  public getVidaMaxima(): number {
    return this.vidaMaxima;
  }

  public estaVivo(): boolean {
    return this.vida > 0;
  }

  public receberDano(dano: number): void {
    if (dano <= 0) return;
    this.vida = Math.max(0, this.vida - dano);
  }

  public curar(quantidade: number): void {
    if (quantidade <= 0) return;
    this.vida = Math.min(this.vidaMaxima, this.vida + quantidade);
  }
}
