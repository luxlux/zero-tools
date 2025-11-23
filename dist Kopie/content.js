let g={isActive:!0,latencyMonitorEnabled:!0,warningThreshold:5,criticalThreshold:20,featureTwoEnabled:!1,autoCheckEnabled:!1,offsetButtonsEnabled:!1,customOffsets:"0.1, 0.5, 1.0",limitAdjusterEnabled:!1,confirmPageEnabled:!1};typeof chrome<"u"&&chrome.storage&&(chrome.storage.sync.get(["latencySettings"],t=>{if(t.latencySettings){const s=t.latencySettings;typeof s.isActive<"u"&&typeof s.latencyMonitorEnabled>"u"&&(s.latencyMonitorEnabled=s.isActive),g={...g,...s}}}),chrome.storage.onChanged.addListener((t,s)=>{s==="sync"&&t.latencySettings&&(g=t.latencySettings.newValue,D(),O())}));const K=t=>{const s=/(\d{1,2}):(\d{2}):(\d{2})/,o=t.match(s);if(!o)return null;const c=new Date,a=new Date(c.getFullYear(),c.getMonth(),c.getDate());return a.setHours(parseInt(o[1],10)),a.setMinutes(parseInt(o[2],10)),a.setSeconds(parseInt(o[3],10)),a.getTime()>c.getTime()+6e4&&a.setDate(a.getDate()-1),a},V=t=>{var a;const s=document.querySelectorAll(".text-color-primary");let o=null;for(let l=0;l<s.length;l++)if((a=s[l].textContent)!=null&&a.includes("Wertentwicklung seit Kauf")){o=s[l];break}if(!o||!o.parentElement)return;const c=o.parentElement.querySelector(".font-medium");if(c){let l=c.querySelector(".latency-extra-indicator");l||(l=document.createElement("span"),l.className="latency-indicator latency-extra-indicator",l.style.marginLeft="10px",c.appendChild(l)),l.classList.remove("latency-good","latency-warning","latency-critical"),l.classList.add(t.stateClass),l.innerText=t.displayTime}},F=()=>{document.querySelectorAll(".latency-indicator").forEach(t=>t.remove())},H=()=>{if(document.getElementById("zero-delay-styles"))return;const t=document.createElement("style");t.id="zero-delay-styles",t.textContent=`
    .zd-btn {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #ced4da;
      cursor: pointer;
      font-weight: 500;
      line-height: 1.4;
      transition: all 0.2s;
      background-color: #fff;
      color: #495057;
    }
    .zd-btn:hover {
      background-color: #e9ecef;
      border-color: #adb5bd;
    }
    .zd-btn-primary {
      border-color: #248eff;
      background-color: #248eff;
      color: #fff;
    }
    .zd-btn-primary:hover {
      background-color: #1a75d6;
      border-color: #1a75d6;
    }
    .zd-offset-btn {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      min-width: 35px;
      text-align: center;
      line-height: 1.2;
    }
    .zd-group-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: stretch;
    }
    .zd-offsets-row {
      display: flex;
      gap: 2px;
      justify-content: space-between;
    }
    .zd-offsets-row .zd-btn {
      flex: 1;
    }
    .zd-separator {
      color: #6c757d;
      font-weight: bold;
      font-size: 12px;
      align-self: center;
      margin: 0 4px;
    }
    .zd-limit-adjuster {
      display: flex;
      justify-content: flex-start;
      gap: 4px;
    }
    .latency-indicator {
      font-size: 0.75em;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 3px;
      margin-left: 5px;
      white-space: nowrap;
    }
    .latency-good {
      color: #198754;
      background-color: #d1e7dd;
    }
    .latency-warning {
      color: #ffc107;
      background-color: #fff3cd;
    }
    .latency-critical {
      color: #dc3545;
      background-color: #f8d7da;
    }
    .zd-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10000;
      white-space: nowrap;
      transform: translateX(-50%);
    }
  `,document.head.appendChild(t)};let B={bid:"",ask:"",single:"",autoCheck:!1,offsetEnabled:!1,offsets:""},I=!1;const D=()=>{const t=!!document.querySelector("trade-confirm"),s=t?!1:g.autoCheckEnabled||I;document.querySelectorAll(".zd-btn").forEach(o=>{var a,l,f;if(o.classList.contains("zd-offset-btn")&&((a=o.parentElement)!=null&&a.classList.contains("zd-limit-adjuster"))||o.closest(".zero-delay-confirm-controls"))return;const c=o.getAttribute("data-original-text")||((l=o.textContent)==null?void 0:l.replace(" & Prüfen",""))||"";o.getAttribute("data-original-text")||o.setAttribute("data-original-text",c),s?(o.classList.add("zd-btn-primary"),!((f=o.textContent)!=null&&f.includes("& Prüfen"))&&!o.classList.contains("zd-offset-btn")&&(o.textContent=`${c} & Prüfen`)):(o.classList.remove("zd-btn-primary"),o.classList.contains("zd-offset-btn")||(o.textContent=c))}),t||document.querySelectorAll(".zd-limit-adjuster").forEach(c=>{c.style.display=s?"none":"flex"})};document.addEventListener("keydown",t=>{t.key==="Shift"&&!I&&(I=!0,D())});document.addEventListener("keyup",t=>{t.key==="Shift"&&(I=!1,D())});const M=(t,s)=>{const o=document.querySelector('div[data-zid="limit-order"]'),c='input[data-zid="limit-order-input"]';if(!o){console.warn("ZeroDelay: Limit button not found");return}let a=document.querySelector(c);a||o.click();let l=0;const f=20,y=setInterval(()=>{l++,a=document.querySelector(c),a?(clearInterval(y),a.value=t,a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0})),a.dispatchEvent(new Event("blur",{bubbles:!0})),s&&setTimeout(()=>{const b=document.querySelector('web-design-system-button[data-zid="check-order"] button');b?b.click():console.warn("ZeroDelay: Check Order button not found")},200)):l>=f&&(clearInterval(y),console.warn("ZeroDelay: Limit input did not appear"))},50)},R=()=>{var l;if(!g.limitAdjusterEnabled){document.querySelectorAll(".zd-limit-adjuster").forEach(f=>f.remove());return}const t=document.querySelector('input[data-zid="limit-order-input"]');if(!t)return;if((l=t.parentElement)!=null&&l.querySelector(".zd-limit-adjuster")){D();return}const s=(f,y)=>{const b=document.createElement("div");return b.className="zd-limit-adjuster",b.style.marginBottom=y?"4px":"0",b.style.marginTop=y?"0":"4px",f.forEach(m=>{const u=document.createElement("button"),x=y?"+":"-";u.textContent=`${x}${m.toString().replace(".",",")}`,u.className="zd-btn zd-offset-btn",u.style.minWidth="30px",u.onclick=h=>{var n;h.preventDefault(),h.stopPropagation();let v=t.value.replace(",","."),S=parseFloat(v);isNaN(S)&&(S=0);const q=y?m:-m;let C=S+q;C<0&&(C=0);const A=v.includes(".")?v.split(".")[1].length:2,L=((n=m.toString().split(".")[1])==null?void 0:n.length)||0,N=Math.max(A,L);t.value=C.toFixed(N),t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0}))},b.appendChild(u)}),b},o=[10,1,.1,.01,.001],c=s(o,!0);t.insertAdjacentElement("beforebegin",c);const a=s(o,!1);t.insertAdjacentElement("afterend",a)},$=(t,s)=>new Promise(o=>{const c=document.querySelector(t);if(c){o(c);return}const a=new MutationObserver(()=>{const l=document.querySelector(t);l&&(a.disconnect(),o(l))});a.observe(document.body,{childList:!0,subtree:!0}),setTimeout(()=>{a.disconnect(),o(null)},s)}),Z=()=>{var A,L,N;H();const t=document.querySelector("trade-create-quote")||document.querySelector('div[data-zid="quote-container"]');if(!t)return;if(!g.featureTwoEnabled){(A=t.querySelector(".zero-delay-limit-controls"))==null||A.remove();return}if(!document.querySelector('div[data-zid="limit-order"]')){(L=t.querySelector(".zero-delay-limit-controls"))==null||L.remove();return}const o=t.querySelector('span[data-zid="quote-spread"]'),c=t.querySelector(".quoteindicator"),a=t.querySelector('span[data-zid="quote-sell"]');if((!o||!c)&&!a)return;const l=n=>{const d=n.match(/([\d,]+)/);return d?d[1].replace(",","."):null};let f=null,y=null,b=null;o&&c?(f=l(o.textContent||""),y=l(c.textContent||"")):a&&(b=l(a.textContent||""));const m={bid:f||"",ask:y||"",single:b||"",autoCheck:g.autoCheckEnabled,offsetEnabled:g.offsetButtonsEnabled,offsets:g.customOffsets};if(m.bid===B.bid&&m.ask===B.ask&&m.single===B.single&&m.autoCheck===B.autoCheck&&m.offsetEnabled===B.offsetEnabled&&m.offsets===B.offsets&&t.querySelector(".zero-delay-limit-controls"))return;B=m,(N=t.querySelector(".zero-delay-offset-controls"))==null||N.remove();let u=t.querySelector(".zero-delay-limit-controls");if(u)u.innerHTML="",u.className="zero-delay-limit-controls d-flex justify-content-end align-items-start mt-0 mb-2",u.style.gap="8px";else{u=document.createElement("div"),u.className="zero-delay-limit-controls d-flex justify-content-end align-items-start mt-0 mb-2",u.style.gap="8px";const n=t.querySelector('div[data-zid="quote-container"]');n?n.insertAdjacentElement("afterend",u):t.appendChild(u)}const x=g.autoCheckEnabled,h=(n,d)=>{n.onmouseenter=()=>{let e=document.getElementById("zd-tooltip-el");e||(e=document.createElement("div"),e.id="zd-tooltip-el",e.className="zd-tooltip",document.body.appendChild(e));const i=d.replace(".",","),r=i.split(",");if(r.length===2&&r[1].length>2){const p=r[0],k=r[1].substring(0,2),z=r[1].substring(2);e.innerHTML=`${p},${k}<span style="opacity: 0.5;">${z}</span>`}else e.textContent=i;e.style.display="block"},n.onmousemove=e=>{const i=document.getElementById("zd-tooltip-el");i&&(i.style.top=`${e.clientY-45}px`,i.style.left=`${e.clientX}px`)},n.onmouseleave=()=>{const e=document.getElementById("zd-tooltip-el");e&&(e.style.display="none")}},v=(n,d)=>{const e=document.createElement("button");return e.setAttribute("data-original-text",n),x||I?(e.textContent=`${n} & Prüfen`,e.classList.add("zd-btn-primary")):e.textContent=n,e.className="zd-btn",e.style.width="100%",h(e,d),e.onclick=i=>{i.preventDefault(),i.stopPropagation();const r=document.getElementById("zd-tooltip-el");r&&(r.style.display="none"),e.blur(),M(d,x||i.shiftKey)},e},S=n=>n.indexOf(".")<0?2:n.split(".")[1].length,q=(n,d,e)=>{const i=parseFloat(n),r=S(n),p=e?d:-d,z=(i*(1+p/100)).toFixed(r),T=`${e?"+":"-"}${d.toString().replace(".",",")}%`,E=document.createElement("button");return E.setAttribute("data-original-text",T),(x||I)&&E.classList.add("zd-btn-primary"),E.textContent=T,E.className="zd-btn zd-offset-btn",h(E,z),E.onclick=w=>{w.preventDefault(),w.stopPropagation();const j=document.getElementById("zd-tooltip-el");j&&(j.style.display="none"),E.blur(),M(z,x||w.shiftKey)},E},C=(n,d)=>{const e=document.createElement("div");e.className="zd-group-col";let i=[];if(g.offsetButtonsEnabled&&g.customOffsets&&(i=g.customOffsets.split(";").map(r=>parseFloat(r.trim().replace(",","."))).filter(r=>!isNaN(r)),i=Array.from(new Set(i.map(Math.abs))).sort((r,p)=>r-p)),i.length>0){const r=document.createElement("div");r.className="zd-offsets-row",i.forEach(p=>{r.appendChild(q(d,p,!0))}),e.appendChild(r)}if(e.appendChild(v(n,d)),i.length>0){const r=document.createElement("div");r.className="zd-offsets-row",i.forEach(p=>{r.appendChild(q(d,p,!1))}),e.appendChild(r)}return e};if(f&&y){const n=!isNaN(parseFloat(f)),d=!isNaN(parseFloat(y));if(n&&u.appendChild(C("Bid als Limit",f)),n&&d){const e=document.createElement("div");e.textContent="/",e.className="zd-separator",u.appendChild(e)}d&&u.appendChild(C("Ask als Limit",y))}else b&&!isNaN(parseFloat(b))&&u.appendChild(C("Kurs als Limit",b));D()},W=()=>{var C,A,L,N;const t=document.querySelector("trade-confirm");if(!t||!g.confirmPageEnabled){(C=document.querySelector(".zero-delay-confirm-controls"))==null||C.remove();return}const s=t.querySelector("trade-confirm-data");if(!s)return;const o=Array.from(s.querySelectorAll(".font-bold")).find(n=>{var d,e;return((d=n.textContent)==null?void 0:d.trim())==="Limit"||((e=n.textContent)==null?void 0:e.trim())==="Market"}),c=((A=o==null?void 0:o.textContent)==null?void 0:A.trim())==="Limit",a=Array.from(s.querySelectorAll(".font-bold")).find(n=>{var d,e;return((d=n.textContent)==null?void 0:d.trim())==="Kauf"||((e=n.textContent)==null?void 0:e.trim())==="Verkauf"}),l=((L=a==null?void 0:a.textContent)==null?void 0:L.trim())==="Kauf",f=t.querySelector(".d-flex.justify-content-between.upper");if(!f)return;const y=f.querySelector(".quoteindicator");if(!y)return;const m=(((N=y.textContent)==null?void 0:N.trim())||"").split("/").map(n=>n.trim().replace("€","").trim());let u="";if(m.length===2?u=l?m[1]:m[0]:u=m[0],!u)return;const x=u.replace(",",".");let h=t.querySelector(".zero-delay-confirm-controls");if(h)return;h=document.createElement("div"),h.className="zero-delay-confirm-controls d-flex flex-column align-items-end mt-3 mb-3",h.style.gap="8px";const v=document.createElement("div");v.className="font-bold",v.textContent=c?"Limit ändern:":"Zu Limit Order wechseln:",h.appendChild(v);const S=document.createElement("div");S.className="d-flex",S.style.gap="8px",S.style.flexWrap="wrap",S.style.justifyContent="flex-end";const q=(n,d)=>{const e=document.createElement("button");return e.textContent=n,e.className="zd-btn zd-btn-primary",e.onmouseenter=()=>{let i=document.getElementById("zd-tooltip-el");i||(i=document.createElement("div"),i.id="zd-tooltip-el",i.className="zd-tooltip",document.body.appendChild(i));const r=d.replace(".",","),p=r.split(",");if(p.length===2&&p[1].length>2){const k=p[0],z=p[1].substring(0,2),P=p[1].substring(2);i.innerHTML=`${k},${z}<span style="opacity: 0.5;">${P}</span>`}else i.textContent=r;i.style.display="block"},e.onmousemove=i=>{const r=document.getElementById("zd-tooltip-el");r&&(r.style.left=i.pageX+"px",r.style.top=i.pageY-45+"px")},e.onmouseleave=()=>{const i=document.getElementById("zd-tooltip-el");i&&(i.style.display="none")},e.onclick=async i=>{i.preventDefault(),i.stopPropagation();const r=document.getElementById("zd-tooltip-el");r&&(r.style.display="none"),e.blur();const p=document.querySelector('a[data-zid="order-mask-back"]');if(!p){console.warn("ZeroDelay: Back button not found");return}if(p.click(),await $("trade-create-quote",3e3),!document.querySelector('input[data-zid="limit-order-input"]')){const z=document.querySelector('div[data-zid="limit-order"]');z&&(z.click(),await $('input[data-zid="limit-order-input"]',1e3))}M(d,!0)},e};if(S.appendChild(q("Kurs als Limit",x)),g.offsetButtonsEnabled){const n=g.customOffsets.split(";").map(r=>parseFloat(r.trim().replace(",","."))).filter(r=>!isNaN(r)),d=Array.from(new Set(n.map(Math.abs))).sort((r,p)=>r-p),e=parseFloat(x),i=x.indexOf(".")>=0?x.split(".")[1].length:2;d.forEach(r=>{[!0,!1].forEach(p=>{const k=p?r:-r,P=(e*(1+k/100)).toFixed(i),E=`${p?"+":"-"}${r.toString().replace(".",",")}%`;S.appendChild(q(E,P))})})}if(h.appendChild(S),c){const n=document.createElement("button");n.textContent="Auf Market Order ändern",n.className="zd-btn mt-2",n.style.fontSize="11px",n.style.padding="4px 12px",n.style.backgroundColor="#dc3545",n.style.borderColor="#dc3545",n.style.color="#fff",n.onclick=async d=>{d.preventDefault(),d.stopPropagation(),n.blur();const e=document.querySelector('a[data-zid="order-mask-back"]');if(!e)return;e.click(),await $("trade-create-quote",3e3),await new Promise(E=>setTimeout(E,100));let i=0;const r=3,p=[200,400,800],k=()=>{document.querySelectorAll('[data-zid="options-container"] [data-zid$="-order"]').forEach(w=>{const j=w.querySelector("use");j&&(j.getAttribute("xlink:href")||"").includes("#minus")&&w.click()})};k();let z=0;const P=15,T=setInterval(()=>{if(z++,document.querySelector('input[data-zid="limit-order-input"]')){if(z>=P)if(i<r){const w=p[i];i++,z=0,setTimeout(()=>{k()},w)}else clearInterval(T),alert(`Fehler: Automatischer Wechsel zur Vorbereitung einer Market Order fehlgeschlagen.

Bitte setzen Sie die Order manuell mit den richtigen Einstellungen fort.`)}else{clearInterval(T);const w=document.querySelector('web-design-system-button[data-zid="check-order"] button');w&&w.click()}},100)},h.appendChild(n)}f.insertAdjacentElement("afterend",h)},O=()=>{if(!g.isActive){F();return}g.latencyMonitorEnabled?document.querySelectorAll('span[data-zid="quote-time"]').forEach(s=>{var u,x,h;const o=(u=s.textContent)==null?void 0:u.trim();if(!o)return;const c=K(o);if(!c)return;const l=new Date().getTime()-c.getTime(),f=Math.floor(l/1e3);let y="latency-good";f>=g.criticalThreshold?y="latency-critical":f>=g.warningThreshold&&(y="latency-warning");const b=f>60?`${Math.floor(f/60)}m ${f%60}s`:`${f}s`;let m=(x=s.parentElement)==null?void 0:x.querySelector(".latency-indicator");m||(m=document.createElement("span"),m.className="latency-indicator",m.style.marginLeft="8px",(h=s.parentElement)==null||h.appendChild(m)),m.classList.remove("latency-good","latency-warning","latency-critical"),m.classList.add(y),m.innerText=`(${b})`,V({stateClass:y,displayTime:`(${b})`})}):F(),Z(),R(),W()};setInterval(O,1e3);O();
