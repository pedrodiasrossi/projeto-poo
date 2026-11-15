/**
 * ============================================================================
 * SERVIÇO DE BUSCA DE LIVROS (Com Fallback e Tratamento de Rate Limit)
 * ============================================================================
 * Busca no Google Books. Se a API do Google bloquear por quota/rate limit (429),
 * busca automaticamente na OpenLibrary ou em um catálogo local de livros clássicos,
 * garantindo que o usuário nunca receba erro 500 ao pesquisar.
 */

export interface LivroGoogleDTO {
  id: string;
  titulo: string;
  autores: string[];
  totalPaginas: number;
  descricao?: string;
  capaUrl?: string;
}

const LIVROS_CATALOGO_OFFLINE: LivroGoogleDTO[] = [
  {
    id: "hobbit-tolkien",
    titulo: "O Hobbit",
    autores: ["J.R.R. Tolkien"],
    totalPaginas: 310,
    descricao: "Bilbo Bolseiro embarca em uma aventura inesperada com anões e Gandalf.",
    capaUrl: "https://covers.openlibrary.org/b/id/8406786-M.jpg",
  },
  {
    id: "senhor-dos-aneis-1",
    titulo: "O Senhor dos Anéis: A Sociedade do Anel",
    autores: ["J.R.R. Tolkien"],
    totalPaginas: 576,
    descricao: "O início da jornada para destruir o Um Anel em Mordor.",
    capaUrl: "https://covers.openlibrary.org/b/id/8406788-M.jpg",
  },
  {
    id: "dom-casmurro",
    titulo: "Dom Casmurro",
    autores: ["Machado de Assis"],
    totalPaginas: 256,
    descricao: "Bentinho e suas memórias sobre a misteriosa Capitu.",
    capaUrl: "https://covers.openlibrary.org/b/id/10543206-M.jpg",
  },
  {
    id: "harry-potter-1",
    titulo: "Harry Potter e a Pedra Filosofal",
    autores: ["J.K. Rowling"],
    totalPaginas: 264,
    descricao: "O jovem bruxo descobre seu passado e o mundo da magia.",
    capaUrl: "https://covers.openlibrary.org/b/id/10521270-M.jpg",
  },
  {
    id: "clean-code",
    titulo: "Código Limpo: Habilidades Práticas do Agile Software",
    autores: ["Robert C. Martin"],
    totalPaginas: 425,
    descricao: "Guia essencial para escrever código sustentável e legível.",
    capaUrl: "https://covers.openlibrary.org/b/id/9255566-M.jpg",
  },
  {
    id: "duna-herbert",
    titulo: "Duna",
    autores: ["Frank Herbert"],
    totalPaginas: 680,
    descricao: "A luta pelo planeta árido Arrakis e a especiaria Melange.",
    capaUrl: "https://covers.openlibrary.org/b/id/11153218-M.jpg",
  },
  {
    id: "1984-orwell",
    titulo: "1984",
    autores: ["George Orwell"],
    totalPaginas: 336,
    descricao: "A distopia do Grande Irmão e a vigilância total.",
    capaUrl: "https://covers.openlibrary.org/b/id/7222246-M.jpg",
  },
  {
    id: "pequeno-principe",
    titulo: "O Pequeno Príncipe",
    autores: ["Antoine de Saint-Exupéry"],
    totalPaginas: 96,
    descricao: "Uma fábula poética sobre amizade, amor e perda.",
    capaUrl: "https://covers.openlibrary.org/b/id/8228691-M.jpg",
  },
  {
    id: "frankenstein-shelley",
    titulo: "Frankenstein",
    autores: ["Mary Shelley"],
    totalPaginas: 280,
    descricao: "A criatura do Dr. Frankenstein e o terror da criação humana.",
    capaUrl: "https://covers.openlibrary.org/b/id/8231856-M.jpg",
  },
];

