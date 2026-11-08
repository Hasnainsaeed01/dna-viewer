"use strict";
/* ============================================================
   UI layer — scanner + tools
   ============================================================ */
var BASE_NAMES={A:"Adenine",T:"Thymine",G:"Guanine",C:"Cytosine",U:"Uracil",N:"Unknown base"};
var BASE_HEX={A:"#22b573",T:"#e5484d",G:"#f08c1e",C:"#2f7fe0",N:"#8b98a5"};
var EXAMPLES={
  long:{name:"Long example — DNA.fasta (20,000 bp)", file:"DNA.fasta.txt", desc:"Synthetic 20,000 bp sequence like the original viewer's file, with a TATA box at 4,001, an EcoRI site at 8,001, an ORF-like region near 12,001 and a BamHI site at 16,001. Generated deterministically in the page, so it is identical on every load.", gen:true},
  puc19:{name:"pUC19 MCS region", desc:"Real multiple-cloning-site region of the pUC19 cloning vector, containing EcoRI, BamHI, HindIII, KpnI, SmaI, PstI, SalI and XhoI sites.", seq:"TTGTCAGACATTAATGTGAGTTAGCTCACTCATTAGGCACCCCAGGCTTTACACTTTATGCTTCCGGCTCGTATGTTGTGTGGAATTGTGAGCGGATAACAATTTCACACAGGAAACAGCTATGACCATGATTACGCCAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTCACTGGCCGTCGTTTTACAACGTCGTGACTGGGAAAACCCTGGCGTTACCCAACTTAATCGCCTTGCAGCACATCCCCCTTTCGCCAGCTGGCGTAATAGCGAAGAGGCCCGCACCGATCGCCCTTCCCAACAGTTGCGCAGCCTGAATGGCGAATGGCGCCTGATGCGGTATTTTCTCCTTACGCATCTGTGCGGTATTTCACACCGCATATGGTGCACTCTCAGTACAATCTGCTCTGATGCCGCATAGTTAAGCCAGTATACACTCCGCTATCGCTACGTGACTGGGTCATGGCTGCGCCCCGACACCCGCCAACACCCGCTGACGCGCCCTGACGGGCTTGTCTGCTCCCGGCATCCGCTTACAGACAAGCTGTGACCGTCTCCGGGAGCTGCATGTGTCAGAGGTTTTCACCGTCATCACCGAAACGCGCGAGGCAGCAGATCAATTC"},
  egfp:{name:"EGFP coding sequence (complete CDS)", desc:"Real complete coding sequence of enhanced GFP (720 bp including the stop codon), starting with the ATG start codon. The ORF Finder reports one long 720 nt ORF on frame +1.", seq:"ATGGTGAGCAAGGGCGAGGAGCTGTTCACCGGGGTGGTGCCCATCCTGGTCGAGCTGGACGGCGACGTAAACGGCCACAAGTTCAGCGTGTCCGGCGAGGGCGAGGGCGATGCCACCTACGGCAAGCTGACCCTGAAGTTCATCTGCACCACCGGCAAGCTGCCCGTGCCCTGGCCCACCCTCGTGACCACCCTGACCTACGGCGTGCAGTGCTTCAGCCGCTACCCCGACCACATGAAGCAGCACGACTTCTTCAAGTCCGCCATGCCCGAAGGCTACGTCCAGGAGCGCACCATCTTCTTCAAGGACGACGGCAACTACAAGACCCGCGCCGAGGTGAAGTTCGAGGGCGACACCCTGGTGAACCGCATCGAGCTGAAGGGCATCGACTTCAAGGAGGACGGCAACATCCTGGGGCACAAGCTGGAGTACAACTACAACAGCCACAACGTCTATATCATGGCCGACAAGCAGAAGAACGGCATCAAGGTGAACTTCAAGATCCGCCACAACATCGAGGACGGCAGCGTGCAGCTCGCCGACCACTACCAGCAGAACACCCCCATCGGCGACGGCCCCGTGCTGCTGCCCGACAACCACTACCTGAGCACCCAGTCCGCCCTGAGCAAAGACCCCAACGAGAAGCGCGATCACATGGTCCTGCTGGAGTTCGTGACCGCCGCCGGGATCACTCTCGGCATGGACGAGCTGTACAAGTAA"},
  synthetic:{name:"Synthetic test sequence", desc:"Constructed test sequence with a known ORF, an EcoRI site (GAATTC), a BamHI site (GGATCC), a TATA-box motif (TATAAA) and ambiguous bases (N, R, Y) for validating the tools.", seq:"GGGCTATAAATATAAAAGGGCCCAAATTTGGGATGAAAGCTTTTGGCCATGGATCCAAATTTGGGCCCAAGCTTGGCCAATGAATTCGTTAACCGGNNACGTRYGGGAAATTTCCCGGGATCCAGCTTTAATTAAGGCCGGCCATGCGTACGTTAGCGGCCGCAAGCTTNNNNACGTACGTAGCTAGCTGAATTCGGATCCAAATGGCCATGGCGCGCGTTAACCCGGGGTTTAAACCCGGGATCCGATCGATCGTAGCTAGCATCGATCGATCGTACGATCGAGCTCGAGATCTAGCTACGATCGATGAATTCGGGGCCCCAAATTTGGGCCCGGATCCATGGCGCGCGTAGCTGACTGACTGACTGATCGATGAATTCTAGCTAGCATCGATCGTACGATCGTACGATCGATCGGATCCAAATTTGGGCCCAAGCTTGGCCAATTGGCCAATGGATCCGAATTC"}
};
var TABS=[
  {id:"scanner", label:"Helix Scanner"},
  {id:"stats", label:"Statistics"},
  {id:"gc", label:"GC Analysis"},
  {id:"translation", label:"Translation"},
  {id:"orf", label:"ORF Finder"},
  {id:"restriction", label:"Restriction Map"},
  {id:"bend", label:"Bendability"},
  {id:"motif", label:"Motif Search"},
  {id:"compare", label:"Comparison"},
  {id:"codon", label:"Codon Analysis"},
  {id:"export", label:"Export"},
  {id:"tests", label:"Tests & Info"}
];
var state={
  records:[], current:0, seq:"", name:"", fileName:"DNA.fasta.txt",
  view:"scanner",
  sel:1, zoom:1, rc:false,
  scanning:false, speed:12, scanAcc:0, lastTick:0,
  motif:"", motifHits:[], motifSet:{},
  code:"standard",
  transPage:0, transShowAll:false,
  lastORFs:[], lastSites:[], lastMotifs:[], lastGC:[]
};
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmt(n){ return n.toLocaleString("en-US"); }
function pct(x){ return (Math.round(x*100)/100).toFixed(2)+"%"; }
function currentRecord(){ return state.records[state.current]||null; }
function displaySeq(){ return state.rc ? reverseComplement(state.seq) : state.seq; }
function rowH(){ return Math.round(36*state.zoom); }
function tileSize(){ return Math.round(27*state.zoom); }
function baseColor(b){ return BASE_HEX[b]||BASE_HEX.N; }
function baseName(b){ return (BASE_NAMES[b]||"Ambiguous base")+" ("+b+")"; }

