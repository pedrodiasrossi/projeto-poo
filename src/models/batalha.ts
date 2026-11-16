import { Leitor } from "./leitor";
import { InimigoLivro, LivroChefe } from "./livroModel";
import { ResultadoAtaqueLeitura } from "./interfaces";

export class Batalha {
  public processarTurnoLeitura(
    leitor: Leitor,
    livro: InimigoLivro,
    paginasLidas: number
  ): ResultadoAtaqueLeitura {
    const dano = leitor.calcularDano(paginasLidas);

    const { danoCausado, finalizado } = livro.receberLeitura(dano);

    let xpGanho = danoCausado * 2;

    if (finalizado) {
      xpGanho += 100;
    }

    if (livro instanceof LivroChefe) {
      xpGanho = livro.calcularBonusXP(xpGanho);
    }

    leitor.ganharExperiencia(xpGanho);

    return {
      danoCausado,
      vidaRestanteLivro: livro.getVida(),
      livroDerrotado: finalizado,
      xpGanho,
      nivelAtual: leitor.getNivel(),
    };
  }
}