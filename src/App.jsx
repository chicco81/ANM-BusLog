import { useState, useEffect, useCallback } from "react";

const DARK = {
  bg:"#0b0d12",bgCard:"#111318",bgInput:"#181b23",bgHover:"#1e2130",
  border:"#1f2233",borderHi:"#2a2e42",accent:"#f5a623",
  text:"#dde1f0",muted:"#5a607a",dim:"#8b92ad",
  green:"#22c55e",red:"#f04747",yellow:"#f59e0b",orange:"#fb923c",shadow:"#000",
};
const LIGHT = {
  bg:"#f2f4f8",bgCard:"#ffffff",bgInput:"#eaecf4",bgHover:"#e2e5f0",
  border:"#d8dce8",borderHi:"#c4c9d8",accent:"#c47800",
  text:"#1a1d2e",muted:"#7a839a",dim:"#4a5268",
  green:"#15803d",red:"#dc2626",yellow:"#b45309",orange:"#c2410c",shadow:"#a0a8c0",
};

const CONDIZIONI=[
  {v:"ottimo",  label:"Ottimo",   color:"#22c55e"},
  {v:"buono",   label:"Buono",    color:"#84cc16"},
  {v:"discreto",label:"Discreto", color:"#f59e0b"},
  {v:"scarso",  label:"Scarso",   color:"#fb923c"},
  {v:"critico", label:"Critico",  color:"#f04747"},
];
const TIPI_GUASTO=[
  "Motore / Trasmissione","Impianto Frenante","Sospensioni / Sterzo",
  "Elettrico / Bordo","Clima / Riscaldamento","Carrozzeria / Struttura",
  "Pneumatici / Ruote","Porte / Accessi","Impianto Carburante",
  "Sistema Diagnostico / OBD","Scarico / Emissioni","Altro",
];
const GRAVITA=[
  {v:"bassa",label:"Bassa",color:"#22c55e"},
  {v:"media",label:"Media",color:"#f59e0b"},
  {v:"alta", label:"Alta", color:"#f04747"},
];
const STATI=[
  {v:"aperto",         label:"Aperto",         color:"#f04747"},
  {v:"in lavorazione", label:"In Lavorazione",  color:"#f59e0b"},
  {v:"riparato",       label:"Riparato",        color:"#22c55e"},
];
const TABS=[
  {id:"dashboard",icon:"◈",label:"Dashboard"},
  {id:"mezzi",    icon:"⊡",label:"Mezzi"},
  {id:"utilizzi", icon:"⊞",label:"Utilizzi"},
  {id:"guasti",   icon:"⚠",label:"Guasti"},
];

const today=()=>new Date().toISOString().split("T")[0];
const fmt=d=>{if(!d)return"—";const[y,m,g]=d.split("-");return`${g}/${m}/${y}`;};

const fbGet   =async(u,p)=>{try{const r=await fetch(`${u}/${p}.json`);return r.ok?r.json():null;}catch{return null;}};
const fbPost  =async(u,p,d)=>{try{const r=await fetch(`${u}/${p}.json`,{method:"POST",body:JSON.stringify(d)});return r.ok?r.json():null;}catch{return null;}};
const fbPatch =async(u,p,d)=>{try{await fetch(`${u}/${p}.json`,{method:"PATCH",body:JSON.stringify(d)});}catch{}};
const fbDelete=async(u,p)=>{try{await fetch(`${u}/${p}.json`,{method:"DELETE"});}catch{}};
const o2a=o=>o?Object.entries(o).map(([_key,v])=>({...v,_key})):[];

// Fuori da App per evitare rimount iOS (tastiera che si chiude)
const NumInput=({val,onChange,placeholder,mezzi,colors})=>{
  const uid="nl"+(placeholder||"x").length+(mezzi||[]).length;
  return(<>
    <input list={uid} placeholder={placeholder||"es. N082"} value={val} onChange={onChange}
      autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck="false"
      style={{background:colors.bgInput,border:`1px solid ${colors.borderHi}`,borderRadius:7,
        color:colors.text,padding:"9px 13px",fontSize:15,fontFamily:"'IBM Plex Mono',monospace",
        letterSpacing:"0.08em",outline:"none",width:"100%",boxSizing:"border-box",WebkitAppearance:"none"}}/>
    <datalist id={uid}>{(mezzi||[]).map(m=><option key={m.numero} value={m.numero}/>)}</datalist>
  </>);
};