/* ---------------- sequence loading ---------------- */
function setSequence(records, idx, fileName){
  state.records=records; state.current=idx||0;
  var rec=currentRecord();
  state.seq=rec?rec.seq:""; state.name=rec?rec.id:"";
  if(fileName) state.fileName=fileName;
  state.sel=1; state.transPage=0; state.transShowAll=false; state.lastORFs=[]; state.lastSites=[]; state.lastMotifs=[];
  stopScan();
  updateTopbar(); renderRecordPicker(); applyMotif(false);
  var sc=$("helixScroll"); if(sc) sc.scrollTop=0;
  renderHelix(true); updateDetails(); renderMiniStats();
  if(state.view==="stats") renderStats();
}
function loadFromText(fromFile){
  var raw=$("seqInput").value, msg=$("inputMsg");
  if(!raw.trim()){ msg.className="msg err"; msg.textContent="Paste a sequence or FASTA text first, or load one of the examples."; msg.style.display="block"; return; }
  var records;
  if(raw.trim().charAt(0)===">"){ records=parseFASTA(raw); }
  else { var s=cleanSequence(raw); records= s? [{id:"sequence", description:"pasted sequence", seq:s}] : []; }
  if(!records.length){ msg.className="msg err"; msg.textContent="No sequence could be read from that input."; return; }
  setSequence(records,0, fromFile||"pasted-sequence.txt");
  msg.className="msg ok";
  msg.textContent="Loaded "+records.length+" record(s), "+fmt(state.seq.length)+" bp. Showing the double helix scanner.";
}
function updateTopbar(){
  var len=state.seq.length;
  $("topFile").textContent="File: "+state.fileName;
  $("topLen").textContent=fmt(len);
  $("topNm").textContent=fmt(Math.round(len*0.34));
  $("topTurns").textContent=len? (len/10.5).toLocaleString("en-US",{maximumFractionDigits:1}) : "0";
  $("topGC").textContent=len? pct(gcPercent(state.seq)) : "—";
  var jr=$("jumpRange"); jr.max=Math.max(1,len); if(state.sel>len) state.sel=Math.max(1,len);
  jr.value=state.sel; $("jumpNum").max=len; $("jumpNum").value=state.sel;
}
function renderRecordPicker(){
  var sel=$("recordPicker"); if(!sel) return;
  sel.innerHTML = state.records.length
    ? state.records.map(function(r,i){ return '<option value="'+i+'"'+(i===state.current?" selected":"")+'>'+esc(r.id)+" — "+fmt(r.seq.length)+" bp</option>"; }).join("")
    : '<option value="">No records loaded</option>';
}

