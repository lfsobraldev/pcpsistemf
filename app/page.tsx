"use client";
import { useMemo,useState } from "react";
import { LayoutDashboard,CalendarRange,ClipboardList,Boxes,ClipboardCheck,History,Settings,Factory,Upload,Download,Search,Filter,AlertTriangle,CheckCircle2,Clock3,LogOut,PanelLeftClose,RefreshCw,FileText } from "lucide-react";
import { Produto } from "@/types/pcp";
import { lerPedidoPdf,metricas,consolidar } from "@/lib/pcp";
import { exportar } from "@/lib/exporter";
import { Bars,Donut } from "@/components/Charts";

type View="dashboard"|"nova"|"revisao"|"quantidades"|"apontamentos"|"historico"|"config";
const menu=[
  {section:"VISÃO GERAL",items:[["dashboard","Painel operacional",LayoutDashboard]]},
  {section:"OPERAÇÃO",items:[["nova","Nova programação",CalendarRange],["revisao","Revisão de leitura",ClipboardList],["quantidades","Quantidades líderes",Boxes],["apontamentos","Apontamentos",ClipboardCheck]]},
  {section:"CONTROLE",items:[["historico","Histórico",History]]},
  {section:"SISTEMA",items:[["config","Configurações",Settings]]}
] as const;