export class GoogleBooksService {
  /**
   * Busca livros com múltiplos níveis de contingência:
   * 1. Tenta a API do Google Books.
   * 2. Se o Google retornar 429 (Too Many Requests), consulta a OpenLibrary.
   * 3. Se tudo falhar ou offline, busca no catálogo local embutido.
   */
  public async buscar(termo: string, limite = 5): Promise<LivroGoogleDTO[]> {
    if (!termo || termo.trim().length === 0) {
      return [];
    }

    const termoNormalizado = termo.trim().toLowerCase();

    // 1. TENTATIVA GOOGLE BOOKS
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        termo
      )}&maxResults=${limite}`;
      const resposta = await fetch(url, { headers: { "User-Agent": "ReadingPG/1.0" } });

      if (resposta.ok) {
        const dados = await resposta.json();
        if (dados.items && Array.isArray(dados.items)) {
          return dados.items.map((item: any) => {
            const info = item.volumeInfo || {};
            return {
              id: item.id,
              titulo: info.title || "Sem título informado",
              autores: info.authors || ["Autor desconhecido"],
              totalPaginas:
                typeof info.pageCount === "number" && info.pageCount > 0
                  ? info.pageCount
                  : 150,
              descricao: info.description,
              capaUrl:
                info.imageLinks?.thumbnail?.replace("http://", "https://") ||
                info.imageLinks?.smallThumbnail?.replace("http://", "https://"),
            };
          });
        }
      } else {
        console.warn(
          `[GoogleBooks] Resposta não-ok (${resposta.status} ${resposta.statusText}). Ativando fallback OpenLibrary...`
        );
      }
    } catch (e: any) {
      console.warn(`[GoogleBooks] Erro na requisição: ${e.message}. Ativando fallback...`);
    }

    // 2. FALLBACK OPENLIBRARY (API Pública sem limites rígidos de 429)
    try {
      const urlOl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        termo
      )}&limit=${limite}`;
      const resOl = await fetch(urlOl);

      if (resOl.ok) {
        const dataOl = await resOl.json();
        if (dataOl.docs && Array.isArray(dataOl.docs) && dataOl.docs.length > 0) {
          return dataOl.docs.slice(0, limite).map((doc: any, idx: number) => {
            // Tenta obter número real de páginas de várias propriedades que a OpenLibrary pode retornar
            let paginas = 0;
            if (typeof doc.number_of_pages_median === "number" && doc.number_of_pages_median > 0) {
              paginas = doc.number_of_pages_median;
            } else if (typeof doc.number_of_pages === "number" && doc.number_of_pages > 0) {
              paginas = doc.number_of_pages;
            } else if (Array.isArray(doc.edition_pages) && doc.edition_pages.length > 0) {
              const validPages = doc.edition_pages.filter((p: any) => typeof p === "number" && p > 0);
              if (validPages.length > 0) {
                paginas = Math.round(validPages.reduce((a: number, b: number) => a + b, 0) / validPages.length);
              }
            }

            // Se a API externa não informou páginas para esta edição, estimamos uma quantidade coerente
            if (!paginas || paginas <= 0) {
              paginas = 320;
            }

            return {
              id: doc.key?.replace("/works/", "") || `ol-${Date.now()}-${idx}`,
              titulo: doc.title || "Título desconhecido",
              autores: doc.author_name || ["Autor desconhecido"],
              totalPaginas: paginas,
              capaUrl: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : undefined,
            };
          });
        }
      }
    } catch (e: any) {
      console.warn(`[OpenLibrary] Falha no fallback OpenLibrary: ${e.message}`);
    }

    // 3. FALLBACK CATALOGO EMBUTIDO / OFFLINE
    const correspondencias = LIVROS_CATALOGO_OFFLINE.filter(
      (l) =>
        l.titulo.toLowerCase().includes(termoNormalizado) ||
        l.autores.some((a) => a.toLowerCase().includes(termoNormalizado))
    );

    if (correspondencias.length > 0) {
      return correspondencias;
    }

    // Se não encontrou no catálogo padrão, gera uma opção personalizada com o termo pesquisado
    // para que o jogador nunca fique travado
    return [
      {
        id: `custom-${Date.now()}`,
        titulo: termo.charAt(0).toUpperCase() + termo.slice(1),
        autores: ["Autor da Obra"],
        totalPaginas: 250,
        descricao: `Livro ${termo} adicionado para batalha.`,
        capaUrl: "https://covers.openlibrary.org/b/id/8406786-M.jpg",
      },
    ];
  }
}
