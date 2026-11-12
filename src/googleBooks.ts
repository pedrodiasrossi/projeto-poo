/**
 * ============================================================================
 * SERVIÇO DE INTEGRAÇÃO COM A API DO GOOGLE BOOKS
 * ============================================================================
 * Permite buscar obras reais no catálogo do Google Books para extrair
 * automaticamente número de páginas, título, autores e capa para a estante.
 */

export interface LivroGoogleDTO {
  id: string;
  titulo: string;
  autores: string[];
  totalPaginas: number;
  descricao?: string;
  capaUrl?: string;
}

export class GoogleBooksService {
  /**
   * Busca livros por título, autor ou palavra-chave na API pública do Google Books.
   * @param termo Palavra de busca (ex: "O Senhor dos Anéis", "Duna")
   * @param limite Quantidade máxima de resultados (padrão 5)
   */
  public async buscar(termo: string, limite = 5): Promise<LivroGoogleDTO[]> {
    if (!termo || termo.trim().length === 0) {
      return [];
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      termo
    )}&maxResults=${limite}`;

    try {
      const resposta = await fetch(url);

      if (!resposta.ok) {
        throw new Error(
          `Erro na API Google Books: ${resposta.status} ${resposta.statusText}`
        );
      }

      const dados = await resposta.json();

      if (!dados.items || !Array.isArray(dados.items)) {
        return [];
      }

      return dados.items.map((item: any) => {
        const info = item.volumeInfo || {};

        return {
          id: item.id,
          titulo: info.title || "Sem título informado",
          autores: info.authors || ["Autor desconhecido"],
          // Se a API não informar a quantidade de páginas, adota 100 como padrão
          totalPaginas: typeof info.pageCount === "number" && info.pageCount > 0
            ? info.pageCount
            : 100,
          descricao: info.description,
          capaUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
        };
      });
    } catch (erro) {
      console.error("Erro ao consultar Google Books:", erro);
      throw erro;
    }
  }
}
