export type Categoria="PORTA"|"BATENTE_PERNA"|"BATENTE_TRAVESSA"|"ALIZAR_PERNA"|"ALIZAR_TRAVESSA"|"KIT_CORRER"|"BAGUETE"|"OUTROS";
export type Status="PENDENTE"|"PROGRAMADO"|"APONTADA"|"AGUARDANDO LINHA"|"DIVERGÊNCIA"|"REVISÃO";
export type Prioridade="NORMAL"|"ALTA"|"URGENTE";

export type Produto={
  id:string;pedido:string;item:string;codigo:string;of:string;categoria:Categoria;
  descricaoOriginal:string;descricaoProducao:string;material:string;medida:string;
  rebaixo:string;acabamento:string;cor:string;quantidade:number;prioridade:Prioridade;
  status:Status;grupo:string;observacao:string;
};

export type PedidoMeta={pedido:string;cliente:string;cidade:string;emissao:string;previsao:string};
export type ParseResult={meta:PedidoMeta;produtos:Produto[];diagnostico:{itens:number;linhas:number;revisao:number;paginas:number}};
