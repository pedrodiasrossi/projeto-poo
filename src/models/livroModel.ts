import { EntidadeCombate } from "./entidadeCombate.ts";
import { StatusLeitura } from "./interfaces.ts";

// Patamar mínimo de páginas para um livro se tornar Boss automaticamente
export const PATAMAR_PAGINAS_BOSS = 350;

export interface ResultadoContraAtaque {
    dano: number;
    mensagem?: string;
}

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
        if (!Number.isInteger(totalPaginas) || totalPaginas <= 0) {
            throw new Error("O total de páginas deve ser um número inteiro positivo maior que zero.");
        }
        super(titulo, totalPaginas, totalPaginas);
    }

    public receberLeitura(paginas: number): { danoCausado: number; finalizado: boolean } {
        if (!this.estaVivo()) {
            throw new Error(`O livro "${this.titulo}" já foi concluído/derrotado!`);
        }

        if (paginas <= 0) {
            throw new Error("A quantidade de páginas lidas deve ser maior que zero.");
        }

        if (paginas > this.vida) {
            throw new Error("Número inválido de páginas");
        }

        const danoReal = paginas;
        this.paginasLidas += danoReal;
        this.receberDano(danoReal);

        if (this.status === "QUERO_LER") {
            this.status = "LENDO";
        }

        const finalizado = !this.estaVivo();
        if (finalizado) {
            this.status = "LIDO";
        }

        return {
            danoCausado: danoReal,
            finalizado,
        };
    }

    public abandonar(): number {
        if (this.status === "LIDO" || !this.estaVivo()) {
            throw new Error("Não é possível abandonar um livro que já foi derrotado.");
        }
        if (this.status === "ABANDONADO") {
            throw new Error("Este livro já foi abandonado.");
        }
        this.status = "ABANDONADO";
        return this.getPenalidadeAbandono();
    }

    public getPenalidadeAbandono(): number {
        return 20;
    }

    public contraAtacar(_paginasLidas: number): ResultadoContraAtaque {
        return { dano: 0 };
    }

    public getClasseBoss(): string | null {
        return null;
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

    public calcularXP(xpBase: number): number {
        return xpBase;
    }

    public getSabedoriaRecompensa(): number {
        return 1;
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

    public override getClasseBoss(): string {
        return "Guardião Literário";
    }

    public override getPenalidadeAbandono(): number {
        return 35;
    }

    public override contraAtacar(paginasLidas: number): ResultadoContraAtaque {
        const dano = Math.max(2, Math.floor(paginasLidas / 12));
        return {
            dano,
            mensagem: `⚔️ ${this.titulo} (${this.getClasseBoss()}) revidou com uma onda de exaustão e causou ${dano} de dano!`,
        };
    }

    public override calcularXP(xpBase: number): number {
        return Math.round(xpBase * this.multiplicadorXP);
    }

    public override getSabedoriaRecompensa(): number {
        return 2;
    }
}

export class TomoColossal extends LivroChefe {
    constructor(
        id: string,
        titulo: string,
        autor: string,
        totalPaginas: number,
        genero: string = "Épico Colossal",
        googleBooksId?: string,
        capaUrl?: string
    ) {
        super(id, titulo, autor, totalPaginas, genero, 2.0, googleBooksId, capaUrl);
    }

    public override getClasseBoss(): string {
        return "Tomo Colossal";
    }

    public override getPenalidadeAbandono(): number {
        return 45;
    }

    public override contraAtacar(paginasLidas: number): ResultadoContraAtaque {
        const dano = Math.max(4, Math.floor(paginasLidas / 8));
        return {
            dano,
            mensagem: `🏔️ O peso épico de "${this.titulo}" (${this.getClasseBoss()}) esmagou sua concentração: -${dano} HP!`,
        };
    }

    public override getSabedoriaRecompensa(): number {
        return 3;
    }
}

export class GrimorioSombrio extends LivroChefe {
    constructor(
        id: string,
        titulo: string,
        autor: string,
        totalPaginas: number,
        genero: string = "Sombrio",
        googleBooksId?: string,
        capaUrl?: string
    ) {
        super(id, titulo, autor, totalPaginas, genero, 1.75, googleBooksId, capaUrl);
    }

    public override getClasseBoss(): string {
        return "Grimório Sombrio";
    }

    public override contraAtacar(paginasLidas: number): ResultadoContraAtaque {
        const dano = Math.max(3, Math.floor(paginasLidas / 10));
        return {
            dano,
            mensagem: `👁️ As páginas sombrias de "${this.titulo}" drenaram sua sanidade: -${dano} HP!`,
        };
    }
}

export class CompendioArcano extends LivroChefe {
    constructor(
        id: string,
        titulo: string,
        autor: string,
        totalPaginas: number,
        genero: string = "Técnico / Arcano",
        googleBooksId?: string,
        capaUrl?: string
    ) {
        super(id, titulo, autor, totalPaginas, genero, 1.8, googleBooksId, capaUrl);
    }

    public override getClasseBoss(): string {
        return "Compêndio Arcano";
    }

    public override contraAtacar(paginasLidas: number): ResultadoContraAtaque {
        const dano = Math.max(3, Math.floor(paginasLidas / 9));
        return {
            dano,
            mensagem: `⚡ Os conceitos densos de "${this.titulo}" causaram sobrecarga mental: -${dano} HP!`,
        };
    }
}

export class FabricaLivros {
    public static criar(dados: {
        id: string;
        titulo: string;
        autor: string;
        totalPaginas: number;
        isBoss?: boolean;
        genero?: string;
        googleBooksId?: string;
        capaUrl?: string;
    }): InimigoLivro {
        const { id, titulo, autor, totalPaginas, isBoss, genero, googleBooksId, capaUrl } = dados;

        const ehBoss = Boolean(isBoss) || totalPaginas >= PATAMAR_PAGINAS_BOSS;

        if (!ehBoss) {
            return new InimigoLivro(id, titulo, autor, totalPaginas, googleBooksId, capaUrl);
        }

        const textoAnalise = `${titulo} ${genero ?? ""}`.toLowerCase();

        if (totalPaginas >= 600) {
            return new TomoColossal(
                id,
                titulo,
                autor,
                totalPaginas,
                genero || "Épico Colossal",
                googleBooksId,
                capaUrl
            );
        }

        if (
            /(terror|horror|sombrio|mist[eé]rio|suspense|dr[aá]cula|frankenstein|1984|lovecraft|king)/.test(
                textoAnalise
            )
        ) {
            return new GrimorioSombrio(
                id,
                titulo,
                autor,
                totalPaginas,
                genero || "Terror / Suspense",
                googleBooksId,
                capaUrl
            );
        }

        if (
            /(c[oó]digo|clean code|programa[cç][aã]o|ci[eê]ncia|filosofia|t[eé]cnico|algoritmo|engenharia|matem[aá]tica)/.test(
                textoAnalise
            )
        ) {
            return new CompendioArcano(
                id,
                titulo,
                autor,
                totalPaginas,
                genero || "Técnico / Estudo",
                googleBooksId,
                capaUrl
            );
        }

        return new LivroChefe(
            id,
            titulo,
            autor,
            totalPaginas,
            genero || "Clássico",
            1.5,
            googleBooksId,
            capaUrl
        );
    }
}
