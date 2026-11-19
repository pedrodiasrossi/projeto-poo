import { Leitor } from "./leitor.ts";
import { InimigoLivro } from "./livroModel.ts";

export type StatusLeitura = "QUERO_LER" | "LENDO" | "LIDO" | "ABANDONADO";
export type statusLeitura = StatusLeitura;

export interface ResultadoAtaqueLeitura {
  danoCausado: number;
  vidaRestanteLivro: number;
  livroDerrotado: boolean;
  xpGanho: number;
  sabedoriaGanha?: number;
  nivelAtual: number;
}
export type resultadoAtaqueLeitura = ResultadoAtaqueLeitura;

export interface LeitorData {
  id: string;
  nome: string;
  vida: number;
  vidaMaxima: number;
  exp: number;
  totalXpGanho?: number;
  sabedoria?: number;
  titulo?: string;
}
export type leitorData = LeitorData;

export interface LivroData {
  id: string;
  titulo: string;
  autor: string;
  totalPaginas: number;
  progresso: number;
  hpAtual: number;
  status: StatusLeitura;
  isBoss: boolean;
  leitorId: string;
}
export type livroData = LivroData;

export interface JogoRepository {
  salvarLeitor(leitor: Leitor): Promise<void>;
  carregarLeitor(id: string): Promise<Leitor | null>;

  salvarLivro(livro: InimigoLivro, leitorId: string): Promise<void>;
  carregarLivro(id: string): Promise<InimigoLivro | null>;
  listarLivrosDoLeitor(leitorId: string): Promise<InimigoLivro[]>;
  removerLivro(id: string): Promise<boolean>;
}
export type jogoRepository = JogoRepository;

export interface ItemLoja {
  id: string;
  nome: string;
  descricao: string;
  custoXP: number;
  custoSabedoria?: number;
  tipo: "CURA" | "MAX_VIDA" | "BONUS_XP" | "TITULO";
  valor: number | string;
}