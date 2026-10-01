"use client";
export function Bars({data}:{data:{label:string,value:number}[]}) {
  const max=Math.max(...data.map(d=>d.value),1);
  return <div className="barChart">{data.map(d=><div className="barRow" key={d.label}>
    <span className="barLabel">{d.label}</span>
    <div className="barTrack"><div className="barFill" style={{width:`${Math.max(4,(d.value/max)*100)}%`}} /></div>
    <b>{d.value}</b>
  </div>)}</div>
}
export function Donut({data}:{data:{label:string,value:number}[]}) {
  const total=data.reduce((s,d)=>s+d.value,0)||1; let offset=0;
  const segs=data.map((d,i)=>{const len=d.value/total*100;const s={...d,start:offset,len,index:i};offset+=len;return s});
  return <div className="donutWrap"><div className="donutBox">
    <svg viewBox="0 0 42 42" className="donut">
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#e7ece9" strokeWidth="5"/>
      {segs.map((s,i)=><circle key={s.label} cx="21" cy="21" r="15.9155" fill="none" stroke={`var(--chart-${(i%4)+1})`} strokeWidth="5"
        strokeDasharray={`${s.len} ${100-s.len}`} strokeDashoffset={25-s.start}/>)}
    </svg>
    <div className="donutCenter"><b>{total}</b><span>itens</span></div>
  </div><div className="legend">{data.map((d,i)=><div key={d.label}><i style={{background:`var(--chart-${(i%4)+1})`}}/><span>{d.label}</span><b>{d.value}</b></div>)}</div></div>
}
