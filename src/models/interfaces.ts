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
  totalXpGanho: number;
  sabedoria: number;
  multiplicadorXP: number;
  tituloAtivo: string;
  inventario?: ItemLoja[];
}
export type leitorData = LeitorData;

export interface LivroData {
  id: string;
  titulo: string;
  autor: string;
  totalPaginas: number;
  hpAtual: number;
  paginasLidas: number;
  status: StatusLeitura;
  isBoss: boolean;
  leitorId: string;
  genero?: string;
  multiplicadorXP?: number;
  capaUrl?: string;
  googleBooksId?: string;
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