import { Categoria, ParseResult, Produto } from "@/types/pcp";

const clean=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();
const up=(v:unknown)=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();

function medida(t:string){
  const d=up(t).replace(/,/g,".").replace(/\s*[X×]\s*/g,"X");
  const a=d.match(/(\d{2,4})X(\d{2,4})X(\d{1,3})/);
  if(a)return `${a[1]}x${a[2]}x${a[3]}`;
  const b=d.match(/(\d{2,4})X(\d{2,4})/);
  return b?`${b[1]}x${b[2]}`:"";
}
function rebaixo(t:string){
  const d=up(t);
  if(/SEM\s+REBAIXO|S\/?\s*REBAIXO/.test(d))return "SEM REBAIXO";
  const m=d.match(/\b(?:RB|REB|REBAIXO)\s*[:\-]?\s*(\d{1,3})(?:\s*X\s*(\d{1,3}))?/);
  return m?(m[2]?`RB ${m[1]}x${m[2]}`:`RB ${m[1]}`):"";
}
function material(t:string){
  const d=up(t);
  return ["MDF ULTRA","HDF 6MM","HDF 3MM","HDF","PINUS","EUCALIPTO","COMPENSADO","MDF","MADEIRA"].find(x=>d.includes(x))||"";
}
function finish(t:string){
  const d=up(t);
  let acabamento="";
  if(/\bREC(?:OBERTO)?\s+PET\b|\bRC\s+PET\b|\bPET\b/.test(d))acabamento="PET";
  else if(d.includes("ESMALTE"))acabamento="ESMALTE";
  else if(d.includes("IMPRESSO"))acabamento="IMPRESSO";
  else if(d.includes("PRIMER"))acabamento="PRIMER";
  let cor="";
  const comuns=["BRANCO CARRARA","FREIJO NOGARA","CAPUCCINO MARCHE","PRETO","TURIM","BRANCO"];
  cor=comuns.find(x=>d.includes(x))||"";
  return {acabamento,cor};
}
function mk(p:Partial<Produto>):Produto{
  return {
    id:p.id||crypto.randomUUID(),pedido:clean(p.pedido),item:clean(p.item),codigo:clean(p.codigo),of:clean(p.of),
    categoria:p.categoria||"OUTROS",descricaoOriginal:clean(p.descricaoOriginal),descricaoProducao:clean(p.descricaoProducao),
    material:clean(p.material),medida:clean(p.medida),rebaixo:clean(p.rebaixo),acabamento:clean(p.acabamento),cor:clean(p.cor),
    quantidade:Number(p.quantidade||0),prioridade:p.prioridade||"NORMAL",status:p.status||"PENDENTE",
    grupo:clean(p.grupo),observacao:clean(p.observacao)
  }
}

