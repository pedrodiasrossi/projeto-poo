import { Leitor } from "./leitor.ts";
import { InimigoLivro } from "./livroModel.ts";
import { ResultadoAtaqueLeitura } from "./interfaces.ts";

export class Batalha {
  public processarTurnoLeitura(
    leitor: Leitor,
    livro: InimigoLivro,
    paginasLidas: number
  ): ResultadoAtaqueLeitura {
    // 1 página lida = 1 de dano no livro
    const dano = leitor.calcularDano(paginasLidas);

    const { danoCausado, finalizado } = livro.receberLeitura(dano);

    // XP base proporcional às páginas lidas multiplicado pelo multiplicador de sabedoria/estudos do leitor
    let xpGanho = Math.round(danoCausado * 2 * leitor.getMultiplicadorXP());

    let sabedoriaGanha = 0;

    if (finalizado) {
      xpGanho += 100;
      // Ao derrotar/concluir um livro, o leitor ganha Sabedoria! Livro Chefe concede o dobro via polimorfismo.
      sabedoriaGanha = livro.getSabedoriaRecompensa();
      leitor.ganharSabedoria(sabedoriaGanha);
    }

    if (!leitor.estaVivo){
      throw new Error("O herói está exausto! Tome um Café Élfico ou descanse antes de continuar lendo.");
    }

    // Aplica o cálculo polimórfico de XP do próprio InimigoLivro (LivroChefe aplica seu multiplicador)
    xpGanho = livro.calcularXP(xpGanho);
    leitor.ganharExperiencia(xpGanho);

    return {
      danoCausado,
      vidaRestanteLivro: livro.getVida(),
      livroDerrotado: finalizado,
      xpGanho,
      sabedoriaGanha,
      nivelAtual: leitor.getNivel(),
    };
  }
}
