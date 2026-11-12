type statusLeitura = "QUERO_LER" | "LENDO" | "LIDO" | "ABANDONADO";

interface resultadoAtaqueLeitura{
    danoCausado: number;
    vidaRestanteLivro: number;
    livroDerrotado: boolean:
    xpGanho: number;
    nivelAtual: number;
}

interface leitorData {
    id: string;
    nome: string;
    vida: number;
    vidaMaxima: number;
    exp: number;
}

interface livroData {
    id: string;
    titulo: string;
    autor: string;
    totalPaginas: number;
    progresso: number;
    hpAtual: number;
    status: statusLeitura;
    isBoss: boolean;
    leitorId: string;
}

interface jogoRepository {
    salvarLeitor(leitor: Leitor): Promise<void>;
    carregarLeitor(id: string): Promise<Leitor | null>;

    salvarLivro(livro: InimigoLivro, leitorId: string): Promise<void>;
    carregarLivro(id: string): Promise<InimigoLivro | null>;
    listarLivrosDoLeitor(leitorId: string): Promise<InimigoLivro[]>;
    removerLivro(id: string): Promise<boolean>;
}

abstract class EntidadeCombate {
    constructor (
        public readonly nome: string,
        private vidaMaxima: number,
        private vida: number
    ) {}

    getVida(): number{}
    getVidaMaxima(): number{}
    estaVivo(): number{}
    receberDano(dano: number): void{}
    curar(quantidade: number): void{}
}

class Leitor extends EntidadeCombate{
    private exp: number = 0;

    constructor(
        readonly id: string,
        nome: string,
        vidaMaxima: number = 100,
        private danoPorPagina: number = 15,
    ) {
        super(nome, vidaMaxima, vidaMaxima);
    }
    
    getNivel(): number{
        return Math.floor(this.exp / 10) + 1;
    }

    getExp(): number{
        return this.exp;
    }

    ganharExperiencia(quantidade: number): void{
        if(quantidade > 0){
            this.exp = this.exp + quantidade;
        }
    }

    calcularDano(paginas: number): number{
        return paginas * this.danoPorPagina;
    }

    restaurarEstado(exp: number, vida?: number): void{
        this.exp = exp;
        this.vida = vida;
    }

}

class InimigoLivro extends EntidadeCombate {
    private paginasLidas: number = 0;
    private status: statusLeitura =  "QUERO_LER";

    constructor(
        public readonly id: string,
        public readonly titulo: string,
        public readonly autor: string,
        public readonly totalPaginas: number,
        public readonly googleBooksId?: string,
        public readonly capaUrl?: string
    ){
        super(titulo, totalPaginas, totalPaginas);
    }

    receberLeitura(paginas: number): {danoCausado: number; finalizado: boolean} {
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

    getStatus(){
        return this.statusLeitura;
    }

    getPaginasLidas(): number{
        return this.paginasLidas;
    }

    getStatus(): statusLeitura{
        return this.status;
    }

    restaurarEstado(paginasLidas: number, vida: number, status: statusLeitura): void{

    }
}

class LivroChefe extends InimigoLivro {
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

class Batalha {
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

class Jogo {
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