export default function Home(){
  const[view,setView]=useState<View>("dashboard"),[collapsed,setCollapsed]=useState(false);
  const[pedidoFile,setPedidoFile]=useState<File|null>(null),[usinagemFile,setUsinagemFile]=useState<File|null>(null);
  const[data,setData]=useState(new Date().toISOString().slice(0,10)),[turno,setTurno]=useState("A");
  const[produtos,setProdutos]=useState<Produto[]>([]),[meta,setMeta]=useState<any>(null),[diag,setDiag]=useState<any>(null);
  const[busy,setBusy]=useState(false),[erro,setErro]=useState(""),[busca,setBusca]=useState("");
  const m=useMemo(()=>metricas(produtos),[produtos]),resumo=useMemo(()=>consolidar(produtos),[produtos]);
  const filtrados=produtos.filter(p=>!busca||[p.pedido,p.of,p.categoria,p.descricaoProducao,p.material,p.medida,p.cor].join(" ").toUpperCase().includes(busca.toUpperCase()));

  async function gerar(){if(!pedidoFile){setErro("Selecione o Pedido em PDF.");return}setBusy(true);setErro("");
    try{const r=await lerPedidoPdf(pedidoFile);setProdutos(r.produtos);setMeta(r.meta);setDiag(r.diagnostico);setView("revisao")}
    catch(e:any){setErro(e.message||"Falha na leitura do pedido.")}finally{setBusy(false)}
  }
  function patch(id:string,key:keyof Produto,value:any){setProdutos(a=>a.map(p=>p.id===id?{...p,[key]:key==="quantidade"?Number(value):value}:p))}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});location.href="/login"}

  return <main className={`pcpShell ${collapsed?"collapsed":""}`}>
    <aside className="sidebar">
      <div className="sideBrand"><div className="brandIcon"><Factory size={22}/></div>{!collapsed&&<div><b>SOBRAL PCP</b><span>CONTROLE DE PRODUÇÃO</span></div>}</div>
      <nav>{menu.map(g=><div className="navGroup" key={g.section}>{!collapsed&&<span className="navSection">{g.section}</span>}
        {g.items.map(([id,label,Icon])=><button key={id} onClick={()=>setView(id as View)} className={view===id?"active":""}><Icon size={18}/>{!collapsed&&<span>{label}</span>}</button>)}
      </div>)}</nav>
      <div className="sidebarBottom"><button onClick={()=>setCollapsed(!collapsed)}><PanelLeftClose size={18}/>{!collapsed&&<span>Recolher menu</span>}</button><button onClick={logout}><LogOut size={18}/>{!collapsed&&<span>Sair</span>}</button></div>
    </aside>

    <section className="workspace">
      <header className="topHeader"><div><span className="contextLabel">PCP • NORDESTE</span><h1>{({dashboard:"Painel operacional",nova:"Nova programação",revisao:"Revisão de leitura",quantidades:"Quantidades para líderes",apontamentos:"Controle de apontamentos",historico:"Histórico de programações",config:"Configurações"} as any)[view]}</h1></div>
        <div className="topActions"><div className="today"><Clock3 size={16}/><span>{new Date().toLocaleDateString("pt-BR")}</span></div><button className="iconBtn"><RefreshCw size={17}/></button><div className="userChip"><span>PCP</span><div><b>Operador PCP</b><small>Produção</small></div></div></div>
      </header>

      <div className="content">
        {view==="dashboard"&&<>
          <div className="statusStrip"><span><i className="online"/>Sistema operacional</span><span>Atualização em tempo real</span>{meta?.pedido&&<b>Pedido atual: {meta.pedido}</b>}</div>
          <section className="kpiGrid">
            <Kpi label="Linhas programadas" value={m.linhas} note="itens de produção" icon={<ClipboardList/>}/>
            <Kpi label="Peças programadas" value={m.pecas.toLocaleString("pt-BR")} note="quantidade total" icon={<Boxes/>}/>
            <Kpi label="Pendentes" value={m.pendentes} note="aguardando execução" icon={<Clock3/>}/>
            <Kpi label="Apontadas" value={m.apontadas} note="confirmadas" icon={<CheckCircle2/>}/>
            <Kpi label="Em revisão" value={m.revisao} note="exigem conferência" icon={<AlertTriangle/>} warn={m.revisao>0}/>
          </section>
          <section className="dashboardGrid">
            <div className="panel wide"><PanelHead title="Peças por grupo" sub="Quantidade programada por família"/><Bars data={m.porGrupo.length?m.porGrupo:[{label:"Sem programação",value:0}]}/></div>
            <div className="panel"><PanelHead title="Status da programação" sub="Situação atual das linhas"/><Donut data={m.porStatus.length?m.porStatus:[{label:"Sem dados",value:0}]}/></div>
            <div className="panel wide"><PanelHead title="Resumo operacional" sub="Consolidação por grupo"/><div className="opsTable"><div className="opsHead"><span>Grupo</span><span>Linhas</span><span>Peças</span></div>
              {[...new Set(produtos.map(p=>p.grupo))].map(g=>{const a=produtos.filter(p=>p.grupo===g);return <div className="opsRow" key={g}><b>{g}</b><span>{a.length}</span><span>{a.reduce((s,p)=>s+p.quantidade,0)}</span></div>})}
              {!produtos.length&&<div className="emptyMini">Nenhuma programação carregada.</div>}</div></div>
            <div className="panel"><PanelHead title="Prioridades" sub="Distribuição das linhas"/><Bars data={m.porPrioridade.length?m.porPrioridade:[{label:"Sem dados",value:0}]}/></div>
          </section>
        </>}

        {view==="nova"&&<div className="operationLayout">
          <section className="panel operationPanel">
            <div className="stepHeader"><span>01</span><div><h3>Documentos da programação</h3><p>O Pedido PDF é a fonte principal. A usinagem é complementar.</p></div></div>
            <div className="uploadGrid"><UploadBox title="Pedido desmembrado" hint="PDF obrigatório" file={pedidoFile} accept=".pdf" onFile={setPedidoFile}/><UploadBox title="Usinagem" hint="XLS/XLSX opcional" file={usinagemFile} accept=".xls,.xlsx" onFile={setUsinagemFile}/></div>
            <div className="stepHeader second"><span>02</span><div><h3>Parâmetros da programação</h3><p>Defina a referência operacional do dia.</p></div></div>
            <div className="formGrid"><label>Data<input type="date" value={data} onChange={e=>setData(e.target.value)}/></label><label>Turno<select value={turno} onChange={e=>setTurno(e.target.value)}><option>A</option><option>B</option><option>A + B</option></select></label><label>Prioridade padrão<select><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></label><label>Unidade<select><option>Nordeste</option></select></label></div>
            {erro&&<div className="errorBox"><AlertTriangle size={18}/>{erro}</div>}
            <div className="processActions"><button className="primaryBtn" onClick={gerar} disabled={busy}>{busy?<><RefreshCw className="spin" size={17}/>PROCESSANDO...</>:<><Factory size={17}/>GERAR PROGRAMAÇÃO</>}</button></div>
          </section>
          <aside className="processAside panel"><PanelHead title="Fluxo de processamento" sub="Etapas reais da leitura"/>{["Ler todas as páginas","Reconstruir itens físicos","Separar pai/subitens","Classificar produtos","Expandir pernas/travessas","Extrair medida/material/acabamento","Preparar revisão"].map((x,i)=><div className="processStep" key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b></div>)}</aside>
        </div>}

        {view==="revisao"&&<>
          {diag&&<section className={`readReport ${diag.revisao?"warning":""}`}><div><span className="eyebrow">DIAGNÓSTICO DA LEITURA</span><h3>{diag.itens} itens físicos • {diag.linhas} linhas de produção</h3><p>{diag.paginas} página(s) processadas • {diag.revisao} em revisão</p></div><div className="readStats"><span><b>{meta?.pedido||"-"}</b><small>Pedido</small></span><span><b>{diag.itens}</b><small>Itens</small></span><span><b>{diag.linhas}</b><small>Linhas</small></span><span><b>{diag.revisao}</b><small>Revisão</small></span></div></section>}
          <Toolbar busca={busca} setBusca={setBusca} onExport={()=>exportar(produtos,data,turno)} count={filtrados.length}/>
          <div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Pedido</th><th>OF</th><th>Peça</th><th>Descrição produção</th><th>Material</th><th>Medida</th><th>Rebaixo</th><th>Acab.</th><th>Cor</th><th>Qtd</th><th>Prioridade</th><th>Status</th></tr></thead><tbody>
            {filtrados.map(p=><tr key={p.id}><td>{p.pedido}</td><td><input value={p.of} onChange={e=>patch(p.id,"of",e.target.value)}/></td><td><span className="typeBadge">{p.categoria}</span></td>
              <td className="descCell"><input value={p.descricaoProducao} onChange={e=>patch(p.id,"descricaoProducao",e.target.value)}/><small title={p.descricaoOriginal}>{p.descricaoOriginal}</small></td>
              <td><input value={p.material} onChange={e=>patch(p.id,"material",e.target.value)}/></td><td><input value={p.medida} onChange={e=>patch(p.id,"medida",e.target.value)}/></td><td><input value={p.rebaixo} onChange={e=>patch(p.id,"rebaixo",e.target.value)}/></td>
              <td><input value={p.acabamento} onChange={e=>patch(p.id,"acabamento",e.target.value)}/></td><td><input value={p.cor} onChange={e=>patch(p.id,"cor",e.target.value)}/></td><td><input type="number" value={p.quantidade} onChange={e=>patch(p.id,"quantidade",e.target.value)}/></td>
              <td><select value={p.prioridade} onChange={e=>patch(p.id,"prioridade",e.target.value)}><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></td>
              <td><select value={p.status} onChange={e=>patch(p.id,"status",e.target.value)}><option>PENDENTE</option><option>PROGRAMADO</option><option>APONTADA</option><option>AGUARDANDO LINHA</option><option>DIVERGÊNCIA</option><option>REVISÃO</option></select></td></tr>)}
          </tbody></table>{!produtos.length&&<div className="emptyState"><FileText size={34}/><b>Nenhuma programação carregada</b><span>Crie uma nova programação para iniciar a revisão.</span></div>}</div>
        </>}

        {view==="quantidades"&&<><Toolbar busca={busca} setBusca={setBusca} onExport={()=>exportar(produtos,data,turno)} count={resumo.length}/><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Grupo</th><th>Peça</th><th>Material</th><th>Medida</th><th>Rebaixo</th><th>Acabamento</th><th>Cor</th><th>Qtd total</th></tr></thead><tbody>
          {resumo.map((r:any)=><tr key={r.key}><td><b>{r.grupo}</b></td><td>{r.categoria}</td><td>{r.material}</td><td>{r.medida}</td><td>{r.rebaixo}</td><td>{r.acabamento}</td><td>{r.cor}</td><td className="qtyStrong">{r.quantidade}</td></tr>)}</tbody></table></div></>}

        {view==="apontamentos"&&<><div className="statusCards">{["PENDENTE","PROGRAMADO","APONTADA","AGUARDANDO LINHA","DIVERGÊNCIA"].map(s=><button key={s}><span>{s}</span><b>{produtos.filter(p=>p.status===s).length}</b></button>)}</div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Pedido</th><th>OF</th><th>Peça</th><th>Descrição</th><th>Qtd</th><th>Prioridade</th><th>Status</th><th>Observação</th></tr></thead><tbody>
          {produtos.map(p=><tr key={p.id}><td>{p.pedido}</td><td>{p.of||"-"}</td><td>{p.categoria}</td><td>{p.descricaoProducao}</td><td>{p.quantidade}</td><td>{p.prioridade}</td><td><select value={p.status} onChange={e=>patch(p.id,"status",e.target.value)}><option>PENDENTE</option><option>PROGRAMADO</option><option>APONTADA</option><option>AGUARDANDO LINHA</option><option>DIVERGÊNCIA</option><option>REVISÃO</option></select></td><td><input value={p.observacao} onChange={e=>patch(p.id,"observacao",e.target.value)}/></td></tr>)}</tbody></table></div></>}

        {view==="historico"&&<div className="panel placeholder"><History size={36}/><h3>Histórico de programações</h3><p>Estrutura visual pronta para persistência no Neon.</p></div>}
        {view==="config"&&<div className="settingsGrid"><div className="panel"><PanelHead title="Classificação industrial" sub="Famílias reconhecidas"/>{["PORTAS","BATENTES","ALIZARES","KIT CORRER","BAGUETES","OUTROS"].map(x=><div className="settingRow" key={x}><span>{x}</span><b>Ativo</b></div>)}</div><div className="panel"><PanelHead title="Parâmetros PCP" sub="Configurações operacionais"/><div className="formStack"><label>Turno padrão<select><option>A</option><option>B</option></select></label><label>Status inicial<select><option>PENDENTE</option><option>PROGRAMADO</option></select></label></div></div></div>}
      </div>
    </section>
  </main>
}