/* ---------------- helix (virtualized) ---------------- */
var helixRAF=false;
function helixGeom(){
  var sc=$("helixScroll");
  var w=sc.clientWidth;
  var grooveW = w>640 ? 86 : 0;
  var trackW=Math.max(120, w-62-58-grooveW);
  var ts=tileSize();
  var amp=Math.max(18, Math.min(96, trackW/2 - ts/2 - 8));
  return {trackW:trackW, amp:amp, cx:trackW/2, ts:ts};
}
function strandX(i, g, strand){
  var th=(i-1)*(2*Math.PI/10.5);
  var s=Math.sin(th);
  return g.cx + (strand===1? s : -s)*g.amp;
}
function renderHelix(force){
  var sc=$("helixScroll"), sp=$("helixSpacer");
  if(!sc||!sp) return;
  var seq=displaySeq(), total=seq.length, rh=rowH();
  sp.style.height=(total*rh)+"px";
  if(!total){ sp.innerHTML='<p style="padding:18px;color:var(--muted)">No sequence loaded. Open “Load a sequence” above and paste, upload, or pick an example.</p>'; return; }
  var g=helixGeom();
  var st=sc.scrollTop, vh=sc.clientHeight||400;
  var first=Math.max(0, Math.floor(st/rh)-4);
  var last=Math.min(total-1, Math.ceil((st+vh)/rh)+4);
  var html="";
  for(var idx=first; idx<=last; idx++){
    var pos=idx+1, b1=seq[idx], b2=complementBase(b1);
    var x1=strandX(pos,g,1), x2=strandX(pos,g,2);
    var th=(pos-1)*(2*Math.PI/10.5), depth=Math.cos(th);
    var back1=depth<0, back2=!back1;
    var turn=Math.floor((pos-1)/10.5)+1;
    var isTurnStart = pos===1 || Math.floor((pos-2)/10.5)!==Math.floor((pos-1)/10.5);
    var groove = (pos%11===3) ? "Major groove" : (pos%11===8 ? "Minor groove" : "");
    var sel = pos===state.sel;
    var inMotif = !!state.motifSet[pos];
    /* backbone connectors to next row */
    var bb="";
    if(idx<total-1){
      var nx1=strandX(pos+1,g,1), nx2=strandX(pos+1,g,2);
      [[x1,nx1,1],[x2,nx2,2]].forEach(function(pr){
        var dx=pr[1]-pr[0], dy=rh, len=Math.sqrt(dx*dx+dy*dy), ang=Math.atan2(dy,dx)*180/Math.PI;
        bb+='<div class="hbackbone" style="left:'+pr[0].toFixed(1)+'px;top:'+(rh/2)+'px;width:'+len.toFixed(1)+'px;transform:rotate('+ang.toFixed(1)+'deg);transform-origin:0 50%"></div>';
      });
    }
    var rung='<div class="hrung" style="left:'+Math.min(x1,x2).toFixed(1)+'px;width:'+Math.abs(x2-x1).toFixed(1)+'px"></div>';
    var t1='<div class="htile'+(back1?" back":"")+(sel?" sel":"")+(inMotif?" motif":"")+'" data-pos="'+pos+'" title="Pair '+pos+": "+b1+"–"+b2+'" style="left:'+x1.toFixed(1)+'px;width:'+g.ts+'px;height:'+g.ts+'px;font-size:'+Math.round(g.ts*0.55)+'px;background:'+baseColor(b1)+'">'+b1+'</div>';
    var t2='<div class="htile'+(back2?" back":"")+(sel?" sel":"")+(inMotif?" motif":"")+'" data-pos="'+pos+'" title="Pair '+pos+": "+b1+"–"+b2+'" style="left:'+x2.toFixed(1)+'px;width:'+g.ts+'px;height:'+g.ts+'px;font-size:'+Math.round(g.ts*0.55)+'px;background:'+baseColor(b2)+'">'+b2+'</div>';
    html+='<div class="hrow'+(sel?" selrow":"")+'" style="top:'+(idx*rh)+'px;height:'+rh+'px">'
      +'<div class="hpos" style="'+(pos%5===0||sel?'color:var(--muted);font-weight:700':'')+'">'+pos+'</div>'
      +'<div class="hturn">'+(isTurnStart? "Turn "+turn : "")+'</div>'
      +'<div class="htrack">'+bb+rung+t1+t2
      +(pos===1? '<span class="hstrandtag" style="left:'+(x1-8)+'px">5′</span><span class="hstrandtag" style="left:'+(x2-8)+'px">3′</span>':"")
      +'</div>'
      +'<div class="hgroove">'+groove+'</div></div>';
  }
  sp.innerHTML=html;
}
function requestHelixRender(){
  if(helixRAF) return; helixRAF=true;
  requestAnimationFrame(function(){ helixRAF=false; renderHelix(); });
}
function ensureVisible(pos, center){
  var sc=$("helixScroll"); if(!sc) return;
  var rh=rowH(), top=(pos-1)*rh, vh=sc.clientHeight;
  if(center){ sc.scrollTop=Math.max(0, top-vh/2+rh/2); return; }
  if(top < sc.scrollTop+rh) sc.scrollTop=Math.max(0, top-vh/2+rh/2);
  else if(top+rh > sc.scrollTop+vh-rh) sc.scrollTop=Math.max(0, top-vh/2+rh/2);
}

