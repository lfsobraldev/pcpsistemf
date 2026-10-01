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

export async function lerPedidoPdf(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Worker do PDF.js empacotado junto com o projeto
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const paginas: string[] = [];

  for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina++) {
    const page = await pdf.getPage(numeroPagina);

    const content = await page.getTextContent();

    /*
      NÃO juntamos simplesmente a página inteira.

      Tentamos reconstruir as linhas de acordo com a posição
      vertical original do PDF.
    */

    const itens = (content.items as any[])
      .filter((item) => item.str && item.str.trim())
      .map((item) => ({
        texto: String(item.str).trim(),
        x: Number(item.transform?.[4] || 0),
        y: Number(item.transform?.[5] || 0),
      }))
      .sort((a, b) => {
        const diferencaY = Math.abs(a.y - b.y);

        if (diferencaY > 3) {
          return b.y - a.y;
        }

        return a.x - b.x;
      });

    const linhas: {
      y: number;
      itens: {
        texto: string;
        x: number;
      }[];
    }[] = [];

    for (const item of itens) {
      let linha = linhas.find(
        (linhaAtual) =>
          Math.abs(linhaAtual.y - item.y) <= 3
      );

      if (!linha) {
        linha = {
          y: item.y,
          itens: [],
        };

        linhas.push(linha);
      }

      linha.itens.push({
        texto: item.texto,
        x: item.x,
      });
    }

    linhas.sort(
      (a, b) => b.y - a.y
    );

    const textoPagina = linhas
      .map((linha) => {
        linha.itens.sort(
          (a, b) => a.x - b.x
        );

        return linha.itens
          .map((item) => item.texto)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter(Boolean)
      .join("\n");

    paginas.push(textoPagina);
  }

  const texto = paginas.join("\n");

  /*
  |--------------------------------------------------------------------------
  | CABEÇALHO
  |--------------------------------------------------------------------------
  */

  const campo = (
    regex: RegExp
  ) =>
    clean(
      texto.match(regex)?.[1] ||
        ""
    );

  const meta = {
    pedido: campo(
      /Pedido:\s*(\d+)/i
    ),

    cliente: campo(
      /Cliente:\s*(.+?)(?=\s+CNPJ:|\s+Endere[cç]o:|\n)/i
    ),

    cidade: campo(
      /Cidade:\s*(.+?)(?=\s+Data Emiss[aã]o:|\n)/i
    ),

    emissao: campo(
      /Data Emiss[aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i
    ),

    previsao: campo(
      /Data Previs[aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i
    ),
  };

  /*
  |--------------------------------------------------------------------------
  | RECONSTRUÇÃO DOS ITENS
  |--------------------------------------------------------------------------
  */

  const linhasTexto =
    texto.split("\n");

  type RawItem = {
    item: string;
    codigo: string;
    descricao: string;
    qtd: number;
  };

  const itensBrutos: RawItem[] =
    [];

  let atual:
    | {
        item: string;
        codigo: string;
        descricao: string[];
      }
    | null = null;

  const finalizarAtual = (
    quantidade: number
  ) => {
    if (!atual) return;

    const descricao =
      clean(
        atual.descricao.join(" ")
      );

    if (
      descricao &&
      quantidade > 0
    ) {
      itensBrutos.push({
        item: atual.item,
        codigo: atual.codigo,
        descricao,
        qtd: quantidade,
      });
    }

    atual = null;
  };

  for (
    const linhaOriginal
    of linhasTexto
  ) {
    const linha =
      linhaOriginal.trim();

    if (!linha) continue;

    /*
      Exemplos:

      1.1 421020008
      7.2 1393032221
      12 3070302374
    */

    const inicioItem =
      linha.match(
        /^(\d+(?:\.\d+)?)\s+(\d{5,})(?:\s+(.*))?$/
      );

    if (inicioItem) {
      atual = {
        item: inicioItem[1],

        codigo:
          inicioItem[2],

        descricao:
          inicioItem[3]
            ? [
                inicioItem[3],
              ]
            : [],
      };

      continue;
    }

    if (!atual) {
      continue;
    }

    /*
      Final típico do produto:

      UN 15,000 11,010 ...
      PC 7,000 ...
      CJ 2,000 ...
    */

    const finalProduto =
      linha.match(
        /^(.*?)(?:\s+)?\b(CJ|UN|PC|PCS|JG)\s+(\d{1,8}(?:[.,]\d{3})?)(?:\s|$)/i
      );

    if (finalProduto) {
      const antesUnidade =
        finalProduto[1]?.trim();

      if (antesUnidade) {
        atual.descricao.push(
          antesUnidade
        );
      }

      const quantidade =
        Number(
          finalProduto[3]
            .replace(
              /\./g,
              ""
            )
            .replace(
              ",",
              "."
            )
        );

      finalizarAtual(
        quantidade
      );

      continue;
    }

    /*
      Continua descrição do item.
    */

    atual.descricao.push(
      linha
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ITEM PAI / SUBITEM
  |--------------------------------------------------------------------------
  */

  const pais =
    new Set<string>();

  for (
    const candidato
    of itensBrutos
  ) {
    const possuiFilhos =
      itensBrutos.some(
        (outro) =>
          outro.item.startsWith(
            `${candidato.item}.`
          )
      );

    if (possuiFilhos) {
      pais.add(
        candidato.item
      );
    }
  }

  const itensFisicos =
    itensBrutos.filter(
      (item) =>
        !pais.has(
          item.item
        )
    );

  /*
  |--------------------------------------------------------------------------
  | CONVERTE PARA PRODUÇÃO
  |--------------------------------------------------------------------------
  */

  const produtos =
    itensFisicos.flatMap(
      (item) =>
        expandir(
          meta.pedido,
          item.item,
          item.codigo,
          item.descricao,
          item.qtd
        )
    );

  const revisao =
    produtos.filter(
      (produto) =>
        produto.status ===
        "REVISÃO"
    ).length;

  return {
    meta,

    produtos,

    diagnostico: {
      itens:
        itensFisicos.length,

      linhas:
        produtos.length,

      revisao,

      paginas:
        pdf.numPages,
    },
  };
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
