import { InimigoLivro } from "./livroModel";
import { Leitor } from "./leitor";

export class Jogo {
  private readonly estante: Map<string, InimigoLivro> = new Map();

  constructor(public readonly leitor: Leitor) {}

  public adicionarLivro(livro: InimigoLivro): void {
    this.estante.set(livro.id, livro);
  }

  public buscarLivro(id: string): InimigoLivro | undefined {
    return this.estante.get(id);
  }

  public listarLivros(): InimigoLivro[] {
    return Array.from(this.estante.values());
  }

  public removerLivro(id: string): boolean {
    return this.estante.delete(id);
  }
}