/* ---------------- selection & details ---------------- */
function selectPair(pos, scrollMode){
  var total=displaySeq().length; if(!total) return;
  pos=Math.max(1, Math.min(total, Math.round(pos)||1));
  state.sel=pos;
  $("jumpRange").value=pos; $("jumpNum").value=pos;
  if(scrollMode==="center") ensureVisible(pos,true);
  else if(scrollMode==="auto") ensureVisible(pos,false);
  renderHelix(); updateDetails();
}
function updateDetails(){
  var seq=displaySeq(), total=seq.length;
  if(!total){
    $("pairHead").innerHTML='Pair 0 <span>of 0</span>';
    $("pairSub").textContent="Load a sequence to start scanning.";
    return;
  }
  var pos=state.sel, b1=seq[pos-1], b2=complementBase(b1);
  var turn=Math.floor((pos-1)/10.5)+1;
  $("pairHead").innerHTML="Pair "+fmt(pos)+' <span>of '+fmt(total)+"</span>";
  $("pairSub").textContent="Turn "+turn+" · "+((pos-1)*0.34).toFixed(1)+" nm from the 5′ end · twist "+Math.round(((pos-1)*360/10.5)%360)+"°"+(state.rc?" · viewing reverse complement":"");
  var t1=$("s1Tile"), t2=$("s2Tile");
  t1.textContent=b1; t1.style.background=baseColor(b1);
  t2.textContent=b2; t2.style.background=baseColor(b2);
  $("s1Name").textContent=baseName(b1);
  $("s2Name").textContent=baseName(b2);
  var ml=$("matchLine"), mt=$("matchTxt");
  if("ACGT".indexOf(b1)>-1){
    ml.className="matchline";
    var bonds=(b1==="A"||b1==="T")?2:3;
    ml.querySelector(".mtag").textContent="MATCH";
    mt.textContent=b1+" pairs with "+b2+" through "+bonds+" hydrogen bonds ("+(bonds===2?"weaker":"stronger")+")";
  } else {
    ml.className="matchline amb";
    ml.querySelector(".mtag").textContent="AMBIGUOUS";
    mt.textContent=b1+" is an ambiguous base — its partner and hydrogen-bond count depend on the actual base at this position";
  }
  /* neighboring strip */
  var half=9, from=Math.max(1,pos-half), to=Math.min(total,pos+half), sh="";
  for(var p=from;p<=to;p++){
    var c1=seq[p-1], c2=complementBase(c1);
    sh+='<div class="stripcol'+(p===pos?" cur":"")+((state.motifSet[p])?" motif":"")+'" data-strip="'+p+'" title="Pair '+p+'">'
      +'<span class="st" style="background:'+baseColor(c1)+'">'+c1+'</span>'
      +'<span class="st" style="background:'+baseColor(c2)+'">'+c2+'</span>'
      +'<span class="sp">'+p+'</span></div>';
  }
  var strip=$("pairStrip"); strip.innerHTML=sh;
  Array.prototype.forEach.call(strip.querySelectorAll("[data-strip]"),function(el){
    el.addEventListener("click",function(){ selectPair(parseInt(el.getAttribute("data-strip"),10),"auto"); });
  });
  var cur=strip.querySelector(".stripcol.cur");
  if(cur) strip.scrollLeft = cur.offsetLeft - strip.clientWidth/2 + 16;
  drawGcMini();
}
function renderMiniStats(){
  var seq=state.seq, el=$("miniStats"), bb=$("baseBars");
  if(!seq){ el.innerHTML=""; bb.innerHTML=""; $("gcMini").innerHTML=""; return; }
  var c=baseCounts(seq), gc=gcPercent(seq);
  el.innerHTML=
    '<div class="ministat"><div class="k">Length</div><div class="v">'+fmt(seq.length)+'</div><div class="k">bp</div></div>'
    +'<div class="ministat"><div class="k">GC content</div><div class="v">'+pct(gc)+'</div><div class="k">G + C</div></div>'
    +'<div class="ministat"><div class="k">Helix turns</div><div class="v">'+(seq.length/10.5).toFixed(1)+'</div><div class="k">10.5 bp/turn</div></div>'
    +'<div class="ministat"><div class="k">Length</div><div class="v">'+fmt(Math.round(seq.length*0.34))+'</div><div class="k">nm</div></div>';
  bb.innerHTML=["A","T","G","C"].map(function(b){
    var col={A:"var(--a)",T:"var(--t)",G:"var(--g)",C:"var(--c)"}[b];
    return '<div class="basebar"><span class="bl" style="color:'+col+'">'+b+'</span><div class="bar"><i style="width:'+(c[b]/seq.length*100)+'%;background:'+col+'"></i></div><span class="bv">'+fmt(c[b])+" · "+pct(c[b]/seq.length*100)+"</span></div>";
  }).join("") + (c.other? '<p style="font-size:12px;color:var(--muted);margin:6px 0 0">Plus '+fmt(c.other)+' ambiguous base(s).</p>':"");
  drawGcMini();
}
function drawGcMini(){
  var el=$("gcMini"); if(!el) return;
  var seq=state.seq; if(!seq){ el.innerHTML=""; return; }
  var win=Math.max(25, Math.round(seq.length/100)), step=Math.max(5, Math.round(seq.length/140));
  var pts=gcWindows(seq, win, step);
  var W=520,H=110,pl=30,pr=6,pt=8,pb=16, iw=W-pl-pr, ih=H-pt-pb;
  function X(x){ return pl+(x-1)/Math.max(1,seq.length-1)*iw; }
  function Y(gv){ return pt+(100-gv)/100*ih; }
  var path=pts.map(function(p,i){ return (i===0?"M":"L")+X(p.mid).toFixed(1)+","+Y(p.gc).toFixed(1); }).join(" ");
  var selX=X(state.sel);
  el.innerHTML='<div class="cap" style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px">GC content along the sequence — click to jump</div>'
    +'<svg id="gcMiniSvg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="GC content mini chart">'
    +'<line x1="'+pl+'" y1="'+Y(50)+'" x2="'+(W-pr)+'" y2="'+Y(50)+'" stroke="var(--line)"/>'
    +'<text x="'+(pl-4)+'" y="'+(Y(100)+4)+'" text-anchor="end" font-size="9" fill="var(--muted)">100%</text>'
    +'<text x="'+(pl-4)+'" y="'+(Y(0)+4)+'" text-anchor="end" font-size="9" fill="var(--muted)">0%</text>'
    +'<path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="1.8"/>'
    +'<line x1="'+selX+'" y1="'+pt+'" x2="'+selX+'" y2="'+(pt+ih)+'" stroke="var(--sel)" stroke-width="2"/>'
    +'<text x="'+pl+'" y="'+(H-2)+'" font-size="9" fill="var(--muted)">1</text>'
    +'<text x="'+(W-pr)+'" y="'+(H-2)+'" text-anchor="end" font-size="9" fill="var(--muted)">'+fmt(seq.length)+'</text></svg>';
  var svg=$("gcMiniSvg");
  svg.addEventListener("click",function(e){
    var r=svg.getBoundingClientRect();
    var frac=((e.clientX-r.left)/r.width*W-pl)/iw;
    selectPair(Math.round(frac*(seq.length-1))+1,"center");
  });
}

