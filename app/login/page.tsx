"use client";
import { useState } from "react";
import { Factory,LockKeyhole,UserRound,ArrowRight,ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
export default function Login(){
  const r=useRouter();const[u,setU]=useState("");const[p,setP]=useState("");const[e,setE]=useState("");const[busy,setBusy]=useState(false);
  async function entrar(ev:React.FormEvent){ev.preventDefault();setE("");setBusy(true);try{const x=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({usuario:u,senha:p})});const j=await x.json();if(!x.ok)throw new Error(j.error||"Falha no login");r.replace("/")}catch(err:any){setE(err.message)}finally{setBusy(false)}}
  return <main className="loginPage"><section className="loginBrand">
    <div className="loginBrandTop"><div className="logoMark"><Factory size={28}/></div><div><b>SOBRAL PCP</b><span>Planejamento e Controle da Produção</span></div></div>
    <div className="loginStatement"><span className="eyebrow">OPERAÇÃO INDUSTRIAL</span><h1>Programação diária, leitura e acompanhamento da produção.</h1><p>Pedidos, OFs, líderes, apontamentos e indicadores em um único ambiente operacional.</p></div>
    <div className="loginFeatures"><div><ShieldCheck size={18}/><span><b>Acesso controlado</b><small>Sessão protegida e credenciais no servidor.</small></span></div><div><Factory size={18}/><span><b>Foco industrial</b><small>Programação por famílias e processos.</small></span></div></div>
    <div className="loginFooter">Sistema interno • PCP Industrial</div>
  </section><section className="loginFormSide"><form className="loginCard" onSubmit={entrar}>
    <div className="loginCardHead"><span className="eyebrow">ACESSO AO SISTEMA</span><h2>Entrar no PCP</h2><p>Informe suas credenciais.</p></div>
    <label>Usuário<div className="inputIcon"><UserRound size={17}/><input autoComplete="username" value={u} onChange={x=>setU(x.target.value)} placeholder="Digite seu usuário"/></div></label>
    <label>Senha<div className="inputIcon"><LockKeyhole size={17}/><input type="password" autoComplete="current-password" value={p} onChange={x=>setP(x.target.value)} placeholder="Digite sua senha"/></div></label>
    {e&&<div className="loginError">{e}</div>}<button className="loginButton" disabled={busy}>{busy?"VALIDANDO...":<>ENTRAR <ArrowRight size={17}/></>}</button><small className="loginHelp">Acesso restrito aos usuários autorizados.</small>
  </form></section></main>
}