export default function App(){
  const[dark,setDark]=useState(()=>{try{return localStorage.getItem("buslog_dark")!=="false";}catch{return true;}});
  const C=dark?DARK:LIGHT;
  const IS={background:C.bgInput,border:`1px solid ${C.borderHi}`,borderRadius:7,color:C.text,
    padding:"9px 13px",fontSize:13,fontFamily:"'IBM Plex Mono',monospace",outline:"none",
    width:"100%",boxSizing:"border-box",transition:"border-color 0.2s"};

  const[tab,setTab]=useState("dashboard");
  const[fbUrl,setFbUrl]=useState(()=>{try{return localStorage.getItem("buslog_fb")||"";}catch{return"";}});
  const[showCfg,setShowCfg]=useState(false);
  const[fbInput,setFbInput]=useState(fbUrl);
  const[synced,setSynced]=useState(false);
  const[loading,setLoading]=useState(false);
  const[mezzi,setMezzi]=useState([]);
  const[utilizzi,setUtilizzi]=useState([]);
  const[guasti,setGuasti]=useState([]);
  const[mezzoDetail,setMezzoDetail]=useState(null);
  const[filtroNum,setFiltroNum]=useState("");
  const[editKey,setEditKey]=useState(null);
  const[editData,setEditData]=useState({});

  const toggleDark=()=>{const n=!dark;setDark(n);try{localStorage.setItem("buslog_dark",String(n));}catch{}};

  const loadAll=useCallback(async url=>{
    if(!url)return;
    setLoading(true);
    const[m,u,g]=await Promise.all([fbGet(url,"mezzi"),fbGet(url,"utilizzi"),fbGet(url,"guasti")]);
    setMezzi(o2a(m));
    setUtilizzi(o2a(u).sort((a,b)=>b.data?.localeCompare(a.data)));
    setGuasti(o2a(g).sort((a,b)=>b.dataSegnalazione?.localeCompare(a.dataSegnalazione)));
    setSynced(true);setLoading(false);
  },[]);
  useEffect(()=>{if(fbUrl)loadAll(fbUrl);},[fbUrl,loadAll]);

  const saveFbUrl=()=>{const u=fbInput.replace(/\/+$/,"");try{localStorage.setItem("buslog_fb",u);}catch{}setFbUrl(u);setShowCfg(false);};
  const addItem=async(col,data,setter)=>{if(fbUrl){const r=await fbPost(fbUrl,col,data);if(r?.name)setter(p=>[{...data,_key:r.name},...p]);}else setter(p=>[{...data,_key:Date.now().toString()},...p]);};
  const delItem=async(col,key,setter)=>{if(fbUrl)await fbDelete(fbUrl,`${col}/${key}`);setter(p=>p.filter(x=>x._key!==key));};
  const patchItem=async(col,key,upd,setter)=>{if(fbUrl)await fbPatch(fbUrl,`${col}/${key}`,upd);setter(p=>p.map(x=>x._key===key?{...x,...upd}:x));};

  const eM={numero:""};
  const[fM,setFM]=useState(eM);
  const addMezzo=async()=>{
    if(!fM.numero.trim())return;
    const num=fM.numero.trim().toUpperCase();
    if(mezzi.find(m=>m.numero===num)){alert(`Mezzo ${num} già presente.`);return;}
    await addItem("mezzi",{numero:num,note:""},setMezzi);setFM(eM);
  };

  const eU={data:today(),numero:"",linea:"",condizione:"buono",funziona:"",nonFunziona:"",note:""};
  const[fU,setFU]=useState(eU);
  const addUso=async()=>{
    if(!fU.numero.trim()||!fU.linea.trim())return;
    const item={...fU,numero:fU.numero.trim().toUpperCase(),linea:fU.linea.trim().toUpperCase()};
    if(!mezzi.find(m=>m.numero===item.numero))await addItem("mezzi",{numero:item.numero,note:""},setMezzi);
    await addItem("utilizzi",item,setUtilizzi);
    setFU(p=>({...eU,numero:p.numero,linea:p.linea}));
  };
  const avviaTurnoRapido=()=>{
    const u=utilizzi[0];
    setFU({data:today(),numero:u?.numero||"",linea:u?.linea||"",condizione:"buono",funziona:"",nonFunziona:"",note:""});
    setTab("utilizzi");
  };

  const eG={numero:"",tipo:TIPI_GUASTO[0],descrizione:"",gravita:"media",stato:"aperto",dataSegnalazione:today(),dataRiparazione:""};
  const[fG,setFG]=useState(eG);
  const addGuasto=async()=>{
    if(!fG.numero.trim()||!fG.descrizione.trim())return;
    const item={...fG,numero:fG.numero.trim().toUpperCase()};
    if(!mezzi.find(m=>m.numero===item.numero))await addItem("mezzi",{numero:item.numero,note:""},setMezzi);
    await addItem("guasti",item,setGuasti);
    setFG(p=>({...eG,numero:p.numero}));
  };
  const setStatoG=async(key,stato)=>{
    await patchItem("guasti",key,{stato,...(stato==="riparato"?{dataRiparazione:today()}:{})},setGuasti);
  };
  const startEdit=(u)=>{setEditKey(u._key);setEditData({condizione:u.condizione||"buono",funziona:u.funziona||"",nonFunziona:u.nonFunziona||"",note:u.note||"",linea:u.linea||""});};
  const saveEdit=async(key)=>{await patchItem("utilizzi",key,editData,setUtilizzi);setEditKey(null);};

  const esportaReport=(numero)=>{
    const uM=utilizzi.filter(u=>u.numero===numero).sort((a,b)=>b.data.localeCompare(a.data));
    const gM=guasti.filter(g=>g.numero===numero).sort((a,b)=>b.dataSegnalazione.localeCompare(a.dataSegnalazione));
    const lc=uM[0]?.condizione||"—";
    const linee=[...new Set(uM.map(u=>u.linea))];
    let t=`REPORT MEZZO: ${numero}\nData: ${fmt(today())}\nCondizione: ${lc}\nLinee: ${linee.join(", ")||"—"}\nUtilizzi: ${uM.length}\n\n`;
    t+=`${"─".repeat(38)}\nGUASTI ATTIVI (${gM.filter(g=>g.stato!=="riparato").length})\n${"─".repeat(38)}\n`;
    gM.filter(g=>g.stato!=="riparato").forEach(g=>{t+=`[${g.gravita.toUpperCase()}] ${g.tipo} — ${fmt(g.dataSegnalazione)}\n  ${g.descrizione}\n\n`;});
    t+=`${"─".repeat(38)}\nSTORICO UTILIZZI\n${"─".repeat(38)}\n`;
    uM.forEach(u=>{t+=`${fmt(u.data)} | Linea ${u.linea} | ${u.condizione}\n`;if(u.nonFunziona)t+=`  ✗ ${u.nonFunziona}\n`;if(u.funziona)t+=`  ✓ ${u.funziona}\n`;if(u.note)t+=`  Note: ${u.note}\n`;});
    t+=`\n${"─".repeat(38)}\nGUASTI RIPARATI (${gM.filter(g=>g.stato==="riparato").length})\n${"─".repeat(38)}\n`;
    gM.filter(g=>g.stato==="riparato").forEach(g=>{t+=`${g.tipo} — riparato ${fmt(g.dataRiparazione)}\n`;});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([t],{type:"text/plain;charset=utf-8"}));
    a.download=`BusLog_${numero}_${today()}.txt`;a.click();
  };

  const nAperti=guasti.filter(g=>g.stato==="aperto").length;
  const nInLav=guasti.filter(g=>g.stato==="in lavorazione").length;
  const nRip=guasti.filter(g=>g.stato==="riparato").length;
  const lastCond=num=>utilizzi.find(u=>u.numero===num)?.condizione||null;
  const gAp=num=>guasti.filter(g=>g.numero===num&&g.stato!=="riparato");
  const utilFiltrati=filtroNum.trim()?utilizzi.filter(u=>u.numero.includes(filtroNum.trim().toUpperCase())):utilizzi;

  // UI components
  const Bdg=({color,children,sm})=>(
    <span style={{background:color+"22",color,border:`1px solid ${color}55`,borderRadius:4,
      padding:sm?"1px 7px":"2px 9px",fontSize:sm?10:11,fontFamily:"'IBM Plex Mono',monospace",
      fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
  const Lbl=({c,red})=>(
    <label style={{fontSize:10,fontWeight:700,color:red?C.red:C.muted,letterSpacing:"0.1em",
      textTransform:"uppercase",display:"block",marginBottom:6}}>{c}</label>
  );
  const SH=({icon,title,count,color})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <span style={{fontSize:13,color:color||C.accent}}>{icon}</span>
      <span style={{fontSize:13,fontWeight:700,color:color||C.accent,letterSpacing:"0.07em",textTransform:"uppercase"}}>{title}</span>
      {count!=null&&<span style={{fontSize:11,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>({count})</span>}
    </div>
  );
  const StatBox=({label,value,accent,sub})=>(
    <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
      padding:"13px 15px",flex:1,minWidth:88,boxShadow:`0 1px 6px ${C.shadow}14`}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <div style={{fontSize:32,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:accent||C.accent,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.dim,marginTop:3}}>{sub}</div>}
    </div>
  );
  const CDot=({v,sm})=>{
    const c=CONDIZIONI.find(x=>x.v===v);if(!c)return null;
    return<span style={{display:"inline-flex",alignItems:"center",gap:4,background:c.color+"22",
      border:`1px solid ${c.color}55`,borderRadius:5,padding:sm?"1px 7px":"3px 10px",
      fontSize:sm?10:11,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:c.color,
      letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
      <span style={{fontSize:6}}>●</span>{c.label}
    </span>;
  };
  const BtnPrimary=({children,onClick,color,disabled})=>(
    <button onClick={onClick} disabled={disabled} style={{
      background:color||C.accent,color:color===C.red?"#fff":"#000",border:"none",
      borderRadius:7,padding:"9px 20px",fontFamily:"'Rajdhani',sans-serif",
      fontWeight:700,fontSize:13,letterSpacing:"0.05em",
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,whiteSpace:"nowrap"}}>
      {children}
    </button>
  );
  const BtnOutline=({children,onClick,small})=>(
    <button onClick={onClick} style={{
      background:"transparent",border:`1px solid ${C.borderHi}`,color:C.muted,
      borderRadius:7,padding:small?"6px 13px":"9px 18px",fontFamily:"'Rajdhani',sans-serif",
      fontWeight:700,fontSize:small?12:13,cursor:"pointer",whiteSpace:"nowrap"}}>
      {children}
    </button>
  );

  const MezzoModal=({numero,onClose})=>{
    const uM=utilizzi.filter(u=>u.numero===numero).sort((a,b)=>b.data.localeCompare(a.data));
    const gM=guasti.filter(g=>g.numero===numero).sort((a,b)=>b.dataSegnalazione.localeCompare(a.dataSegnalazione));
    const ga=gM.filter(g=>g.stato!=="riparato");
    const lc=lastCond(numero);
    const linee=[...new Set(uM.map(u=>u.linea))];
    return(
      <div style={{position:"fixed",inset:0,background:"#000c",zIndex:500,
        display:"flex",alignItems:"flex-start",justifyContent:"center",
        padding:"16px 12px",overflowY:"auto"}}
        onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{background:C.bgCard,border:`1px solid ${C.accent}44`,borderRadius:12,
          width:"min(620px,100%)",padding:"20px 18px",boxShadow:`0 8px 40px ${C.shadow}55`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,
            paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
              fontSize:26,color:C.accent,letterSpacing:"0.06em"}}>{numero}</div>
            <div style={{flex:1}}>
              {lc&&<div style={{marginBottom:3}}><CDot v={lc}/></div>}
              <div style={{fontSize:11,color:C.muted}}>{uM.length} utilizzi · linee: {linee.join(", ")||"—"}</div>
            </div>
            {ga.length>0&&<Bdg color={C.red}>{ga.length} guasti aperti</Bdg>}
            <button onClick={onClose} style={{background:"transparent",border:"none",
              color:C.muted,cursor:"pointer",fontSize:20,padding:"2px 8px"}}>✕</button>
          </div>
          {ga.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.red,fontWeight:700,letterSpacing:"0.1em",
                textTransform:"uppercase",marginBottom:8}}>⚠ Guasti Attivi</div>
              {ga.map(g=>{const gr=GRAVITA.find(x=>x.v===g.gravita);return(
                <div key={g._key} style={{background:C.bgInput,borderRadius:7,padding:"10px 12px",
                  marginBottom:8,borderLeft:`3px solid ${gr?.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <Bdg color={gr?.color} sm>{gr?.label}</Bdg>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,flex:1}}>{g.tipo}</span>
                    <span style={{fontSize:10,color:C.muted}}>{fmt(g.dataSegnalazione)}</span>
                  </div>
                  <div style={{fontSize:12,color:C.dim}}>{g.descrizione}</div>
                </div>
              );})}
            </div>
          )}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:8}}>Storico Utilizzi ({uM.length})</div>
            {uM.length===0&&<div style={{color:C.muted,fontSize:12,padding:8}}>Nessun utilizzo.</div>}
            {uM.map(u=>(
              <div key={u._key} style={{padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:(u.funziona||u.nonFunziona)?3:0}}>
                  <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:70,flexShrink:0}}>{fmt(u.data)}</span>
                  <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                    borderRadius:4,padding:"1px 9px",fontSize:12,fontWeight:700,
                    fontFamily:"'IBM Plex Mono',monospace",minWidth:44,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                  <CDot v={u.condizione} sm/>
                  {u.note&&<span style={{fontSize:11,color:C.muted,flex:1,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.note}</span>}
                </div>
                {u.nonFunziona&&<div style={{paddingLeft:80,fontSize:11,color:C.red}}>✗ {u.nonFunziona}</div>}
                {u.funziona&&<div style={{paddingLeft:80,fontSize:11,color:C.green}}>✓ {u.funziona}</div>}
              </div>
            ))}
          </div>
          {gM.filter(g=>g.stato==="riparato").length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",
                textTransform:"uppercase",marginBottom:8}}>
                Guasti Riparati ({gM.filter(g=>g.stato==="riparato").length})
              </div>
              {gM.filter(g=>g.stato==="riparato").map(g=>(
                <div key={g._key} style={{padding:"7px 0",borderBottom:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",gap:10}}>
                  <Bdg color={C.green} sm>Riparato</Bdg>
                  <span style={{fontSize:12,color:C.dim,flex:1}}>{g.tipo}</span>
                  <span style={{fontSize:10,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(g.dataRiparazione)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            <BtnPrimary onClick={()=>esportaReport(numero)}>⬇ Esporta Report</BtnPrimary>
            <BtnOutline onClick={onClose}>Chiudi</BtnOutline>
          </div>
        </div>
      </div>
    );
  };

  return(<>
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
        padding:"0 14px",paddingTop:"max(10px,env(safe-area-inset-top))",
        display:"flex",alignItems:"center",gap:10,minHeight:52,
        position:"sticky",top:0,zIndex:200,boxShadow:`0 2px 8px ${C.shadow}22`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:17}}>🚌</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.accent,letterSpacing:"0.05em",lineHeight:1}}>BUSLOG</div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:"0.12em"}}>ANM NAPOLI</div>
          </div>
        </div>
        <div style={{width:1,height:26,background:C.border,flexShrink:0}}/>
        <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} className="tn" onClick={()=>setTab(t.id)} style={{
              background:tab===t.id?C.accent+"22":"transparent",
              color:tab===t.id?C.accent:C.muted,
              border:tab===t.id?`1px solid ${C.accent}44`:"1px solid transparent",
              borderRadius:6,padding:"4px 9px",fontFamily:"'Rajdhani',sans-serif",
              fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",
              letterSpacing:"0.04em",transition:"all 0.15s",
              display:"flex",alignItems:"center",gap:4}}>
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
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <button onClick={toggleDark} title={dark?"Tema chiaro":"Tema scuro"} style={{
            background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
            borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:13,lineHeight:1}}>
            {dark?"☀":"🌙"}
          </button>
          <div style={{width:7,height:7,borderRadius:"50%",
            background:fbUrl&&synced?C.green:fbUrl?C.yellow:C.muted,
            boxShadow:fbUrl&&synced?`0 0 5px ${C.green}`:"none"}}/>
          <button onClick={()=>{setFbInput(fbUrl);setShowCfg(true);}} style={{
            background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
            borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10,
            fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>⚙ DB</button>
        </div>
      </div>

      {/* MODAL FIREBASE */}
      {showCfg&&(
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.bgCard,border:`1px solid ${C.accent}44`,borderRadius:10,
            width:"min(440px,100%)",padding:"22px 20px",boxShadow:`0 8px 40px ${C.shadow}66`}}>
            <SH icon="⚙" title="Configurazione Firebase" color={C.accent}/>
            <p style={{fontSize:12,color:C.dim,marginBottom:12,lineHeight:1.6}}>
              URL del Firebase Realtime Database:<br/>
              <code style={{color:C.accent,fontSize:11}}>https://IL-TUO-PROGETTO-default-rtdb.firebaseio.com</code>
            </p>
            <Lbl c="Firebase URL"/>
            <input value={fbInput} onChange={e=>setFbInput(e.target.value)}
              placeholder="https://..." style={{...IS,marginBottom:14}}/>
            <div style={{display:"flex",gap:10}}>
              <BtnPrimary onClick={saveFbUrl}>Salva e Connetti</BtnPrimary>
              <BtnOutline onClick={()=>setShowCfg(false)}>Annulla</BtnOutline>
            </div>
          </div>
        </div>
      )}

      {mezzoDetail&&<MezzoModal numero={mezzoDetail} onClose={()=>setMezzoDetail(null)}/>}

      {loading&&(
        <div style={{textAlign:"center",padding:14,color:C.accent,fontSize:12,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span>
          Caricamento da Firebase...
        </div>
      )}

      <div style={{padding:"14px 12px",maxWidth:900,margin:"0 auto"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Turno rapido */}
            <div style={{background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:10,
              padding:"14px 16px",display:"flex",alignItems:"center",
              justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.accent}}>🚌 Turno Rapido</div>
                <div style={{fontSize:11,color:C.dim,marginTop:2}}>
                  {utilizzi[0]?`Ultimo: ${utilizzi[0].numero} · Linea ${utilizzi[0].linea} · ${fmt(utilizzi[0].data)}`:"Registra il turno di oggi"}
                </div>
              </div>
              <BtnPrimary onClick={avviaTurnoRapido}>+ Inizia Turno</BtnPrimary>
            </div>
            {/* KPI */}
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
                <span style={{fontSize:12,color:C.yellow}}>⚠ Modalità offline — dati persi al refresh.</span>
                <button onClick={()=>{setFbInput("");setShowCfg(true);}} style={{
                  background:C.yellow,color:"#000",border:"none",borderRadius:5,
                  padding:"5px 12px",fontSize:11,fontFamily:"'Rajdhani',sans-serif",
                  fontWeight:700,cursor:"pointer"}}>Configura DB</button>
              </div>
            )}
            {/* Ultimi utilizzi */}
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⊞" title="Ultimi Utilizzi"/>
              {utilizzi.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:12}}>Nessun utilizzo.</div>}
              {utilizzi.slice(0,7).map(u=>{
                const c=CONDIZIONI.find(x=>x.v===u.condizione);
                return(
                  <div key={u._key} className="hov" style={{display:"flex",alignItems:"center",gap:8,
                    padding:"9px 5px",borderBottom:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setMezzoDetail(u.numero)}>
                    <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:68,flexShrink:0}}>{fmt(u.data)}</span>
                    <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                      borderRadius:4,padding:"1px 8px",fontSize:12,fontWeight:700,
                      fontFamily:"'IBM Plex Mono',monospace",minWidth:44,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,
                      color:C.text,minWidth:48,flexShrink:0}}>{u.numero}</span>
                    {c&&<span style={{fontSize:7,color:c.color,flexShrink:0}}>●</span>}
                    {u.nonFunziona&&<span style={{fontSize:11,color:C.red,flex:1,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✗ {u.nonFunziona}</span>}
                  </div>
                );
              })}
            </div>
            {/* Guasti attivi */}
            {guasti.filter(g=>g.stato!=="riparato").length>0&&(
              <div style={{background:C.bgCard,border:`1px solid ${C.red}44`,borderRadius:10,
                padding:"16px 14px",boxShadow:`0 0 16px ${C.red}0c`}}>
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
                        <Bdg color={gr?.color} sm>{gr?.label}</Bdg>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:C.accent}}>{g.numero}</span>
                        <span style={{fontSize:13,fontWeight:600,flex:1,color:C.text}}>{g.tipo}</span>
                        <Bdg color={st?.color} sm>{st?.label}</Bdg>
                      </div>
                      <div style={{fontSize:12,color:C.dim}}>{g.descrizione}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MEZZI */}
        {tab==="mezzi"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⊡" title="Aggiungi Mezzo" color={C.accent}/>
              <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                <div style={{flex:1}}>
                  <Lbl c="Numero Mezzo *"/>
                  <input placeholder="es. N082, 4231..." value={fM.numero}
                    onChange={e=>setFM({numero:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&addMezzo()}
                    style={{...IS,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",fontSize:15}}/>
                </div>
                <BtnPrimary onClick={addMezzo}>Aggiungi</BtnPrimary>
              </div>
              <p style={{fontSize:11,color:C.muted,marginTop:8}}>Aggiunti automaticamente anche da Utilizzi e Guasti.</p>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⊡" title="Parco Mezzi" count={mezzi.length}/>
              {mezzi.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Nessun mezzo.</div>}
              {mezzi.map(m=>{
                const lc=lastCond(m.numero);
                const ga=gAp(m.numero);
                const nu=utilizzi.filter(u=>u.numero===m.numero);
                const linee=[...new Set(nu.map(u=>u.linea))];
                return(
                  <div key={m._key} className="hov" style={{display:"flex",alignItems:"center",gap:12,
                    padding:"12px 8px",borderBottom:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}
                    onClick={()=>setMezzoDetail(m.numero)}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                      fontSize:19,color:C.accent,minWidth:62,letterSpacing:"0.05em"}}>{m.numero}</div>
                    <div style={{flex:1}}>
                      {lc&&<div style={{marginBottom:3}}><CDot v={lc} sm/></div>}
                      <div style={{fontSize:11,color:C.muted}}>
                        {nu.length} utilizz{nu.length===1?"o":"i"}
                        {linee.length>0&&<> · <span style={{color:C.dim}}>{linee.slice(0,5).join(", ")}{linee.length>5?"…":""}</span></>}
                      </div>
                    </div>
                    {ga.length>0?<Bdg color={C.red}>{ga.length} guast{ga.length>1?"i":"o"}</Bdg>
                      :nu.length>0&&<Bdg color={C.green}>OK</Bdg>}
                    <span style={{fontSize:11,color:C.dim}}>›</span>
                    <button onClick={e=>{e.stopPropagation();delItem("mezzi",m._key,setMezzi);}} style={{
                      background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:"2px 5px"}}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* UTILIZZI */}
        {tab==="utilizzi"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⊞" title="Registra Utilizzo"/>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:"0 0 128px"}}>
                  <Lbl c="Data *"/>
                  <input type="date" value={fU.data}
                    onChange={e=>setFU(p=>({...p,data:e.target.value}))} style={IS}/>
                </div>
                <div style={{flex:1,minWidth:100}}>
                  <Lbl c="N° Mezzo *"/>
                  <NumInput val={fU.numero} mezzi={mezzi} colors={C}
                    onChange={e=>setFU(p=>({...p,numero:e.target.value.toUpperCase()}))}/>
                </div>
                <div style={{flex:"0 0 75px"}}>
                  <Lbl c="Linea *"/>
                  <input placeholder="C1" value={fU.linea}
                    onChange={e=>setFU(p=>({...p,linea:e.target.value.toUpperCase()}))}
                    style={{...IS,textAlign:"center",fontWeight:700}}/>
                </div>
              </div>
              <Lbl c="Condizione Mezzo"/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {CONDIZIONI.map(c=>(
                  <button key={c.v} onClick={()=>setFU(p=>({...p,condizione:c.v}))} style={{
                    background:fU.condizione===c.v?c.color+"33":"transparent",
                    border:`1px solid ${fU.condizione===c.v?c.color:C.borderHi}`,
                    color:fU.condizione===c.v?c.color:C.muted,
                    borderRadius:6,padding:"5px 10px",fontFamily:"'Rajdhani',sans-serif",
                    fontWeight:700,fontSize:12,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:6,color:fU.condizione===c.v?c.color:C.muted}}>●</span>{c.label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:140}}>
                  <Lbl c="Cosa funziona bene"/>
                  <input placeholder="freni ok, clima ok..." value={fU.funziona}
                    onChange={e=>setFU(p=>({...p,funziona:e.target.value}))}
                    style={{...IS,fontFamily:"'Rajdhani',sans-serif"}}/>
                </div>
                <div style={{flex:1,minWidth:140}}>
                  <Lbl c="Cosa NON funziona" red/>
                  <input placeholder="clima guasto, vibrazione..." value={fU.nonFunziona}
                    onChange={e=>setFU(p=>({...p,nonFunziona:e.target.value}))}
                    style={{...IS,fontFamily:"'Rajdhani',sans-serif",
                      borderColor:fU.nonFunziona?C.red+"66":undefined}}/>
                </div>
              </div>
              <Lbl c="Note aggiuntive"/>
              <input placeholder="Servizio serale, straordinario..." value={fU.note}
                onChange={e=>setFU(p=>({...p,note:e.target.value}))}
                style={{...IS,fontFamily:"'Rajdhani',sans-serif",marginBottom:14}}/>
              <BtnPrimary onClick={addUso}>Salva Utilizzo</BtnPrimary>
            </div>
            {/* Storico con filtro */}
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:C.accent}}>⊞</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.accent,letterSpacing:"0.07em",textTransform:"uppercase"}}>Storico</span>
                  <span style={{fontSize:11,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>({utilFiltrati.length})</span>
                </div>
                <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Filtra:</span>
                  <input placeholder="N082..." value={filtroNum}
                    onChange={e=>setFiltroNum(e.target.value)}
                    style={{...IS,width:80,padding:"5px 9px",fontSize:12}}/>
                  {filtroNum&&<button onClick={()=>setFiltroNum("")} style={{
                    background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>}
                </div>
              </div>
              {utilFiltrati.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Nessun utilizzo trovato.</div>}
              {utilFiltrati.map(u=>{
                const cond=CONDIZIONI.find(x=>x.v===u.condizione);
                const isEditing=editKey===u._key;
                return(
                  <div key={u._key} style={{borderBottom:`1px solid ${C.border}`,padding:"10px 6px"}}>
                    {/* RIGA PRINCIPALE */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:(u.nonFunziona||u.funziona)&&!isEditing?3:0}}>
                      <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:C.muted,width:68,flexShrink:0}}>{fmt(u.data)}</span>
                      <span style={{background:C.accent+"22",color:C.accent,border:`1px solid ${C.accent}44`,
                        borderRadius:4,padding:"1px 8px",fontSize:12,fontWeight:700,
                        fontFamily:"'IBM Plex Mono',monospace",minWidth:44,textAlign:"center",flexShrink:0}}>{u.linea}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,
                        color:C.text,flexShrink:0,cursor:"pointer"}}
                        onClick={()=>setMezzoDetail(u.numero)}>{u.numero}</span>
                      {cond&&<span style={{fontSize:7,color:cond.color}}>●</span>}
                      <span style={{fontSize:11,color:cond?.color||C.dim}}>{cond?.label}</span>
                      <div style={{flex:1}}/>
                      {/* Bottone modifica */}
                      <button onClick={e=>{e.stopPropagation();isEditing?setEditKey(null):startEdit(u);}} style={{
                        background:isEditing?C.accent+"22":"transparent",
                        border:`1px solid ${isEditing?C.accent:C.borderHi}`,
                        color:isEditing?C.accent:C.muted,borderRadius:5,
                        padding:"2px 8px",cursor:"pointer",fontSize:11,
                        fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                        {isEditing?"✕ Chiudi":"✏ Modifica"}
                      </button>
                      <button onClick={e=>{e.stopPropagation();delItem("utilizzi",u._key,setUtilizzi);}} style={{
                        background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:"1px 4px"}}>✕</button>
                    </div>
                    {/* ANOMALIE (solo se non in modifica) */}
                    {!isEditing&&u.nonFunziona&&<div style={{paddingLeft:76,fontSize:11,color:C.red,marginTop:2}}>✗ {u.nonFunziona}</div>}
                    {!isEditing&&u.funziona&&<div style={{paddingLeft:76,fontSize:11,color:C.green,marginTop:1}}>✓ {u.funziona}</div>}
                    {!isEditing&&u.note&&<div style={{paddingLeft:76,fontSize:11,color:C.muted,marginTop:1}}>{u.note}</div>}
                    {/* PANNELLO MODIFICA INLINE */}
                    {isEditing&&(
                      <div style={{background:C.bgInput,borderRadius:8,padding:"12px 14px",
                        marginTop:10,border:`1px solid ${C.accent}33`}}>
                        {/* Condizione */}
                        <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",
                          textTransform:"uppercase",marginBottom:6}}>Condizione</div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                          {CONDIZIONI.map(cd=>(
                            <button key={cd.v} onClick={()=>setEditData(p=>({...p,condizione:cd.v}))} style={{
                              background:editData.condizione===cd.v?cd.color+"33":"transparent",
                              border:`1px solid ${editData.condizione===cd.v?cd.color:C.borderHi}`,
                              color:editData.condizione===cd.v?cd.color:C.muted,
                              borderRadius:6,padding:"4px 9px",fontFamily:"'Rajdhani',sans-serif",
                              fontWeight:700,fontSize:11,cursor:"pointer",
                              display:"flex",alignItems:"center",gap:3}}>
                              <span style={{fontSize:6,color:editData.condizione===cd.v?cd.color:C.muted}}>●</span>{cd.label}
                            </button>
                          ))}
                        </div>
                        {/* Linea */}
                        <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",
                          textTransform:"uppercase",marginBottom:4}}>Linea</div>
                        <input value={editData.linea} onChange={e=>setEditData(p=>({...p,linea:e.target.value.toUpperCase()}))}
                          style={{background:C.bgCard,border:`1px solid ${C.borderHi}`,borderRadius:6,
                            color:C.text,padding:"7px 10px",fontSize:13,fontFamily:"'IBM Plex Mono',monospace",
                            outline:"none",width:"100px",marginBottom:10}}/>
                        {/* Cosa funziona */}
                        <div style={{fontSize:10,fontWeight:700,color:C.green,letterSpacing:"0.1em",
                          textTransform:"uppercase",marginBottom:4}}>Cosa funziona</div>
                        <input placeholder="freni ok, clima ok..." value={editData.funziona}
                          onChange={e=>setEditData(p=>({...p,funziona:e.target.value}))}
                          style={{background:C.bgCard,border:`1px solid ${C.borderHi}`,borderRadius:6,
                            color:C.text,padding:"7px 10px",fontSize:13,fontFamily:"'Rajdhani',sans-serif",
                            outline:"none",width:"100%",boxSizing:"border-box",marginBottom:10}}/>
                        {/* Anomalie */}
                        <div style={{fontSize:10,fontWeight:700,color:C.red,letterSpacing:"0.1em",
                          textTransform:"uppercase",marginBottom:4}}>Anomalie / Cosa NON funziona</div>
                        <input placeholder="es. clima guasto, vibrazione asse..." value={editData.nonFunziona}
                          onChange={e=>setEditData(p=>({...p,nonFunziona:e.target.value}))}
                          style={{background:C.bgCard,border:`1px solid ${editData.nonFunziona?C.red+"66":C.borderHi}`,
                            borderRadius:6,color:C.text,padding:"7px 10px",fontSize:13,
                            fontFamily:"'Rajdhani',sans-serif",outline:"none",
                            width:"100%",boxSizing:"border-box",marginBottom:10}}/>
                        {/* Note */}
                        <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",
                          textTransform:"uppercase",marginBottom:4}}>Note</div>
                        <input placeholder="Note aggiuntive..." value={editData.note}
                          onChange={e=>setEditData(p=>({...p,note:e.target.value}))}
                          style={{background:C.bgCard,border:`1px solid ${C.borderHi}`,borderRadius:6,
                            color:C.text,padding:"7px 10px",fontSize:13,fontFamily:"'Rajdhani',sans-serif",
                            outline:"none",width:"100%",boxSizing:"border-box",marginBottom:12}}/>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>saveEdit(u._key)} style={{
                            background:C.green,color:"#fff",border:"none",borderRadius:6,
                            padding:"7px 16px",fontFamily:"'Rajdhani',sans-serif",
                            fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Salva</button>
                          <button onClick={()=>setEditKey(null)} style={{
                            background:"transparent",border:`1px solid ${C.borderHi}`,color:C.muted,
                            borderRadius:6,padding:"7px 14px",fontFamily:"'Rajdhani',sans-serif",
                            fontWeight:700,fontSize:12,cursor:"pointer"}}>Annulla</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GUASTI */}
        {tab==="guasti"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.red}33`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⚠" title="Segnala Guasto" color={C.red}/>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:120}}>
                  <Lbl c="N° Mezzo *"/>
                  <NumInput val={fG.numero} mezzi={mezzi} colors={C}
                    onChange={e=>setFG(p=>({...p,numero:e.target.value.toUpperCase()}))}/>
                </div>
                <div style={{flex:"0 0 135px"}}>
                  <Lbl c="Data"/>
                  <input type="date" value={fG.dataSegnalazione}
                    onChange={e=>setFG(p=>({...p,dataSegnalazione:e.target.value}))} style={IS}/>
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:2,minWidth:170}}>
                  <Lbl c="Categoria Guasto"/>
                  <select value={fG.tipo} onChange={e=>setFG(p=>({...p,tipo:e.target.value}))}
                    style={{...IS,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer"}}>
                    {TIPI_GUASTO.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:120}}>
                  <Lbl c="Gravità"/>
                  <div style={{display:"flex",gap:5}}>
                    {GRAVITA.map(g=>(
                      <button key={g.v} onClick={()=>setFG(p=>({...p,gravita:g.v}))} style={{
                        background:fG.gravita===g.v?g.color+"33":"transparent",
                        border:`1px solid ${fG.gravita===g.v?g.color:C.borderHi}`,
                        color:fG.gravita===g.v?g.color:C.muted,
                        borderRadius:6,padding:"6px 7px",fontFamily:"'Rajdhani',sans-serif",
                        fontWeight:700,fontSize:11,cursor:"pointer",flex:1}}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Lbl c="Descrizione *"/>
              <textarea rows={3} value={fG.descrizione}
                onChange={e=>setFG(p=>({...p,descrizione:e.target.value}))}
                placeholder="Sintomi, quando si manifesta, rumori, frequenza..."
                style={{...IS,fontFamily:"'Rajdhani',sans-serif",resize:"vertical",marginBottom:14,lineHeight:1.5}}/>
              <BtnPrimary onClick={addGuasto} color={C.red}>Segnala Guasto</BtnPrimary>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
              padding:"16px 14px",boxShadow:`0 1px 6px ${C.shadow}14`}}>
              <SH icon="⚠" title="Storico Guasti" count={guasti.length}/>
              {guasti.length===0&&<div style={{color:C.green,fontSize:13,textAlign:"center",padding:20}}>✓ Nessun guasto.</div>}
              {guasti.map(g=>{
                const gr=GRAVITA.find(x=>x.v===g.gravita);
                const st=STATI.find(x=>x.v===g.stato);
                return(
                  <div key={g._key} style={{background:C.bgInput,borderRadius:8,padding:"12px 13px",
                    marginBottom:10,border:`1px solid ${C.border}`,borderLeft:`3px solid ${gr?.color}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <Bdg color={gr?.color} sm>{gr?.label}</Bdg>
                      <button onClick={()=>setMezzoDetail(g.numero)} style={{
                        background:"transparent",border:"none",cursor:"pointer",padding:0,
                        fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:C.accent}}>
                        {g.numero}
                      </button>
                      <span style={{fontSize:13,fontWeight:700,flex:1,color:C.text}}>{g.tipo}</span>
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

        <div style={{marginTop:20,textAlign:"center",color:C.muted,fontSize:10,
          letterSpacing:"0.12em",paddingBottom:16}}>
          BUSLOG v4 — DEPOSITO CAVALLEGGERI D'AOSTA
        </div>
      </div>
    </div>
  </>);
}