/* ---------------- scanning ---------------- */
var scanTimer=null;
function setScanUI(){
  $("scanBtn").classList.toggle("on", state.scanning);
  $("scanBtnTxt").textContent=state.scanning? "PAUSE" : "SCANNING";
  $("playBtn").classList.toggle("on", state.scanning);
  $("playBtn").textContent=state.scanning? "⏸ Pause" : "▶ Scan";
}
function startScan(){
  var total=displaySeq().length; if(!total) return;
  if(state.sel>=total) selectPair(1,"center");
  state.scanning=true; state.lastTick=performance.now(); state.scanAcc=0;
  if(scanTimer) clearInterval(scanTimer);
  scanTimer=setInterval(scanStep, 40);
  setScanUI();
}
function stopScan(){
  state.scanning=false;
  if(scanTimer){ clearInterval(scanTimer); scanTimer=null; }
  setScanUI();
}
function toggleScan(){ state.scanning? stopScan() : startScan(); }
function scanStep(){
  var now=performance.now(), dt=(now-state.lastTick)/1000; state.lastTick=now;
  state.scanAcc += state.speed*dt;
  var steps=Math.floor(state.scanAcc);
  if(steps<1) return;
  state.scanAcc-=steps;
  var total=displaySeq().length;
  var next=state.sel+steps;
  if(next>total){ selectPair(total,"auto"); stopScan(); return; }
  selectPair(next,"auto");
}

