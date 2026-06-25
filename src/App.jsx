import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_PROFILE = "diretor_profile_v1";
const STORAGE_MSGS    = "diretor_msgs_v1";

const store = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? { value: v } : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

const GENEROS_LIST = [
  "Sertanejo Universitário","Sertanejo Raiz","MPB","Pop Nacional","Pop Internacional",
  "Rock Nacional","Rock Internacional","Forró","Pagode","Axé","Gospel",
  "Jazz / Blues","Soul / R&B","Bossa Nova","Romântico / Flashback","Funk"
];
const EVENTOS_LIST = [
  "Bares e restaurantes","Casamentos","Eventos corporativos","Aniversários",
  "Formaturas","Festivais","Shows próprios","Happy hour","Beach clubs","Confraternizações"
];
const OBJETIVOS_LIST = [
  "Aumentar cachê","Mais shows por mês","Atrair eventos premium",
  "Reconhecimento regional","Construir identidade de marca","Diversificar repertório",
  "Parcerias com cerimonialistas","Expandir para outros estados"
];
const FORMACOES = [
  "Solo com playback","Violão e voz","Voz, violão e percussão","Duo","Trio","Banda completa"
];
const QUICK_ACTIONS = [
  { emoji:"💍", label:"Setlist\nCasamento 3h",     prompt:"Crie um setlist completo para um casamento de 3 horas. Organize em blocos por momento (cerimônia, coquetel, festa, encerramento) com justificativa artística e comercial. Formato: número | música | artista original | duração aprox | motivo." },
  { emoji:"🍻", label:"Setlist\nBar / Happy hour", prompt:"Crie um setlist para uma noite em bar ou happy hour de 4 horas. Considere o arco emocional completo da noite. Organize em blocos com título e função. Justifique cada escolha." },
  { emoji:"🏢", label:"Setlist\nCorporativo 2h",   prompt:"Crie um setlist para evento corporativo sofisticado de 2 horas. Ambiente pede repertório incontestável e elegante. Justifique cada escolha considerando o perfil do contratante corporativo." },
  { emoji:"🎂", label:"Setlist\nAniversário 3h",   prompt:"Crie um setlist para festa de aniversário, 3 horas. Repertório inclusivo, emocionante, progressivamente dançante. Use meu perfil de gêneros como base e justifique a sequência." },
  { emoji:"💰", label:"Como\naumentar cachê",      prompt:"Quero aumentar meu cachê nos próximos 3 meses. Analise meu perfil: o que muda na minha postura, apresentação comercial, repertório e comunicação para eu cobrar mais? Seja específico com valores de referência e prazos." },
  { emoji:"🎯", label:"10 músicas\nprioridade",    prompt:"Baseado no meu perfil e nos mercados que atendo, quais são as 10 músicas que devo aprender ou aperfeiçoar agora para aumentar meu valor de mercado? Justifique cada escolha em termos de impacto artístico e comercial." },
  { emoji:"📈", label:"Plano\n6 meses",            prompt:"Crie um plano de carreira para os próximos 6 meses. Metas concretas, ações semanais, indicadores de sucesso mensuráveis. Pense como um diretor musical que precisa apresentar resultados." },
  { emoji:"⭐", label:"Meu\nposicionamento",       prompt:"Analise meu perfil com honestidade: qual é meu diferencial real no mercado? Como devo me posicionar? Que eventos devo priorizar e por quê? O que me distingue da concorrência e como capitalizar isso agora?" },
];

