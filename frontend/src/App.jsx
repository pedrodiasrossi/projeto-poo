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
    BookMarked,
    GraduationCap,
    Crown,
    Skull,
    Moon
} from "lucide-react";
import { api } from "./api.js";

const PATAMAR_PAGINAS_BOSS = 350;

export default function App() {
    const [tab, setTab] = useState("arena");
    const [leitor, setLeitor] = useState(null);
    const [livros, setLivros] = useState([]);
    const [activeBookId, setActiveBookId] = useState("");
    const [shopData, setShopData] = useState({ itens: [], saldoXP: 0, saldoSabedoria: 0, inventario: [] });

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isBossNewBook, setIsBossNewBook] = useState(false);
    const [generoNewBook, setGeneroNewBook] = useState("Aventura Literária");

    const [pagesToRead, setPagesToRead] = useState(25);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const [heroNameInput, setHeroNameInput] = useState("");
    const [showNameModal, setShowNameModal] = useState(false);

    const [events, setEvents] = useState([
        { type: "system", text: "Bem-vindo ao ReadingPG! Livros com 350+ páginas despertam como Bosses personalizados." }
    ]);

    const log = (type, text) => {
        setEvents((old) => [
            { type, text, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
            ...old
        ].slice(0, 12));
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
                if (estanteLivros.some((b) => b.id === curr && b.status !== "ABANDONADO")) return curr;
                const primeiroDisponivel = estanteLivros.find(
                    (b) => !b.derrotado && b.status !== "ABANDONADO"
                );
                return primeiroDisponivel?.id || estanteLivros[0]?.id || "";
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
            if (res.danoRecebidoLeitor > 0 && res.mensagemContraAtaque) {
                log("error", res.mensagemContraAtaque);
            }
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

    const handleAbandonarLivro = async (livro) => {
        const penalidade = livro.isBoss ? (livro.hpMaximo >= 600 ? 45 : 35) : 20;
        if (
            !confirm(
                `Tem certeza que deseja abandonar "${livro.titulo}"?\nVocê sofrerá -${penalidade} HP de dano moral!`
            )
        ) {
            return;
        }

        setBusy(true);
        setError("");
        try {
            const res = await api.abandonarLivro(livro.id);
            await carregarDados();
            log("error", `💔 ${res.mensagem}`);
        } catch (e) {
            setError(e.message);
            log("error", e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleDescansar = async () => {
        setBusy(true);
        setError("");
        try {
            const res = await api.descansarUsuario();
            await carregarDados();
            log("success", `🌙 ${res.mensagem}`);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

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

    const handleAdicionarLivro = async (livroGoogle) => {
        setBusy(true);
        setError("");
        try {
            const res = await api.adicionarLivro({
                id: livroGoogle.id,
                titulo: livroGoogle.titulo,
                autor: Array.isArray(livroGoogle.autores) ? livroGoogle.autores.join(", ") : livroGoogle.autores,
                totalPaginas: livroGoogle.totalPaginas,
                capaUrl: livroGoogle.capaUrl,
                isBoss: isBossNewBook,
                genero: generoNewBook
            });
            await carregarDados();
            setActiveBookId(livroGoogle.id);
            setSearchResults([]);
            setSearchTerm("");
            log(res.livro?.isBoss ? "error" : "success", res.mensagem);
            setTab("arena");
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleRemoverLivro = async (livro) => {
        const avisoDano =
            livro.status === "LENDO"
                ? `\n⚠️ Como a leitura está em andamento, fugir causará dano ao seu herói!`
                : "";
        if (!confirm(`Remover "${livro.titulo}" da sua estante?${avisoDano}`)) return;
        setBusy(true);
        try {
            const res = await api.removerLivro(livro.id);
            await carregarDados();
            log(res.danoSofrido > 0 ? "error" : "system", res.mensagem);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

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

    const handleSalvarHeroi = async (e) => {
        e.preventDefault();
        const novoNome = heroNameInput.trim();
        if (!novoNome) return setError("Por favor, digite um nome para seu herói.");
        setBusy(true);
        setError("");
        try {
            if (leitor?.id) {
                await api.atualizarUsuario(novoNome);
                await carregarDados();
                setShowNameModal(false);
                log("success", `Nome do herói alterado para "${novoNome}" com sucesso!`);
            } else {
                await api.criarUsuario(novoNome);
                await carregarDados();
                setShowNameModal(false);
                log("success", `Herói "${novoNome}" criado com sucesso! Prepare-se para a aventura.`);
            }
            setHeroNameInput("");
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const podeInteragirLivro =
        livroAtivo && !livroAtivo.derrotado && livroAtivo.status !== "ABANDONADO";

                  return (
    <div className="app-shell">
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
          <strong>Patamar de Boss: {PATAMAR_PAGINAS_BOSS} pág.</strong>
          <p>Obras longas ou sombrias despertam como Chefes que contra-atacam sua energia!</p>
        </div>

        <div className="sidebar-foot">
          <span className="status-light" />
          {error ? "Desconectado do Backend" : "ReadingPG Conectado"}
        </div>
      </aside>

      <main className="main">
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
              <div className="avatar" title="Clique para editar o nome do Herói">
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
                {leitor?.id ? "PERFIL DO HERÓI" : "BEM-VINDO AO READINGPG"}
              </div>
              <h2 style={{ font: "700 24px 'Space Grotesk'", margin: "8px 0 10px" }}>
                {leitor?.id ? "Renomear Aventureiro" : "Crie seu Herói Leitor"}
              </h2>
              <p style={{ color: "#9aa7c2", fontSize: "12px", lineHeight: 1.6, margin: "0 0 22px" }}>
                {leitor?.id
                  ? "Altere o nome do seu aventureiro. Seu nível, livros e inventário serão mantidos intactos!"
                  : "Para iniciar sua jornada e transformar suas leituras diárias em golpes de RPG, escolha o nome do seu aventureiro:"}
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
                <div style={{ display: "flex", gap: "8px" }}>
                  {leitor?.id && (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ flex: 1, justifyContent: "center", padding: "13px" }}
                      onClick={() => setShowNameModal(false)}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ flex: 1, justifyContent: "center", padding: "13px" }}
                    disabled={busy}
                  >
                    <Sparkles size={16} /> {leitor?.id ? "Salvar Nome" : "Iniciar Aventura"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="alert">
            <AlertTriangle size={18} />
            <span>
              {error}
              <small>Verifique os requisitos da ação ou a conexão com o servidor.</small>
            </span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
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
                                      <div className="stat-detail">
                                          Multiplicador: {leitor?.multiplicadorXP || 1}x XP
                                      </div>
                                  </div>

                                  <div className="stat-card">
                                      <div className="stat-icon pink">
                                          <Heart size={18} />
                                      </div>
                                      <div className="stat-label">Energia do Leitor</div>
                                      <div className="stat-value">
                                          {leitor?.vida ?? 100} / {leitor?.vidaMaxima || 100}
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span className="stat-detail">
                                              {leitor && leitor.vida <= 0 ? "⚠️ Exausto!" : "HP do jogador"}
                                          </span>
                                          {leitor && leitor.vida < leitor.vidaMaxima && (
                                              <button
                                                  onClick={handleDescansar}
                                                  disabled={busy}
                                                  title="Recuperar +15 HP gratuitamente"
                                                  style={{
                                                      background: "#1e293b",
                                                      border: "1px solid #334155",
                                                      color: "#38bdf8",
                                                      borderRadius: "6px",
                                                      padding: "2px 8px",
                                                      fontSize: "10px",
                                                      cursor: "pointer",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "4px"
                                                  }}
                                              >
                                                  <Moon size={11} /> Descansar (+15 HP)
                                              </button>
                                          )}
                                      </div>
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
                                      <div className="stat-label">Sabedoria</div>
                                      <div className="stat-value">{leitor?.sabedoria || 0} ★</div>
                                      <div className="stat-detail">Conquistada ao derrotar livros</div>
                                  </div>
                              </section>

                              {tab === "arena" && (
                                  <section>
                                      {livros.length > 0 && (
                                          <div style={{ marginBottom: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                              {livros.map((b) => (
                                                  <button
                                                      key={b.id}
                                                      className={b.id === activeBookId ? "primary-button" : "secondary-button"}
                                                      style={{ padding: "7px 12px", fontSize: "12px" }}
                                                      onClick={() => setActiveBookId(b.id)}
                                                  >
                                                      {b.isBoss && <Flame size={13} color="#fbbf24" />} {b.titulo}
                                                  </button>
                                              ))}
                                          </div>
                                      )}


                                      {livroAtivo ? (
                                          <div className="panel battle-card">
                                              <div className="book-cover-box">
                                                  {livroAtivo.capaUrl ? (
                                                      <img src={livroAtivo.capaUrl} alt={livroAtivo.titulo} />
                                                  ) : (
                                                      <div className="book-cover-placeholder">
                                                          <BookOpen size={36} />
                                                      </div>
                                                  )}
                                              </div>

                                              <div style={{ flex: 1, minWidth: "240px" }}>
                                                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                                                      <span className="eyebrow">ALVO DA BATALHA</span>
                                                      {livroAtivo.isBoss && (
                                                          <span
                                                              style={{
                                                                  background: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
                                                                  color: "#fef08a",
                                                                  border: "1px solid #f59e0b",
                                                                  borderRadius: "12px",
                                                                  padding: "2px 10px",
                                                                  fontSize: "11px",
                                                                  fontWeight: 700,
                                                                  display: "inline-flex",
                                                                  alignItems: "center",
                                                                  gap: "4px"
                                                              }}
                                                          >
                                                              <Flame size={12} /> {livroAtivo.classeBoss || "BOSS"} ({livroAtivo.multiplicadorXP}x XP)
                                                          </span>
                                                      )}
                                                  </div>

                                                  <h2 style={{ margin: "0 0 4px", font: "700 22px 'Space Grotesk'" }}>
                                                      {livroAtivo.titulo}
                                                  </h2>
                                                  <p style={{ margin: "0 0 14px", color: "#8c9ab5", fontSize: "13px" }}>
                                                      {livroAtivo.autor}
                                                  </p>

                                                  <div style={{ marginBottom: "12px" }}>
                                                      <div
                                                          style={{
                                                              display: "flex",
                                                              justifyContent: "space-between",
                                                              fontSize: "12px",
                                                              marginBottom: "6px"
                                                          }}
                                                      >
                                                          <span>HP do Monstro</span>
                                                          <strong>
                                                              {livroAtivo.hpAtual} / {livroAtivo.hpMaximo} HP
                                                          </strong>
                                                      </div>
                                                      <div className="stat-progress" style={{ height: "10px" }}>
                                                          <span
                                                              style={{
                                                                  width: `${(livroAtivo.hpAtual / livroAtivo.hpMaximo) * 100}%`,
                                                                  background: livroAtivo.isBoss
                                                                      ? "linear-gradient(90deg, #ef4444, #f59e0b)"
                                                                      : undefined
                                                              }}
                                                          />
                                                      </div>
                                                  </div>

                                                  <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#9aa7c2", flexWrap: "wrap" }}>
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
                                                      {livroAtivo.status === "ABANDONADO" && (
                                                          <span style={{ color: "#f87171", fontWeight: 700 }}>💔 ABANDONADO</span>
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
                                                          disabled={!podeInteragirLivro || busy}
                                                      />
                                                  </div>
                                                  <small style={{ color: "#7987a5", fontSize: "11px", display: "block", marginBottom: "8px" }}>
                                                      Máximo permitido: {livroAtivo.hpAtual} página(s) restante(s)
                                                  </small>
                                                  <button
                                                      className="attack-btn"
                                                      onClick={handleAtacar}
                                                      disabled={!podeInteragirLivro || busy || Number(pagesToRead) > livroAtivo.hpAtual}
                                                  >
                                                      <Swords size={16} /> Ler e Atacar
                                                  </button>

                                                  {podeInteragirLivro && (
                                                      <button
                                                          type="button"
                                                          onClick={() => handleAbandonarLivro(livroAtivo)}
                                                          disabled={busy}
                                                          style={{
                                                              width: "100%",
                                                              marginTop: "8px",
                                                              background: "transparent",
                                                              border: "1px solid #7f1d1d",
                                                              color: "#fca5a5",
                                                              borderRadius: "8px",
                                                              padding: "7px",
                                                              fontSize: "11px",
                                                              cursor: "pointer",
                                                              display: "inline-flex",
                                                              alignItems: "center",
                                                              justifyContent: "center",
                                                              gap: "5px"
                                                          }}
                                                      >
                                                          <Skull size={13} /> Abandonar Livro (-{livroAtivo.isBoss ? (livroAtivo.hpMaximo >= 600 ? 45 : 35) : 20} HP)
                                                      </button>
                                                  )}

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
                                      <div className="panel">
                                          <div className="panel-heading">
                                              <div>
                                                  <div className="eyebrow">GOOGLE BOOKS API</div>
                                                  <h3>Invocar Novo Livro como Monstro</h3>
                                              </div>
                                              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                                                  <select
                                                      value={generoNewBook}
                                                      onChange={(e) => setGeneroNewBook(e.target.value)}
                                                      style={{
                                                          background: "#0c1222",
                                                          border: "1px solid #364468",
                                                          borderRadius: "6px",
                                                          color: "#e2e8f0",
                                                          padding: "5px 8px",
                                                          fontSize: "12px"
                                                      }}
                                                  >
                                                      <option value="Aventura Literária">Gênero: Aventura / Fantasia</option>
                                                      <option value="Terror / Suspense">Gênero: Terror / Sombrio</option>
                                                      <option value="Técnico / Estudo">Gênero: Técnico / Ciência</option>
                                                      <option value="Clássico">Gênero: Clássico</option>
                                                  </select>
                                                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#fbbf24" }}>
                                                      <input
                                                          type="checkbox"
                                                          checked={isBossNewBook}
                                                          onChange={(e) => setIsBossNewBook(e.target.checked)}
                                                      />
                                                      Forçar Boss (Auto acima de {PATAMAR_PAGINAS_BOSS} pág.)
                                                  </label>
                                              </div>
                                          </div>

                                          <form onSubmit={handleBuscarGoogle} className="search-bar-wrap">
                                              <input
                                                  type="text"
                                                  placeholder="Digite o título do livro ou autor (ex: 'O Hobbit', 'Duna', '1984')..."
                                                  value={searchTerm}
                                                  onChange={(e) => setSearchTerm(e.target.value)}
                                              />
                                              <button type="submit" className="primary-button" disabled={searchLoading}>
                                                  <Search size={16} /> {searchLoading ? "Buscando..." : "Pesquisar"}
                                              </button>
                                          </form>

                                          {searchResults.length > 0 && (
                                              <div className="search-results-list">
                                                  {searchResults.map((item) => {
                                                      const atingiuPatamarBoss = item.totalPaginas >= PATAMAR_PAGINAS_BOSS || isBossNewBook;
                                                      return (
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
                                                                      <span style={{ fontSize: "11px", color: "#f472b6" }}>⚔️ Páginas:</span>
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
                                                                      {atingiuPatamarBoss && (
                                                                          <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 700 }}>
                                                                              🔥 BOSS
                                                                          </span>
                                                                      )}
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
                                                      );
                                                  })}
                                              </div>
                                          )}
                                      </div>

                                      <div className="panel">
                                          <div className="panel-heading">
                                              <div>
                                                  <div className="eyebrow">SUA BIBLIOTECA</div>
                                                  <h3>Livros na Estante ({livros.length})</h3>
                                              </div>
                                          </div>

                                          <div className="shelf-grid">
                                              {livros.map((livro) => {
                                                  const rotuloBotao =
                                                      livro.status === "LIDO"
                                                          ? "Concluído"
                                                          : livro.status === "ABANDONADO"
                                                              ? "Abandonado"
                                                              : "Combater";

                                                  return (
                                                      <div key={livro.id} className="book-card">
                                                          {livro.capaUrl ? (
                                                              <img src={livro.capaUrl} alt={livro.titulo} />
                                                          ) : (
                                                              <div className="book-card-placeholder">
                                                                  <BookOpen size={24} />
                                                              </div>
                                                          )}
                                                          <div className="book-card-body">
                                                              {livro.isBoss && (
                                                                  <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 700 }}>
                                                                      🔥 {livro.classeBoss || "BOSS"} ({livro.multiplicadorXP}x XP)
                                                                  </span>
                                                              )}
                                                              <h4>{livro.titulo}</h4>
                                                              <p>{livro.autor}</p>
                                                              <div style={{ fontSize: "11px", color: "#9aa7c2", marginBottom: "8px" }}>
                                                                  HP: {livro.hpAtual} / {livro.hpMaximo} • {livro.status}
                                                              </div>
                                                              <div className="book-card-actions">
                                                                  <button
                                                                      className="select-target-btn"
                                                                      disabled={livro.status === "LIDO" || livro.status === "ABANDONADO"}
                                                                      onClick={() => {
                                                                          if (livro.status === "LIDO" || livro.status === "ABANDONADO") return;
                                                                          setActiveBookId(livro.id);
                                                                          setTab("arena");
                                                                      }}
                                                                  >
                                                                      {rotuloBotao}
                                                                  </button>
                                                                  {livro.status !== "LIDO" && livro.status !== "ABANDONADO" && (
                                                                      <button
                                                                          className="delete-book-btn"
                                                                          title="Abandonar livro (perde HP)"
                                                                          onClick={() => handleAbandonarLivro(livro)}
                                                                      >
                                                                          <Skull size={13} />
                                                                      </button>
                                                                  )}
                                                                  <button
                                                                      className="delete-book-btn"
                                                                      title="Remover"
                                                                      onClick={() => handleRemoverLivro(livro)}
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
