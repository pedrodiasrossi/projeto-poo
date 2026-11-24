import { Leitor } from "./leitor.ts";
import { InimigoLivro } from "./livroModel.ts";
import { ResultadoAtaqueLeitura } from "./interfaces.ts";

export class Batalha {
    public processarTurnoLeitura(
        leitor: Leitor,
        livro: InimigoLivro,
        paginasLidas: number
    ): ResultadoAtaqueLeitura {
        if (!leitor.estaVivo()) {
            throw new Error(
                "Seu herói está exausto (0 HP)! Compre um Café Élfico na loja ou descanse antes de continuar lendo."
            );
        }

        const dano = leitor.calcularDano(paginasLidas);
        const { danoCausado, finalizado } = livro.receberLeitura(dano);

        // Contra-ataque polimórfico do livro (apenas Bosses causam dano)
        const contraAtaque = livro.contraAtacar(danoCausado);
        if (contraAtaque.dano > 0) {
            leitor.receberDano(contraAtaque.dano);
        }

        let xpGanho = Math.round(danoCausado * 2 * leitor.getMultiplicadorXP());
        let sabedoriaGanha = 0;

        if (finalizado) {
            xpGanho += 100;
            sabedoriaGanha = livro.getSabedoriaRecompensa();
            leitor.ganharSabedoria(sabedoriaGanha);
        }

        xpGanho = livro.calcularXP(xpGanho);
        leitor.ganharExperiencia(xpGanho);

        return {
            danoCausado,
            vidaRestanteLivro: livro.getVida(),
            livroDerrotado: finalizado,
            xpGanho,
            sabedoriaGanha,
            nivelAtual: leitor.getNivel(),
            danoRecebidoLeitor: contraAtaque.dano,
            vidaRestanteLeitor: leitor.getVida(),
            mensagemContraAtaque: contraAtaque.mensagem,
        };
    }
}