function Kpi({label,value,note,icon,warn}:{label:string,value:any,note:string,icon:any,warn?:boolean}){return <div className={`kpiCard ${warn?"warn":""}`}><div className="kpiTop"><span>{label}</span><i>{icon}</i></div><b>{value}</b><small>{note}</small></div>}
function PanelHead({title,sub}:{title:string,sub:string}){return <div className="panelHead"><div><h3>{title}</h3><p>{sub}</p></div></div>}
function UploadBox({title,hint,file,accept,onFile}:{title:string,hint:string,file:File|null,accept:string,onFile:(f:File|null)=>void}){return <label className={`uploadBox ${file?"hasFile":""}`}><Upload size={22}/><div><b>{title}</b><span>{file?file.name:hint}</span></div><input type="file" accept={accept} onChange={e=>onFile(e.target.files?.[0]||null)}/></label>}
function Toolbar({busca,setBusca,onExport,count}:{busca:string,setBusca:(v:string)=>void,onExport:()=>void,count:number}){return <div className="tableToolbar"><div className="searchBox"><Search size={16}/><input placeholder="Buscar pedido, OF, peça, medida, cor..." value={busca} onChange={e=>setBusca(e.target.value)}/></div><div className="tableToolbarRight"><span>{count} registro(s)</span><button><Filter size={16}/>Filtros</button><button className="exportBtn" onClick={onExport}><Download size={16}/>Exportar Excel</button></div></div>}