function buildSP(p) {
  return `Você é o Diretor Musical de ${p.nome||"este artista"}. Não é uma IA assistente — é um profissional contratado com autoridade total para alavancar a carreira deste artista cover.

Trajetória: 20 anos no mercado de entretenimento brasileiro. Produziu artistas regionais e nacionais, trabalhou com assessorias de eventos de alto nível, domina psicologia do público, curadoria de repertório, posicionamento de mercado e precificação de shows.

PERFIL DO ARTISTA:
• Nome/marca: ${p.nome||"não informado"}
• Formação de palco: ${p.formacao||"não informado"}
• Região de atuação: ${p.regiao||"não informado"}
• Gêneros que trabalha: ${(p.generos||[]).join(", ")||"não informado"}
• Referências e influências: ${p.referencias||"não informado"}
• Mercados que atende: ${(p.tipos_evento||[]).join(", ")||"não informado"}
• Cachê atual por show: ${p.cache_atual||"não informado"}
• Objetivos de carreira: ${(p.objetivos||[]).join(", ")||"não informado"}
• Diferencial percebido: ${p.diferencial||"não informado"}

SUAS COMPETÊNCIAS:
1. CURADORIA — sabe qual música encaixa em qual momento e como isso impacta o valor percebido e o retorno financeiro
2. POSICIONAMENTO — entende como um artista cover constrói valor além das músicas que canta
3. MERCADO — sabe o que cada contratante quer: cerimonialista ≠ dono de bar ≠ RH corporativo
4. CARREIRA — pensa longo prazo. Um show de R$800 pode virar R$4.000 em 8 meses com a estratégia certa
5. REPERTÓRIO — domina o cancioneiro brasileiro e internacional: sertanejo, MPB, forró, pagode, pop, rock, romântico, bossa nova, clássicos

COMPORTAMENTO:
- Fala com autoridade. Sem rodeios, sem linguagem de assistente subserviente
- Discorda quando vê erro de direção. Celebra quando o artista acerta
- Setlists COMPLETOS: número | música | artista original | duração aprox | motivo (1 linha)
- Setlists em BLOCOS com título e função
- Estratégias com prazos reais, ações específicas, métricas mensuráveis

Responda SEMPRE em português brasileiro. Seja direto. Entregue valor real em cada resposta.`;
}

// ── Aguarda window.puter estar disponível ─────────────────
function waitForPuter(ms = 10000) {
  if (window.puter) return Promise.resolve(window.puter);
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      if (window.puter) { clearInterval(id); resolve(window.puter); }
      else if (Date.now() - t0 > ms) { clearInterval(id); reject(new Error("puter_timeout")); }
    }, 150);
  });
}

// ── Verifica login com timeout seguro ─────────────────────
async function checkSignedIn() {
  try {
    const puter = await waitForPuter();
    // isSignedIn pode ser síncrono ou assíncrono dependendo da versão
    const result = puter.auth.isSignedIn();
    if (result && typeof result.then === "function") {
      return await Promise.race([
        result,
        new Promise(r => setTimeout(() => r(false), 3000))
      ]);
    }
    return !!result;
  } catch {
    return false;
  }
}

// ── Chama a IA via Puter ──────────────────────────────────
async function callPuter(messages, profile) {
  const puter = await waitForPuter();
  const sp = buildSP(profile);
  const fullMessages = [
    { role: "user",      content: `Contexto:\n\n${sp}` },
    { role: "assistant", content: "Entendido. Pronto para atuar como seu Diretor Musical." },
    ...messages,
  ];
  const response = await Promise.race([
    puter.ai.chat(fullMessages, { model: "claude-sonnet-4-6" }),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout_ia")), 90000))
  ]);
  try {
    if (typeof response === "string") return response;
    if (typeof response?.text === "string") return response.text;
    if (typeof response?.message?.content === "string") return response.message.content;
    if (Array.isArray(response?.message?.content)) {
      return response.message.content.map(b => b?.text || "").join("");
    }
    if (typeof response?.content === "string") return response.content;
    if (Array.isArray(response?.content)) {
      return response.content.map(b => b?.text || "").join("");
    }
    console.error("Puter formato desconhecido:", JSON.stringify(response));
    return "Resposta em formato inesperado. Tente novamente.";
  } catch {
    return "Erro ao processar resposta. Tente novamente.";
  }
}

function Chip({ label, selected, onToggle }) {
  return <button className={`chip${selected ? " on" : ""}`} onClick={onToggle} type="button">{label}</button>;
}
function tog(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }
const EP = { nome:"", formacao:"", regiao:"", generos:[], referencias:"", tipos_evento:[], cache_atual:"", objetivos:[], diferencial:"" };

