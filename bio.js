"use strict";
/* ============================================================
   DNA Viewer — core bioinformatics engine (pure functions)
   ============================================================ */
var IUPAC_SETS = {A:"A",C:"C",G:"G",T:"T",U:"T",R:"AG",Y:"CT",S:"GC",W:"AT",K:"GT",M:"AC",B:"CGT",D:"AGT",H:"ACT",V:"ACG",N:"ACGT"};
var COMPLEMENT = {A:"T",T:"A",U:"A",C:"G",G:"C",R:"Y",Y:"R",S:"S",W:"W",K:"M",M:"K",B:"V",V:"B",D:"H",H:"D",N:"N"};
function complementBase(b){ return COMPLEMENT[b] || "N"; }
function complementSeq(s){ var out=""; for(var i=0;i<s.length;i++) out+=complementBase(s[i]); return out; }
function reverseComplement(s){ var out=""; for(var i=s.length-1;i>=0;i--) out+=complementBase(s[i]); return out; }
function cleanSequence(raw){ return (raw||"").toUpperCase().replace(/[\s\d]/g,""); }
function parseFASTA(text){
  var records=[], cur=null;
  var lines=(text||"").split(/\r?\n/);
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();
    if(!line) continue;
    if(line.charAt(0)===">"){
      var header=line.slice(1).trim();
      var sp=header.search(/\s/);
      cur={ id: sp===-1?header:header.slice(0,sp), description: sp===-1?"":header.slice(sp+1).trim(), seq:"" };
      records.push(cur);
    } else {
      if(!cur){ cur={id:"sequence", description:"", seq:""}; records.push(cur); }
      cur.seq += line.toUpperCase().replace(/\s/g,"");
    }
  }
  return records.filter(function(r){ return r.seq.length>0; });
}
function baseCounts(seq){
  var c={A:0,T:0,G:0,C:0,other:0};
  for(var i=0;i<seq.length;i++){ var b=seq[i]; if(c.hasOwnProperty(b)) c[b]++; else c.other++; }
  return c;
}
function gcPercent(seq){
  if(!seq.length) return 0;
  var c=baseCounts(seq); return (c.G+c.C)/seq.length*100;
}
function gcWindows(seq, win, step){
  win=Math.max(1,win); step=Math.max(1,step);
  var out=[];
  if(!seq.length) return out;
  if(seq.length<=win){ out.push({start:1,end:seq.length,mid:(1+seq.length)/2,gc:gcPercent(seq)}); return out; }
  for(var s=0;s+win<=seq.length;s+=step){
    out.push({start:s+1,end:s+win,mid:s+win/2+1,gc:gcPercent(seq.slice(s,s+win))});
  }
  return out;
}
var CODON_TABLE = (function(){
  var bases="TCAG", aas="FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", t={};
  var i=0;
  for(var a=0;a<4;a++)for(var b=0;b<4;b++)for(var c=0;c<4;c++){ t[bases[a]+bases[b]+bases[c]]=aas[i++]; }
  return t;
})();
var GENETIC_CODES = {
  standard:{name:"Standard (NCBI 1)", overrides:{}},
  mito_vert:{name:"Vertebrate Mitochondrial (NCBI 2)", overrides:{AGA:"*",AGG:"*",ATA:"M",TGA:"W"}},
  mito_yeast:{name:"Yeast Mitochondrial (NCBI 3)", overrides:{ATA:"M",CTC:"T",CTT:"T",CTA:"T",CTG:"T",TGA:"W",CGA:"A",CGC:"A"}},
  bacterial:{name:"Bacterial / Plant Plastid (NCBI 11)", overrides:{}}
};
function codonTableFor(codeKey){
  var t={}; for(var k in CODON_TABLE) t[k]=CODON_TABLE[k];
  var ov=(GENETIC_CODES[codeKey]||GENETIC_CODES.standard).overrides;
  for(var k2 in ov) t[k2]=ov[k2];
  return t;
}
function aaForCodon(codon, table){
  codon=(codon||"").replace(/U/g,"T");
  if(/^[ACGT]{3}$/.test(codon)) return table[codon] || "X";
  /* Ambiguous codon: expand over every IUPAC possibility. If all
     resolutions give the same amino acid, that amino acid is certain;
     only a genuinely mixed result is X. */
  var sets=[];
  for(var k=0;k<3;k++){ var s=IUPAC_SETS[codon[k]]; if(!s) return "X"; sets.push(s.replace(/U/g,"T")); }
  var found={}, nFound=0;
  for(var a=0;a<sets[0].length;a++) for(var b=0;b<sets[1].length;b++) for(var c=0;c<sets[2].length;c++){
    var aa=table[sets[0][a]+sets[1][b]+sets[2][c]] || "X";
    if(!found[aa]){ found[aa]=true; nFound++; }
  }
  return nFound===1 ? Object.keys(found)[0] : "X";
}
function translateFrame(seq, offset, table){
  var aa="";
  for(var i=offset;i+3<=seq.length;i+=3){
    aa += aaForCodon(seq.slice(i,i+3), table);
  }
  return aa;
}
var STOP_CODONS=["TAA","TAG","TGA"];
var START_CODON_SETS={ atg:["ATG"], atg_alt:["ATG","GTG","TTG"] };
function findORFs(seq, minNt, codeKey, startMode){
  var table=codonTableFor(codeKey||"standard"), orfs=[];
  var startCodons=START_CODON_SETS[startMode]||START_CODON_SETS.atg;
  var strands=[{strand:"+", s:seq},{strand:"-", s:reverseComplement(seq)}];
  strands.forEach(function(st){
    for(var frame=0;frame<3;frame++){
      var i=frame;
      while(i+3<=st.s.length){
        var codon=st.s.slice(i,i+3);
        if(startCodons.indexOf(codon)>-1){
          var j=i, hitStop=false;
          while(j+3<=st.s.length){
            var c2=st.s.slice(j,j+3);
            if(aaForCodon(c2, table)==="*"){
              hitStop=true;
              var len=j+3-i;
              if(len>=minNt){
                var prot=translateFrame(st.s.slice(i,j+3),0,table).replace(/\*$/,"");
                /* Alternative starts (GTG, TTG) are decoded as formyl-Met
                   at initiation, so the first residue is shown as M. */
                if(codon!=="ATG" && prot.length) prot="M"+prot.slice(1);
                var start,end;
                if(st.strand==="+"){ start=i+1; end=j+3; }
                else { start=seq.length-(j+3)+1; end=seq.length-i; }
                orfs.push({start:start,end:end,strand:st.strand,frame:frame+1,lengthNt:len,lengthAa:prot.length,protein:prot,stopCodon:c2,startCodon:codon});
              }
              break;
            }
            j+=3;
          }
          i = hitStop ? j+3 : i+3;
        } else i+=3;
      }
    }
  });
  orfs.sort(function(a2,b2){ return b2.lengthNt-a2.lengthNt; });
  return orfs;
}
/* ---- Needleman–Wunsch global alignment (match +1, mismatch −1, gap −2) ---- */
var NW_MAX=5000;
function needlemanWunsch(a, b){
  var n=a.length, m=b.length;
  var W=m+1;
  var score=new Int32Array((n+1)*W);
  var dir=new Uint8Array((n+1)*W); /* 1=diag, 2=up (gap in B), 3=left (gap in A) */
  var i,j;
  for(i=1;i<=n;i++){ score[i*W]=-2*i; dir[i*W]=2; }
  for(j=1;j<=m;j++){ score[j]=-2*j; dir[j]=3; }
  for(i=1;i<=n;i++){
    for(j=1;j<=m;j++){
      var diag=score[(i-1)*W+(j-1)] + (a[i-1]===b[j-1] ? 1 : -1);
      var up=score[(i-1)*W+j] - 2;
      var left=score[i*W+(j-1)] - 2;
      var best=diag, d=1;
      if(up>best){ best=up; d=2; }
      if(left>best){ best=left; d=3; }
      score[i*W+j]=best; dir[i*W+j]=d;
    }
  }
  var alA="", alB="", ii=n, jj=m;
  while(ii>0 || jj>0){
    var dd = (ii>0 && jj>0) ? dir[ii*W+jj] : (ii>0 ? 2 : 3);
    if(dd===1){ alA=a[ii-1]+alA; alB=b[jj-1]+alB; ii--; jj--; }
    else if(dd===2){ alA=a[ii-1]+alA; alB="-"+alB; ii--; }
    else { alA="-"+alA; alB=b[jj-1]+alB; jj--; }
    if(alA.length> (n+m+2)) break; /* safety, never expected */
  }
  var matches=0, mismatches=0, gaps=0;
  for(var k=0;k<alA.length;k++){
    if(alA[k]==="-" || alB[k]==="-") gaps++;
    else if(alA[k]===alB[k]) matches++;
    else mismatches++;
  }
  return { alignedA:alA, alignedB:alB, length:alA.length, matches:matches, mismatches:mismatches, gaps:gaps,
    identity: alA.length? matches/alA.length*100:0, score:score[n*W+m] };
}
/* ---- DNA bendability: A-tracts / T-tracts and AT-rich bend-prone windows ---- */
function findATracts(seq){
  var tracts=[], re=/(A{4,}|T{4,})/g, mm;
  while((mm=re.exec(seq))!==null){
    tracts.push({start:mm.index+1, end:mm.index+mm[0].length, length:mm[0].length, type:(mm[0].charAt(0)==="A"?"A-tract":"T-tract"), seq:mm[0]});
  }
  return tracts;
}
function findBendWindows(seq){
  var win=50, out=[];
  if(seq.length<win) return out;
  for(var s=0;s+win<=seq.length;s+=25){
    var slice=seq.slice(s,s+win), at=0;
    for(var i=0;i<slice.length;i++) if(slice[i]==="A"||slice[i]==="T") at++;
    if(at/win>=0.7) out.push({start:s+1, end:s+win, atPct:at/win*100});
  }
  return out;
}
function transPageCount(len){ return Math.max(1, Math.ceil((len||0)/600)); }
var ENZYMES=[
  {name:"EcoRI", site:"GAATTC", cut:1, iso:"none known"},
  {name:"BamHI", site:"GGATCC", cut:1, iso:"BstI"},
  {name:"HindIII", site:"AAGCTT", cut:1, iso:"none known"},
  {name:"NotI", site:"GCGGCCGC", cut:2, iso:"CciNI"},
  {name:"XhoI", site:"CTCGAG", cut:1, iso:"PaeR7I"},
  {name:"PstI", site:"CTGCAG", cut:5, iso:"Bsp63I"},
  {name:"SmaI", site:"CCCGGG", cut:3, iso:"XmaI (neoschizomer — different cut site)"},
  {name:"KpnI", site:"GGTACC", cut:5, iso:"Acc65I (neoschizomer — different cut site)"},
  {name:"SalI", site:"GTCGAC", cut:1, iso:"none known"},
  {name:"HaeIII", site:"GGCC", cut:2, iso:"BsuRI"}
];
function iupacMatchAt(seq, pos, pattern){
  for(var k=0;k<pattern.length;k++){
    var set=IUPAC_SETS[pattern[k]]; if(!set) return false;
    if(set.indexOf(seq[pos+k])===-1) return false;
  }
  return true;
}
function findMotif(seq, motif, circular){
  motif=(motif||"").toUpperCase().replace(/\s/g,"");
  var hits=[]; if(!motif) return hits;
  if(motif.length>seq.length && !circular) return hits;
  var hay = circular ? seq + seq.slice(0, Math.max(0,motif.length-1)) : seq;
  var limit = circular ? seq.length : seq.length - motif.length;
  for(var i=0;i<=limit;i++){ if(iupacMatchAt(hay,i,motif)) hits.push(i+1); }
  return hits;
}
function findRestrictionSites(seq, enzymeNames, circular){
  var sites=[];
  ENZYMES.forEach(function(e){
    if(enzymeNames.indexOf(e.name)===-1) return;
    findMotif(seq, e.site, circular).forEach(function(p){ sites.push({enzyme:e.name, site:e.site, pos:p, strand:"+", cutPos: ((p-1+e.cut-1) % (seq.length||1)) + 1 }); });
    var rc=reverseComplement(e.site);
    if(rc!==e.site){
      findMotif(seq, rc, circular).forEach(function(p){ sites.push({enzyme:e.name, site:rc, pos:p, strand:"-", cutPos: ((p-1+(e.site.length-e.cut)-1) % (seq.length||1)) + 1 }); });
    }
  });
  sites.sort(function(a,b){ return a.pos-b.pos; });
  return sites;
}
function restrictionFragments(seqLen, sites, circular){
  var cuts=sites.map(function(s){return s.cutPos;}).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
  if(!cuts.length) return seqLen?[seqLen]:[];
  var frags=[], prev=0, i;
  if(circular){
    for(i=0;i<cuts.length;i++){ var len=(cuts[(i+1)%cuts.length]-cuts[i]+seqLen)%seqLen; if(len===0) len=seqLen; frags.push(len); }
  } else {
    cuts.forEach(function(cp){ frags.push(cp-prev); prev=cp; });
    frags.push(seqLen-prev);
  }
  return frags.filter(function(f){return f>0;}).sort(function(a,b){return b-a;});
}
function codonUsage(seq, frame){
  var counts={}, total=0;
  for(var i=frame||0;i+3<=seq.length;i+=3){
    var cod=seq.slice(i,i+3); if(/^[ACGT]{3}$/.test(cod)){ counts[cod]=(counts[cod]||0)+1; total++; }
  }
  return {counts:counts, total:total};
}
var AA_CODONS={F:["TTT","TTC"],L:["TTA","TTG","CTT","CTC","CTA","CTG"],I:["ATT","ATC","ATA"],M:["ATG"],V:["GTT","GTC","GTA","GTG"],S:["TCT","TCC","TCA","TCG","AGT","AGC"],P:["CCT","CCC","CCA","CCG"],T:["ACT","ACC","ACA","ACG"],A:["GCT","GCC","GCA","GCG"],Y:["TAT","TAC"],H:["CAT","CAC"],Q:["CAA","CAG"],N:["AAT","AAC"],K:["AAA","AAG"],D:["GAT","GAC"],E:["GAA","GAG"],C:["TGT","TGC"],W:["TGG"],R:["CGT","CGC","CGA","CGG","AGA","AGG"],G:["GGT","GGC","GGA","GGG"],"*":["TAA","TAG","TGA"]};
function rscu(counts){
  var out={};
  Object.keys(AA_CODONS).forEach(function(aa){
    var cods=AA_CODONS[aa], sum=0;
    cods.forEach(function(c){ sum+=counts[c]||0; });
    cods.forEach(function(c){ out[c]= sum===0?0:(counts[c]||0)/(sum/cods.length); });
  });
  return out;
}
function dinucleotideFreq(seq){
  var counts={}, total=0;
  for(var i=0;i+2<=seq.length;i++){ var d=seq.slice(i,i+2); if(/^[ACGT]{2}$/.test(d)){ counts[d]=(counts[d]||0)+1; total++; } }
  return {counts:counts,total:total};
}
function downloadFile(name, content, type){
  var blob = content instanceof Blob ? content : new Blob([content],{type:type||"text/plain"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },500);
}
function toFASTA(records, width){
  width=width||70;
  return records.map(function(r){
    var out=">"+r.id+(r.description?" "+r.description:"")+"\n";
    for(var i=0;i<r.seq.length;i+=width) out+=r.seq.slice(i,i+width)+"\n";
    return out;
  }).join("");
}
/* Deterministic synthetic DNA (seeded) — used for the long example so the
   project stays small while still shipping a real 20,000 bp sequence. */
function seededDNA(length, seed, gcFrac){
  var x=seed>>>0 || 123456789, out="";
  function rnd(){ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }
  for(var i=0;i<length;i++){
    var r=rnd();
    if(r<gcFrac/2) out+="G"; else if(r<gcFrac) out+="C";
    else if(r<gcFrac+(1-gcFrac)/2) out+="A"; else out+="T";
  }
  return out;
}
function buildLongExample(){
  var s=seededDNA(20000, 987654321, 0.52);
  /* embed recognizable landmarks at known spots: TATA box, EcoRI, a full ORF, BamHI */
  function splice(str, pos, sub){ return str.slice(0,pos)+sub+str.slice(pos+sub.length); }
  s=splice(s, 4000, "TATAAA");
  s=splice(s, 8000, "GAATTC");
  s=splice(s, 12000, "ATG" + seededDNA(597, 424242, 0.5).replace(/TAA|TAG|TGA/g,"TCA") + "TAA");
  s=splice(s, 16000, "GGATCC");
  return s;
}
