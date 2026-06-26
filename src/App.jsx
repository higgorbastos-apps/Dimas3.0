import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
//  DIRETOR MUSICAL — Fase 2
//  Integrado com Google Sheets via Apps Script.
//  IA via Puter.js — sem custo para o desenvolvedor.
// ============================================================

const STORAGE_PROFILE = "diretor_profile_v2";
const STORAGE_MSGS    = "diretor_msgs_v2";
const STORAGE_CONFIG  = "diretor_config_v1";

const store = {
  get: (k) => { try { const v=localStorage.getItem(k); return v?{value:v}:null; } catch { return null; } },
  set: (k,v) => { try { localStorage.setItem(k,v); } catch {} },
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
  { emoji:"💍", label:"Setlist\nCasamento 3h",      prompt:"Com base no meu histórico real de shows e músicas, crie um setlist completo para um casamento de 3 horas. Organize em blocos (cerimônia, coquetel, festa, encerramento). Considere o que eu toco com mais frequência e o que faz tempo que não uso." },
  { emoji:"🍻", label:"Setlist\nBar / Happy hour",  prompt:"Com base no meu histórico, crie um setlist para bar ou happy hour de 4 horas. Considere o arco emocional da noite e priorize músicas do meu repertório real que funcionam bem nesse ambiente." },
  { emoji:"🏢", label:"Setlist\nCorporativo 2h",    prompt:"Com base no meu repertório histórico, crie um setlist para evento corporativo sofisticado de 2 horas. Repertório elegante, incontestável. Justifique cada escolha." },
  { emoji:"🎂", label:"Setlist\nAniversário 3h",    prompt:"Baseado no meu histórico real de músicas, crie um setlist para festa de aniversário de 3 horas. Repertório inclusivo, progressivamente dançante. Considere o que tenho tocado e o que posso reintroduzir." },
  { emoji:"📊", label:"Análise do\nmeu repertório", prompt:"Analise meu histórico completo de shows e músicas. Quais são meus padrões? O que toco demais? O que estou negligenciando? Quais gaps existem no meu repertório para os mercados que atendo? Seja direto e honesto." },
  { emoji:"💰", label:"Como\naumentar cachê",       prompt:"Com base no meu histórico real — shows, frequência, locais, repertório — o que precisa mudar concretamente para eu aumentar meu cachê nos próximos 3 meses? Analise onde estou e diga o que fazer." },
  { emoji:"📈", label:"Plano\n6 meses",             prompt:"Com base no meu histórico de shows e no meu perfil, crie um plano de carreira para os próximos 6 meses. Use dados reais do que já fiz. Metas concretas, ações semanais, métricas mensuráveis." },
  { emoji:"⭐", label:"Meu\nposicionamento",        prompt:"Analise meu histórico real — onde toco, com que frequência, qual repertório — e me diga com honestidade: como estou posicionado no mercado hoje? O que me diferencia? O que precisa mudar para atrair eventos de maior valor?" },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#080705;--surface:#111009;--raised:#181511;--raised2:#201D17;
  --border:#252018;--border2:#302A1E;
  --gold:#C9A84C;--gold-dim:#7A6428;--gold-soft:#1A1508;
  --cream:#F0EDE6;--cream2:#BAB6AF;--muted:#7A766E;
  --ok:#5A9E72;--ok-soft:#0E2016;
  --display:'Playfair Display',Georgia,serif;
  --sans:'Inter',system-ui,sans-serif;
  --mono:'IBM Plex Mono',monospace;
}
body{background:var(--bg);color:var(--cream);font-family:var(--sans);-webkit-tap-highlight-color:transparent;}
#dm-root{min-height:100vh;max-width:680px;margin:0 auto;display:flex;flex-direction:column;}

