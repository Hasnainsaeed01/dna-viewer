"use strict";
/* ============================================================
   Tool views (Statistics, GC, Translation, ORF, Restriction,
   Motif, Comparison, Codon, Export, Tests)
   ============================================================ */
function buildTabs(){
  $("tabbar").innerHTML=TABS.map(function(t){
    return '<button type="button" class="tabbtn'+(state.view===t.id?" active":"")+'" data-tab="'+t.id+'">'+t.label+"</button>";
  }).join("");
  Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"),function(b){
    b.addEventListener("click",function(){ showView(b.getAttribute("data-tab")); });
  });
}
function showView(id){
  state.view=id;
  Array.prototype.forEach.call(document.querySelectorAll(".view"),function(v){ v.classList.toggle("active", v.id==="view-"+id); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"),function(b){ b.classList.toggle("active", b.getAttribute("data-tab")===id); });
  if(id==="scanner"){ renderHelix(true); updateDetails(); }
  if(id==="stats") renderStats();
  if(id==="gc") renderGC();
  if(id==="translation") renderTranslation();
  if(id==="orf") renderORFs();
  if(id==="restriction") renderRestriction();
  if(id==="bend") renderBend();
  if(id==="codon") renderCodon();
}
function statCard(k,v,d,barColor,barPct){
  return '<div class="stat-card"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div>'
    +(barColor?'<div class="bar"><i style="width:'+Math.min(100,barPct)+'%;background:'+barColor+'"></i></div>':"")+'</div>';
}
function buildToolViews(){
  var codeOptions=Object.keys(GENETIC_CODES).map(function(k){ return '<option value="'+k+'">'+esc(GENETIC_CODES[k].name)+'</option>'; }).join("");
  var enzymeChecks=ENZYMES.map(function(e){ return '<label class="chk"><input type="checkbox" class="enz-chk" value="'+e.name+'" checked> '+e.name+' <span class="mono" style="color:var(--muted)">'+e.site+'</span></label>'; }).join("");
  $("toolViews").innerHTML =
  '<section class="view scrollable" id="view-stats"><div class="wrap">'
  + '<h1>Sequence Statistics</h1><p class="sub">Base composition, GC/AT balance and dinucleotide frequencies for the loaded sequence (forward strand, as loaded).</p>'
  + '<div id="statsBody"></div></div></section>'

  + '<section class="view scrollable" id="view-gc"><div class="wrap">'
  + '<h1>GC Content Analysis</h1><p class="sub">Sliding-window GC percentage across the sequence. Hover the chart points to read each window. The mini version of this chart also sits beside the helix on the Scanner tab.</p>'
  + '<div class="card"><div class="row">'
  + '<label class="f" style="margin:0">Window size (bp) <input type="number" id="gcWin" value="100" min="5" max="5000" style="width:90px"></label>'
  + '<label class="f" style="margin:0">Step size (bp) <input type="number" id="gcStep" value="20" min="1" max="1000" style="width:90px"></label>'
  + '<button class="btn" id="gcRun" type="button">Recalculate</button>'
  + '<button class="btn secondary" id="gcSvgDl" type="button">Download chart (SVG)</button></div>'
  + '<div id="gcSummary" style="margin-top:12px"></div><div id="gcChart" style="margin-top:8px"></div>'
  + '<p style="color:var(--muted);font-size:13px">Windows above 60% GC are GC-rich; below 40% they are AT-rich, relative to typical bacterial and plasmid sequences.</p></div></div></section>'

  + '<section class="view scrollable" id="view-translation"><div class="wrap">'
  + '<h1>Translation &amp; Reverse Complement</h1><p class="sub">Six-frame translation with a selectable genetic code, plus the reverse complement with full IUPAC ambiguity support.</p>'
  + '<div class="card"><div class="row"><label class="f" style="margin:0">Genetic code <select id="codeSelect">'+codeOptions+'</select></label>'
  + '<button class="btn secondary" id="dlTransBtn" type="button">Download translation</button></div>'
  + '<p style="color:var(--muted);font-size:13px;margin:10px 0 0">Codons with ambiguous bases are resolved over all their IUPAC possibilities: if every possibility gives the same amino acid, that amino acid is shown; X appears only when the result is genuinely uncertain (for example GGN always gives Glycine, so it shows G).</p>'
  + '<div id="transPager" style="margin-top:12px"></div>'
  + '<div id="framesBody" style="margin-top:14px"></div></div>'
  + '<div class="card"><h2>Reverse complement</h2>'
  + '<div class="grid cols2"><div><h3>Original (5′ → 3′)</h3><div class="seqtext" id="origText"></div></div>'
  + '<div><h3>Reverse complement (5′ → 3′)</h3><div class="seqtext" id="rcText"></div></div></div>'
  + '<div class="row" style="margin-top:12px"><button class="btn secondary" id="copyRcBtn" type="button">Copy reverse complement</button>'
  + '<button class="btn secondary" id="dlRcBtn" type="button">Download as FASTA</button>'
  + '<button class="btn secondary" id="loadRcBtn" type="button">Load reverse complement as sequence</button>'
  + '<span id="rcMsg" style="font-size:13px;color:var(--good)"></span></div></div></div></section>'

  + '<section class="view scrollable" id="view-orf"><div class="wrap">'
  + '<h1>ORF Finder</h1><p class="sub">Open reading frames in all six reading frames: a start codon followed in frame by a stop codon (TAA, TAG, TGA). Bacteria also use GTG and TTG as alternative start codons — enable them below; when one is used, its first residue is translated as M (formyl-Met), as in real bacterial translation.</p>'
  + '<div class="note"><strong>Predicted, not proven.</strong> These are computational predictions. An ORF is not necessarily a functional gene: real genes also need promoter context, a ribosome binding site, and experimental evidence.</div>'
  + '<div class="card"><div class="row"><label class="f" style="margin:0">Minimum ORF length (nt) <input type="number" id="orfMin" value="90" min="30" step="30" style="width:90px"></label>'
  + '<label class="f" style="margin:0">Start codons <select id="orfStarts"><option value="atg">ATG only</option><option value="atg_alt">ATG + GTG + TTG (bacterial alternatives)</option></select></label>'
  + '<button class="btn" id="orfRun" type="button">Find ORFs</button><span id="orfCount" style="color:var(--muted);font-size:13.5px"></span></div>'
  + '<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>#</th><th>Start</th><th>End</th><th>Strand</th><th>Frame</th><th>Start codon</th><th>Length (nt)</th><th>Length (aa)</th><th>Stop</th><th>Protein (first 40 aa)</th></tr></thead><tbody id="orfTable"></tbody></table></div>'
  + '<p style="color:var(--muted);font-size:13px">Select an ORF row to jump to it in the Helix Scanner.</p>'
  + '<div class="row"><button class="btn secondary" id="dlOrfBtn" type="button">Download ORFs (CSV)</button>'
  + '<button class="btn secondary" id="copyProtBtn" type="button">Copy selected protein</button><span id="orfMsg" style="font-size:13px;color:var(--good)"></span></div>'
  + '</div></div></section>'

  + '<section class="view scrollable" id="view-restriction"><div class="wrap">'
  + '<h1>Restriction Map</h1><p class="sub">Recognition sites and cleavage positions for common enzymes, searched on both strands, with fragment sizes for a digest.</p>'
  + '<div class="card"><h3>Enzymes</h3><div>'+enzymeChecks+'</div>'
  + '<div class="row" style="margin-top:10px"><label class="chk"><input type="checkbox" id="circToggle"> Treat DNA as circular</label>'
  + '<button class="btn" id="enzRun" type="button">Analyze</button>'
  + '<button class="btn secondary" id="dlEnzBtn" type="button">Download sites (CSV)</button></div>'
  + '<div style="margin-top:16px"><h3>Enzyme reference — isoschizomers</h3><p style="color:var(--muted);font-size:13px;margin:0 0 8px">Isoschizomers recognise the same sequence and cut at the same position. A neoschizomer recognises the same sequence but cuts at a different position. Only verified relationships are listed.</p><div class="tablewrap"><table><thead><tr><th>Enzyme</th><th>Recognition site</th><th>Isoschizomers</th></tr></thead><tbody>'
  + ENZYMES.map(function(e){ return "<tr><td data-l='Enzyme'>"+e.name+"</td><td data-l='Site' class='mono'>"+e.site+"</td><td data-l='Isoschizomers'>"+esc(e.iso)+"</td></tr>"; }).join("")
  + '</tbody></table></div></div>'
  + '<div id="enzMap" style="margin-top:14px"></div>'
  + '<div class="grid cols2" style="margin-top:6px"><div><h3>Cut sites</h3><div class="tablewrap"><table><thead><tr><th>Enzyme</th><th>Site</th><th>Position</th><th>Strand</th><th>Cut after</th><th>Isoschizomers</th></tr></thead><tbody id="enzTable"></tbody></table></div></div>'
  + '<div><h3>Digest fragments</h3><div id="fragList"></div></div></div></div></div></section>'

  + '<section class="view scrollable" id="view-bend"><div class="wrap">'
  + '<h1>DNA Bendability</h1><p class="sub">Local bends in real DNA, detected from the sequence itself: A-tracts and bend-prone AT-rich regions.</p>'
  + '<div class="note"><strong>Why this panel exists:</strong> the Helix Scanner draws ideal B-DNA geometry — a regular twist of 10.5 bp per turn, the standard average. Real DNA bends locally: runs of four or more A (or T) bases in a row, called A-tracts, are stiff and intrinsically curved, and AT-rich regions bend and flex more easily. This panel finds those regions in your sequence; the helix view itself keeps the ideal geometry.</div>'
  + '<div class="card"><div class="row"><button class="btn" id="bendRun" type="button">Analyse bendability</button><span id="bendCount" style="color:var(--muted);font-size:13.5px"></span></div>'
  + '<div id="bendSeq" style="margin-top:14px"></div>'
  + '<h3 style="margin-top:18px">A-tracts (4+ consecutive A or T bases)</h3><div class="tablewrap"><table><thead><tr><th>Type</th><th>Start</th><th>End</th><th>Length</th><th>Sequence</th><th></th></tr></thead><tbody id="bendTable"></tbody></table></div>'
  + '<h3 style="margin-top:18px">Other bend-prone regions (50 bp windows with ≥70% A+T)</h3><div id="bendWindows"></div></div></div></section>'

  + '<section class="view scrollable" id="view-motif"><div class="wrap">'
  + '<h1>Motif Search</h1><p class="sub">Search one motif per line. IUPAC ambiguity codes are supported (R = A/G, Y = C/T, N = any base). Overlapping matches are reported, and matches are also highlighted inside the Helix Scanner.</p>'
  + '<div class="card"><div class="field"><label class="f" for="motifInput">Motifs</label>'
  + '<textarea class="seqin" id="motifInput" style="min-height:84px" spellcheck="false">TATAAA\nGAATTC</textarea></div>'
  + '<div class="row"><button class="btn" id="motifRun" type="button">Search motifs</button>'
  + '<label class="chk"><input type="checkbox" id="motifCirc"> Circular DNA (wrap-around matches)</label>'
  + '<button class="btn secondary" id="dlMotifBtn" type="button">Download results (CSV)</button></div>'
  + '<div id="motifSummary" style="margin-top:12px"></div>'
  + '<div class="tablewrap"><table><thead><tr><th>Motif</th><th>Position</th><th>Matched sequence</th><th></th></tr></thead><tbody id="motifTable"></tbody></table></div></div></div></section>'

  + '<section class="view scrollable" id="view-compare"><div class="wrap">'
  + '<h1>Sequence Comparison</h1><p class="sub">Needleman–Wunsch global alignment of the loaded sequence (Sequence A) against a second sequence: gaps are inserted so similar regions line up even when bases were inserted or deleted. Scoring: match +1, mismatch −1, gap −2. Alignment is capped at 5,000 bp per sequence. The original position-by-position overlay is still available as a secondary view.</p>'
  + '<div class="card"><div class="field"><label class="f" for="seqB">Sequence B (raw or FASTA)</label>'
  + '<textarea class="seqin" id="seqB" spellcheck="false" placeholder="Paste the second sequence…"></textarea></div>'
  + '<div class="row"><label class="f" style="margin:0">Method <select id="cmpMode"><option value="nw">Needleman–Wunsch global alignment</option><option value="overlay">Position-by-position overlay (original view)</option></select></label>'
  + '<button class="btn" id="cmpRun" type="button">Compare</button></div>'
  + '<div id="cmpResult" style="margin-top:14px"></div></div></div></section>'

  + '<section class="view scrollable" id="view-codon"><div class="wrap">'
  + '<h1>Codon Usage &amp; Composition</h1><p class="sub">Codon frequencies and relative synonymous codon usage (RSCU) for the chosen forward reading frame, plus dinucleotide composition.</p>'
  + '<div class="card"><div class="row"><label class="f" style="margin:0">Reading frame <select id="codonFrame"><option value="0">Frame +1</option><option value="1">Frame +2</option><option value="2">Frame +3</option></select></label>'
  + '<button class="btn" id="codonRun" type="button">Recalculate</button>'
  + '<button class="btn secondary" id="dlCodonBtn" type="button">Download codon table (CSV)</button></div>'
  + '<div id="codonBody" style="margin-top:14px"></div></div></div></section>'

  + '<section class="view scrollable" id="view-export"><div class="wrap">'
  + '<h1>Export Results</h1><p class="sub">Download the current sequence and any analysis results as files. Run an analysis first so its export has content. The Helix Scanner panel also has one-click FASTA, statistics CSV and PNG snapshot buttons.</p>'
  + '<div class="card"><div class="grid cols2" id="exportBtns"></div>'
  + '<p style="color:var(--muted);font-size:13px" id="exportMsg"></p></div>'
  + '<div class="card"><h2>Using this page on GitHub Pages</h2><p style="color:var(--muted);font-size:14px;margin:0">This app is one self-contained HTML file with no external dependencies. Save it as <span class="mono">index.html</span>, push it to a GitHub repository, and enable Pages (Settings → Pages → deploy from branch) — it works exactly as it does here, including offline after the first load.</p></div></div></section>'

  + '<section class="view scrollable" id="view-tests"><div class="wrap">'
  + '<h1>Tests &amp; Information</h1><p class="sub">Built-in validation tests for the biological algorithms, plus known limitations.</p>'
  + '<div class="card"><h2>Algorithm self-tests</h2><p style="color:var(--muted)">These tests run the real analysis functions on sequences with known answers.</p>'
  + '<button class="btn" id="testRun" type="button">Run tests</button><div id="testResults" style="margin-top:12px"></div></div>'
  + '<div class="card"><h2>Limitations</h2><ul style="margin:0;padding-left:20px;color:var(--muted);font-size:14px">'
  + '<li>Sequence comparison uses Needleman–Wunsch global alignment (match +1, mismatch −1, gap −2), capped at 5,000 bp per sequence; longer inputs are refused with an on-screen message. It is a pairwise global alignment, not BLAST: it does not search a database or find local matches. The position-by-position overlay remains available as a secondary view.</li>'
  + '<li>ORF finding uses ATG by default; the start-codon setting also enables the bacterial alternative starts GTG and TTG, whose first residue is shown as M (formyl-Met). Other rare start codons are not searched.</li>'
  + '<li>The helix view is virtualized: only the pairs on screen are drawn, so 20,000+ bp sequences stay smooth.</li>'
  + '<li>Groove labels and the twist in the helix view follow ideal B-DNA geometry (10.5 bp per turn). Real DNA bends and varies locally — the Bendability tab detects A-tracts and bend-prone AT-rich regions in the sequence, but the helix drawing itself keeps the ideal geometry.</li>'
  + '<li>Restriction cut positions follow each enzyme\'s standard top-strand cleavage offset. Verified isoschizomers (and neoschizomers, labelled as such) are listed in the Restriction Map enzyme table.</li>'
  + '<li>Codons containing ambiguous bases are resolved over all IUPAC possibilities and show the amino acid when every possibility agrees; X is shown only when the result is genuinely uncertain.</li>'
  + '<li>Long translations are shown in paginated 600 bp blocks with previous/next navigation and a show-all option, so the full translation can be viewed on screen; the downloadable translation covers the full sequence.</li></ul></div></div></section>';
}
/* ---------- statistics ---------- */
function renderStats(){
  var el=$("statsBody"); if(!el) return;
  var seq=state.seq;
  if(!seq){ el.innerHTML='<div class="card">No sequence loaded yet.</div>'; return; }
  var c=baseCounts(seq), len=seq.length, gc=(c.G+c.C)/len*100, at=(c.A+c.T)/len*100;
  var cards='<div class="grid cols4">'
    + statCard("Total length", fmt(len)+" bp", "bases in current record")
    + statCard("GC content", pct(gc), "G + C fraction", "var(--accent)", gc)
    + statCard("AT content", pct(at), "A + T fraction", "var(--t)", at)
    + statCard("GC / AT ratio", at>0?((c.G+c.C)/(c.A+c.T)).toFixed(3):"—", "ambiguous bases: "+fmt(c.other))
    + "</div>";
  var rows=["A","T","G","C"].map(function(b){
    var col={A:"var(--a)",T:"var(--t)",G:"var(--g)",C:"var(--c)"}[b];
    return statCard("Base "+b, fmt(c[b]), pct(c[b]/len*100)+" of sequence", col, c[b]/len*100);
  }).join("");
  var total=len, acc=0, segs="";
  [["A",c.A,"#22b573"],["T",c.T,"#e5484d"],["G",c.G,"#f08c1e"],["C",c.C,"#2f7fe0"],["Other",c.other,"#8b98a5"]].forEach(function(s){
    if(!s[1]) return;
    var frac=s[1]/total, a0=acc*2*Math.PI-Math.PI/2; acc+=frac; var a1=acc*2*Math.PI-Math.PI/2;
    var large=frac>0.5?1:0, r=52, cx=70, cy=70;
    segs+='<path d="M'+cx+','+cy+' L'+(cx+r*Math.cos(a0)).toFixed(1)+','+(cy+r*Math.sin(a0)).toFixed(1)+' A'+r+','+r+' 0 '+large+' 1 '+(cx+r*Math.cos(a1)).toFixed(1)+','+(cy+r*Math.sin(a1)).toFixed(1)+' Z" fill="'+s[2]+'"><title>'+s[0]+": "+fmt(s[1])+" ("+pct(frac*100)+")</title></path>";
  });
  var donut='<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Nucleotide composition chart">'+segs+'<circle cx="70" cy="70" r="26" fill="var(--panel)"></circle><text x="70" y="75" text-anchor="middle" font-size="12" fill="var(--muted)">'+fmt(len)+' bp</text></svg>';
  var di=dinucleotideFreq(seq);
  var diRows=Object.keys(di.counts).sort(function(a,b){return di.counts[b]-di.counts[a];}).slice(0,10).map(function(d){
    return "<tr><td data-l='Dinucleotide' class='mono'>"+d+"</td><td data-l='Count'>"+fmt(di.counts[d])+"</td><td data-l='Frequency'>"+pct(di.counts[d]/di.total*100)+"</td></tr>";
  }).join("");
  el.innerHTML=cards
    +'<div class="grid cols4">'+rows+'</div>'
    +'<div class="grid cols2"><div class="card"><h2>Composition</h2><div class="row" style="align-items:flex-start;gap:22px">'+donut+'<div><p style="margin:4px 0"><span class="pill">A '+pct(c.A/len*100)+'</span> <span class="pill">T '+pct(c.T/len*100)+'</span></p><p style="margin:4px 0"><span class="pill">G '+pct(c.G/len*100)+'</span> <span class="pill">C '+pct(c.C/len*100)+'</span></p><p style="margin:4px 0"><span class="pill">Ambiguous '+fmt(c.other)+' ('+pct(c.other/len*100)+')</span></p><p style="color:var(--muted);font-size:13px">Percentages are of total length, including ambiguous bases.</p></div></div></div>'
    +'<div class="card"><h2>Top dinucleotides</h2><div class="tablewrap"><table><thead><tr><th>Dinucleotide</th><th>Count</th><th>Frequency</th></tr></thead><tbody>'+diRows+'</tbody></table></div></div></div>';
}
/* ---------- GC chart ---------- */
function renderGC(){
  var chart=$("gcChart"), sum=$("gcSummary"); if(!chart) return;
  var seq=state.seq;
  if(!seq){ chart.innerHTML='<p style="color:var(--muted)">No sequence loaded yet.</p>'; sum.innerHTML=""; state.lastGC=[]; return; }
  var win=Math.max(5, parseInt($("gcWin").value,10)||100), step=Math.max(1, parseInt($("gcStep").value,10)||20);
  var pts=gcWindows(seq, win, step); state.lastGC=pts;
  var mean=gcPercent(seq);
  var maxP=pts.reduce(function(m,p){return p.gc>m.gc?p:m;},pts[0]), minP=pts.reduce(function(m,p){return p.gc<m.gc?p:m;},pts[0]);
  sum.innerHTML='<span class="pill">Overall GC '+pct(mean)+'</span> <span class="pill">Windows: '+pts.length+'</span> <span class="pill">Highest: '+pct(maxP.gc)+' at '+fmt(maxP.start)+'–'+fmt(maxP.end)+'</span> <span class="pill">Lowest: '+pct(minP.gc)+' at '+fmt(minP.start)+'–'+fmt(minP.end)+'</span>';
  var W=860,H=240,pl=44,pr=10,pt=12,pb=28, iw=W-pl-pr, ih=H-pt-pb;
  var maxX=Math.max(seq.length, win);
  function X(x){ return pl + (x-1)/Math.max(1,maxX-1)*iw; }
  function Y(gv){ return pt + (100-gv)/100*ih; }
  var path=pts.map(function(p,i){ return (i===0?"M":"L")+X(p.mid).toFixed(1)+","+Y(p.gc).toFixed(1); }).join(" ");
  var dots=pts.map(function(p){ return '<circle cx="'+X(p.mid).toFixed(1)+'" cy="'+Y(p.gc).toFixed(1)+'" r="3" fill="var(--accent)"><title>Position '+fmt(p.start)+'–'+fmt(p.end)+': GC '+pct(p.gc)+'</title></circle>'; }).join("");
  var grid="";
  [0,25,50,75,100].forEach(function(gv){ grid+='<line x1="'+pl+'" y1="'+Y(gv)+'" x2="'+(W-pr)+'" y2="'+Y(gv)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(gv)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+gv+'%</text>'; });
  chart.innerHTML='<svg id="gcSvg" viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" role="img" aria-label="GC content chart">'+grid
    +'<line x1="'+pl+'" y1="'+Y(60)+'" x2="'+(W-pr)+'" y2="'+Y(60)+'" stroke="#f08c1e" stroke-dasharray="4 4"/><line x1="'+pl+'" y1="'+Y(40)+'" x2="'+(W-pr)+'" y2="'+Y(40)+'" stroke="#e5484d" stroke-dasharray="4 4"/>'
    +'<line x1="'+pl+'" y1="'+Y(mean)+'" x2="'+(W-pr)+'" y2="'+Y(mean)+'" stroke="var(--accent2)" stroke-width="1.5"/>'
    +'<path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="2"/>'+dots
    +'<text x="'+(pl+iw/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" fill="var(--muted)">Position (bp) — window '+win+' bp, step '+step+' bp</text></svg>';
}
/* ---------- translation ---------- */
function renderTranslation(){
  var body=$("framesBody"), pager=$("transPager"); if(!body) return;
  var seq=state.seq;
  if(!seq){ body.innerHTML='<p style="color:var(--muted)">No sequence loaded yet.</p>'; if(pager) pager.innerHTML=""; $("origText").textContent=""; $("rcText").textContent=""; return; }
  var table=codonTableFor(state.code);
  var rcFull=reverseComplement(seq);
  var pages=transPageCount(seq.length);
  if(state.transPage>pages-1) state.transPage=pages-1;
  if(state.transPage<0) state.transPage=0;
  function framesFor(slice, base){
    /* reverse frames are taken from the matching window of the full RC sequence */
    var rcWin=rcFull.slice(Math.max(0, seq.length-(base+slice.length)), Math.max(0, seq.length-(base+slice.length))+slice.length);
    return [
      {label:"Frame +1", s:slice, off:0, base:base},{label:"Frame +2", s:slice, off:1, base:base},{label:"Frame +3", s:slice, off:2, base:base},
      {label:"Frame −1 (reverse strand)", s:rcWin, off:0, base:base},{label:"Frame −2 (reverse strand)", s:rcWin, off:1, base:base},{label:"Frame −3 (reverse strand)", s:rcWin, off:2, base:base}
    ];
  }
  function blockHtml(pageIdx){
    var start=pageIdx*600, slice=seq.slice(start, start+600);
    return '<h3 style="margin:16px 0 8px">Block '+(pageIdx+1)+' of '+pages+' — nt '+fmt(start+1)+'–'+fmt(start+slice.length)+' of '+fmt(seq.length)+'</h3>'
      + framesFor(slice, start).map(function(f){
        var aa=translateFrame(f.s, f.off, table);
        var html=aa.split("").map(function(ch){
          var cls= ch==="M"?"aa start":(ch==="*"?"aa stop":"aa");
          return '<span class="'+cls+'">'+ch+'</span>';
        }).join("");
        return '<div class="frameblock"><div class="fh">'+f.label+' <span style="color:var(--muted);font-weight:400">· nt '+(f.base+f.off+1)+'–'+(f.base+f.off+aa.length*3)+' · '+aa.length+' residues · M highlighted, * = stop</span></div><div class="aaseq">'+html+'</div></div>';
      }).join("");
  }
  if(pager){
    if(state.transShowAll){
      pager.innerHTML='<div class="row"><span class="pill">Showing all '+pages+' block(s) — the full translation</span><button class="btn secondary small" id="transPagedBtn" type="button">Back to paged view</button></div>';
    } else {
      pager.innerHTML='<div class="row"><button class="btn secondary small" id="transPrevBtn" type="button"'+(state.transPage===0?" disabled":"")+'>← Previous block</button>'
        +'<span class="pill">Block '+(state.transPage+1)+' of '+pages+' · 600 bp per block</span>'
        +'<button class="btn secondary small" id="transNextBtn" type="button"'+(state.transPage>=pages-1?" disabled":"")+'>Next block →</button>'
        +(pages>1? '<button class="btn secondary small" id="transMoreBtn" type="button">Show more — display all blocks</button>' : "")
        +'</div>';
    }
    var pv=$("transPrevBtn"), nx=$("transNextBtn"), mr=$("transMoreBtn"), pg=$("transPagedBtn");
    if(pv) pv.addEventListener("click", function(){ state.transPage--; renderTranslation(); });
    if(nx) nx.addEventListener("click", function(){ state.transPage++; renderTranslation(); });
    if(mr) mr.addEventListener("click", function(){ state.transShowAll=true; renderTranslation(); });
    if(pg) pg.addEventListener("click", function(){ state.transShowAll=false; renderTranslation(); });
  }
  if(state.transShowAll){
    var all="";
    for(var p=0;p<pages;p++) all+=blockHtml(p);
    body.innerHTML=all;
  } else {
    body.innerHTML=blockHtml(state.transPage);
  }
  $("origText").textContent=seq;
  $("rcText").textContent=rcFull;
}
function translationText(){
  var table=codonTableFor(state.code), rc=reverseComplement(state.seq), out="";
  [["+1",state.seq,0],["+2",state.seq,1],["+3",state.seq,2],["-1",rc,0],["-2",rc,1],["-3",rc,2]].forEach(function(f){
    out+="Frame "+f[0]+"\n"+translateFrame(f[1],f[2],table)+"\n\n";
  });
  return out;
}
/* ---------- ORF ---------- */
var selectedORF=null;
function renderORFs(){
  var tb=$("orfTable"); if(!tb) return;
  if(!state.seq){ tb.innerHTML='<tr><td colspan="10">No sequence loaded yet.</td></tr>'; $("orfCount").textContent=""; state.lastORFs=[]; return; }
  var minNt=Math.max(30, parseInt($("orfMin").value,10)||90);
  var startMode=($("orfStarts") && $("orfStarts").value) || "atg";
  var orfs=findORFs(state.seq, minNt, state.code, startMode);
  state.lastORFs=orfs; selectedORF=null;
  $("orfCount").textContent=orfs.length+" predicted ORF(s) found (minimum "+minNt+" nt, start codons: "+(startMode==="atg_alt"?"ATG + GTG + TTG":"ATG only")+").";
  tb.innerHTML= orfs.length? orfs.map(function(o,i){
    return '<tr class="clickable" data-orf="'+i+'"><td data-l="#">'+(i+1)+'</td><td data-l="Start">'+fmt(o.start)+'</td><td data-l="End">'+fmt(o.end)+'</td><td data-l="Strand">'+o.strand+'</td><td data-l="Frame">'+o.strand+o.frame+'</td><td data-l="Start codon" class="mono">'+o.startCodon+'</td><td data-l="Length nt">'+fmt(o.lengthNt)+'</td><td data-l="Length aa">'+o.lengthAa+'</td><td data-l="Stop" class="mono">'+o.stopCodon+'</td><td data-l="Protein" class="mono">'+esc(o.protein.slice(0,40))+(o.protein.length>40?"…":"")+'</td></tr>';
  }).join("") : '<tr><td colspan="10">No ORFs of at least '+minNt+' nt found. Try a lower minimum length.</td></tr>';
  Array.prototype.forEach.call(tb.querySelectorAll("[data-orf]"),function(tr){
    tr.addEventListener("click",function(){
      var o=orfs[parseInt(tr.getAttribute("data-orf"),10)];
      selectedORF=o;
      $("orfMsg").textContent="ORF "+o.start+"–"+o.end+" — opening in the Helix Scanner.";
      state.rc = (o.strand==="-");
      $("rcToggle").checked=state.rc;
      applyMotif(false);
      showView("scanner");
      selectPair(o.start,"center");
    });
  });
}
/* ---------- restriction ---------- */
function renderRestriction(){
  var tb=$("enzTable"), map=$("enzMap"), frag=$("fragList"); if(!tb) return;
  if(!state.seq){ tb.innerHTML='<tr><td colspan="6">No sequence loaded yet.</td></tr>'; map.innerHTML=""; frag.innerHTML=""; state.lastSites=[]; return; }
  var names=Array.prototype.map.call(document.querySelectorAll(".enz-chk:checked"),function(c){return c.value;});
  var circular=$("circToggle").checked;
  var sites=findRestrictionSites(state.seq, names, circular);
  state.lastSites=sites;
  var isoByName={}; ENZYMES.forEach(function(e){ isoByName[e.name]=e.iso; });
  tb.innerHTML= sites.length? sites.map(function(s){
    return "<tr><td data-l='Enzyme'>"+s.enzyme+"</td><td data-l='Site' class='mono'>"+s.site+"</td><td data-l='Position'>"+fmt(s.pos)+"</td><td data-l='Strand'>"+s.strand+"</td><td data-l='Cut after'>"+fmt(s.cutPos)+"</td><td data-l='Isoschizomers'>"+esc(isoByName[s.enzyme]||"none known")+"</td></tr>";
  }).join("") : '<tr><td colspan="6">No sites for the selected enzymes in this sequence.</td></tr>';
  var frags=restrictionFragments(state.seq.length, sites, circular);
  frag.innerHTML='<p style="margin-top:0">'+(circular?"Circular":"Linear")+' digest with '+sites.length+' cut(s) → <strong>'+frags.length+' fragment(s)</strong></p>'
    + frags.map(function(f,i){ return '<span class="pill">Fragment '+(i+1)+': '+fmt(f)+' bp</span>'; }).join("");
  var L=state.seq.length, W=880, midY=54;
  if(circular){
    var cx=W/2, cy=110, r=72, marks=sites.map(function(s){
      var a=(s.pos-1)/L*2*Math.PI-Math.PI/2;
      return '<line x1="'+(cx+r*Math.cos(a)).toFixed(1)+'" y1="'+(cy+r*Math.sin(a)).toFixed(1)+'" x2="'+(cx+(r+13)*Math.cos(a)).toFixed(1)+'" y2="'+(cy+(r+13)*Math.sin(a)).toFixed(1)+'" stroke="var(--accent2)" stroke-width="2"/><text x="'+(cx+(r+30)*Math.cos(a)).toFixed(1)+'" y="'+(cy+(r+30)*Math.sin(a)+3).toFixed(1)+'" text-anchor="middle" font-size="10.5" fill="var(--ink)">'+s.enzyme+'</text>';
    }).join("");
    map.innerHTML='<svg viewBox="0 0 '+W+' 230" style="width:100%;height:auto" role="img" aria-label="Circular restriction map"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--accent)" stroke-width="3"/>'+marks+'<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" font-size="12" fill="var(--muted)">'+fmt(L)+' bp · circular</text></svg>';
  } else {
    var ticks=sites.map(function(s,idx){
      var x=40+(s.pos-1)/Math.max(1,L-1)*(W-80);
      var ly = idx%2===0 ? midY-24 : midY-42;
      var py = idx%2===0 ? midY+32 : midY+48;
      return '<line x1="'+x.toFixed(1)+'" y1="'+(midY-16)+'" x2="'+x.toFixed(1)+'" y2="'+(midY+16)+'" stroke="var(--accent2)" stroke-width="2"/><text x="'+x.toFixed(1)+'" y="'+ly+'" text-anchor="middle" font-size="10.5" fill="var(--ink)">'+s.enzyme+'</text><text x="'+x.toFixed(1)+'" y="'+py+'" text-anchor="middle" font-size="10" fill="var(--muted)">'+fmt(s.pos)+'</text>';
    }).join("");
    map.innerHTML='<svg viewBox="0 0 '+W+' 110" style="width:100%;height:auto" role="img" aria-label="Linear restriction map"><line x1="40" y1="'+midY+'" x2="'+(W-40)+'" y2="'+midY+'" stroke="var(--accent)" stroke-width="3"/>'+ticks+'<text x="40" y="'+(midY+48)+'" font-size="10" fill="var(--muted)">1</text><text x="'+(W-40)+'" y="'+(midY+48)+'" text-anchor="end" font-size="10" fill="var(--muted)">'+fmt(L)+'</text></svg>';
  }
}
/* ---------- motif tab ---------- */
function renderMotifTab(){
  var tb=$("motifTable"), sum=$("motifSummary"); if(!tb) return;
  var motifs=$("motifInput").value.split(/\r?\n/).map(function(m){return m.trim().toUpperCase();}).filter(Boolean);
  var circular=$("motifCirc").checked;
  state.lastMotifs=[];
  if(!state.seq){ tb.innerHTML='<tr><td colspan="4">No sequence loaded yet.</td></tr>'; sum.innerHTML=""; return; }
  if(!motifs.length){ tb.innerHTML='<tr><td colspan="4">Enter at least one motif.</td></tr>'; sum.innerHTML=""; return; }
  var rows="";
  motifs.forEach(function(m){
    findMotif(state.seq, m, circular).forEach(function(p){
      var matched=state.seq.slice(p-1,p-1+m.length);
      if(matched.length<m.length) matched=(state.seq+state.seq).slice(p-1,p-1+m.length);
      state.lastMotifs.push({motif:m, pos:p, matched:matched});
      rows+="<tr><td data-l='Motif' class='mono'>"+esc(m)+"</td><td data-l='Position'>"+fmt(p)+"</td><td data-l='Matched' class='mono'>"+esc(matched)+"</td><td><button type='button' class='btn secondary small' data-jump='"+p+"' data-m='"+esc(m)+"'>View in helix</button></td></tr>";
    });
  });
  var counts={}; state.lastMotifs.forEach(function(h){ counts[h.motif]=(counts[h.motif]||0)+1; });
  sum.innerHTML=Object.keys(counts).map(function(m){ return '<span class="pill mono">'+esc(m)+': '+counts[m]+' match(es)</span>'; }).join("") || '<span class="pill">No matches</span>';
  tb.innerHTML= rows || '<tr><td colspan="4">No matches found.</td></tr>';
  Array.prototype.forEach.call(tb.querySelectorAll("[data-jump]"),function(b){
    b.addEventListener("click",function(){
      $("motifInputScanner").value=b.getAttribute("data-m");
      state.rc=false; $("rcToggle").checked=false;
      applyMotif(false);
      showView("scanner");
      selectPair(parseInt(b.getAttribute("data-jump"),10),"center");
    });
  });
}
/* ---------- compare ---------- */
function renderCompare(){
  var out=$("cmpResult"); if(!out) return;
  var raw=$("seqB").value, bSeq="";
  if(raw.trim().charAt(0)===">"){ var recs=parseFASTA(raw); bSeq=recs.length?recs[0].seq:""; }
  else bSeq=cleanSequence(raw);
  var a=state.seq;
  if(!a){ out.innerHTML='<p style="color:var(--bad)">Load Sequence A on the Scanner tab first.</p>'; return; }
  if(!bSeq){ out.innerHTML='<p style="color:var(--bad)">Paste Sequence B above.</p>'; return; }
  var mode=($("cmpMode") && $("cmpMode").value) || "nw";
  if(mode==="overlay"){
    var n=Math.min(a.length,bSeq.length), matches=0, i;
    for(i=0;i<n;i++) if(a[i]===bSeq[i]) matches++;
    var ident=n? matches/n*100:0;
    var blocks="", shown=Math.min(n,6000);
    for(var s=0;s<shown;s+=60){
      var aLine="", bLine="";
      for(var j=s;j<Math.min(shown,s+60);j++){
        if(a[j]===bSeq[j]){ aLine+='<span class="diff-ok">'+a[j]+'</span>'; bLine+='<span class="diff-ok">'+bSeq[j]+'</span>'; }
        else { aLine+='<span class="diff-mis">'+a[j]+'</span>'; bLine+='<span class="diff-mis">'+bSeq[j]+'</span>'; }
      }
      blocks+='<div class="seqtext" style="margin-bottom:8px"><strong>'+(s+1)+'</strong> A '+aLine+'<br><span style="visibility:hidden"><strong>'+(s+1)+'</strong></span> B '+bLine+'</div>';
    }
    out.innerHTML='<div class="row"><span class="pill">Mode: position-by-position overlay</span><span class="pill">Compared length: '+fmt(n)+' bp</span><span class="pill">Matches: '+fmt(matches)+'</span><span class="pill">Mismatches: '+fmt(n-matches)+'</span><span class="pill"><strong>Identity: '+pct(ident)+'</strong></span><span class="pill">A length '+fmt(a.length)+' · B length '+fmt(bSeq.length)+'</span></div>'
      +'<p style="color:var(--muted);font-size:13px">Compared over the shorter length; extra bases in the longer sequence are not scored. Mismatched positions are highlighted.'+(n>shown?' Showing the first 6,000 compared bases.':'')+'</p>'+blocks;
    return;
  }
  /* Needleman–Wunsch (default) */
  if(a.length>NW_MAX || bSeq.length>NW_MAX){
    out.innerHTML='<div class="msg err" style="display:block">Needleman–Wunsch alignment is capped at 5,000 bp per sequence to keep the browser responsive. Sequence A is '+fmt(a.length)+' bp and Sequence B is '+fmt(bSeq.length)+' bp — trim the longer sequence to 5,000 bp or less, or switch to the position-by-position overlay view.</div>';
    return;
  }
  out.innerHTML='<p style="color:var(--muted)">Aligning…</p>';
  setTimeout(function(){
    var al=needlemanWunsch(a, bSeq);
    var blocks="";
    for(var s=0;s<al.length;s+=60){
      var aLine="", bLine="", mid="";
      for(var j=s;j<Math.min(al.length,s+60);j++){
        var ca=al.alignedA[j], cb=al.alignedB[j];
        var same = ca!=="-" && cb!=="-" && ca===cb;
        var cls = same? "diff-ok":"diff-mis";
        aLine+='<span class="'+cls+'">'+ca+'</span>';
        bLine+='<span class="'+cls+'">'+cb+'</span>';
        mid+= same? "|" : (ca==="-"||cb==="-" ? " " : "·");
      }
      blocks+='<div class="seqtext" style="margin-bottom:8px"><strong>'+(s+1)+'</strong> A '+aLine+'<br><span style="visibility:hidden"><strong>'+(s+1)+'</strong></span> &nbsp; '+esc(mid)+'<br><span style="visibility:hidden"><strong>'+(s+1)+'</strong></span> B '+bLine+'</div>';
    }
    out.innerHTML='<div class="row"><span class="pill">Mode: Needleman–Wunsch global alignment</span><span class="pill">Alignment length: '+fmt(al.length)+'</span><span class="pill">Matches: '+fmt(al.matches)+'</span><span class="pill">Mismatches: '+fmt(al.mismatches)+'</span><span class="pill">Gap columns: '+fmt(al.gaps)+'</span><span class="pill"><strong>Identity: '+pct(al.identity)+'</strong></span><span class="pill">Score: '+al.score+' (match +1, mismatch −1, gap −2)</span><span class="pill">A length '+fmt(a.length)+' · B length '+fmt(bSeq.length)+'</span></div>'
      +'<p style="color:var(--muted);font-size:13px">“–” is a gap inserted by the alignment. Percent identity = matches ÷ alignment length. Mismatched and gapped positions are highlighted.</p>'+blocks;
  }, 30);
}
/* ---------- bendability ---------- */
function renderBend(){
  var tb=$("bendTable"), seqEl=$("bendSeq"), winEl=$("bendWindows"), cnt=$("bendCount");
  if(!tb) return;
  if(!state.seq){ tb.innerHTML='<tr><td colspan="6">No sequence loaded yet.</td></tr>'; seqEl.innerHTML=""; winEl.innerHTML=""; if(cnt) cnt.textContent=""; return; }
  var seq=state.seq;
  var tracts=findATracts(seq), windows=findBendWindows(seq);
  if(cnt) cnt.textContent=tracts.length+" A-tract(s) and "+windows.length+" bend-prone AT-rich window(s) found.";
  var inTract={};
  tracts.forEach(function(tr){ for(var k=tr.start;k<=tr.end;k++) inTract[k]=true; });
  var html="";
  for(var s=0;s<seq.length;s+=60){
    var line="";
    for(var j=s;j<Math.min(seq.length,s+60);j++){
      line+= inTract[j+1] ? '<span class="bend-hl">'+seq[j]+'</span>' : seq[j];
    }
    html+='<div><span style="color:var(--muted)">'+(s+1)+'</span> '+line+'</div>';
    if(html.length>220000) break; /* keep very long sequences responsive; table below stays complete */
  }
  seqEl.innerHTML='<h3>Sequence with A-tracts highlighted</h3><div class="seqtext">'+html+'</div>'
    +(seq.length>3600? '<p style="color:var(--muted);font-size:13px">Highlight view shows the first part of the sequence; the A-tract table below covers the full sequence.</p>':"");
  tb.innerHTML= tracts.length? tracts.map(function(tr){
    return "<tr><td data-l='Type'>"+tr.type+"</td><td data-l='Start'>"+fmt(tr.start)+"</td><td data-l='End'>"+fmt(tr.end)+"</td><td data-l='Length'>"+tr.length+"</td><td data-l='Sequence' class='mono'>"+esc(tr.seq)+"</td><td><button type='button' class='btn secondary small' data-bendjump='"+tr.start+"'>View in helix</button></td></tr>";
  }).join("") : '<tr><td colspan="6">No A-tracts (4+ consecutive A or T bases) in this sequence.</td></tr>';
  Array.prototype.forEach.call(tb.querySelectorAll("[data-bendjump]"),function(b){
    b.addEventListener("click",function(){ state.rc=false; $("rcToggle").checked=false; showView("scanner"); selectPair(parseInt(b.getAttribute("data-bendjump"),10),"center"); });
  });
  winEl.innerHTML= windows.length? windows.map(function(w){ return '<span class="pill">'+fmt(w.start)+'–'+fmt(w.end)+': '+pct(w.atPct)+' A+T</span>'; }).join("") : '<p style="color:var(--muted);margin:0">No 50 bp window reaches 70% A+T.</p>';
}
/* ---------- codon ---------- */
var lastCodonCSV="";
function renderCodon(){
  var el=$("codonBody"); if(!el) return;
  if(!state.seq){ el.innerHTML='<p style="color:var(--muted)">No sequence loaded yet.</p>'; return; }
  var frame=parseInt($("codonFrame").value,10)||0;
  var cu=codonUsage(state.seq, frame), r=rscu(cu.counts);
  var csv="codon,amino_acid,count,frequency_percent,rscu\n";
  var rows=Object.keys(AA_CODONS).map(function(aa){
    return AA_CODONS[aa].map(function(cod){
      var cnt=cu.counts[cod]||0, f=cu.total? cnt/cu.total*100:0;
      csv+=cod+","+aa+","+cnt+","+f.toFixed(2)+","+(r[cod]||0).toFixed(3)+"\n";
      return "<tr><td data-l='Codon' class='mono'>"+cod+"</td><td data-l='Amino acid'>"+aa+"</td><td data-l='Count'>"+cnt+"</td><td data-l='Frequency'>"+f.toFixed(2)+"%</td><td data-l='RSCU'>"+(r[cod]||0).toFixed(2)+"</td><td data-l='' style='min-width:110px'><div class='bar' style='margin:0'><i style='width:"+Math.min(100,(r[cod]||0)/3*100)+"%;background:var(--accent)'></i></div></td></tr>";
    }).join("");
  }).join("");
  lastCodonCSV=csv;
  var di=dinucleotideFreq(state.seq);
  var diPills=Object.keys(di.counts).sort().map(function(d){ return '<span class="pill mono">'+d+' '+pct(di.counts[d]/di.total*100)+'</span>'; }).join("");
  el.innerHTML='<p style="color:var(--muted)">'+fmt(cu.total)+' complete codons counted in frame +'+(frame+1)+'. RSCU = 1.0 means no bias within a synonymous family.</p>'
    +'<div class="tablewrap"><table><thead><tr><th>Codon</th><th>Amino acid</th><th>Count</th><th>Frequency</th><th>RSCU</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<h3 style="margin-top:18px">Dinucleotide composition (whole sequence)</h3><div>'+diPills+'</div>';
}
/* ---------- export ---------- */
function statsCSV(){
  var c=baseCounts(state.seq), len=state.seq.length||1;
  return "metric,value\nlength_bp,"+state.seq.length+"\nA,"+c.A+"\nT,"+c.T+"\nG,"+c.G+"\nC,"+c.C+"\nambiguous,"+c.other+"\nGC_percent,"+gcPercent(state.seq).toFixed(2)+"\nAT_percent,"+((c.A+c.T)/len*100).toFixed(2)+"\nphysical_length_nm,"+(state.seq.length*0.34).toFixed(1)+"\nhelix_turns,"+(state.seq.length/10.5).toFixed(2)+"\n";
}
function orfsCSV(){ return "start,end,strand,frame,start_codon,length_nt,length_aa,stop_codon,protein\n"+state.lastORFs.map(function(o){ return [o.start,o.end,o.strand,o.frame,o.startCodon||"ATG",o.lengthNt,o.lengthAa,o.stopCodon,o.protein].join(","); }).join("\n")+"\n"; }
function sitesCSV(){ return "enzyme,site,position,strand,cut_after\n"+state.lastSites.map(function(s){ return [s.enzyme,s.site,s.pos,s.strand,s.cutPos].join(","); }).join("\n")+"\n"; }
function motifCSV(){ return "motif,position,matched\n"+state.lastMotifs.map(function(h){ return [h.motif,h.pos,h.matched].join(","); }).join("\n")+"\n"; }
function buildExport(){
  var el=$("exportBtns"); if(!el) return;
  var items=[
    ["Download FASTA (all records)", function(){ if(!state.records.length) return "Load a sequence first."; downloadFile("sequences.fasta", toFASTA(state.records)); return "FASTA downloaded."; }],
    ["Download statistics (CSV)", function(){ if(!state.seq) return "Load a sequence first."; downloadFile("statistics.csv", statsCSV(), "text/csv"); return "Statistics CSV downloaded."; }],
    ["Download helix snapshot (PNG)", function(){ if(!state.seq) return "Load a sequence first."; downloadHelixPNG(); return "PNG snapshot downloaded (centered on pair "+state.sel+")."; }],
    ["Download reverse complement (FASTA)", function(){ if(!state.seq) return "Load a sequence first."; downloadFile("reverse_complement.fasta", toFASTA([{id:state.name+"_revcomp", description:"reverse complement", seq:reverseComplement(state.seq)}])); return "Reverse complement downloaded."; }],
    ["Download six-frame translation", function(){ if(!state.seq) return "Load a sequence first."; downloadFile("translation.txt", translationText()); return "Translation downloaded."; }],
    ["Download ORF results (CSV)", function(){ if(!state.lastORFs.length) return "Run the ORF Finder first."; downloadFile("orfs.csv", orfsCSV(), "text/csv"); return "ORF CSV downloaded."; }],
    ["Download restriction sites (CSV)", function(){ if(!state.lastSites.length) return "Run Restriction Map first."; downloadFile("restriction_sites.csv", sitesCSV(), "text/csv"); return "Restriction CSV downloaded."; }],
    ["Download motif results (CSV)", function(){ if(!state.lastMotifs.length) return "Run Motif Search first."; downloadFile("motif_hits.csv", motifCSV(), "text/csv"); return "Motif CSV downloaded."; }],
    ["Download GC window data (CSV)", function(){ if(!state.seq) return "Load a sequence first."; if(!state.lastGC.length) renderGC(); var csv="window_start,window_end,gc_percent\n"+state.lastGC.map(function(p){return p.start+","+p.end+","+p.gc.toFixed(2);}).join("\n")+"\n"; downloadFile("gc_windows.csv", csv, "text/csv"); return "GC data downloaded."; }]
  ];
  el.innerHTML="";
  items.forEach(function(it){
    var b=document.createElement("button"); b.type="button"; b.className="btn secondary"; b.textContent=it[0];
    b.addEventListener("click",function(){ $("exportMsg").textContent=it[1]()||""; });
    el.appendChild(b);
  });
}
/* ---------- tests ---------- */
function runTests(){
  var tests=[];
  function t(name, cond){ tests.push({name:name, pass:!!cond}); }
  t("FASTA parsing reads 2 records", (function(){ var r=parseFASTA(">a desc\nACGT\n>b\nTTTT"); return r.length===2 && r[0].seq==="ACGT" && r[0].id==="a" && r[0].description==="desc"; })());
  t("Base counting", (function(){ var c=baseCounts("AAGGCCTTNN"); return c.A===2&&c.G===2&&c.C===2&&c.T===2&&c.other===2; })());
  t("GC percentage of GGCCAT is 66.67%", Math.abs(gcPercent("GGCCAT")-66.6667)<0.01);
  t("Reverse complement of AAGCTT is AAGCTT (palindrome)", reverseComplement("AAGCTT")==="AAGCTT");
  t("Reverse complement handles IUPAC (R codes Y)", reverseComplement("ACGR")==="YCGT");
  t("Translation: ATGGCTTAA → MA* in standard code", translateFrame("ATGGCTTAA",0,codonTableFor("standard"))==="MA*");
  t("Vertebrate mito code: TGA codes W, not stop", translateFrame("ATGTGA",0,codonTableFor("mito_vert"))==="MW");
  t("ORF finder finds ATG…TAA ORF", (function(){ var o=findORFs("CCCATGAAAGGGTTTTAACCC",15,"standard"); return o.length>=1 && o[0].protein.indexOf("MKGF")===0; })());
  t("EcoRI site found at correct position and cut", (function(){ var s=findRestrictionSites("AAAAGAATTCTTT", ["EcoRI"], false); return s.length===1 && s[0].pos===5 && s[0].cutPos===5; })());
  t("Motif search finds overlapping matches", findMotif("ATATA","ATA",false).length===2);
  t("Motif search supports IUPAC N", findMotif("ACGTACGT","ANG",false).length===2);
  t("Circular motif search wraps the origin", findMotif("TTACGT","CGTTT",true).length===1);
  t("Linear fragments from one cut", (function(){ var f=restrictionFragments(100,[{cutPos:30}],false); return f.length===2 && f[0]===70 && f[1]===30; })());
  t("Circular fragments from two cuts", (function(){ var f=restrictionFragments(100,[{cutPos:20},{cutPos:60}],true); return f.length===2 && f[0]===60 && f[1]===40; })());
  t("RSCU of a lone codon family is balanced", (function(){ var r=rscu({"TTT":4,"TTC":4}); return Math.abs(r["TTT"]-1)<0.001 && Math.abs(r["TTC"]-1)<0.001; })());
  t("B-DNA math: 20,000 bp = 6,800 nm and 1904.8 turns", Math.abs(20000*0.34-6800)<0.01 && Math.abs(20000/10.5-1904.76)<0.01);
  t("Seeded long example is deterministic and 20,000 bp", buildLongExample().length===20000 && buildLongExample()===buildLongExample());
  t("Long example contains its EcoRI landmark", buildLongExample().slice(8000,8006)==="GAATTC");
  t("Needleman–Wunsch aligns identical sequences at 100% identity", (function(){ var al=needlemanWunsch("ACGTACGT","ACGTACGT"); return al.identity===100 && al.matches===8 && al.gaps===0 && al.score===8; })());
  t("Needleman–Wunsch inserts a gap for an insertion", (function(){ var al=needlemanWunsch("ACGTACGT","ACGTTACGT"); return al.gaps===1 && al.matches===8 && al.mismatches===0; })());
  t("Needleman–Wunsch counts a mismatch with no gaps", (function(){ var al=needlemanWunsch("ACGT","AGGT"); return al.matches===3 && al.mismatches===1 && al.gaps===0 && Math.abs(al.identity-75)<0.01; })());
  t("Needleman–Wunsch alignment cap is 5,000 bp", NW_MAX===5000);
  t("ORF finder with alternative starts finds a GTG ORF and codes its first residue M", (function(){ var o=findORFs("CCC" + "GTGAAAGGGTTTTAA" + "CCC",15,"standard","atg_alt"); return o.length>=1 && o[0].startCodon==="GTG" && o[0].protein.charAt(0)==="M"; })());
  t("ORF finder in ATG-only mode ignores a GTG start", (function(){ var o=findORFs("CCC" + "GTGAAAGGGTTTTAA" + "CCC",15,"standard","atg"); return o.length===0; })());
  t("ORF finder with alternative starts finds a TTG ORF coded as M", (function(){ var o=findORFs("CCC" + "TTGAAAGGGTTTTAA" + "CCC",15,"standard","atg_alt"); return o.length>=1 && o[0].startCodon==="TTG" && o[0].protein.charAt(0)==="M"; })());
  t("A-tract detection finds AAAA and TTTT runs but not shorter runs", (function(){ var tr=findATracts("CCAAAACCGGTTTTCCAAACC"); return tr.length===2 && tr[0].type==="A-tract" && tr[0].length===4 && tr[1].type==="T-tract"; })());
  t("Bend-prone window detection flags an AT-rich window", findBendWindows("ATATATATATATATATATATATATATATATATATATATATATATATATAT").length>=1);
  t("Isoschizomer data: KpnI lists Acc65I and HaeIII lists BsuRI", (function(){ var by={}; ENZYMES.forEach(function(e){ by[e.name]=e.iso; }); return by["KpnI"].indexOf("Acc65I")>-1 && by["HaeIII"]==="BsuRI" && by["XhoI"]==="PaeR7I" && by["EcoRI"]==="none known"; })());
  t("Ambiguous codon GGN resolves to Glycine, not X", translateFrame("GGN",0,codonTableFor("standard"))==="G");
  t("Ambiguous codon CAR resolves to Glutamine (Q)", translateFrame("CAR",0,codonTableFor("standard"))==="Q");
  t("Ambiguous codon ATH resolves to Isoleucine (I)", translateFrame("ATH",0,codonTableFor("standard"))==="I");
  t("Genuinely uncertain codon ATN stays X", translateFrame("ATN",0,codonTableFor("standard"))==="X");
  t("Ambiguous stop TAR resolves to stop (*)", translateFrame("TAR",0,codonTableFor("standard"))==="*");
  t("Translation pagination: 20,000 bp needs 34 blocks of 600 bp", transPageCount(20000)===34 && transPageCount(600)===1 && transPageCount(601)===2);
  var passed=tests.filter(function(x){return x.pass;}).length;
  $("testResults").innerHTML='<p><strong>'+passed+" / "+tests.length+' tests passed.</strong></p>'
    + tests.map(function(x){ return '<p style="margin:4px 0" class="'+(x.pass?"test-pass":"test-fail")+'">'+(x.pass?"✓ PASS":"✗ FAIL")+' — <span style="color:var(--ink);font-weight:400">'+esc(x.name)+'</span></p>'; }).join("");
}
/* ---------- misc wiring ---------- */
function copyText(txt, msgEl, msg){
  function done(){ if(msgEl) msgEl.textContent=msg; }
  function fallback(){
    var ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); }catch(e){}
    ta.remove(); done();
  }
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, fallback); } else fallback();
}
function toggleTheme(){
  var cur=document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", cur==="dark"?"light":"dark");
  renderHelix();
}
function init(){
  buildTabs(); buildToolViews(); buildExport();
  /* examples */
  var eb=$("exampleBtns");
  Object.keys(EXAMPLES).forEach(function(k){
    var ex=EXAMPLES[k];
    var b=document.createElement("button"); b.type="button"; b.className="btn secondary small"; b.textContent=ex.name;
    b.addEventListener("click",function(){
      var seq = ex.gen? buildLongExample() : ex.seq;
      $("seqInput").value=">"+ex.name+"\n"+seq;
      $("exampleDesc").textContent=ex.desc;
      loadFromText(ex.file || (ex.name+".fasta"));
    });
    eb.appendChild(b);
  });
  $("inputToggle").addEventListener("click", function(){
    var body=$("inputBody"), open=body.style.display!=="none";
    body.style.display=open? "none":"";
    this.setAttribute("aria-expanded", String(!open));
    this.textContent=open? "Load a sequence ▸" : "Load a sequence ▾";
    requestHelixRender();
  });
  $("loadBtn").addEventListener("click", function(){ loadFromText(); });
  $("clearBtn").addEventListener("click", function(){ $("seqInput").value=""; stopScan(); setSequence([],0,"—"); $("inputMsg").className="msg"; $("inputMsg").style.display="none"; });
  $("fileInput").addEventListener("change", function(){
    var f=this.files && this.files[0]; if(!f) return;
    var reader=new FileReader();
    reader.onload=function(){ $("seqInput").value=String(reader.result||""); loadFromText(f.name); };
    reader.readAsText(f);
    this.value="";
  });
  $("recordPicker").addEventListener("change", function(){ setSequence(state.records, parseInt(this.value,10)||0); });
  /* top bar */
  $("themeBtn").addEventListener("click", toggleTheme);
  $("scanBtn").addEventListener("click", toggleScan);
  $("playBtn").addEventListener("click", toggleScan);
  /* helix interactions */
  var sc=$("helixScroll");
  sc.addEventListener("scroll", requestHelixRender);
  sc.addEventListener("click", function(e){
    var t=e.target;
    while(t && t!==sc && !t.getAttribute("data-pos")) t=t.parentNode;
    if(t && t.getAttribute && t.getAttribute("data-pos")) selectPair(parseInt(t.getAttribute("data-pos"),10), null);
  });
  window.addEventListener("resize", requestHelixRender);
  $("rcToggle").addEventListener("change", function(){
    state.rc=this.checked; applyMotif(false); renderHelix(true); updateDetails();
  });
  $("zoomIn").addEventListener("click", function(){ setZoom(state.zoom+0.15); });
  $("zoomOut").addEventListener("click", function(){ setZoom(state.zoom-0.15); });
  function setZoom(z){
    state.zoom=Math.max(0.65, Math.min(1.9, Math.round(z*100)/100));
    $("zoomLbl").textContent=Math.round(state.zoom*100)+"%";
    ensureVisible(state.sel,true); renderHelix(true);
  }
  /* scan controls */
  $("speedRange").addEventListener("input", function(){
    state.speed=parseInt(this.value,10)||12;
    $("speedLbl").textContent=state.speed+" pairs/s";
  });
  $("jumpRange").addEventListener("input", function(){ selectPair(parseInt(this.value,10),"auto"); });
  $("jumpNum").addEventListener("change", function(){ selectPair(parseInt(this.value,10),"center"); });
  $("jumpGo").addEventListener("click", function(){ selectPair(parseInt($("jumpNum").value,10),"center"); });
  document.addEventListener("keydown", function(e){
    if(state.view!=="scanner") return;
    var tag=(e.target && e.target.tagName)||"";
    if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
    if(e.key===" "){ e.preventDefault(); toggleScan(); }
    else if(e.key==="ArrowDown"){ e.preventDefault(); selectPair(state.sel+1,"auto"); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); selectPair(state.sel-1,"auto"); }
  });
  /* motif in helix */
  $("motifGo").addEventListener("click", function(){ applyMotif(true); if(state.motifHits.length) selectPair(state.motifHits[0],"center"); });
  $("motifInputScanner").addEventListener("keydown", function(e){ if(e.key==="Enter"){ applyMotif(true); if(state.motifHits.length) selectPair(state.motifHits[0],"center"); } });
  $("motifPrev").addEventListener("click", function(){ motifJump(-1); });
  $("motifNext").addEventListener("click", function(){ motifJump(1); });
  /* right panel exports */
  $("dlFastaBtn").addEventListener("click", function(){ if(state.records.length) downloadFile("sequences.fasta", toFASTA(state.records)); });
  $("dlStatsBtn").addEventListener("click", function(){ if(state.seq) downloadFile("statistics.csv", statsCSV(), "text/csv"); });
  $("dlPngBtn").addEventListener("click", downloadHelixPNG);
  /* gc */
  $("gcRun").addEventListener("click", renderGC);
  $("gcSvgDl").addEventListener("click", function(){ var svg=$("gcSvg"); if(svg) downloadFile("gc_chart.svg", new XMLSerializer().serializeToString(svg), "image/svg+xml"); });
  /* translation */
  $("codeSelect").addEventListener("change", function(){ state.code=this.value; renderTranslation(); });
  $("copyRcBtn").addEventListener("click", function(){ copyText(reverseComplement(state.seq), $("rcMsg"), "Reverse complement copied."); });
  $("dlRcBtn").addEventListener("click", function(){ if(state.seq) downloadFile("reverse_complement.fasta", toFASTA([{id:state.name+"_revcomp",description:"reverse complement",seq:reverseComplement(state.seq)}])); });
  $("loadRcBtn").addEventListener("click", function(){ if(!state.seq) return; var rc=reverseComplement(state.seq); setSequence([{id:state.name+"_revcomp", description:"reverse complement of "+state.name, seq:rc}],0,state.name+"_revcomp.fasta"); $("rcMsg").textContent="Reverse complement loaded as the current sequence."; renderTranslation(); });
  $("dlTransBtn").addEventListener("click", function(){ if(state.seq) downloadFile("translation.txt", translationText()); });
  /* bendability */
  $("bendRun").addEventListener("click", renderBend);
  /* orf */
  $("orfRun").addEventListener("click", renderORFs);
  $("orfStarts").addEventListener("change", renderORFs);
  $("dlOrfBtn").addEventListener("click", function(){ if(state.lastORFs.length) downloadFile("orfs.csv", orfsCSV(), "text/csv"); else $("orfMsg").textContent="Run the ORF Finder first."; });
  $("copyProtBtn").addEventListener("click", function(){ if(selectedORF) copyText(selectedORF.protein, $("orfMsg"), "Protein copied ("+selectedORF.lengthAa+" aa)."); else $("orfMsg").textContent="Select an ORF row first."; });
  /* restriction */
  $("enzRun").addEventListener("click", renderRestriction);
  $("circToggle").addEventListener("change", renderRestriction);
  $("dlEnzBtn").addEventListener("click", function(){ if(state.lastSites.length) downloadFile("restriction_sites.csv", sitesCSV(), "text/csv"); });
  /* motif tab */
  $("motifRun").addEventListener("click", renderMotifTab);
  $("dlMotifBtn").addEventListener("click", function(){ if(state.lastMotifs.length) downloadFile("motif_hits.csv", motifCSV(), "text/csv"); });
  /* compare + codon */
  $("cmpRun").addEventListener("click", renderCompare);
  $("codonRun").addEventListener("click", renderCodon);
  $("dlCodonBtn").addEventListener("click", function(){ if(lastCodonCSV) downloadFile("codon_usage.csv", lastCodonCSV, "text/csv"); });
  /* tests */
  $("testRun").addEventListener("click", runTests);
  /* default: the long 20,000 bp example, like the original DNA.fasta file */
  var longSeq=buildLongExample();
  $("seqInput").value=">DNA.fasta synthetic long example\n"+longSeq;
  $("exampleDesc").textContent=EXAMPLES.long.desc;
  setSequence([{id:"DNA.fasta", description:"synthetic long example, 20,000 bp", seq:longSeq}],0,"DNA.fasta.txt");
  selectPair(1,null);
}
document.addEventListener("DOMContentLoaded", init);