/* ---------------- motif in helix ---------------- */
function applyMotif(scroll){
  var m=($("motifInputScanner").value||"").toUpperCase().replace(/\s/g,"");
  state.motif=m; state.motifSet={}; state.motifHits=[];
  if(m && displaySeq().length){
    state.motifHits=findMotif(displaySeq(), m, false);
    state.motifHits.forEach(function(p){ for(var k=0;k<m.length;k++) state.motifSet[p+k]=true; });
  }
  $("motifCount").textContent = m ? (state.motifHits.length? fmt(state.motifHits.length)+" match(es) — highlighted in the helix" : "No matches in this sequence") : "";
  $("motifPrev").disabled=$("motifNext").disabled=!state.motifHits.length;
  renderHelix(); updateDetails();
}
function motifJump(dir){
  if(!state.motifHits.length) return;
  var target=null, i;
  if(dir>0){ for(i=0;i<state.motifHits.length;i++){ if(state.motifHits[i]>state.sel){ target=state.motifHits[i]; break; } } if(target===null) target=state.motifHits[0]; }
  else { for(i=state.motifHits.length-1;i>=0;i--){ if(state.motifHits[i]<state.sel){ target=state.motifHits[i]; break; } } if(target===null) target=state.motifHits[state.motifHits.length-1]; }
  selectPair(target,"center");
}