function expandir(pedido:string,item:string,codigo:string,descricao:string,qtd:number):Produto[]{
  const d=up(descricao), f=finish(descricao), mat=material(descricao), rb=rebaixo(descricao);
  const out:Produto[]=[];

  if(d.includes("MARCO")||d.includes("BATENTE")){
    const pernas=d.match(/C\/?\s*(\d+)\s+PERNAS?\s+DE\s+(\d{3,4})X(\d{2,4})X(\d{1,3})/);
    const trav=d.match(/(?:E\s*)?(\d+)\s+TRAVESSA\s+DE\s+(\d{2,4})/);
    if(pernas)out.push(mk({pedido,item,codigo,categoria:"BATENTE_PERNA",descricaoOriginal:descricao,
      descricaoProducao:`PERNA BATENTE ${mat} ${f.acabamento} ${f.cor}`,material:mat,medida:`${pernas[2]}x${pernas[3]}x${pernas[4]}`,
      rebaixo:rb,acabamento:f.acabamento,cor:f.cor,quantidade:Number(pernas[1])*qtd,grupo:"BATENTES"}));
    if(trav)out.push(mk({pedido,item,codigo,categoria:"BATENTE_TRAVESSA",descricaoOriginal:descricao,
      descricaoProducao:`TRAVESSA BATENTE ${mat} ${f.acabamento} ${f.cor}`,material:mat,
      medida:[trav[2],pernas?.[3],pernas?.[4]].filter(Boolean).join("x"),rebaixo:rb,acabamento:f.acabamento,cor:f.cor,
      quantidade:Number(trav[1])*qtd,grupo:"BATENTES"}));
    if(out.length)return out;
  }

  if(d.includes("ALIZAR")){
    const pernas=d.match(/(\d+)\s+(?:PERNAS|PCS)\s+(?:DE\s+)?(\d{3,4})X(\d{2,4})X(\d{1,3})/);
    const trav=d.match(/(\d+)\s+(?:TRAVESSAS|PCS)\s+(?:DE\s+)?(\d{2,4})(?:\s|$)/);
    if(pernas)out.push(mk({pedido,item,codigo,categoria:"ALIZAR_PERNA",descricaoOriginal:descricao,
      descricaoProducao:`PERNA ALIZAR ${mat} ${f.acabamento} ${f.cor}`,material:mat,medida:`${pernas[2]}x${pernas[3]}x${pernas[4]}`,
      acabamento:f.acabamento,cor:f.cor,quantidade:Number(pernas[1])*qtd,grupo:"ALIZARES"}));
    if(trav)out.push(mk({pedido,item,codigo,categoria:"ALIZAR_TRAVESSA",descricaoOriginal:descricao,
      descricaoProducao:`TRAVESSA ALIZAR ${mat} ${f.acabamento} ${f.cor}`,material:mat,
      medida:[trav[2],pernas?.[3],pernas?.[4]].filter(Boolean).join("x"),acabamento:f.acabamento,cor:f.cor,
      quantidade:Number(trav[1])*qtd,grupo:"ALIZARES"}));
    if(out.length)return out;
  }

  let categoria:Categoria="OUTROS",grupo="OUTROS";
  if(d.includes("FOLHA DE PORTA")||d.includes("PORTA SOLIDA")||d.includes("PORTA COLMEIA")){categoria="PORTA";grupo="PORTAS"}
  else if(d.includes("KIT")&&d.includes("CORRER")){categoria="KIT_CORRER";grupo="KIT CORRER"}
  else if(d.includes("BAGUETE")){categoria="BAGUETE";grupo="BAGUETES"}

  return [mk({pedido,item,codigo,categoria,descricaoOriginal:descricao,descricaoProducao:descricao,material:mat,medida:medida(descricao),
    rebaixo:rb,acabamento:f.acabamento,cor:f.cor,quantidade:qtd,grupo,status:categoria==="OUTROS"?"REVISÃO":"PENDENTE"})];
}

function textoEmLinhasPdf(content: any): string[] {
  const linhas: string[] = [];

  let atual = "";

  for (const item of content.items as any[]) {
    const texto = String(
      item.str || ""
    ).trim();

    if (texto) {
      atual +=
        (atual ? " " : "") +
        texto;
    }

    /*
      O próprio PDF informa quando
      aquele fragmento termina uma linha.

      Isso é MUITO mais confiável
      que tentar reconstruir somente
      pela coordenada Y.
    */

    if (item.hasEOL) {
      const limpa =
        atual
          .replace(/\s+/g, " ")
          .trim();

      if (limpa) {
        linhas.push(limpa);
      }

      atual = "";
    }
  }

  if (atual.trim()) {
    linhas.push(
      atual
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  return linhas;
}

export function metricas(produtos:Produto[]){
  const by=(key:"grupo"|"status"|"prioridade")=>{
    const mp=new Map<string,number>();for(const p of produtos)mp.set(String(p[key]),(mp.get(String(p[key]))||0)+(key==="grupo"?p.quantidade:1));
    return [...mp].map(([label,value])=>({label,value}));
  };
  return {linhas:produtos.length,pecas:produtos.reduce((s,p)=>s+p.quantidade,0),pendentes:produtos.filter(p=>p.status==="PENDENTE").length,
    apontadas:produtos.filter(p=>p.status==="APONTADA").length,revisao:produtos.filter(p=>p.status==="REVISÃO"||p.status==="DIVERGÊNCIA").length,
    porGrupo:by("grupo"),porStatus:by("status"),porPrioridade:by("prioridade")};
}
export function consolidar(produtos:Produto[]){
  const mp=new Map<string,any>();
  for(const p of produtos){const k=[p.grupo,p.categoria,p.material,p.medida,p.rebaixo,p.acabamento,p.cor].join("|").toUpperCase(),a=mp.get(k);
    if(a)a.quantidade+=p.quantidade;else mp.set(k,{key:k,grupo:p.grupo,categoria:p.categoria,material:p.material,medida:p.medida,rebaixo:p.rebaixo,acabamento:p.acabamento,cor:p.cor,quantidade:p.quantidade})}
  return [...mp.values()];
}