export default function App() {
  const [profile, setProfile]     = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  // view: "loading" | "puter-gate" | "onboarding" | "main"
  const [view, setView]           = useState("loading");
  const [showModal, setShowModal] = useState(false);
  const [obStep, setObStep]       = useState(0);
  const [form, setForm]           = useState(EP);
  const [loginPending, setLoginPending] = useState(false);
  const endRef  = useRef(null);
  const profRef = useRef(null);
  const pollRef = useRef(null);

  // ── Boot ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const signedIn = await checkSignedIn();
      if (!signedIn) {
        setView("puter-gate");
        return;
      }
      loadFromStorage();
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  
  }, []);

  function loadFromStorage() {
    try {
      const pr = store.get(STORAGE_PROFILE);
      const mr = store.get(STORAGE_MSGS);
      if (pr) {
        const p = JSON.parse(pr.value);
        setProfile(p); profRef.current = p; setForm(p);
        if (mr) {
          // Sanitiza mensagens: garante que todo content é string
          const msgs = JSON.parse(mr.value);
          const safe = msgs.map(m => ({
            ...m,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
          }));
          setMessages(safe);
        }
        setView("main");
      } else {
        setView("onboarding");
      }
    } catch {
      // Se der qualquer erro no localStorage, limpa e recomeça
      store.set(STORAGE_MSGS, JSON.stringify([]));
      setView("onboarding");
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── Login: abre o fluxo do Puter e faz polling ───────────
  const handleLogin = useCallback(async () => {
    setLoginPending(true);
    try {
      const puter = await waitForPuter(5000);
      // signIn abre o popup/iframe do Puter — não esperamos a Promise
      // pois ela só resolve depois de interação. Fazemos polling.
      puter.auth.signIn().catch(() => {});
    } catch {
      setLoginPending(false);
      return;
    }

    // Polling: verifica a cada 1s se o login foi concluído (até 5 min)
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      const ok = await checkSignedIn();
      if (ok) {
        clearInterval(pollRef.current);
        setLoginPending(false);
        loadFromStorage();
      } else if (tries > 300) { // 5 min
        clearInterval(pollRef.current);
        setLoginPending(false);
      }
    }, 1000);
  
  }, []);

  // ── Envio de mensagem ─────────────────────────────────────
  const sendMessage = useCallback(async (text, baseMessages) => {
    if (!text.trim() || loading) return;
    const cur = baseMessages !== undefined ? baseMessages : messages;
    const newMsgs = [...cur, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const reply = await callPuter(newMsgs, profRef.current || form);
      // Garante que reply é sempre string antes de renderizar
      const safeReply = (typeof reply === "string") ? reply : JSON.stringify(reply);
      const final = [...newMsgs, { role: "assistant", content: safeReply }];
      setMessages(final);
      store.set(STORAGE_MSGS, JSON.stringify(final.slice(-40)));
    } catch (e) {
      let msg = "⚠️ Erro. Tente novamente.";
      if (e.message === "timeout_ia") msg = "⏱ A resposta demorou demais. Tente novamente.";
      else if (e.message === "puter_timeout") msg = "⚠️ Puter.js não carregou. Recarregue a página.";
      else if (e.message) msg = `⚠️ ${e.message}`;
      setMessages(prev => [...prev, { role: "assistant", content: msg, isError: true }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, form]);

  // ── Salvar perfil ─────────────────────────────────────────
  const saveProfile = useCallback((p) => {
    setProfile(p); profRef.current = p; setForm(p);
    store.set(STORAGE_PROFILE, JSON.stringify(p));
    setShowModal(false);
    setMessages([]);
    setView("main");
  }, []);

  // ── Onboarding ────────────────────────────────────────────
  const OB = [
    {
      q: "Como você se apresenta ao mercado?",
      h: "Nome artístico, como você toca e onde você atua.",
      valid: () => form.nome.trim().length > 0,
      body: () => (<>
        <div className="field"><label className="fl">Nome artístico / marca</label><input className="fi" value={form.nome} placeholder="Ex: Higgor Acústico, Duo Serrano…" onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
        <div className="field"><label className="fl">Formação de palco</label><select className="fs" value={form.formacao} onChange={e => setForm(f => ({...f, formacao: e.target.value}))}><option value="">Selecione…</option>{FORMACOES.map(o => <option key={o}>{o}</option>)}</select></div>
        <div className="field"><label className="fl">Cidade / região de atuação</label><input className="fi" value={form.regiao} placeholder="Ex: Friburgo, RJ" onChange={e => setForm(f => ({...f, regiao: e.target.value}))} /></div>
      </>)
    },
    {
      q: "Seus gêneros e referências.",
      h: "Selecione o que você já trabalha e informe suas maiores influências.",
      valid: () => form.generos.length > 0,
      body: () => (<>
        <div className="field"><label className="fl">Gêneros que você trabalha</label><div className="chips">{GENEROS_LIST.map(g => <Chip key={g} label={g} selected={form.generos.includes(g)} onToggle={() => setForm(f => ({...f, generos: tog(f.generos, g)}))} />)}</div></div>
        <div className="field" style={{marginTop:18}}><label className="fl">Referências e influências</label><textarea className="fta" value={form.referencias} placeholder="Ex: Roberto Carlos, Tim Maia, Ed Sheeran…" onChange={e => setForm(f => ({...f, referencias: e.target.value}))} /></div>
      </>)
    },
    {
      q: "Seu mercado atual.",
      h: "Onde você toca hoje e qual é seu cachê por show.",
      valid: () => form.tipos_evento.length > 0,
      body: () => (<>
        <div className="field"><label className="fl">Tipos de evento</label><div className="chips">{EVENTOS_LIST.map(e => <Chip key={e} label={e} selected={form.tipos_evento.includes(e)} onToggle={() => setForm(f => ({...f, tipos_evento: tog(f.tipos_evento, e)}))} />)}</div></div>
        <div className="field" style={{marginTop:18}}><label className="fl">Cachê atual por show</label><input className="fi" value={form.cache_atual} placeholder="Ex: R$ 800 a R$ 1.500" onChange={e => setForm(f => ({...f, cache_atual: e.target.value}))} /></div>
      </>)
    },
    {
      q: "Onde você quer chegar.",
      h: "Objetivos de carreira e seu diferencial como artista.",
      valid: () => form.objetivos.length > 0,
      body: () => (<>
        <div className="field"><label className="fl">Objetivos principais</label><div className="chips">{OBJETIVOS_LIST.map(o => <Chip key={o} label={o} selected={form.objetivos.includes(o)} onToggle={() => setForm(f => ({...f, objetivos: tog(f.objetivos, o)}))} />)}</div></div>
        <div className="field" style={{marginTop:18}}><label className="fl">Seu diferencial</label><textarea className="fta" value={form.diferencial} placeholder="Ex: Timbre vocal distinto, grande repertório romântico…" onChange={e => setForm(f => ({...f, diferencial: e.target.value}))} /></div>
      </>)
    }
  ];

  const step   = OB[obStep];
  const isLast = obStep === OB.length - 1;
  const showQA = messages.length === 0 && !loading;

  // ── LOADING ───────────────────────────────────────────────
  if (view === "loading") return (
    <div id="dm-root">
      <div className="splash">
        <div className="thinking"><span/><span/><span/></div>
        <div className="splash-label">Carregando…</div>
      </div>
    </div>
  );

  // ── PUTER GATE ────────────────────────────────────────────
  if (view === "puter-gate") return (
    <div id="dm-root">
      <div className="dm-header">
        <div className="dm-logotype">
          <div className="dm-title">DIRETOR <em>MUSICAL</em></div>
        </div>
      </div>
      <div className="puter-gate">
        <div className="puter-gate-icon">🎵</div>
        <div className="puter-gate-title">Bem-vindo ao Diretor Musical</div>
        <div className="puter-gate-sub">
          Este app usa o <strong style={{color:"var(--gold)"}}>Puter</strong> para acessar IA gratuitamente.
          {loginPending
            ? " Aguardando você concluir o login na janela do Puter…"
            : " Crie uma conta gratuita ou entre para começar."}
        </div>
        {!loginPending && (
          <button className="puter-gate-btn" onClick={handleLogin}>
            Entrar com Puter →
          </button>
        )}
        {loginPending && (
          <div className="thinking"><span/><span/><span/></div>
        )}
        <div className="puter-gate-note">
          {loginPending
            ? "Se a janela não abriu, verifique se o pop-up foi bloqueado pelo navegador."
            : "Conta gratuita · Sem cartão de crédito · IA fornecida pelo Puter"}
        </div>
      </div>
    </div>
  );

  // ── ONBOARDING ────────────────────────────────────────────
  if (view === "onboarding") return (
    <div id="dm-root">
      <div className="dm-header">
        <div className="dm-logotype"><div className="dm-title">DIRETOR <em>MUSICAL</em></div></div>
        <div style={{fontFamily:"var(--mono)",fontSize:"11px",color:"var(--muted)",letterSpacing:".06em",textTransform:"uppercase"}}>configuração inicial</div>
      </div>
      <div className="onboard">
        <div className="ob-progress">{OB.map((_,i) => <div key={i} className={`ob-dot${i<=obStep?" on":""}`}/>)}</div>
        <h2 className="ob-q">{step.q}</h2>
        <p className="ob-hint">{step.h}</p>
        {step.body()}
        <div className="ob-nav">
          {obStep > 0 && <button className="ob-back" onClick={() => setObStep(s => s-1)}>← Voltar</button>}
          <button className="ob-next" disabled={!step.valid()} onClick={() => { if (isLast) saveProfile(form); else setObStep(s => s+1); }}>
            {isLast ? "Conhecer meu Diretor →" : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN ──────────────────────────────────────────────────
  return (
    <div id="dm-root">
      <div className="dm-header">
        <div className="dm-logotype">
          <div className="dm-title">DIRETOR <em>MUSICAL</em></div>
          {profile?.nome && <div className="dm-artist">{profile.nome}</div>}
        </div>
        <div className="dm-header-btns">
          {messages.length > 0 && (
            <button className="hbtn" title="Limpar conversa" onClick={() => {
              if (!window.confirm("Apagar toda a conversa?")) return;
              setMessages([]);
              store.set(STORAGE_MSGS, JSON.stringify([]));
            }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          )}
          <button className="hbtn" title="Editar perfil" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </button>
        </div>
      </div>

      {showQA ? (
        <div className="qa-wrap">
          <div className="qa-intro">
            <h2>O que trabalhamos hoje?</h2>
            <p>Escolha uma ação rápida ou escreva sua pergunta abaixo.</p>
          </div>
          <div className="qa-grid">
            {QUICK_ACTIONS.map((qa, i) => (
              <button key={i} className="qa-card" onClick={() => sendMessage(qa.prompt)}>
                <span className="qa-emoji">{qa.emoji}</span>
                <span className="qa-label">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-area">
          {messages.map((m, i) => m.role === "assistant" ? (
            <div key={i} className="msg-dir">
              <div className="msg-dir-bar"/>
              <div className="msg-dir-body">
                <div className="msg-dir-label">Diretor Musical</div>
                <div className={`msg-dir-text${m.isError ? " error" : ""}`}>{m.content}</div>
              </div>
            </div>
          ) : (
            <div key={i} className="msg-user">
              <div className="msg-user-bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg-dir">
              <div className="msg-dir-bar"/>
              <div className="msg-dir-body">
                <div className="msg-dir-label">Diretor Musical</div>
                <div className="thinking"><span/><span/><span/></div>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
      )}

      <div className="input-bar">
        <textarea
          rows={1} value={input}
          placeholder="Fale com seu Diretor Musical…"
          onChange={e => setInput(e.target.value)}
          onInput={e => { e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,130)+"px"; }}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
        />
        <button className="send-btn" disabled={!input.trim() || loading} onClick={() => sendMessage(input)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      {/* Modal perfil */}
      <div className="mover" hidden={!showModal} onClick={e => { if (e.target.classList.contains("mover")) setShowModal(false); }}>
        <div className="mpanel">
          <div className="mtitle">Atualizar perfil</div>
          <div className="field"><label className="fl">Nome artístico</label><input className="fi" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
          <div className="field"><label className="fl">Formação</label><select className="fs" value={form.formacao} onChange={e => setForm(f => ({...f, formacao: e.target.value}))}><option value="">Selecione…</option>{FORMACOES.map(o => <option key={o}>{o}</option>)}</select></div>
          <div className="field"><label className="fl">Região</label><input className="fi" value={form.regiao} onChange={e => setForm(f => ({...f, regiao: e.target.value}))} /></div>
          <div className="field"><label className="fl">Gêneros</label><div className="chips">{GENEROS_LIST.map(g => <Chip key={g} label={g} selected={form.generos.includes(g)} onToggle={() => setForm(f => ({...f, generos: tog(f.generos, g)}))} />)}</div></div>
          <div className="field"><label className="fl">Referências musicais</label><textarea className="fta" value={form.referencias} onChange={e => setForm(f => ({...f, referencias: e.target.value}))} /></div>
          <div className="field"><label className="fl">Tipos de evento</label><div className="chips">{EVENTOS_LIST.map(e => <Chip key={e} label={e} selected={form.tipos_evento.includes(e)} onToggle={() => setForm(f => ({...f, tipos_evento: tog(f.tipos_evento, e)}))} />)}</div></div>
          <div className="field"><label className="fl">Cachê atual</label><input className="fi" value={form.cache_atual} onChange={e => setForm(f => ({...f, cache_atual: e.target.value}))} /></div>
          <div className="field"><label className="fl">Objetivos</label><div className="chips">{OBJETIVOS_LIST.map(o => <Chip key={o} label={o} selected={form.objetivos.includes(o)} onToggle={() => setForm(f => ({...f, objetivos: tog(f.objetivos, o)}))} />)}</div></div>
          <div className="field"><label className="fl">Diferencial</label><textarea className="fta" value={form.diferencial} onChange={e => setForm(f => ({...f, diferencial: e.target.value}))} /></div>
          <div className="mbtns">
            <button className="mbtn-c" onClick={() => { setShowModal(false); setForm(profile); }}>Cancelar</button>
            <button className="mbtn-s" onClick={() => saveProfile(form)}>Salvar perfil</button>
          </div>
        </div>
      </div>
    </div>
  );
}
