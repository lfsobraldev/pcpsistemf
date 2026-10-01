import { NextResponse } from "next/server";
import crypto from "crypto";
const sign=(v:string,s:string)=>crypto.createHmac("sha256",s).update(v).digest("hex");
export async function POST(req:Request){
  const {usuario,senha}=await req.json();const u=process.env.ADMIN_USER||"",p=process.env.ADMIN_INITIAL_PASSWORD||"",secret=process.env.AUTH_SECRET||"";
  if(!u||!p||!secret)return NextResponse.json({error:"Configure ADMIN_USER, ADMIN_INITIAL_PASSWORD e AUTH_SECRET."},{status:500});
  if(usuario!==u||senha!==p)return NextResponse.json({error:"Usuário ou senha inválidos."},{status:401});
  const payload=`${usuario}|${Date.now()}`,token=`${Buffer.from(payload).toString("base64url")}.${sign(payload,secret)}`;
  const res=NextResponse.json({ok:true});res.cookies.set("pcp_session",token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:43200});return res;
}
