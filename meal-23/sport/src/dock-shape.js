function shapeDock(){
  const dock=document.querySelector('.dock'); const W=dock.offsetWidth,H=dock.offsetHeight;
  if(!W) return;
  const rn=37, rf=20, peek=.17, gap=7, R=24, rFab=rn-gap;
  let cy=rFab*(1-2*peek); const floor=H-(cy+rn); if(floor<11) cy-=(11-floor);
  const cx=W/2; const dx=Math.sqrt(Math.max(0,(rn+rf)**2-(rf-cy)**2))||rn;
  const k=rn/(rn+rf), tx=cx-dx*k, rx=cx+dx*k,ty=cy+(rf-cy)*k;
  const d=`M${R} 0 L${(cx-dx).toFixed(2)} 0 A${rf} ${rf} 0 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)} A${rn} ${rn} 0 0 0 ${rx.toFixed(2)} ${ty.toFixed(2)} A${rf} ${rf} 0 0 1 ${(cx+dx).toFixed(2)} 0 L${W-R} 0 A${R} ${R} 0 0 1 ${W} ${R} L${W} ${H-R} A${R} ${R} 0 0 1 ${W-R} ${H} L${R} ${H} A${R} ${R} 0 0 1 0 ${H-R} L0 ${R} A${R} ${R} 0 0 1 ${R} 0Z`;
  const bg=document.getElementById('dockBg');
  bg.style.clipPath=`path('${d}')`; bg.style.webkitClipPath=`path('${d}')`;
  const svg=document.getElementById('dockEdge');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.querySelector('path').setAttribute('d',d);
  const fab=document.getElementById('sport-fab');fab.style.left='50%';fab.style.top=cy+'px';fab.style.width=(rFab*2)+'px';fab.style.height=(rFab*2)+'px';
  dock.style.setProperty('--gapW',Math.round(rFab*2+14)+'px');
}