/* ---------------- PNG snapshot ---------------- */
function downloadHelixPNG(){
  var seq=displaySeq(); if(!seq.length) return;
  var pos=state.sel, half=22;
  var from=Math.max(1,pos-half), to=Math.min(seq.length,pos+half), n=to-from+1;
  var W=720, rowPx=30, head=92, foot=54, H=head+n*rowPx+foot;
  var cv=document.createElement("canvas"); cv.width=W*2; cv.height=H*2;
  var ctx=cv.getContext("2d"); ctx.scale(2,2);
  var dark=document.documentElement.getAttribute("data-theme")!=="light";
  ctx.fillStyle=dark? "#0a1017" : "#ffffff"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=dark? "#e8f0f7" : "#12222f";
  ctx.font="800 21px system-ui, sans-serif"; ctx.fillText("DNA VIEWER — Double Helix", 28, 36);
  ctx.font="13px system-ui, sans-serif"; ctx.fillStyle=dark? "#8fa3b5" : "#54687a";
  ctx.fillText("File: "+state.fileName+"  ·  "+fmt(seq.length)+" bp  ·  pairs "+from+"–"+to+"  ·  selected pair "+pos, 28, 60);
  var cx=W/2+30, amp=105, ts=24;
  for(var p=from;p<=to;p++){
    var y=head+(p-from)*rowPx+rowPx/2;
    var th=(p-1)*(2*Math.PI/10.5), s=Math.sin(th), d=Math.cos(th);
    var x1=cx+s*amp, x2=cx-s*amp, b1=seq[p-1], b2=complementBase(b1);
    ctx.fillStyle=dark? "#5f7488" : "#8496a6"; ctx.font="11px ui-monospace, monospace"; ctx.textAlign="right";
    ctx.fillText(String(p), 78, y+4); ctx.textAlign="left";
    if(p===1||Math.floor((p-2)/10.5)!==Math.floor((p-1)/10.5)){
      ctx.fillStyle="#4aa3e8"; ctx.font="700 11px system-ui, sans-serif";
      ctx.fillText("Turn "+(Math.floor((p-1)/10.5)+1), 88, y+4);
    }
    ctx.strokeStyle=dark? "#2a4258" : "#b9cbd9"; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(Math.min(x1,x2),y); ctx.lineTo(Math.max(x1,x2),y); ctx.stroke(); ctx.setLineDash([]);
    [[x1,b1,d<0],[x2,b2,d>=0]].forEach(function(t){
      ctx.globalAlpha=t[2]?0.55:1;
      ctx.fillStyle=baseColor(t[1]);
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(t[0]-ts/2,y-ts/2,ts,ts,6); else ctx.rect(t[0]-ts/2,y-ts/2,ts,ts);
      ctx.fill(); ctx.globalAlpha=1;
      ctx.fillStyle="#fff"; ctx.font="800 14px ui-monospace, monospace"; ctx.textAlign="center";
      ctx.fillText(t[1], t[0], y+5); ctx.textAlign="left";
    });
    if(p===pos){
      ctx.strokeStyle="#ffd84d"; ctx.lineWidth=2.5;
      ctx.strokeRect(84, y-rowPx/2+2, W-110, rowPx-4); ctx.lineWidth=1;
    }
  }
  var b1=seq[pos-1], b2=complementBase(b1);
  ctx.fillStyle=dark? "#e8f0f7" : "#12222f"; ctx.font="700 14px system-ui, sans-serif";
  var bonds=("ACGT".indexOf(b1)>-1)? (("AT".indexOf(b1)>-1)? "2 hydrogen bonds (weaker)" : "3 hydrogen bonds (stronger)") : "ambiguous base";
  ctx.fillText("Pair "+pos+": "+baseName(b1)+" pairs with "+baseName(b2)+" — "+bonds, 28, H-22);
  cv.toBlob(function(blob){ if(blob) downloadFile("dna-helix-pair-"+pos+".png", blob); },"image/png");
}
