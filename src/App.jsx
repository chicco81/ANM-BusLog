import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg:"#0b0d12",bgCard:"#111318",bgInput:"#181b23",bgHover:"#1e2130",
  border:"#1f2233",borderHi:"#2a2e42",accent:"#f5a623",
  text:"#dde1f0",muted:"#5a607a",dim:"#8b92ad",
  green:"#22c55e",red:"#f04747",yellow:"#f59e0b",purple:"#a855f7",
  orange:"#fb923c",
};

const CONDIZIONI = [
  {v:"ottimo",  label:"Ottimo",    color:C.green,  icon:"●"},
  {v:"buono",   label:"Buono",     color:"#84cc16", icon:"●"},
  {v:"discreto",label:"Discreto",  color:C.yellow,  icon:"●"},
  {v:"scarso",  label:"Scarso",    color:C.orange,  icon:"●"},
  {v:"critico", label:"Critico",   color:C.red,     icon:"●"},
];
const TIPI_GUASTO = [
  "Motore / Trasmissione","Impianto Frenante","Sospensioni / Sterzo",
  "Elettrico / Bordo","Clima / Riscaldamento","Carrozzeria / Struttura",
  "Pneumatici / Ruote","Porte / Accessi","Impianto Carburante",
  "Sistema Diagnostico / OBD","Scarico / Emissioni","Altro",
];
const GRAVITA = [
  {v:"bassa",label:"Bassa",color:C.green},
  {v:"media",label:"Media",color:C.yellow},
  {v:"alta", label:"Alta", color:C.red},
];
const STATI = [
  {v:"aperto",         label:"Aperto",         color:C.red},
  {v:"in lavorazione", label:"In Lavorazione",  color:C.yellow},
  {v:"riparato",       label:"Riparato",        color:C.green},
];
const TABS = [
  {id:"dashboard", icon:"◈", label:"Dashboard"},
  {id:"mezzi",     icon:"⊡", label:"Mezzi"},
  {id:"utilizzi",  icon:"⊞", label:"Utilizzi"},
  {id:"guasti",    icon:"⚠", label:"Guasti"},
  {id:"ai",        icon:"⚙", label:"AI Meccanico"},
];

const today = () => new Date().toISOString().split("T")[0];
const fmt   = d => { if(!d) return "—"; const [y,m,g]=d.split("-"); return `${g}/${m}/${y}`; };

