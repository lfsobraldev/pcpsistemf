import ExcelJS from "exceljs";
import { Produto } from "@/types/pcp";
import { consolidar } from "./pcp";

function head(row:ExcelJS.Row){row.font={bold:true,color:{argb:"FFFFFFFF"}};row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF173C2E"}};row.alignment={horizontal:"center",vertical:"middle",wrapText:true}}
function title(ws:ExcelJS.Worksheet,text:string,cols:number){ws.mergeCells(1,1,1,cols);const c=ws.getCell(1,1);c.value=text;c.font={bold:true,size:16,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF173C2E"}};c.alignment={horizontal:"center",vertical:"middle"};ws.getRow(1).height=30}
export async function exportar(produtos:Produto[],data:string,turno:string){
  const wb=new ExcelJS.Workbook();wb.creator="Sobral PCP";
  const q=wb.addWorksheet("QUANTIDADES LIDERES");title(q,`PCP • QUANTIDADES LÍDERES • ${data} • TURNO ${turno}`,8);q.addRow([]);q.addRow(["Grupo","Peça","Material","Medida","Rebaixo","Acabamento","Cor","Qtd"]);head(q.getRow(3));
  for(const r of consolidar(produtos))q.addRow([r.grupo,r.categoria,r.material,r.medida,r.rebaixo,r.acabamento,r.cor,r.quantidade]);
  q.columns=[{width:18},{width:24},{width:20},{width:18},{width:15},{width:18},{width:24},{width:12}];

  const a=wb.addWorksheet("APONTAMENTOS");title(a,`PCP • APONTAMENTOS • ${data} • TURNO ${turno}`,8);a.addRow([]);a.addRow(["Pedido","OF","Peça","Descrição produção","Qtd","Prioridade","Status","Observação"]);head(a.getRow(3));
  produtos.forEach(p=>a.addRow([p.pedido,p.of,p.categoria,p.descricaoProducao,p.quantidade,p.prioridade,p.status,p.observacao]));
  a.columns=[{width:14},{width:15},{width:24},{width:50},{width:10},{width:14},{width:20},{width:30}];

  for(const grupo of [...new Set(produtos.map(p=>p.grupo))]){
    const ws=wb.addWorksheet((grupo||"OUTROS").slice(0,31));title(ws,`PCP • ${grupo} • ${data} • TURNO ${turno}`,10);ws.addRow([]);ws.addRow(["Pedido","OF","Peça","Descrição","Material","Medida","Rebaixo","Acabamento","Cor","Qtd"]);head(ws.getRow(3));
    produtos.filter(p=>p.grupo===grupo).forEach(p=>ws.addRow([p.pedido,p.of,p.categoria,p.descricaoProducao,p.material,p.medida,p.rebaixo,p.acabamento,p.cor,p.quantidade]));
    ws.columns=[{width:14},{width:15},{width:24},{width:48},{width:20},{width:18},{width:15},{width:18},{width:24},{width:10}];
    ws.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9};
  }
  const buf=await wb.xlsx.writeBuffer();const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`PCP_Programacao_${data}.xlsx`;link.click();URL.revokeObjectURL(url)
}