/* HEADER */
.dm-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 11px;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:10;}
.dm-logotype{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.dm-title{font-family:var(--display);font-size:19px;font-weight:700;letter-spacing:.02em;color:var(--cream);line-height:1;}
.dm-title em{color:var(--gold);font-style:normal;}
.dm-artist{font-family:var(--mono);font-size:10.5px;color:var(--gold-dim);letter-spacing:.06em;text-transform:uppercase;border-left:1px solid var(--border2);padding-left:10px;}
.dm-sync{font-family:var(--mono);font-size:10px;color:var(--ok);letter-spacing:.04em;display:flex;align-items:center;gap:4px;}
.dm-sync.off{color:var(--muted);}
.dm-header-btns{display:flex;gap:6px;flex-shrink:0;}
.hbtn{width:33px;height:33px;border-radius:50%;background:var(--raised);border:1px solid var(--border);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .15s,border-color .15s,background .15s;}
.hbtn:hover{color:var(--gold);border-color:var(--gold-dim);background:var(--raised2);}

/* SYNC BANNER */
.sync-banner{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 20px;background:var(--ok-soft);border-bottom:1px solid var(--ok);
  font-family:var(--mono);font-size:12px;color:var(--ok);
}
.sync-banner.warn{background:#1A0E05;border-color:var(--gold-dim);color:var(--gold-dim);}
.sync-btn{background:var(--ok);border:none;border-radius:6px;color:#0A1F0E;font-size:12px;font-weight:700;padding:5px 12px;cursor:pointer;}
.sync-btn.warn{background:var(--gold);color:#1A1304;}

/* QUICK ACTIONS */
.qa-wrap{flex:1;overflow-y:auto;padding:20px;}
.qa-intro{margin-bottom:20px;}
.qa-intro h2{font-family:var(--display);font-size:24px;font-weight:700;color:var(--cream);line-height:1.2;margin-bottom:4px;}
.qa-intro p{font-size:13px;color:var(--muted);line-height:1.55;}
.qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(min-width:480px){.qa-grid{grid-template-columns:repeat(4,1fr);}}
.qa-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 12px;cursor:pointer;text-align:left;transition:border-color .15s,background .15s,transform .12s;}
.qa-card:hover{border-color:var(--gold-dim);background:var(--raised);}
.qa-card:active{transform:scale(.96);}
.qa-emoji{font-size:20px;display:block;margin-bottom:8px;}
.qa-label{font-size:12px;font-weight:600;color:var(--cream);white-space:pre-line;line-height:1.3;}

/* STATS STRIP */
.stats-strip{
  display:flex;gap:0;margin-bottom:20px;
  background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;
}
.stat{flex:1;padding:12px 10px;text-align:center;border-right:1px solid var(--border);}
.stat:last-child{border-right:none;}
.stat-n{font-family:var(--display);font-size:24px;font-weight:700;color:var(--gold);line-height:1;}
.stat-l{font-family:var(--mono);font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:3px;}

/* CHAT */
.chat-area{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:18px;}
.chat-area::-webkit-scrollbar{width:3px;}
.chat-area::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.msg-dir{display:flex;align-items:flex-start;}
.msg-dir-bar{width:3px;border-radius:2px;background:linear-gradient(to bottom,var(--gold),var(--gold-dim));flex-shrink:0;margin-right:14px;align-self:stretch;min-height:24px;}
.msg-dir-body{flex:1;min-width:0;}
.msg-dir-label{font-family:var(--mono);font-size:10px;font-weight:500;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;}
.msg-dir-text{font-size:15px;line-height:1.7;color:var(--cream);white-space:pre-wrap;word-break:break-word;}
.msg-user{display:flex;justify-content:flex-end;}
.msg-user-bubble{background:var(--raised2);border:1px solid var(--border2);border-radius:14px 14px 3px 14px;padding:10px 14px;max-width:78%;font-size:15px;line-height:1.55;color:var(--cream2);word-break:break-word;}
.thinking{display:flex;gap:5px;align-items:center;padding:4px 0;}
.thinking span{width:6px;height:6px;background:var(--gold-dim);border-radius:50%;animation:dmP 1.2s ease-in-out infinite;}
.thinking span:nth-child(2){animation-delay:.2s;}.thinking span:nth-child(3){animation-delay:.4s;}
@keyframes dmP{0%,100%{opacity:.25;transform:scale(.8);}50%{opacity:1;transform:scale(1.2);}}

/* INPUT */
.input-bar{padding:10px 16px 16px;border-top:1px solid var(--border);background:var(--bg);display:flex;gap:10px;align-items:flex-end;}
.input-bar textarea{flex:1;min-width:0;background:var(--raised);border:1px solid var(--border);border-radius:10px;color:var(--cream);font-family:var(--sans);font-size:15px;padding:10px 13px;resize:none;min-height:44px;max-height:130px;line-height:1.5;transition:border-color .15s;overflow-y:auto;}
.input-bar textarea:focus{outline:none;border-color:var(--gold-dim);}
.input-bar textarea::placeholder{color:#38342E;}
.send-btn{width:44px;height:44px;flex-shrink:0;background:var(--gold);border:none;border-radius:10px;color:#1A1304;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:filter .15s,transform .12s;}
.send-btn:hover:not(:disabled){filter:brightness(1.1);}
.send-btn:disabled{opacity:.32;cursor:not-allowed;}

/* ONBOARDING */
.onboard{flex:1;display:flex;flex-direction:column;padding:28px 24px 24px;max-width:480px;margin:0 auto;width:100%;}
.ob-progress{display:flex;gap:6px;margin-bottom:32px;}
.ob-dot{height:3px;flex:1;border-radius:2px;background:var(--border2);transition:background .3s;}
.ob-dot.on{background:var(--gold);}
.ob-q{font-family:var(--display);font-size:26px;font-weight:700;line-height:1.15;color:var(--cream);margin-bottom:6px;}
.ob-hint{font-size:14px;color:var(--muted);margin-bottom:24px;line-height:1.55;}
.field{margin-bottom:14px;}
.fl{display:block;font-size:10.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;}
.fi,.fs,.fta{width:100%;background:var(--raised);border:1px solid var(--border);border-radius:8px;color:var(--cream);font-family:var(--sans);font-size:15px;padding:11px 13px;display:block;transition:border-color .15s;}
.fi:focus,.fs:focus,.fta:focus{outline:none;border-color:var(--gold-dim);}
.fi::placeholder,.fta::placeholder{color:#38342E;}
.fs{-webkit-appearance:none;cursor:pointer;}
.fta{resize:vertical;min-height:70px;line-height:1.5;}
.chips{display:flex;flex-wrap:wrap;gap:8px;}
.chip{padding:7px 13px;border-radius:100px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;user-select:none;-webkit-user-select:none;}
.chip.on{background:var(--gold-soft);border-color:var(--gold-dim);color:var(--gold);}
.ob-nav{margin-top:auto;padding-top:24px;display:flex;gap:10px;}
.ob-back{padding:13px 16px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:15px;font-weight:600;cursor:pointer;flex:1;}
.ob-next{padding:13px 20px;background:var(--gold);border:none;border-radius:8px;color:#1A1304;font-size:15px;font-weight:700;cursor:pointer;flex:2;transition:filter .15s;}
.ob-next:hover{filter:brightness(1.08);}
.ob-next:disabled{opacity:.35;cursor:not-allowed;}

/* MODAL */
.mover{position:fixed;inset:0;background:rgba(4,3,2,.88);display:flex;align-items:flex-end;justify-content:center;z-index:50;}
.mover[hidden]{display:none;}
.mpanel{width:100%;max-width:680px;background:var(--surface);border:1px solid var(--border2);border-top:2px solid var(--gold);border-radius:14px 14px 0 0;padding:22px 20px 32px;max-height:88vh;overflow-y:auto;}
@media(min-width:560px){.mover{align-items:center;padding:20px;}.mpanel{border-radius:14px;}}
.mtitle{font-family:var(--display);font-size:20px;font-weight:700;color:var(--cream);margin-bottom:6px;}
.msub{font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.5;}
.mbtns{display:flex;gap:10px;margin-top:18px;}
.mbtn-c{padding:12px 16px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:14px;font-weight:600;cursor:pointer;flex:1;}
.mbtn-s{padding:12px 16px;background:var(--gold);border:none;border-radius:8px;color:#1A1304;font-size:14px;font-weight:700;cursor:pointer;flex:2;transition:filter .15s;}
.mbtn-s:hover{filter:brightness(1.08);}
.section-title{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-dim);margin:20px 0 10px;padding-top:16px;border-top:1px solid var(--border);}
.section-title:first-of-type{border-top:none;margin-top:0;padding-top:0;}

.qa-wrap::-webkit-scrollbar{width:3px;}
.qa-wrap::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
`;

/* ── SYSTEM PROMPT ─────────────────────────────────────────── */
function buildSP(p, resumo) {
  const temHistorico = resumo && resumo.totalShows > 0;

  const histSection = temHistorico ? `
HISTÓRICO REAL DE SHOWS (dados da planilha Google Sheets do artista):
• Total de shows registrados: ${resumo.totalShows}
• Total de músicas tocadas: ${resumo.totalMusicas} entradas (${resumo.totalMusicasUnicas} músicas únicas)
• Média de músicas por show: ${resumo.mediaMusicasPorShow}

TOP MÚSICAS MAIS TOCADAS:
${resumo.maisOcadas.map((m,i) => `${i+1}. ${m.musica} — ${m.vezes}x (última vez: ${m.ultimaVez})`).join('\n')}

MÚSICAS QUE NÃO ENTRAM HÁ MAIS DE 60 DIAS (repertório esquecido):
${resumo.esquecidas.length > 0 ? resumo.esquecidas.map(m => `• ${m.musica} (última vez: ${m.ultimaVez})`).join('\n') : '• Nenhuma — todos os itens foram usados recentemente.'}

SHOWS POR MÊS (últimos 12 meses):
${resumo.showsPorMes.map(s => `• ${s.mes}: ${s.qtd} show${s.qtd>1?'s':''}`).join('\n')}

LOCAIS MAIS FREQUENTES:
${resumo.locaisMaisFrequentes.map(l => `• ${l.local}: ${l.qtd}x`).join('\n')}

ÚLTIMOS 5 SHOWS:
${resumo.ultimos5.map(s => `• ${s.data} — ${s.local} (${s.qtd} músicas)${s.setlist?.length > 0 ? '\n  Setlist: ' + s.setlist.slice(0,5).join(', ') + (s.setlist.length > 5 ? '...' : '') : ''}`).join('\n')}
` : `
HISTÓRICO DE SHOWS: Ainda não há shows registrados na planilha. O artista está começando a usar o sistema agora.
Baseie suas análises no perfil declarado e oriente o artista sobre como construir um histórico rico desde o início.
`;

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
${histSection}

SUAS COMPETÊNCIAS:
1. CURADORIA — usa o histórico real para criar setlists baseados no que o artista realmente domina, equilibrando músicas frequentes com as esquecidas
2. ANÁLISE — identifica padrões, gaps e oportunidades nos dados reais de shows e repertório
3. POSICIONAMENTO — entende como um artista cover constrói valor além das músicas que canta
4. MERCADO — sabe o que cada contratante quer: cerimonialista ≠ dono de bar ≠ RH corporativo
5. CARREIRA — pensa longo prazo com base em dados concretos, não suposições

COMPORTAMENTO:
- Usa os dados reais do histórico quando existem. Nunca ignora o que a planilha diz
- Fala com autoridade. Sem rodeios, sem linguagem de assistente subserviente
- Setlists COMPLETOS: número | música | motivo baseado no histórico
- Estratégias com prazos reais, ações específicas, métricas mensuráveis
- Quando o histórico está vazio, orienta o artista a construí-lo desde já

Responda SEMPRE em português brasileiro. Seja direto. Use os dados reais quando disponíveis.`;
}

function Chip({label,selected,onToggle}){
  return <button className={`chip${selected?" on":""}`} onClick={onToggle} type="button">{label}</button>;
}
function tog(arr,val){ return arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]; }
const EP={nome:"",formacao:"",regiao:"",generos:[],referencias:"",tipos_evento:[],cache_atual:"",objetivos:[],diferencial:""};
const EC={url:"",token:""};

export default function DirectorMusical(){
  const [profile,setProfile]   = useState(null);
  const [config,setConfig]     = useState(null);   // { url, token } do Apps Script
  const [resumo,setResumo]     = useState(null);   // dados da planilha
  const [syncing,setSyncing]   = useState(false);
  const [messages,setMessages] = useState([]);
  const [input,setInput]       = useState("");
  const [loading,setLoading]   = useState(false);
  const [view,setView]         = useState("loading");
  const [modal,setModal]       = useState(null);   // null | "profile" | "config"
  const [obStep,setObStep]     = useState(0);
  const [form,setForm]         = useState(EP);
  const [cfgForm,setCfgForm]   = useState(EC);
  const endRef    = useRef(null);
  const profileRef= useRef(null);
  const resumoRef = useRef(null);

  /* LOAD */
  useEffect(()=>{
    const pr=store.get(STORAGE_PROFILE);
    const mr=store.get(STORAGE_MSGS);
    const cr=store.get(STORAGE_CONFIG);
    if(pr){ const p=JSON.parse(pr.value); setProfile(p); profileRef.current=p; setForm(p); }
    if(mr){ setMessages(JSON.parse(mr.value)); }
    if(cr){ const c=JSON.parse(cr.value); setConfig(c); setCfgForm(c); }
    setView(pr?"main":"onboarding");
  },[]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loading]);

  /* SYNC com a planilha */
  const syncPlanilha = useCallback(async(cfg)=>{
    const c = cfg || config;
    if(!c?.url||!c?.token) return null;
    setSyncing(true);
    try{
      const res = await fetch(`${c.url}?action=resumo&token=${encodeURIComponent(c.token)}`);
      const json = await res.json();
      if(json.success){
        resumoRef.current=json.resumo;
        setResumo(json.resumo);
        setSyncing(false); // ← fix: resetar sempre
        return json.resumo;
      }
    }catch(e){ console.error("Sync error:",e); }
    setSyncing(false);
    return null;
  },[config]);

  /* PUTER.JS CALL */
  const callAPI = useCallback(async(msgs,p,r)=>{
    const prof  = p  || profileRef.current || form;
    const res_  = r  !== undefined ? r : resumoRef.current;
    const puter = window.puter;
    if(!puter) throw new Error("Puter.js não carregou. Verifique o index.html.");

    const fullMessages=[
      { role:"user",      content:`Contexto — leia antes de responder:\n\n${buildSP(prof, res_)}` },
      { role:"assistant", content:"Entendido. Estou com acesso ao perfil e ao histórico real de shows. Pronto para trabalhar." },
      ...msgs
    ];

    const response = await puter.ai.chat(fullMessages, { model:"claude-sonnet-4-6" });
    if(typeof response==="string") return response;
    if(response?.message?.content) return response.message.content;
    if(response?.content?.[0]?.text) return response.content[0].text;
    if(response?.text) return response.text;
    return String(response);
  },[form]);

  const sendMessage = useCallback(async(text,base)=>{
    if(!text.trim()||loading) return;
    const cur = base!==undefined?base:messages;
    const nm  = [...cur,{role:"user",content:text}];
    setMessages(nm); setInput(""); setLoading(true);
    // sync silencioso antes de responder
    let r = resumoRef.current;
    if(config?.url) r = await syncPlanilha() || r;
    try{
      const reply = await callAPI(nm, null, r);
      const fin   = [...nm,{role:"assistant",content:reply}];
      setMessages(fin);
      store.set(STORAGE_MSGS,JSON.stringify(fin.slice(-40)));
    }catch(e){ setMessages(prev=>[...prev,{role:"assistant",content:`Erro: ${e.message}`}]); }
    setLoading(false); setSyncing(false);
  },[messages,loading,callAPI,config,syncPlanilha]);

  const saveProfile = useCallback(async(p,isFirst)=>{
    setProfile(p); profileRef.current=p; setForm(p);
    store.set(STORAGE_PROFILE,JSON.stringify(p));
    setModal(null); setView("main");
    if(isFirst){
      let r=null;
      if(config?.url) r=await syncPlanilha();
      setLoading(true);
      try{
        const t="Apresentação inicial: acabei de receber seu briefing completo. Apresente-se profissionalmente e faça uma análise honesta do meu perfil e do meu histórico de shows — o que você vê de potencial real, o que está me limitando e qual é a primeira ação concreta desta semana.";
        const reply=await callAPI([{role:"user",content:t}],p,r);
        const intro=[{role:"assistant",content:reply}];
        setMessages(intro); store.set(STORAGE_MSGS,JSON.stringify(intro));
      }catch(e){ setMessages([{role:"assistant",content:`Erro ao iniciar: ${e.message}`}]); }
      setLoading(false);
    }
  },[config,syncPlanilha,callAPI]);

  const saveConfig = useCallback(async(c)=>{
    setConfig(c); setCfgForm(c);
    store.set(STORAGE_CONFIG,JSON.stringify(c));
    setModal(null);
    const r = await syncPlanilha(c);
    if(r) setSyncing(false);
  },[syncPlanilha]);

  /* ONBOARDING STEPS */
  const OB=[
    { q:"Como você se apresenta ao mercado?", h:"Nome artístico, como você toca e onde atua.", valid:()=>form.nome.trim().length>0,
      body:()=>(<>
        <div className="field"><label className="fl">Nome artístico / marca</label><input className="fi" value={form.nome} placeholder="Ex: Higgor Acústico…" onChange={e=>setForm(f=>({...f,nome:e.target.value}))} /></div>
        <div className="field"><label className="fl">Formação de palco</label><select className="fs" value={form.formacao} onChange={e=>setForm(f=>({...f,formacao:e.target.value}))}><option value="">Selecione…</option>{FORMACOES.map(o=><option key={o}>{o}</option>)}</select></div>
        <div className="field"><label className="fl">Cidade / região</label><input className="fi" value={form.regiao} placeholder="Ex: Friburgo, RJ" onChange={e=>setForm(f=>({...f,regiao:e.target.value}))} /></div>
      </>)
    },
    { q:"Seus gêneros e referências.", h:"Selecione o que você trabalha e informe suas influências.", valid:()=>form.generos.length>0,
      body:()=>(<>
        <div className="field"><label className="fl">Gêneros</label><div className="chips">{GENEROS_LIST.map(g=><Chip key={g} label={g} selected={form.generos.includes(g)} onToggle={()=>setForm(f=>({...f,generos:tog(f.generos,g)}))} />)}</div></div>
        <div className="field" style={{marginTop:16}}><label className="fl">Referências e influências</label><textarea className="fta" value={form.referencias} placeholder="Ex: Roberto Carlos, Zé Ramalho, Tim Maia…" onChange={e=>setForm(f=>({...f,referencias:e.target.value}))} /></div>
      </>)
    },
    { q:"Seu mercado atual.", h:"Onde você toca e quanto cobra.", valid:()=>form.tipos_evento.length>0,
      body:()=>(<>
        <div className="field"><label className="fl">Tipos de evento</label><div className="chips">{EVENTOS_LIST.map(e=><Chip key={e} label={e} selected={form.tipos_evento.includes(e)} onToggle={()=>setForm(f=>({...f,tipos_evento:tog(f.tipos_evento,e)}))} />)}</div></div>
        <div className="field" style={{marginTop:16}}><label className="fl">Cachê atual por show</label><input className="fi" value={form.cache_atual} placeholder="Ex: R$ 800 a R$ 1.500" onChange={e=>setForm(f=>({...f,cache_atual:e.target.value}))} /></div>
      </>)
    },
    { q:"Onde você quer chegar.", h:"Objetivos e o que te diferencia.", valid:()=>form.objetivos.length>0,
      body:()=>(<>
        <div className="field"><label className="fl">Objetivos</label><div className="chips">{OBJETIVOS_LIST.map(o=><Chip key={o} label={o} selected={form.objetivos.includes(o)} onToggle={()=>setForm(f=>({...f,objetivos:tog(f.objetivos,o)}))} />)}</div></div>
        <div className="field" style={{marginTop:16}}><label className="fl">Seu diferencial</label><textarea className="fta" value={form.diferencial} placeholder="Ex: Timbre vocal distinto, domínio de guitarra…" onChange={e=>setForm(f=>({...f,diferencial:e.target.value}))} /></div>
      </>)
    }
  ];

  const step=OB[obStep]; const isLast=obStep===OB.length-1;
  const showQA=messages.length===0&&!loading;
  const isConnected=!!(config?.url&&config?.token);
  const temHistorico=resumo&&resumo.totalShows>0;

  /* ── LOADING ── */
  if(view==="loading") return <div id="dm-root" style={{alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div className="thinking"><span/><span/><span/></div></div>;

  /* ── ONBOARDING ── */
  if(view==="onboarding") return (
    <div id="dm-root"><style>{CSS}</style>
      <div className="dm-header">
        <div className="dm-logotype"><div className="dm-title">DIRETOR <em>MUSICAL</em></div></div>
        <div style={{fontFamily:"var(--mono)",fontSize:"11px",color:"var(--muted)",letterSpacing:".06em",textTransform:"uppercase"}}>configuração inicial</div>
      </div>
      <div className="onboard">
        <div className="ob-progress">{OB.map((_,i)=><div key={i} className={`ob-dot${i<=obStep?" on":""}`}/>)}</div>
        <h2 className="ob-q">{step.q}</h2><p className="ob-hint">{step.h}</p>
        {step.body()}
        <div className="ob-nav">
          {obStep>0&&<button className="ob-back" onClick={()=>setObStep(s=>s-1)}>← Voltar</button>}
          <button className="ob-next" disabled={!step.valid()} onClick={()=>{ if(isLast) saveProfile(form,true); else setObStep(s=>s+1); }}>
            {isLast?"Conhecer meu Diretor →":"Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── MAIN ── */
  return (
    <div id="dm-root"><style>{CSS}</style>

      <div className="dm-header">
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <div className="dm-logotype">
            <div className="dm-title">DIRETOR <em>MUSICAL</em></div>
            {profile?.nome&&<div className="dm-artist">{profile.nome}</div>}
          </div>
          {isConnected&&(
            <div className={`dm-sync${temHistorico?"":" off"}`}>
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {syncing?"sincronizando…": temHistorico?`${resumo.totalShows} shows • ${resumo.totalMusicasUnicas} músicas`:"planilha conectada"}
            </div>
          )}
        </div>
        <div className="dm-header-btns">
          {messages.length>0&&<button className="hbtn" title="Limpar conversa" onClick={()=>{ if(!confirm("Apagar conversa?")) return; setMessages([]); store.set(STORAGE_MSGS,JSON.stringify([])); }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>}
          <button className="hbtn" title="Conectar planilha" onClick={()=>{ setCfgForm(config||EC); setModal("config"); }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <button className="hbtn" title="Editar perfil" onClick={()=>{ setForm(profile||EP); setModal("profile"); }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </button>
        </div>
      </div>

      {/* SYNC BANNER — quando não tem planilha conectada */}
      {!isConnected&&view==="main"&&showQA&&(
        <div className="sync-banner warn">
          <span>⚡ Conecte sua planilha para análises baseadas em dados reais</span>
          <button className="sync-btn warn" onClick={()=>{ setCfgForm(EC); setModal("config"); }}>Conectar</button>
        </div>
      )}
      {isConnected&&!temHistorico&&showQA&&(
        <div className="sync-banner">
          <span>✓ Planilha conectada — registre seu primeiro show no Setlist PWA</span>
          <button className="sync-btn" onClick={()=>syncPlanilha()}>Atualizar</button>
        </div>
      )}

      {showQA?(
        <div className="qa-wrap">
          {/* STATS quando tem histórico */}
          {temHistorico&&(
            <div className="stats-strip">
              <div className="stat"><div className="stat-n">{resumo.totalShows}</div><div className="stat-l">shows</div></div>
              <div className="stat"><div className="stat-n">{resumo.totalMusicasUnicas}</div><div className="stat-l">músicas</div></div>
              <div className="stat"><div className="stat-n">{resumo.mediaMusicasPorShow}</div><div className="stat-l">média/show</div></div>
              <div className="stat"><div className="stat-n">{resumo.showsPorMes?.[0]?.qtd||0}</div><div className="stat-l">este mês</div></div>
            </div>
          )}
          <div className="qa-intro">
            <h2>O que trabalhamos hoje?</h2>
            <p>{temHistorico?"Respostas baseadas no seu histórico real de shows.":"Escolha uma ação ou escreva sua pergunta abaixo."}</p>
          </div>
          <div className="qa-grid">{QUICK_ACTIONS.map((qa,i)=><button key={i} className="qa-card" onClick={()=>sendMessage(qa.prompt)}><span className="qa-emoji">{qa.emoji}</span><span className="qa-label">{qa.label}</span></button>)}</div>
        </div>
      ):(
        <div className="chat-area">
          {messages.map((m,i)=>m.role==="assistant"?(
            <div key={i} className="msg-dir"><div className="msg-dir-bar"/><div className="msg-dir-body"><div className="msg-dir-label">Diretor Musical</div><div className="msg-dir-text">{m.content}</div></div></div>
          ):(
            <div key={i} className="msg-user"><div className="msg-user-bubble">{m.content}</div></div>
          ))}
          {loading&&<div className="msg-dir"><div className="msg-dir-bar"/><div className="msg-dir-body"><div className="msg-dir-label">Diretor Musical{syncing?" — consultando planilha…":""}</div><div className="thinking"><span/><span/><span/></div></div></div>}
          <div ref={endRef}/>
        </div>
      )}

      <div className="input-bar">
        <textarea rows={1} value={input} placeholder="Fale com seu Diretor Musical…"
          onChange={e=>setInput(e.target.value)}
          onInput={e=>{ e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,130)+"px"; }}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);} }}
        />
        <button className="send-btn" disabled={!input.trim()||loading} onClick={()=>sendMessage(input)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      {/* MODAL PERFIL */}
      <div className="mover" hidden={modal!=="profile"} onClick={e=>{ if(e.target.classList.contains("mover")) setModal(null); }}>
        <div className="mpanel">
          <div className="mtitle">Perfil artístico</div>
          <div className="msub">Estas informações alimentam o contexto do Diretor Musical.</div>
          <div className="section-title">Identificação</div>
          <div className="field"><label className="fl">Nome artístico</label><input className="fi" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} /></div>
          <div className="field"><label className="fl">Formação</label><select className="fs" value={form.formacao} onChange={e=>setForm(f=>({...f,formacao:e.target.value}))}><option value="">Selecione…</option>{FORMACOES.map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="field"><label className="fl">Região</label><input className="fi" value={form.regiao} onChange={e=>setForm(f=>({...f,regiao:e.target.value}))} /></div>
          <div className="section-title">Repertório e mercado</div>
          <div className="field"><label className="fl">Gêneros</label><div className="chips">{GENEROS_LIST.map(g=><Chip key={g} label={g} selected={form.generos.includes(g)} onToggle={()=>setForm(f=>({...f,generos:tog(f.generos,g)}))} />)}</div></div>
          <div className="field"><label className="fl">Referências</label><textarea className="fta" value={form.referencias} onChange={e=>setForm(f=>({...f,referencias:e.target.value}))} /></div>
          <div className="field"><label className="fl">Tipos de evento</label><div className="chips">{EVENTOS_LIST.map(e=><Chip key={e} label={e} selected={form.tipos_evento.includes(e)} onToggle={()=>setForm(f=>({...f,tipos_evento:tog(f.tipos_evento,e)}))} />)}</div></div>
          <div className="field"><label className="fl">Cachê atual</label><input className="fi" value={form.cache_atual} onChange={e=>setForm(f=>({...f,cache_atual:e.target.value}))} /></div>
          <div className="section-title">Objetivos</div>
          <div className="field"><div className="chips">{OBJETIVOS_LIST.map(o=><Chip key={o} label={o} selected={form.objetivos.includes(o)} onToggle={()=>setForm(f=>({...f,objetivos:tog(f.objetivos,o)}))} />)}</div></div>
          <div className="field"><label className="fl">Diferencial</label><textarea className="fta" value={form.diferencial} onChange={e=>setForm(f=>({...f,diferencial:e.target.value}))} /></div>
          <div className="mbtns">
            <button className="mbtn-c" onClick={()=>{ setModal(null); setForm(profile); }}>Cancelar</button>
            <button className="mbtn-s" onClick={()=>saveProfile(form,false)}>Salvar perfil</button>
          </div>
        </div>
      </div>

      {/* MODAL CONFIGURAÇÃO DA PLANILHA */}
      <div className="mover" hidden={modal!=="config"} onClick={e=>{ if(e.target.classList.contains("mover")) setModal(null); }}>
        <div className="mpanel">
          <div className="mtitle">Conectar planilha</div>
          <div className="msub">Cole a URL do seu Web App do Google Apps Script e o token secreto. O Diretor Musical consultará sua planilha em tempo real antes de cada resposta.</div>
          <div className="field"><label className="fl">URL do Web App (Apps Script)</label><input className="fi" value={cfgForm.url} placeholder="https://script.google.com/macros/s/.../exec" onChange={e=>setCfgForm(f=>({...f,url:e.target.value}))} /></div>
          <div className="field"><label className="fl">Token secreto</label><input className="fi" value={cfgForm.token} placeholder="o mesmo SECRET_TOKEN do Code.gs" onChange={e=>setCfgForm(f=>({...f,token:e.target.value}))} /></div>
          <div className="mbtns">
            <button className="mbtn-c" onClick={()=>{ setModal(null); setCfgForm(config||EC); }}>Cancelar</button>
            <button className="mbtn-s" disabled={!cfgForm.url.trim()||!cfgForm.token.trim()} onClick={()=>saveConfig(cfgForm)}>Conectar e sincronizar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