// Definito FUORI da App — evita rimount su iOS che chiude la tastiera
const NumInput = ({val, onChange, placeholder, mezzi}) => {
  const uid = "nl-" + (placeholder||"x").replace(/\s/g,"");
  return (
    <>
      <input
        list={uid}
        placeholder={placeholder||"es. N082"}
        value={val}
        onChange={onChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck="false"
        style={{
          background:"#181b23",border:"1px solid #2a2e42",borderRadius:7,
          color:"#dde1f0",padding:"9px 13px",fontSize:15,
          fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",
          outline:"none",width:"100%",boxSizing:"border-box",
          WebkitAppearance:"none",
        }}
      />
      <datalist id={uid}>
        {(mezzi||[]).map(m=><option key={m.numero} value={m.numero}/>)}
      </datalist>
    </>
  );
};

// Firebase REST
const fbGet    = async (u,p)   => { try{ const r=await fetch(`${u}/${p}.json`); return r.ok?r.json():null; }catch{ return null; }};
const fbPost   = async (u,p,d) => { try{ const r=await fetch(`${u}/${p}.json`,{method:"POST",body:JSON.stringify(d)}); return r.ok?r.json():null; }catch{ return null; }};
const fbPatch  = async (u,p,d) => { try{ await fetch(`${u}/${p}.json`,{method:"PATCH",body:JSON.stringify(d)}); }catch{} };
const fbDelete = async (u,p)   => { try{ await fetch(`${u}/${p}.json`,{method:"DELETE"}); }catch{} };
const o2a      = o => o ? Object.entries(o).map(([_key,v])=>({...v,_key})) : [];

// UI atoms
const IS = {background:C.bgInput,border:`1px solid ${C.borderHi}`,borderRadius:7,color:C.text,
  padding:"9px 13px",fontSize:13,fontFamily:"'IBM Plex Mono',monospace",outline:"none",
  width:"100%",boxSizing:"border-box",transition:"border-color 0.2s"};

const Badge = ({color,children,sm}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}55`,borderRadius:4,
    padding:sm?"1px 7px":"2px 9px",fontSize:sm?10:11,fontFamily:"'IBM Plex Mono',monospace",
    fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
    {children}
  </span>
);
const Label = ({c}) => (
  <label style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",
    textTransform:"uppercase",display:"block",marginBottom:6}}>{c}</label>
);
const Inp = p => <input {...p} style={{...IS,...p.style}}/>;
const Btn = ({children,onClick,color,outline,small,disabled,style}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:outline?"transparent":(color||C.accent),
    color:outline?(color||C.muted):(color===C.red||color===C.purple?"#fff":"#000"),
    border:outline?`1px solid ${color||C.borderHi}`:"none",
    borderRadius:7,padding:small?"6px 14px":"9px 20px",
    fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:small?12:13,
    letterSpacing:"0.05em",cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?0.5:1,transition:"all 0.15s",whiteSpace:"nowrap",...style}}>
    {children}
  </button>
);
const SH = ({icon,title,count,color}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
    <span style={{fontSize:13,color:color||C.accent}}>{icon}</span>
    <span style={{fontSize:13,fontWeight:700,color:color||C.accent,letterSpacing:"0.07em",textTransform:"uppercase"}}>{title}</span>
    {count!=null&&<span style={{fontSize:11,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>({count})</span>}
  </div>
);

// Markdown safe renderer
const MdBlock = ({text}) => (
  <div style={{lineHeight:1.75}}>
    {text.split("\n").map((line,i)=>{
      if(!line.trim()) return <div key={i} style={{height:5}}/>;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p,j)=>
        p.startsWith("**")&&p.endsWith("**")
          ? <strong key={j} style={{color:C.accent,fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700}}>{p.slice(2,-2)}</strong>
          : <span key={j}>{p}</span>
      );
      if(line.match(/^[-•]\s|^\d+\.\s/))
        return <div key={i} style={{display:"flex",gap:6,padding:"2px 0 2px 8px",fontSize:13,color:C.dim}}>
          <span style={{color:C.accent,flexShrink:0}}>›</span><span>{rendered}</span>
        </div>;
      return <div key={i} style={{fontSize:13,color:C.dim,padding:"1px 0"}}>{rendered}</div>;
    })}
  </div>
);

// ── Statbox
const StatBox = ({label,value,accent,sub}) => (
  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
    padding:"16px 18px",flex:1,minWidth:100}}>
    <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <div style={{fontSize:36,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:accent||C.accent,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.dim,marginTop:4}}>{sub}</div>}
  </div>
);

// ── Condizione dot
const CondDot = ({v,size}) => {
  const c = CONDIZIONI.find(x=>x.v===v);
  if(!c) return null;
  return <span style={{
    display:"inline-flex",alignItems:"center",gap:5,
    background:c.color+"22",border:`1px solid ${c.color}55`,
    borderRadius:5,padding:size==="sm"?"1px 7px":"3px 10px",
    fontSize:size==="sm"?10:11,fontFamily:"'IBM Plex Mono',monospace",
    fontWeight:700,color:c.color,letterSpacing:"0.06em",textTransform:"uppercase",
    whiteSpace:"nowrap",
  }}>
    <span style={{fontSize:7,lineHeight:1}}>●</span>{c.label}
  </span>;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]         = useState("dashboard");
  const [fbUrl,setFbUrl]     = useState(()=>{ try{ return localStorage.getItem("buslog_fb")||""; }catch{ return ""; }});
  const [showCfg,setShowCfg] = useState(false);
  const [fbInput,setFbInput] = useState(fbUrl);
  const [synced,setSynced]   = useState(false);
  const [loading,setLoading] = useState(false);

  // ── DATI ──
  const [mezzi,    setMezzi]    = useState([]);  // {_key, numero, note}
  const [utilizzi, setUtilizzi] = useState([]);  // {_key, data, numero, linea, condizione, funziona, nonFunziona, note}
  const [guasti,   setGuasti]   = useState([]);  // {_key, numero, tipo, descrizione, gravita, stato, dataSegnalazione, dataRiparazione}

  // ── MODAL STORICO MEZZO ──
  const [mezzoDetail, setMezzoDetail] = useState(null); // numero mezzo

  // ── FIREBASE ──
  const loadAll = useCallback(async url=>{
    if(!url) return;
    setLoading(true);
    const [m,u,g] = await Promise.all([
      fbGet(url,"mezzi"), fbGet(url,"utilizzi"), fbGet(url,"guasti"),
    ]);
    setMezzi(o2a(m));
    setUtilizzi(o2a(u).sort((a,b)=>b.data?.localeCompare(a.data)));
    setGuasti(o2a(g).sort((a,b)=>b.dataSegnalazione?.localeCompare(a.dataSegnalazione)));
    setSynced(true);
    setLoading(false);
  },[]);
  useEffect(()=>{ if(fbUrl) loadAll(fbUrl); },[fbUrl,loadAll]);

  const saveFbUrl = () => {
    const u=fbInput.replace(/\/+$/,"");
    try{ localStorage.setItem("buslog_fb",u); }catch{}
    setFbUrl(u); setShowCfg(false);
  };

  const addItem = async (col,data,setter) => {
    if(fbUrl){ const r=await fbPost(fbUrl,col,data); if(r?.name) setter(p=>[{...data,_key:r.name},...p]); }
    else setter(p=>[{...data,_key:Date.now().toString()},...p]);
  };
  const delItem = async (col,key,setter) => {
    if(fbUrl) await fbDelete(fbUrl,`${col}/${key}`);
    setter(p=>p.filter(x=>x._key!==key));
  };
  const patchItem = async (col,key,upd,setter) => {
    if(fbUrl) await fbPatch(fbUrl,`${col}/${key}`,upd);
    setter(p=>p.map(x=>x._key===key?{...x,...upd}:x));
  };

  // ── FORMS ──
  const eM = {numero:""};
  const [fM,setFM] = useState(eM);
  const addMezzo = async () => {
    if(!fM.numero.trim()) return;
    const num = fM.numero.trim().toUpperCase();
    if(mezzi.find(m=>m.numero===num)){ alert(`Mezzo ${num} già presente.`); return; }
    await addItem("mezzi",{numero:num,note:""},setMezzi);
    setFM(eM);
  };

  const eU = {data:today(),numero:"",linea:"",condizione:"buono",funziona:"",nonFunziona:"",note:""};
  const [fU,setFU] = useState(eU);
  const addUso = async () => {
    if(!fU.numero.trim()||!fU.linea.trim()) return;
    const item = {...fU, numero:fU.numero.trim().toUpperCase(), linea:fU.linea.trim().toUpperCase()};
    // aggiungi mezzo automaticamente se non esiste
    if(!mezzi.find(m=>m.numero===item.numero)){
      await addItem("mezzi",{numero:item.numero,note:""},setMezzi);
    }
    await addItem("utilizzi",item,setUtilizzi);
    setFU(p=>({...eU,numero:p.numero,linea:p.linea})); // tieni numero e linea per velocità
  };

  const eG = {numero:"",tipo:TIPI_GUASTO[0],descrizione:"",gravita:"media",
    stato:"aperto",dataSegnalazione:today(),dataRiparazione:""};
  const [fG,setFG] = useState(eG);
  const addGuasto = async () => {
    if(!fG.numero.trim()||!fG.descrizione.trim()) return;
    const item = {...fG, numero:fG.numero.trim().toUpperCase()};
    if(!mezzi.find(m=>m.numero===item.numero)){
      await addItem("mezzi",{numero:item.numero,note:""},setMezzi);
    }
    await addItem("guasti",item,setGuasti);
    setFG(p=>({...eG,numero:p.numero}));
  };
  const setStatoG = async (key,stato) => {
    await patchItem("guasti",key,{stato,...(stato==="riparato"?{dataRiparazione:today()}:{})},setGuasti);
  };

  // ── AI ──
  const [aiNum, setAiNum]   = useState("");
  const [aiTipo,setAiTipo]  = useState(TIPI_GUASTO[0]);
  const [aiDesc,setAiDesc]  = useState("");
  const [aiResp,setAiResp]  = useState("");
  const [aiLoad,setAiLoad]  = useState(false);
  const aiRef = useRef(null);

  const runAI = async () => {
    if(!aiDesc||aiLoad) return;
    setAiLoad(true); setAiResp("");
    // context from history
    const usMezzo = utilizzi.filter(u=>u.numero===aiNum.toUpperCase()).slice(0,3);
    const guMezzo = guasti.filter(g=>g.numero===aiNum.toUpperCase()&&g.stato!=="riparato");
    const context = usMezzo.length
      ? `\nStorico recente mezzo: ${usMezzo.map(u=>`${fmt(u.data)} linea ${u.linea} condizione ${u.condizione}${u.nonFunziona?", problemi: "+u.nonFunziona:""}`).join(" | ")}`
      : "";
    const prompt = `Sono autista di autobus ANM Napoli.
Mezzo: ${aiNum.toUpperCase()||"non specificato"}
Categoria guasto: ${aiTipo}
Problema: ${aiDesc}${context}
${guMezzo.length ? `\nGuasti aperti su questo mezzo: ${guMezzo.map(g=>g.tipo+": "+g.descrizione).join("; ")}` : ""}

Esegui diagnosi tecnica completa da ingegnere meccatronico. Rispondi in italiano strutturato così:

**1. SISTEMI COINVOLTI**
[componenti interessati]

**2. CAUSE PROBABILI** (dalla più probabile)
[lista numerata: % probabilità, causa tecnica, meccanismo fisico]

**3. DIAGNOSI DETTAGLIATA**
[analisi guasto: meccanismo di failure, usura, degrado, valori tipici bar/°C/km]

**4. COSA FARE SUBITO**
[azione immediata come autista, quando fermare il mezzo, cosa comunicare al deposito]

**5. RISCHI SE IGNORATO**
[sicurezza, danni secondari, conseguenze operative]

**6. MANUTENZIONE PREVENTIVA**
[intervalli km/tempo, costi stimati, parti da verificare]`;

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:`Sei un ingegnere meccatronico di élite specializzato in autobus urbani. 20+ anni su flotte TPL.
Conosci: motori diesel Mercedes OM936/OM470/OM471 Euro VI, Cummins ISB/ISC, MAN D0836, trasmissioni automatiche Voith D864/ZF EcoLife/Allison T270, freni EBS Wabco/Knorr-Bremse, sospensioni pneumatiche ECAS, elettronica CAN-bus, diagnostica OBD SAE J1939.
Rispondi SEMPRE in italiano. Usa valori tecnici precisi. Massima praticità operativa per un autista.`,
          messages:[{role:"user",content:prompt}],
        }),
      });
      const d = await r.json();
      setAiResp(d.content?.map(x=>x.text||"").join("")||"Errore nella risposta.");
      setTimeout(()=>aiRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
    } catch{ setAiResp("⚠ Errore di connessione. Riprova."); }
    setAiLoad(false);
  };

  // ── STATS ──
  const nAperti = guasti.filter(g=>g.stato==="aperto").length;
  const nInLav  = guasti.filter(g=>g.stato==="in lavorazione").length;
  const nRip    = guasti.filter(g=>g.stato==="riparato").length;
  const nCrit   = guasti.filter(g=>g.gravita==="alta"&&g.stato!=="riparato").length;

  // Per un mezzo: ultima condizione
  const lastCondizione = (num) => {
    const last = utilizzi.find(u=>u.numero===num);
    return last?.condizione||null;
  };
  const guastiAperti = (num) => guasti.filter(g=>g.numero===num&&g.stato!=="riparato");

  // NumInput è definito fuori da App (vedi sopra)

  // ── MODAL STORICO MEZZO ──
  const MezzoModal = ({numero, onClose}) => {
    const uMezzo = utilizzi.filter(u=>u.numero===numero).sort((a,b)=>b.data.localeCompare(a.data));
    const gMezzo = guasti.filter(g=>g.numero===numero).sort((a,b)=>b.dataSegnalazione.localeCompare(a.dataSegnalazione));
    const gAperti = gMezzo.filter(g=>g.stato!=="riparato");
    const lc = lastCondizione(numero);
    const lineeUsate = [...new Set(uMezzo.map(u=>u.linea))];

    return (
      <div style={{position:"fixed",inset:0,background:"#000c",zIndex:500,
        display:"flex",alignItems:"flex-start",justifyContent:"center",
        padding:"20px 12px",overflowY:"auto"}}
        onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{background:C.bgCard,border:`1px solid ${C.accent}44`,borderRadius:12,
          width:"min(640px,100%)",padding:"24px 20px",position:"relative"}}>
          
          {/* Header mezzo */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,
            paddingBottom:16,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
              fontSize:28,color:C.accent,letterSpacing:"0.06em"}}>{numero}</div>
            <div style={{flex:1}}>
              {lc && <div style={{marginBottom:4}}><CondDot v={lc}/></div>}
              <div style={{fontSize:11,color:C.muted}}>
                {uMezzo.length} utilizzi · linee: {lineeUsate.join(", ")||"—"}
              </div>
            </div>
            {gAperti.length>0&&<Badge color={C.red}>{gAperti.length} guasto{gAperti.length>1?"i":""} aperti</Badge>}
            <button onClick={onClose} style={{background:"transparent",border:"none",
              color:C.muted,cursor:"pointer",fontSize:20,padding:"2px 8px",lineHeight:1}}>✕</button>
          </div>

          {/* Guasti attivi */}
          {gAperti.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,color:C.red,fontWeight:700,letterSpacing:"0.1em",
                textTransform:"uppercase",marginBottom:10}}>⚠ Guasti Attivi</div>
              {gAperti.map(g=>{
                const gr=GRAVITA.find(x=>x.v===g.gravita);
                return(
                  <div key={g._key} style={{background:C.bgInput,borderRadius:7,padding:"10px 12px",
                    marginBottom:8,borderLeft:`3px solid ${gr?.color}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <Badge color={gr?.color} sm>{gr?.label}</Badge>
                      <span style={{fontSize:13,fontWeight:700}}>{g.tipo}</span>
                      <span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>{fmt(g.dataSegnalazione)}</span>
                    </div>
                    <div style={{fontSize:12,color:C.dim}}>{g.descrizione}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Storico utilizzi */}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:10}}>Storico Utilizzi ({uMezzo.length})</div>
            {uMezzo.length===0&&<div style={{color:C.muted,fontSize:12,padding:8}}>Nessun utilizzo registrato.</div>}
            {uMezzo.map(u=>(
              <div key={u._key} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom: (u.funziona||u.nonFunziona||u.note)?6:0}}>
                  <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:74,flexShrink:0}}>{fmt(u.data)}</span>
                  <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                    borderRadius:4,padding:"1px 9px",fontSize:13,fontWeight:700,
                    fontFamily:"'IBM Plex Mono',monospace",minWidth:48,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                  <CondDot v={u.condizione} size="sm"/>
                  {u.note&&<span style={{fontSize:11,color:C.muted,flex:1,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.note}</span>}
                </div>
                {(u.funziona||u.nonFunziona)&&(
                  <div style={{paddingLeft:84,display:"flex",gap:16,flexWrap:"wrap"}}>
                    {u.funziona&&<span style={{fontSize:11,color:C.green}}>✓ {u.funziona}</span>}
                    {u.nonFunziona&&<span style={{fontSize:11,color:C.red}}>✗ {u.nonFunziona}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Storico guasti riparati */}
          {gMezzo.filter(g=>g.stato==="riparato").length>0&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",
                textTransform:"uppercase",marginBottom:10}}>
                Guasti Riparati ({gMezzo.filter(g=>g.stato==="riparato").length})
              </div>
              {gMezzo.filter(g=>g.stato==="riparato").map(g=>(
                <div key={g._key} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",gap:10}}>
                  <Badge color={C.green} sm>Riparato</Badge>
                  <span style={{fontSize:12,color:C.dim,flex:1}}>{g.tipo}</span>
                  <span style={{fontSize:10,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>
                    {fmt(g.dataRiparazione)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{marginTop:18,display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn small onClick={()=>{setAiNum(numero);setAiDesc("");setTab("ai");onClose();}}>
              ⚙ Consulta AI Meccanico
            </Btn>
            <Btn small outline onClick={onClose}>Chiudi</Btn>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html{background:${C.bg};}
      body{background:${C.bg};padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);}
      input:focus,select:focus,textarea:focus{border-color:${C.accent}!important;box-shadow:0 0 0 2px ${C.accent}15!important;}
      ::-webkit-scrollbar{width:5px;height:5px;}
      ::-webkit-scrollbar-track{background:${C.bg};}
      ::-webkit-scrollbar-thumb{background:${C.borderHi};border-radius:3px;}
      .hov:hover{background:${C.bgHover}!important;}
      .tn:hover{color:${C.text}!important;}
      @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    `}</style>

    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Rajdhani',sans-serif",color:C.text}}>

      {/* HEADER */}
      <div style={{background:C.bgCard,borderBottom:`2px solid ${C.accent}`,
        padding:"0 16px",paddingTop:"max(12px, env(safe-area-inset-top))",
        display:"flex",alignItems:"center",gap:12,minHeight:54,
        position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          <span style={{fontSize:18}}>🚌</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.accent,letterSpacing:"0.05em",lineHeight:1}}>BUSLOG</div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:"0.14em"}}>ANM NAPOLI</div>
          </div>
        </div>
        <div style={{width:1,height:28,background:C.border,flexShrink:0}}/>
        <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} className="tn" onClick={()=>setTab(t.id)} style={{
              background:tab===t.id?C.accent+"22":"transparent",
              color:tab===t.id?C.accent:C.muted,
              border:tab===t.id?`1px solid ${C.accent}44`:"1px solid transparent",
              borderRadius:6,padding:"4px 9px",fontFamily:"'Rajdhani',sans-serif",
              fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",
              letterSpacing:"0.04em",transition:"all 0.15s",
              display:"flex",alignItems:"center",gap:4,
            }}>
              <span style={{fontSize:9}}>{t.icon}</span>{t.label}
              {t.id==="guasti"&&nAperti>0&&(
                <span style={{background:C.red,color:"#fff",borderRadius:3,
                  padding:"0 4px",fontSize:9,fontWeight:700,minWidth:14,textAlign:"center"}}>
                  {nAperti}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          <div title={fbUrl&&synced?"Firebase OK":fbUrl?"Connessione...":"Solo memoria"} style={{
            width:7,height:7,borderRadius:"50%",
            background:fbUrl&&synced?C.green:fbUrl?C.yellow:C.muted,
            boxShadow:fbUrl&&synced?`0 0 5px ${C.green}`:"none",
          }}/>
          <button onClick={()=>{setFbInput(fbUrl);setShowCfg(true);}} style={{
            background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
            borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:10,
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700,
          }}>⚙ DB</button>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showCfg&&(
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.bgCard,border:`1px solid ${C.accent}44`,borderRadius:10,
            width:"min(440px,100%)",padding:"22px 20px"}}>
            <SH icon="⚙" title="Configurazione Firebase" color={C.accent}/>
            <p style={{fontSize:12,color:C.dim,marginBottom:12,lineHeight:1.6}}>
              Incolla l'URL del tuo Firebase Realtime Database per salvare i dati in modo permanente.<br/>
              <code style={{color:C.accent,fontSize:11}}>https://IL-TUO-PROGETTO-default-rtdb.firebaseio.com</code>
            </p>
            <Label c="Firebase URL"/>
            <Inp value={fbInput} onChange={e=>setFbInput(e.target.value)}
              placeholder="https://..." style={{marginBottom:14}}/>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={saveFbUrl}>Salva e Connetti</Btn>
              <Btn onClick={()=>setShowCfg(false)} outline>Annulla</Btn>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STORICO MEZZO */}
      {mezzoDetail&&(
        <MezzoModal numero={mezzoDetail} onClose={()=>setMezzoDetail(null)}/>
      )}

      {loading&&(
        <div style={{textAlign:"center",padding:14,color:C.accent,fontSize:12,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span>
          Caricamento da Firebase...
        </div>
      )}

      <div style={{padding:"16px 14px",maxWidth:900,margin:"0 auto"}}>

        {/* ══ DASHBOARD ══ */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <StatBox label="Mezzi" value={mezzi.length} sub="nel registro"/>
              <StatBox label="Utilizzi" value={utilizzi.length} sub="totali"/>
              <StatBox label="Aperti" value={nAperti} accent={nAperti>0?C.red:C.green} sub="guasti"/>
              <StatBox label="Officina" value={nInLav} accent={C.yellow} sub="in lav."/>
              <StatBox label="Riparati" value={nRip} accent={C.green} sub="storico"/>
            </div>

            {!fbUrl&&(
              <div style={{background:C.yellow+"18",border:`1px solid ${C.yellow}44`,borderRadius:8,
                padding:"10px 14px",display:"flex",alignItems:"center",
                justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:C.yellow}}>
                  ⚠ Modalità offline — configura Firebase per salvare i dati.
                </span>
                <button onClick={()=>{setFbInput("");setShowCfg(true);}} style={{
                  background:C.yellow,color:"#000",border:"none",borderRadius:5,
                  padding:"5px 12px",fontSize:11,fontFamily:"'Rajdhani',sans-serif",
                  fontWeight:700,cursor:"pointer"}}>Configura DB</button>
              </div>
            )}

            {/* Ultimi utilizzi */}
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⊞" title="Ultimi Utilizzi"/>
              {utilizzi.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:12}}>Nessun utilizzo.</div>}
              {utilizzi.slice(0,7).map(u=>{
                const c=CONDIZIONI.find(x=>x.v===u.condizione);
                return(
                  <div key={u._key} className="hov" style={{display:"flex",alignItems:"center",gap:10,
                    padding:"9px 5px",borderBottom:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setMezzoDetail(u.numero)}>
                    <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:72,flexShrink:0}}>{fmt(u.data)}</span>
                    <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                      borderRadius:4,padding:"1px 9px",fontSize:13,fontWeight:700,
                      fontFamily:"'IBM Plex Mono',monospace",minWidth:48,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:600,
                      color:C.text,minWidth:52,flexShrink:0}}>{u.numero}</span>
                    {c&&<span style={{fontSize:8,color:c.color,flexShrink:0}}>●</span>}
                    {u.nonFunziona&&<span style={{fontSize:11,color:C.red,flex:1,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✗ {u.nonFunziona}</span>}
                  </div>
                );
              })}
            </div>

            {/* Guasti attivi */}
            {guasti.filter(g=>g.stato!=="riparato").length>0&&(
              <div style={{background:C.bgCard,border:`1px solid ${C.red}44`,borderRadius:10,
                padding:"18px 18px",boxShadow:`0 0 20px ${C.red}0e`}}>
                <SH icon="⚠" title="Guasti Attivi" color={C.red}
                  count={guasti.filter(g=>g.stato!=="riparato").length}/>
                {guasti.filter(g=>g.stato!=="riparato").map(g=>{
                  const gr=GRAVITA.find(x=>x.v===g.gravita);
                  const st=STATI.find(x=>x.v===g.stato);
                  return(
                    <div key={g._key} className="hov" style={{padding:"9px 5px",
                      borderBottom:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}
                      onClick={()=>setMezzoDetail(g.numero)}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <Badge color={gr?.color} sm>{gr?.label}</Badge>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:C.accent}}>{g.numero}</span>
                        <span style={{fontSize:13,fontWeight:600,flex:1}}>{g.tipo}</span>
                        <Badge color={st?.color} sm>{st?.label}</Badge>
                      </div>
                      <div style={{fontSize:12,color:C.dim,paddingLeft:2}}>{g.descrizione}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MEZZI ══ */}
        {tab==="mezzi"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⊡" title="Aggiungi Mezzo" color={C.accent}/>
              <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                <div style={{flex:1}}>
                  <Label c="Numero Mezzo *"/>
                  <Inp placeholder="es. N082, 4231, A015..."
                    value={fM.numero} onChange={e=>setFM({numero:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&addMezzo()}
                    style={{fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",fontSize:15}}/>
                </div>
                <Btn onClick={addMezzo}>Aggiungi</Btn>
              </div>
              <p style={{fontSize:11,color:C.muted,marginTop:8}}>
                I mezzi vengono anche aggiunti automaticamente quando registri un utilizzo o un guasto.
              </p>
            </div>

            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⊡" title="Parco Mezzi" count={mezzi.length}/>
              {mezzi.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Nessun mezzo registrato.</div>}
              {mezzi.map(m=>{
                const lc=lastCondizione(m.numero);
                const c=CONDIZIONI.find(x=>x.v===lc);
                const ga=guastiAperti(m.numero);
                const nu=utilizzi.filter(u=>u.numero===m.numero);
                const linee=[...new Set(nu.map(u=>u.linea))];
                return(
                  <div key={m._key} className="hov" style={{display:"flex",alignItems:"center",gap:14,
                    padding:"13px 8px",borderBottom:`1px solid ${C.border}`,
                    borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setMezzoDetail(m.numero)}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                      fontSize:20,color:C.accent,minWidth:72,letterSpacing:"0.06em"}}>{m.numero}</div>
                    <div style={{flex:1}}>
                      {c&&<div style={{marginBottom:3}}><CondDot v={lc} size="sm"/></div>}
                      <div style={{fontSize:11,color:C.muted}}>
                        {nu.length} utilizz{nu.length===1?"o":"i"}
                        {linee.length>0&&<span> · linee: <span style={{color:C.dim}}>{linee.slice(0,4).join(", ")}{linee.length>4?"…":""}</span></span>}
                      </div>
                    </div>
                    {ga.length>0
                      ? <Badge color={C.red}>{ga.length} guasto{ga.length>1?"i":""}</Badge>
                      : nu.length>0&&<Badge color={C.green}>OK</Badge>}
                    <span style={{fontSize:11,color:C.dim}}>›</span>
                    <button onClick={e=>{e.stopPropagation();delItem("mezzi",m._key,setMezzi);}} style={{
                      background:"transparent",border:"none",color:C.muted,
                      cursor:"pointer",fontSize:13,padding:"2px 5px"}}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ UTILIZZI ══ */}
        {tab==="utilizzi"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⊞" title="Registra Utilizzo"/>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:"0 0 130px"}}>
                  <Label c="Data *"/>
                  <Inp type="date" value={fU.data} onChange={e=>setFU(p=>({...p,data:e.target.value}))}/>
                </div>
                <div style={{flex:1,minWidth:100}}>
                  <Label c="N° Mezzo *"/>
                  <NumInput val={fU.numero} mezzi={mezzi}
                    onChange={e=>setFU(p=>({...p,numero:e.target.value.toUpperCase()}))}/>
                </div>
                <div style={{flex:"0 0 90px"}}>
                  <Label c="Linea *"/>
                  <Inp placeholder="C1" value={fU.linea}
                    onChange={e=>setFU(p=>({...p,linea:e.target.value.toUpperCase()}))}
                    style={{textAlign:"center",fontWeight:700}}/>
                </div>
              </div>

              {/* Condizione */}
              <Label c="Condizione Generale del Mezzo"/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {CONDIZIONI.map(c=>(
                  <button key={c.v} onClick={()=>setFU(p=>({...p,condizione:c.v}))} style={{
                    background:fU.condizione===c.v?c.color+"33":"transparent",
                    border:`1px solid ${fU.condizione===c.v?c.color:C.borderHi}`,
                    color:fU.condizione===c.v?c.color:C.muted,
                    borderRadius:6,padding:"5px 12px",fontFamily:"'Rajdhani',sans-serif",
                    fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:"0.04em",
                    display:"flex",alignItems:"center",gap:5,
                  }}>
                    <span style={{fontSize:7,color:fU.condizione===c.v?c.color:C.muted}}>●</span>{c.label}
                  </button>
                ))}
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:160}}>
                  <Label c="Cosa funziona bene"/>
                  <Inp placeholder="es. freni ok, clima ok, porte regolari..."
                    value={fU.funziona} onChange={e=>setFU(p=>({...p,funziona:e.target.value}))}
                    style={{fontFamily:"'Rajdhani',sans-serif"}}/>
                </div>
                <div style={{flex:1,minWidth:160}}>
                  <Label c="Cosa NON funziona / Criticità"/>
                  <Inp placeholder="es. clima guasto, vibrazione asse post..."
                    value={fU.nonFunziona} onChange={e=>setFU(p=>({...p,nonFunziona:e.target.value}))}
                    style={{fontFamily:"'Rajdhani',sans-serif",borderColor:fU.nonFunziona?C.red+"66":undefined}}/>
                </div>
              </div>

              <Label c="Note aggiuntive"/>
              <Inp placeholder="Servizio serale, cambio linea, altre osservazioni..."
                value={fU.note} onChange={e=>setFU(p=>({...p,note:e.target.value}))}
                style={{fontFamily:"'Rajdhani',sans-serif",marginBottom:14}}/>
              <Btn onClick={addUso}>Salva Utilizzo</Btn>
            </div>

            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⊞" title="Storico Utilizzi" count={utilizzi.length}/>
              {utilizzi.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Nessun utilizzo.</div>}
              {utilizzi.map(u=>{
                const c=CONDIZIONI.find(x=>x.v===u.condizione);
                return(
                  <div key={u._key} className="hov" style={{padding:"10px 6px",
                    borderBottom:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setMezzoDetail(u.numero)}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:u.nonFunziona?4:0}}>
                      <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:72,flexShrink:0}}>{fmt(u.data)}</span>
                      <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                        borderRadius:4,padding:"1px 9px",fontSize:12,fontWeight:700,
                        fontFamily:"'IBM Plex Mono',monospace",minWidth:46,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,
                        color:C.text,flexShrink:0}}>{u.numero}</span>
                      {c&&<span style={{fontSize:8,color:c.color}}>●</span>}
                      <span style={{fontSize:11,color:c?.color||C.dim}}>{c?.label}</span>
                      <div style={{flex:1}}/>
                      <button onClick={e=>{e.stopPropagation();delItem("utilizzi",u._key,setUtilizzi);}} style={{
                        background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:"1px 4px"}}>✕</button>
                    </div>
                    {u.nonFunziona&&<div style={{paddingLeft:82,fontSize:11,color:C.red}}>✗ {u.nonFunziona}</div>}
                    {u.funziona&&<div style={{paddingLeft:82,fontSize:11,color:C.green}}>✓ {u.funziona}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ GUASTI ══ */}
        {tab==="guasti"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.red}33`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⚠" title="Segnala Guasto" color={C.red}/>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:120}}>
                  <Label c="N° Mezzo *"/>
                  <NumInput val={fG.numero} mezzi={mezzi}
                    onChange={e=>setFG(p=>({...p,numero:e.target.value.toUpperCase()}))}/>
                </div>
                <div style={{flex:"0 0 140px"}}>
                  <Label c="Data"/>
                  <Inp type="date" value={fG.dataSegnalazione}
                    onChange={e=>setFG(p=>({...p,dataSegnalazione:e.target.value}))}/>
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:2,minWidth:180}}>
                  <Label c="Categoria Guasto"/>
                  <select value={fG.tipo} onChange={e=>setFG(p=>({...p,tipo:e.target.value}))}
                    style={{...IS,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer"}}>
                    {TIPI_GUASTO.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:110}}>
                  <Label c="Gravità"/>
                  <div style={{display:"flex",gap:6,paddingTop:2}}>
                    {GRAVITA.map(g=>(
                      <button key={g.v} onClick={()=>setFG(p=>({...p,gravita:g.v}))} style={{
                        background:fG.gravita===g.v?g.color+"33":"transparent",
                        border:`1px solid ${fG.gravita===g.v?g.color:C.borderHi}`,
                        color:fG.gravita===g.v?g.color:C.muted,
                        borderRadius:6,padding:"6px 10px",fontFamily:"'Rajdhani',sans-serif",
                        fontWeight:700,fontSize:12,cursor:"pointer",flex:1,
                      }}>{g.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <Label c="Descrizione Tecnica *"/>
              <textarea rows={3} value={fG.descrizione}
                onChange={e=>setFG(p=>({...p,descrizione:e.target.value}))}
                placeholder="Sintomi, condizioni (freddo/caldo, in frenata, accelerazione), rumori, km, frequenza..."
                style={{...IS,fontFamily:"'Rajdhani',sans-serif",resize:"vertical",marginBottom:14,lineHeight:1.5}}/>
              <Btn onClick={addGuasto} color={C.red}>Segnala Guasto</Btn>
            </div>

            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 18px"}}>
              <SH icon="⚠" title="Storico Guasti" count={guasti.length}/>
              {guasti.length===0&&<div style={{color:C.green,fontSize:13,textAlign:"center",padding:20}}>✓ Nessun guasto.</div>}
              {guasti.map(g=>{
                const gr=GRAVITA.find(x=>x.v===g.gravita);
                const st=STATI.find(x=>x.v===g.stato);
                return(
                  <div key={g._key} style={{background:C.bgInput,borderRadius:8,padding:"13px 14px",
                    marginBottom:10,border:`1px solid ${C.border}`,borderLeft:`3px solid ${gr?.color}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <Badge color={gr?.color} sm>{gr?.label}</Badge>
                      <button onClick={()=>setMezzoDetail(g.numero)} style={{
                        background:"transparent",border:"none",cursor:"pointer",padding:0,
                        fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:C.accent}}>
                        {g.numero}
                      </button>
                      <span style={{fontSize:13,fontWeight:700,flex:1}}>{g.tipo}</span>
                      <span style={{fontSize:10,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(g.dataSegnalazione)}</span>
                    </div>
                    <div style={{fontSize:12,color:C.dim,marginBottom:10}}>{g.descrizione}</div>
                    {g.stato==="riparato"&&<div style={{fontSize:11,color:C.green,marginBottom:8}}>✓ Riparato il {fmt(g.dataRiparazione)}</div>}
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {STATI.map(so=>(
                        <button key={so.v} onClick={()=>setStatoG(g._key,so.v)} style={{
                          background:g.stato===so.v?so.color+"33":"transparent",
                          border:`1px solid ${g.stato===so.v?so.color:C.border}`,
                          color:g.stato===so.v?so.color:C.muted,
                          borderRadius:5,padding:"3px 10px",fontSize:11,
                          fontFamily:"'Rajdhani',sans-serif",fontWeight:700,cursor:"pointer"}}>
                          {so.label}
                        </button>
                      ))}
                      <div style={{flex:1}}/>
                      <button onClick={()=>{setAiNum(g.numero);setAiTipo(g.tipo);setAiDesc(g.descrizione);setTab("ai");}} style={{
                        background:C.purple+"22",border:`1px solid ${C.purple}44`,color:C.purple,
                        borderRadius:5,padding:"3px 10px",fontSize:11,
                        fontFamily:"'Rajdhani',sans-serif",fontWeight:700,cursor:"pointer"}}>
                        ⚙ AI
                      </button>
                      <button onClick={()=>delItem("guasti",g._key,setGuasti)} style={{
                        background:"transparent",border:`1px solid ${C.red}33`,color:C.red,
                        borderRadius:5,padding:"3px 8px",fontSize:11,
                        fontFamily:"'Rajdhani',sans-serif",cursor:"pointer"}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ AI MECCANICO ══ */}
        {tab==="ai"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.purple}44`,borderRadius:10,
              padding:"18px 18px",boxShadow:`0 0 24px ${C.purple}10`}}>
              <SH icon="⚙" title="AI Meccanico — Diagnosi Tecnica" color={C.purple}/>
              <p style={{fontSize:12,color:C.dim,marginBottom:16,lineHeight:1.6}}>
                Descrivi il problema. L'AI ha accesso allo storico del mezzo e fornisce diagnosi tecnica
                da ingegnere meccatronico specializzato in autobus urbani.
              </p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:120}}>
                  <Label c="N° Mezzo"/>
                  <NumInput val={aiNum} mezzi={mezzi}
                    onChange={e=>setAiNum(e.target.value.toUpperCase())}
                    placeholder="es. N082 (opzionale)"/>
                </div>
                <div style={{flex:2,minWidth:180}}>
                  <Label c="Categoria"/>
                  <select value={aiTipo} onChange={e=>setAiTipo(e.target.value)}
                    style={{...IS,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer"}}>
                    {TIPI_GUASTO.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <Label c="Descrivi il Problema *"/>
              <textarea rows={5} value={aiDesc} onChange={e=>setAiDesc(e.target.value)}
                placeholder={"Descrivi in dettaglio:\n• Quando si manifesta (a freddo/caldo, in frenata, curva, costante)\n• Tipo di rumore (fischio, battito, stridio, vibrazione, cigolìo)\n• Spie accese sul cruscotto\n• Con che frequenza (sempre, saltuariamente, solo in condizioni specifiche)\n• Chilometraggio approssimativo"}
                style={{...IS,fontFamily:"'Rajdhani',sans-serif",resize:"vertical",marginBottom:14,lineHeight:1.5}}/>
              <Btn onClick={runAI} color={C.purple} disabled={!aiDesc||aiLoad}>
                {aiLoad
                  ? <span style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span>
                      Analisi in corso...
                    </span>
                  : "⚙ Esegui Diagnosi"}
              </Btn>
            </div>

            {(aiLoad||aiResp)&&(
              <div ref={aiRef} style={{background:C.bgCard,border:`1px solid ${C.purple}44`,
                borderRadius:10,padding:"18px 18px",boxShadow:`0 0 24px ${C.purple}10`}}>
                <SH icon="⚙" title="Diagnosi Tecnica" color={C.purple}/>
                {aiLoad&&<div style={{color:C.purple,fontSize:13,padding:8}}>Elaborazione diagnostica in corso...</div>}
                {aiResp&&<MdBlock text={aiResp}/>}
              </div>
            )}
          </div>
        )}

        <div style={{marginTop:24,textAlign:"center",color:C.muted,fontSize:10,letterSpacing:"0.12em",paddingBottom:16}}>
          BUSLOG v3 — DEPOSITO CAVALLEGGERI D'AOSTA
        </div>
      </div>
    </div>
  </>);
}
