import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Swords,
  ShoppingBag,
  Sparkles,
  Heart,
  Zap,
  Shield,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  ChevronRight,
  BookMarked,
  GraduationCap,
  Crown
} from "lucide-react";
import { api } from "./api.js";

export default function App() {
  const [tab, setTab] = useState("arena"); // "arena" | "estante" | "loja"
  const [leitor, setLeitor] = useState(null);
  const [livros, setLivros] = useState([]);
  const [activeBookId, setActiveBookId] = useState("");
  const [shopData, setShopData] = useState({ itens: [], saldoXP: 0, saldoSabedoria: 0, inventario: [] });

  // Busca no Google Books
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isBossNewBook, setIsBossNewBook] = useState(false);

  // Combate
  const [pagesToRead, setPagesToRead] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Criação / Edição do Nome do Herói
  const [heroNameInput, setHeroNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);

  const [events, setEvents] = useState([
    { type: "system", text: "Bem-vindo ao ReadingPG! Conecte-se e derrote livros lendo páginas reais." }
  ]);

  const log = (type, text) => {
    setEvents((old) => [
      { type, text, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
      ...old
    ].slice(0, 10));
  };

  const carregarDados = useCallback(async () => {
    try {
      const [usuarioRes, estanteRes, lojaRes] = await Promise.all([
        api.obterUsuario(),
        api.obterEstante(),
        api.obterLoja()
      ]);

      if (usuarioRes && !usuarioRes.precisaCadastro && usuarioRes.nome) {
        setLeitor(usuarioRes);
        setShowNameModal(false);
      } else {
        setLeitor(null);
        setShowNameModal(true);
      }
      const estanteLivros = estanteRes.estante || [];
      setLivros(estanteLivros);
      setShopData(lojaRes);

      setActiveBookId((curr) => {
        if (estanteLivros.some((b) => b.id === curr)) return curr;
        const primeiroVivo = estanteLivros.find((b) => !b.derrotado);
        return primeiroVivo?.id || estanteLivros[0]?.id || "";
      });

      setError("");
    } catch (e) {
      setError(`Erro ao conectar ao servidor: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const livroAtivo = livros.find((b) => b.id === activeBookId);

  // Ação de Leitura / Ataque
  const handleAtacar = async () => {
    if (!livroAtivo) return setError("Selecione um livro na estante para ler.");
    const paginas = Number(pagesToRead);
    if (!paginas || paginas <= 0) return setError("Informe uma quantidade válida de páginas.");
    if (paginas > livroAtivo.hpAtual) {
      return setError(
        `Número inválido de páginas: o livro possui apenas ${livroAtivo.hpAtual} página(s) restante(s).`
      );
    }

    setBusy(true);
    setError("");
    try {
      const res = await api.atacarLivro(livroAtivo.id, paginas);
      await carregarDados();
      log(
        "success",
        `Você leu ${res.danoCausado} páginas e causou ${res.danoCausado} de dano em "${livroAtivo.titulo}"! (+${res.xpGanho} XP)`
      );
      if (res.livroDerrotado) {
        log(
          "success",
          `🏆 O LIVRO "${livroAtivo.titulo}" FOI CONCLUÍDO! Você recebeu +${res.sabedoriaGanha || 1} Ponto(s) de Sabedoria!`
        );
      }
    } catch (e) {
      setError(e.message);
      log("error", `Falha no turno: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Buscar livros no Google
  const handleBuscarGoogle = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    setError("");
    try {
      const resultados = await api.buscarLivrosGoogle(searchTerm);
      setSearchResults(resultados);
      if (resultados.length === 0) {
        log("system", `Nenhum livro encontrado para "${searchTerm}".`);
      }
    } catch (e) {
      setError(`Erro na busca do Google Books: ${e.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Adicionar livro à estante
  const handleAdicionarLivro = async (livroGoogle) => {
    setBusy(true);
    setError("");
    try {
      await api.adicionarLivro({
        id: livroGoogle.id,
        titulo: livroGoogle.titulo,
        autor: Array.isArray(livroGoogle.autores) ? livroGoogle.autores.join(", ") : livroGoogle.autores,
        totalPaginas: livroGoogle.totalPaginas,
        capaUrl: livroGoogle.capaUrl,
        isBoss: isBossNewBook,
        genero: "Aventura Literária"
      });
      await carregarDados();
      setActiveBookId(livroGoogle.id);
      setSearchResults([]);
      setSearchTerm("");
      log("success", `Livro "${livroGoogle.titulo}" invocado como monstro na sua estante!`);
      setTab("arena");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Remover livro da estante
  const handleRemoverLivro = async (id, titulo) => {
    if (!confirm(`Remover "${titulo}" da sua estante?`)) return;
    setBusy(true);
    try {
      await api.removerLivro(id);
      await carregarDados();
      log("system", `Livro "${titulo}" foi removido da estante.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Comprar item na loja
  const handleComprarItem = async (item) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.comprarItem(item.id);
      await carregarDados();
      log("success", `Comprou: ${res.item.nome}! ${res.item.descricao}`);
    } catch (e) {
      setError(e.message);
      log("error", `Loja: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Definir ou Alterar Nome do Herói
  const handleSalvarHeroi = async (e) => {
    e.preventDefault();
    if (!heroNameInput.trim()) return setError("Por favor, digite um nome para seu herói.");
    setBusy(true);
    setError("");
    try {
      await api.criarUsuario(heroNameInput.trim());
      await carregarDados();
      setShowNameModal(false);
      log("success", `Herói "${heroNameInput.trim()}" criado com sucesso! Prepare-se para a aventura.`);
      setHeroNameInput("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={22} />
          </div>
          <div>
            <strong>READINGPG</strong>
            <span>RPG LITERÁRIO</span>
          </div>
        </div>

        <div className="side-label">MENU PRINCIPAL</div>

        <button
          className={`nav-item ${tab === "arena" ? "active" : ""}`}
          onClick={() => setTab("arena")}
        >
          <Swords size={18} /> Arena & Leitura
          {tab === "arena" && <span className="nav-dot" />}
        </button>

        <button
          className={`nav-item ${tab === "estante" ? "active" : ""}`}
          onClick={() => setTab("estante")}
        >
          <BookMarked size={18} /> Estante de Livros
          {tab === "estante" && <span className="nav-dot" />}
        </button>

        <button
          className={`nav-item ${tab === "loja" ? "active" : ""}`}
          onClick={() => setTab("loja")}
        >
          <ShoppingBag size={18} /> Loja de XP
          {tab === "loja" && <span className="nav-dot" />}
        </button>

        <div className="sidebar-bottom">
          <div className="orb">⚔️</div>
          <strong>Ler é Desferir Golpes</strong>
          <p>Cada página lida causa 1 de dano no Boss do livro e acumula XP para seu herói.</p>
        </div>

        <div className="sidebar-foot">
          <span className="status-light" />
          {error ? "Desconectado do Backend" : "ReadingPG Conectado"}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="eyebrow">RPG LITERÁRIO • SISTEMA POO</div>
            <h1>
              ReadingPG Arena <span>✦</span>
            </h1>
          </div>
          <div className="top-actions">
            <div className={`connection ${error ? "offline" : ""}`}>
              <span />
              {error ? "Servidor Offline" : "API Conectada"}
            </div>
            <button
              className="icon-button"
              onClick={carregarDados}
              title="Atualizar Dados"
              disabled={busy}
            >
              <RefreshCw size={17} />
            </button>
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
              onClick={() => {
                setHeroNameInput(leitor?.nome || "");
                setShowNameModal(true);
              }}
            >
              <div
                className="avatar"
                title="Clique para editar o nome do Herói"
              >
                {leitor?.nome?.slice(0, 1)?.toUpperCase() || "L"}
              </div>
              {leitor?.titulo && (
                <span
                  style={{
                    fontSize: "11px",
                    background: "#312e81",
                    color: "#a5b4fc",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    border: "1px solid #4338ca",
                    fontWeight: 600
                  }}
                >
                  {leitor.titulo}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* MODAL PRIMEIRO ACESSO / CRIAR HERÓI */}
        {showNameModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(11, 16, 32, 0.85)",
              backdropFilter: "blur(6px)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
              padding: "20px"
            }}
          >
            <div
              className="panel"
              style={{
                maxWidth: "460px",
                width: "100%",
                background: "linear-gradient(145deg, #161a33, #0f1325)",
                border: "1px solid #4a3e7a",
                boxShadow: "0 0 40px rgba(139, 92, 246, 0.25)",
                padding: "32px",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #7c3aed, #4338ca)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  color: "#e0e7ff",
                  boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)"
                }}
              >
                <Award size={30} />
              </div>

              <div className="eyebrow" style={{ color: "#a78bfa" }}>
                BEM-VINDO AO READINGPG
              </div>
              <h2 style={{ font: "700 24px 'Space Grotesk'", margin: "8px 0 10px" }}>
                Crie seu Herói Leitor
              </h2>
              <p style={{ color: "#9aa7c2", fontSize: "12px", lineHeight: 1.6, margin: "0 0 22px" }}>
                Para iniciar sua jornada e transformar suas leituras diárias em golpes de RPG,
                escolha o nome do seu aventureiro:
              </p>

              <form onSubmit={handleSalvarHeroi}>
                <input
                  type="text"
                  placeholder="Ex: Gandalf, Percy Jackson, Rossi..."
                  value={heroNameInput}
                  onChange={(e) => setHeroNameInput(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#0c1020",
                    border: "1px solid #362f59",
                    borderRadius: "10px",
                    padding: "13px 16px",
                    color: "white",
                    font: "600 14px 'Space Grotesk'",
                    marginBottom: "16px",
                    outline: "none"
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="primary-button"
                  style={{ width: "100%", justifyContent: "center", padding: "13px" }}
                  disabled={busy}
                >
                  <Sparkles size={16} /> Iniciar Aventura
                </button>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="alert">
            <AlertTriangle size={18} />
            <span>
              {error}
              <small>Certifique-se de que o backend Deno está rodando na porta 3000.</small>
            </span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {/* STATS DO JOGADOR */}
        <section className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon purple">
              <Award size={18} />
            </div>
            <div className="stat-label">Herói Leitor</div>
            <div className="stat-value">Nível {leitor?.nivel || 1}</div>
            <div className="stat-detail">
              {leitor?.totalXpGanho || 0} XP Total • {leitor?.titulo || "Leitor Novato"}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <Zap size={18} />
            </div>
            <div className="stat-label">XP Disponível (Saldo)</div>
            <div className="stat-value">{leitor?.experiencia || 0} XP</div>
            <div className="stat-detail">Gaste na loja sem perder seu Nível</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pink">
              <Heart size={18} />
            </div>
            <div className="stat-label">Energia do Leitor</div>
            <div className="stat-value">
              {leitor?.vida || 100} / {leitor?.vidaMaxima || 100}
            </div>
            <div className="stat-detail">HP do jogador</div>
            <div className="stat-progress">
              <span
                style={{
                  width: `${leitor ? (leitor.vida / leitor.vidaMaxima) * 100 : 100}%`
                }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon gold">
              <GraduationCap size={18} />
            </div>
            <div className="stat-label">Pontos de Sabedoria</div>
            <div className="stat-value">{leitor?.sabedoria || 0} ★</div>
            <div className="stat-detail">Ganho ao derrotar livros inteiros</div>
          </div>
        </section>

        {/* CONTEÚDO DAS ABAS */}
        {tab === "arena" && (
          <section>
            {livroAtivo ? (
              <div className="combat-hero">
                <div className="boss-cover-wrap">
                  {livroAtivo.capaUrl ? (
                    <img src={livroAtivo.capaUrl} alt={livroAtivo.titulo} />
                  ) : (
                    <BookOpen size={48} color="#8b5cf6" />
                  )}
                  {livroAtivo.isBoss && <div className="boss-badge">CHEFE BOSS</div>}
                </div>

                <div className="boss-details">
                  <div className="eyebrow">INIMIGO ATIVO • LIVRO CHEFE</div>
                  <h2>{livroAtivo.titulo}</h2>
                  <div className="boss-author">{livroAtivo.autor}</div>

                  <div className="hp-bar-container">
                    <div className="hp-bar-labels">
                      <span>Pontos de Vida (Páginas restantes)</span>
                      <strong>
                        {livroAtivo.hpAtual} / {livroAtivo.hpMaximo} HP
                      </strong>
                    </div>
                    <div className="hp-track">
                      <div
                        className="hp-fill"
                        style={{
                          width: `${Math.max(0, (livroAtivo.hpAtual / livroAtivo.hpMaximo) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#9aa7c2" }}>
                    <span>
                      Progresso: <b>{livroAtivo.paginasLidas}</b> pág. lidas
                    </span>
                    <span>•</span>
                    <span>
                      Status: <b>{livroAtivo.status}</b>
                    </span>
                    {livroAtivo.derrotado && (
                      <span style={{ color: "#34d399", fontWeight: 700 }}>🏆 LIVRO DERROTADO</span>
                    )}
                  </div>
                </div>

                <div className="combat-controls">
                  <h4>Sessão de Leitura / Ataque</h4>
                  <div className="read-input-line">
                    <input
                      type="number"
                      min="1"
                      max={livroAtivo.hpAtual || 1}
                      value={pagesToRead}
                      onChange={(e) => setPagesToRead(e.target.value)}
                      placeholder="Páginas lidas"
                      disabled={livroAtivo.derrotado || busy}
                    />
                  </div>
                  <small style={{ color: "#7987a5", fontSize: "11px", display: "block", marginBottom: "8px" }}>
                    Máximo permitido: {livroAtivo.hpAtual} página(s) restante(s)
                  </small>
                  <button
                    className="attack-btn"
                    onClick={handleAtacar}
                    disabled={livroAtivo.derrotado || busy || Number(pagesToRead) > livroAtivo.hpAtual}
                  >
                    <Swords size={16} /> Ler e Atacar
                  </button>
                  {livroAtivo.derrotado && (
                    <p style={{ color: "#34d399", fontSize: "11px", marginTop: "10px", textAlign: "center" }}>
                      Este livro já foi concluído! Escolha outro na estante.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
                <BookOpen size={48} style={{ color: "#a78bfa", marginBottom: "16px" }} />
                <h3>Sua estante ainda não possui nenhum monstro invocado!</h3>
                <p style={{ color: "#8c9ab5", marginBottom: "20px" }}>
                  Busque livros reais da sua biblioteca para transformá-los em Chefes de RPG.
                </p>
                <button className="primary-button" style={{ margin: "0 auto" }} onClick={() => setTab("estante")}>
                  <Plus size={16} /> Buscar Livro no Google Books
                </button>
              </div>
            )}
          </section>
        )}

        {tab === "estante" && (
          <section>
            {/* BUSCA DE NOVOS LIVROS */}
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">GOOGLE BOOKS API</div>
                  <h3>Invocar Novo Livro como Monstro</h3>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#fbbf24" }}>
                  <input
                    type="checkbox"
                    checked={isBossNewBook}
                    onChange={(e) => setIsBossNewBook(e.target.checked)}
                  />
                  Criar como Livro Chefe (Boss com +50% XP)
                </label>
              </div>

              <form onSubmit={handleBuscarGoogle} className="search-bar-wrap">
                <input
                  type="text"
                  placeholder="Digite o título do livro ou autor (ex: 'O Hobbit', 'Dom Casmurro')..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="primary-button" disabled={searchLoading}>
                  <Search size={16} /> {searchLoading ? "Buscando..." : "Pesquisar"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="search-results-list">
                  {searchResults.map((item) => (
                    <div key={item.id} className="search-item-card">
                      {item.capaUrl ? (
                        <img src={item.capaUrl} alt={item.titulo} />
                      ) : (
                        <div
                          style={{
                            width: "55px",
                            height: "80px",
                            background: "#1e2840",
                            borderRadius: "4px",
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          <BookOpen size={20} color="#7483a5" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <strong
                          style={{
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {item.titulo}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#8a98b5" }}>
                          {Array.isArray(item.autores) ? item.autores.join(", ") : item.autores}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "4px 0" }}>
                          <span style={{ fontSize: "11px", color: "#f472b6" }}>
                            ⚔️ Páginas:
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={item.totalPaginas}
                            onChange={(e) => {
                              const novasPags = Math.max(1, Number(e.target.value) || 1);
                              setSearchResults((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, totalPaginas: novasPags } : it))
                              );
                            }}
                            title="Você pode ajustar o número de páginas para bater com sua edição física"
                            style={{
                              width: "70px",
                              background: "#0c1222",
                              border: "1px solid #364468",
                              borderRadius: "4px",
                              color: "#f8fafc",
                              padding: "2px 6px",
                              fontSize: "11px",
                              fontFamily: "'Space Grotesk', sans-serif"
                            }}
                          />
                          <span style={{ fontSize: "9px", color: "#7987a5" }}>HP</span>
                        </div>
                        <button
                          className="secondary-button"
                          style={{ marginTop: "auto", padding: "5px 10px", fontSize: "10px" }}
                          onClick={() => handleAdicionarLivro(item)}
                          disabled={busy}
                        >
                          <Plus size={12} /> Adicionar à Estante
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LISTA DA ESTANTE */}
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">SUA BIBLIOTECA</div>
                  <h3>Livros na Estante ({livros.length})</h3>
                </div>
              </div>

              <div className="bookshelf-grid">
                {livros.map((livro) => {
                  const percent = Math.max(0, Math.min(100, (livro.hpAtual / livro.hpMaximo) * 100));
                  const isActive = livro.id === activeBookId;
                  const rotuloBotao =livro.status === "LIDO" || livro.status === "ABANDONADO"
                    ? livro.status.charAt(0) + livro.status.toLowerCase().slice(1)
                    : isActive
                      ? "Em leitura"
                      : "Selecionar";

                  return (
                    <div key={livro.id} className={`book-card ${isActive ? "is-active" : ""}`}>
                      <div className="book-card-thumb">
                        {livro.capaUrl ? (
                          <img src={livro.capaUrl} alt={livro.titulo} />
                        ) : (
                          <BookOpen size={28} color="#71809d" />
                        )}
                      </div>
                      <div className="book-card-info">
                        <h4>{livro.titulo}</h4>
                        <span className="author">{livro.autor}</span>

                        <div className="hp-track" style={{ height: "6px", margin: "6px 0" }}>
                          <div className="hp-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <span style={{ fontSize: "10px", color: "#92a0bd" }}>
                          {livro.hpAtual} / {livro.hpMaximo} HP
                        </span>

                        <div className="book-card-actions">
                          <button
                            className="select-target-btn"
                            disabled={livro.status === "LIDO" || livro.status === "ABANDONADO"}
                            onClick={() => {
                              if (livro.status === "LIDO" || livro.status === "ABANDONADO") return;
                              setActiveBookId(livro.id);
                              setTab("arena");
                            }}
                          >{rotuloBotao}
                          </button>
                          <button
                            className="delete-book-btn"
                            title="Remover"
                            onClick={() => handleRemoverLivro(livro.id, livro.titulo)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {tab === "loja" && (
          <section>
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">MERCADOR LITERÁRIO & ACADEMIA DOS SÁBIOS</div>
                  <h3>Loja de Recompensas de Leitura</h3>
                </div>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ font: "700 15px 'Space Grotesk'", color: "#38bdf8" }}>
                    Saldo: {leitor?.experiencia || 0} XP
                  </div>
                  <div style={{ font: "700 15px 'Space Grotesk'", color: "#facc15" }}>
                    Sabedoria: {leitor?.sabedoria || 0} ★
                  </div>
                </div>
              </div>
              <p style={{ color: "#8f9cb5", fontSize: "12px", marginTop: "-6px", marginBottom: "20px" }}>
                Gaste pontos de experiência para restaurar energia, expandir foco e acelerar aprendizados — ou use pontos de Sabedoria (conquistados ao concluir livros) para desbloquear Títulos honoríficos!
              </p>

              <div className="shop-grid">
                {shopData.itens.map((item) => {
                  const custoXP = item.custoXP || 0;
                  const custoSab = item.custoSabedoria || 0;
                  const temXP = (leitor?.experiencia || 0) >= custoXP;
                  const temSab = (leitor?.sabedoria || 0) >= custoSab;
                  const podeComprar = temXP && temSab;

                  const isTitulo = item.tipo === "TITULO";
                  const jaPossuiTitulo = isTitulo && leitor?.titulo === item.valor;

                  return (
                    <div key={item.id} className="shop-card">
                      <div
                        className="shop-card-icon"
                        style={{
                          background:
                            item.tipo === "TITULO"
                              ? "#facc1522"
                              : item.tipo === "BONUS_XP"
                              ? "#a78bfa22"
                              : item.tipo === "CURA"
                              ? "#f472b622"
                              : "#38bdf822",
                          color:
                            item.tipo === "TITULO"
                              ? "#facc15"
                              : item.tipo === "BONUS_XP"
                              ? "#c4b5fd"
                              : item.tipo === "CURA"
                              ? "#f9a8d4"
                              : "#7dd3fc"
                        }}
                      >
                        {item.tipo === "TITULO" ? (
                          <Crown size={22} />
                        ) : item.tipo === "BONUS_XP" ? (
                          <Sparkles size={22} />
                        ) : item.tipo === "CURA" ? (
                          <Heart size={22} />
                        ) : (
                          <Shield size={22} />
                        )}
                      </div>
                      <h4>{item.nome}</h4>
                      <p>{item.descricao}</p>
                      <div className="shop-card-foot">
                        <div className="shop-cost">
                          {custoSab > 0 ? (
                            <>
                              <GraduationCap size={16} /> {custoSab} Sabedoria
                            </>
                          ) : (
                            <>
                              <Zap size={16} /> {custoXP} XP
                            </>
                          )}
                        </div>
                        <button
                          className="buy-btn"
                          disabled={!podeComprar || busy || jaPossuiTitulo}
                          onClick={() => handleComprarItem(item)}
                        >
                          {jaPossuiTitulo ? "Ativo" : isTitulo ? "Desbloquear" : "Comprar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ITENS COMPRADOS */}
              <div style={{ marginTop: "28px", borderTop: "1px solid #23304c", paddingTop: "18px" }}>
                <h4 style={{ font: "600 14px 'Space Grotesk'", margin: "0 0 10px" }}>Seu Inventário</h4>
                {leitor?.inventario?.length > 0 ? (
                  <div className="inventory-list">
                    {leitor.inventario.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="inventory-tag">
                        <CheckCircle2 size={13} color="#34d399" /> {item.nome}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#72819d", fontSize: "11px" }}>Você ainda não comprou itens nesta aventura.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* LOG DE EVENTOS */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">REGISTRO DE BATALHA</div>
              <h3>Histórico de Eventos</h3>
            </div>
            <button
              style={{ background: "transparent", border: 0, color: "#8f9bb5", fontSize: "11px" }}
              onClick={() => setEvents([])}
            >
              Limpar histórico
            </button>
          </div>
          <div className="event-list">
            {events.map((ev, i) => (
              <div className="event" key={`${ev.text}-${i}`}>
                <div className={`event-icon ${ev.type}`}>
                  {ev.type === "error" ? (
                    <AlertTriangle size={14} />
                  ) : ev.type === "success" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                </div>
                <div className="event-text">
                  {ev.text}
                  <small>{ev.time || "Sistema"}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="footer">
          <span>
            READINGPG <b>•</b> RPG LITERÁRIO
          </span>
          <span>Aventura focada em POO</span>
          <button onClick={carregarDados}>
            <RefreshCw size={12} /> Sincronizar
          </button>
        </footer>
      </main>
    </div>
  );
}
