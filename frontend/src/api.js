// Camada de comunicação com a API REST do ReadingPG
async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = (data && (data.erro || data.error || data.mensagem || data.message)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

const post = (path, body) =>
  request(path, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

const put = (path, body) =>
  request(path, {
    method: "PUT",
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

const del = (path) =>
  request(path, {
    method: "DELETE"
  });

export const api = {
  // Usuário / Leitor
  obterUsuario: () => request("/api/usuario"),
  criarUsuario: (nome) => post("/api/usuario", { nome }),
  atualizarUsuario: (nome) => put("/api/usuario", { nome }),

  // Estante
  obterEstante: () => request("/api/estante"),
  adicionarLivro: (livro) => post("/api/estante", livro),
  obterLivro: (id) => request(`/api/estante/${encodeURIComponent(id)}`),
  removerLivro: (id) => del(`/api/estante/${encodeURIComponent(id)}`),

  // Combate / Leitura
  atacarLivro: (id, paginas) => post(`/api/estante/${encodeURIComponent(id)}/ler`, { paginas }),

  // Google Books
  buscarLivrosGoogle: (termo) => request(`/api/livros/busca?q=${encodeURIComponent(termo)}`),

  // Loja de Itens por XP
  obterLoja: () => request("/api/loja"),
  comprarItem: (itemId) => post("/api/loja/comprar", { itemId })
};
