"use strict";
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
const glyphs = {
 folder:'<path d="M3 7V5h6l2 2h9v12H3z"/>', pencil:'<path d="m5 16-1 4 4-1L19 8l-3-3zM14 7l3 3"/>',
 undo:'<path d="m8 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/>',redo:'<path d="m16 4 5 5-5 5m4-5h-9a6 6 0 0 0 0 12"/>',
 download:'<path d="M12 3v11m-4-4 4 4 4-4M4 15v5h16v-5"/>', upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 15v5h16v-5"/>',
 library:'<rect x="7" y="5" width="14" height="14" rx="2"/><path d="M3 8v12a2 2 0 0 0 2 2M9 15l3-3 2 2 3-4 3 4"/><circle cx="12" cy="9" r="1"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',plus:'<path d="M12 5v14M5 12h14"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m4 17 5-6 4 4 3-4 4 5"/><circle cx="15" cy="8" r="1.5"/>',
 frame:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v4H4m11 12v-4h5"/>',
 grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
 adjust:'<path d="M4 6h5m5 0h6M4 12h10m5 0h1M4 18h2m5 0h9"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 type:'<path d="M4 7V4h16v3m-8-3v16m-4 0h8"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/>',
 eyeoff:'<path d="m3 3 18 18M9 6c6-2 11 4 13 6l-3 4M5 8l-3 4c3 5 9 9 15 5"/>',
 check:'<path d="m4 12 5 5L20 6"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',
 fill:'<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M8 8h8v8H8z"/>',
 fit:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10v8H7z"/>',
 rotate:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', flip:'<path d="M12 2v3m0 3v3m0 3v3m0 3v2M3 6l5 12H3zm18 0-5 12h5z"/>',
 cursor:'<path d="m5 3 14 10-7 1-3 7z"/>',left:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',center:'<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',right:'<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',trash:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 9v8m4-8v8"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>'
};
const icon = name => '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24">'+(glyphs[name]||'')+'</svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.outerHTML=icon(el.dataset.icon));
const targets = {
 spotify:{name:'Spotify',kind:'Album cover',w:3000,h:3000,ext:'png'},
 apple:{name:'Apple Music',kind:'Album cover',w:4000,h:4000,ext:'jpg'},
 bandcamp:{name:'Bandcamp',kind:'Album cover',w:1400,h:1400,ext:'jpg'},
 youtube:{name:'YouTube',kind:'Channel banner',w:2560,h:1440,ext:'jpg',limit:6000000,safe:[.603,.293]},
 header:{name:'Spotify',kind:'Artist header',w:2660,h:1140,ext:'jpg',limit:20000000,noText:true}
};
const formats={spotify:'Album cover',apple:'Apple cover',bandcamp:'Bandcamp cover',youtube:'YouTube banner',header:'Spotify header'};
const fonts=['DM Sans','DM Serif Text','Barlow Condensed','Archivo Black','Space Mono','Playfair Display','Bricolage Grotesque','Cormorant Garamond','Courier Prime','Space Grotesk','Rubik','Young Serif'];
const builtins={bloom:'Night bloom',tide:'Undertow',dune:'Dune study',haze:'Violet haze'};
const media=new Map(),userFonts=new Map(),imgs=new Map(),processed=new Map();
const defaults={fit:'Fill',rotation:0,mirror:false,zoom:100,panX:0,panY:0,look:'Original',exposure:0,contrast:0,visible:true};
const textLayer=(v={})=>({id:crypto.randomUUID(),role:'text',value:'New text',font:'DM Sans',size:9,color:'#fff6df',align:'center',x:.5,y:.5,italic:false,bold:false,visible:true,shadow:'Off',tracking:0,...v});
let state={name:'Afterglow',format:'spotify',photo:'bloom',photoStyle:{...defaults},text:[
 textLayer({role:'title',value:'Afterglow',font:'DM Serif Text',italic:true,size:20.1,y:.165}),
 textLayer({role:'artist',value:'VERA VALE',font:'Space Mono',size:2.6,y:.924,tracking:.28})
],selected:'image',outputs:['spotify','apple']};
let guides=false,undoStack=[],redoStack=[],lastImageToken=0,drag=null,lastText,db,ready=false,saveTimer,toastTimer,saveVersion=0;
const snap=()=>JSON.stringify(state);
const selected=()=>state.text.find(t=>t.id===state.selected);
function checkpoint(before){if(!before||before===snap())return;undoStack.push(before);if(undoStack.length>70)undoStack.shift();redoStack=[];historyUI();saveSoon()}
function change(fn){const before=snap();fn();checkpoint(before);sync()}
function historyUI(){$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length}
function travel(from,to){if(!from.length)return;to.push(snap());state=JSON.parse(from.pop());sync();saveSoon()}
$('undo').onclick=()=>travel(undoStack,redoStack);$('redo').onclick=()=>travel(redoStack,undoStack);
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
function openDB(){return new Promise((ok,fail)=>{const q=indexedDB.open('sleeve-studio-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('workspace');q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error)})}
function dbGet(key){return new Promise((ok,fail)=>{const q=db.transaction('workspace').objectStore('workspace').get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error)})}
function dbPut(key,value){return new Promise((ok,fail)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,key);tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error)})}
function saveSoon(){if(!ready||!db)return;const version=++saveVersion;clearTimeout(saveTimer);$('savestatus').textContent='Saving locally…';saveTimer=setTimeout(async()=>{try{await dbPut('project',structuredClone(state));if(version===saveVersion)$('savestatus').textContent='Saved locally · refresh resets cover'}catch{$('savestatus').textContent='Local save unavailable'}},160)}
const fileData=file=>new Promise((ok,fail)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=fail;r.readAsDataURL(file)});
function loadImg(id){if(!imgs.has(id)){const promise=new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(new Error('Could not open this image.'));i.src=media.get(id).src});imgs.set(id,promise)}return imgs.get(id)}
function fontWeight(t){return t.font==='Barlow Condensed'?800:t.bold?700:400}
function cssFont(t,size){return (t.italic?'italic ':'')+fontWeight(t)+' '+size+'px "'+t.font+'", sans-serif'}
function preloadText(layers=state.text){return Promise.all(layers.map(t=>document.fonts.load(cssFont(t,40),t.value||'Aa')))}
const coverLayouts = {
 full:   {name:'Full bleed', photo:[0,0,1,1], text:[.035,.025,.93,.95]},
 framed: {name:'Framed photo', photo:[.095,.27,.81,.57], text:[.045,.015,.91,.97]},
 split:  {name:'Split cover', photo:[0,0,1,.60], text:[.055,.62,.89,.345]},
 type:   {name:'Type only', photo:null, text:[.06,.31,.88,.38]}
};
function coverLayout(target, layout = state.layout) {
 return target.w === target.h && Object.hasOwn(coverLayouts, layout) ? coverLayouts[layout] : coverLayouts.full;
}
function photoFrame(target, width, height, layout) {
 const rect = coverLayout(target, layout).photo;
 if (!rect) return null;
 const [x,y,w,h] = rect;
 return {x:x*width, y:y*height, w:w*width, h:h*height};
}
function area(target, layout) {
 if (target.safe) return {x:(1-target.safe[0])/2,y:(1-target.safe[1])/2,w:target.safe[0],h:target.safe[1]};
 const [x,y,w,h] = coverLayout(target, layout).text;
 return {x,y,w,h};
}
const textCase=t=>{const v=t.value||'';return t.textCase==='upper'?v.toUpperCase():t.textCase==='lower'?v.toLowerCase():t.textCase==='title'?v.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()):v};
const leadOf=t=>t.leading??1.12;
function layoutText(ctx,t,target,w,h,layout){const a=area(target,layout),aw=a.w*w,ah=a.h*h;const lines=textCase(t).split('\n');let size=t.size/100*(target.safe?Math.min(aw,ah*2.3):Math.min(w,h));ctx.font=cssFont(t,size);
 const measure=line=>ctx.measureText(line).width+Math.max(0,Array.from(line).length-1)*size*t.tracking;
 let width=Math.max(1,...lines.map(measure)),height=size*leadOf(t)*lines.length;
 const strokePad=Math.max(t.outline?size*(t.outlineWidth??4)/100:0,t.bg?size*(t.bgPad??30)/100:0);
 const scale=Math.min(1,aw/(width+2*strokePad),ah/(height+2*strokePad));size*=scale;ctx.font=cssFont(t,size);width=Math.max(1,...lines.map(measure));height=size*leadOf(t)*lines.length;
 const pad=strokePad*scale;
 const x=clamp(a.x*w+t.x*aw-width/2,a.x*w+pad,(a.x+a.w)*w-width-pad),y=clamp(a.y*h+t.y*ah-height/2,a.y*h+pad,(a.y+a.h)*h-height-pad);
 return {lines,size,x,y,width,height,measure}
}
const shadowPresets = {
 Soft: {opacity:60, size:6, angle:90, distance:3.5},
 Deep: {opacity:14 / 15 * 100, size:11, angle:90, distance:6.5}
};
function shadowSettings(layer) {
 const preset = shadowPresets[layer.shadow];
 return preset && {...preset, ...layer.shadowAdjustments?.[layer.shadow]};
}
function drawType(ctx,t,target,w,h,layout){const b=layoutText(ctx,t,target,w,h,layout);ctx.save();
 if(t.rotation){const cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.translate(cx,cy);ctx.rotate(t.rotation*Math.PI/180);ctx.translate(-cx,-cy)}
 ctx.globalAlpha=(t.opacity??100)/100;
 if(t.bg){const pad=b.size*(t.bgPad??30)/100,bw=b.width+pad*2,bh=b.height+pad*2,r=Math.min(bw,bh)/2*(t.bgRadius??20)/100;
   ctx.fillStyle=t.bgColor||'#151513';ctx.beginPath();ctx.roundRect(b.x-pad,b.y-pad,bw,bh,r);ctx.fill()}
 ctx.fillStyle=t.color;ctx.textBaseline='middle';
 const shadow = shadowSettings(t);
 if (shadow) {
   const radians = shadow.angle * Math.PI / 180;
   const preset = shadowPresets[t.shadow];
   const distance = b.size * (preset.distance / 100) * (shadow.size / preset.size);
   ctx.shadowColor = 'rgba(0,0,0,' + shadow.opacity / 100 + ')';
   ctx.shadowBlur = b.size * shadow.size / 100;
   ctx.shadowOffsetX = Math.cos(radians) * distance;
   ctx.shadowOffsetY = Math.sin(radians) * distance;
 }
 ctx.strokeStyle=t.outlineColor||'#151513';
 ctx.lineWidth=b.size*(t.outlineWidth??4)/100*2;
 ctx.lineJoin=t.outlineJoin||'round';
 ctx.miterLimit=2;
 function drawRun(text,x,y) {
   if(t.outline)ctx.strokeText(text,x,y);
   ctx.fillText(text,x,y);
 }
 const lead=leadOf(t);
 b.lines.forEach((line,i)=>{const lineW=b.measure(line),start=b.x+(t.align==='center'?(b.width-lineW)/2:t.align==='right'?b.width-lineW:0),y=b.y+(i+.5)*b.size*lead;
   if(!t.tracking)drawRun(line,start,y);else{let x=start;for(const c of line){drawRun(c,x,y);x+=ctx.measureText(c).width+t.tracking*b.size}}
   if((t.underline||t.strike)&&line.trim()){const th=Math.max(1,b.size*.065);if(t.underline)ctx.fillRect(start,y+b.size*.33,lineW,th);if(t.strike)ctx.fillRect(start,y-th/2,lineW,th)}
 });ctx.restore();return b}
function geometry(img,s,w,h){const rotated=s.rotation%180!==0,iw=rotated?img.height:img.width,ih=rotated?img.width:img.height;
 const scale=(s.fit==='Fit'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*s.zoom/100;
 return {scale,rangeX:Math.abs(iw*scale-w)/2,rangeY:Math.abs(ih*scale-h)/2}
}
function corrected(img,s){if(s.look==='Original'&&!s.exposure&&!s.contrast)return img;const key=[state.photo,s.look,s.exposure,s.contrast].join('|');if(processed.has(key))return processed.get(key);
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 const data=ctx.getImageData(0,0,c.width,c.height),p=data.data,light=2**(s.exposure/80),contrast=(1+s.contrast/100)*(s.look==='Film'?.83:1),lut=new Uint8ClampedArray(256);
 for(let i=0;i<256;i++)lut[i]=clamp(((i*light-128)*contrast)+128,0,255);
 for(let i=0;i<p.length;i+=4){let r=p[i],g=p[i+1],b=p[i+2];if(s.look!=='Original'){const l=r*.2126+g*.7152+b*.0722;if(s.look==='Mono'){r=g=b=l}else{r=(r*.7+l*.3)*1.06+6;g=g*.7+l*.3+3;b=(b*.7+l*.3)*.93+6}}
 p[i]=lut[clamp(Math.round(r),0,255)];p[i+1]=lut[clamp(Math.round(g),0,255)];p[i+2]=lut[clamp(Math.round(b),0,255)]}
 ctx.putImageData(data,0,0);processed.clear();processed.set(key,c);return c
}
function paint(canvas,img,target,w,h,layout=state.layout,layers=state.text) {
 canvas.width=w; canvas.height=h;
 const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
 ctx.fillStyle=state.fillColor||'#151513';
 ctx.fillRect(0,0,w,h);
 const s=state.photoStyle, frame=photoFrame(target,w,h,layout);
 if (s.visible && frame) {
   const g=geometry(img,s,frame.w,frame.h);
   ctx.save();
   ctx.beginPath();
   ctx.rect(frame.x,frame.y,frame.w,frame.h);
   ctx.clip();
   ctx.globalAlpha=(s.opacity??100)/100;
   ctx.imageSmoothingQuality='high';
   ctx.translate(frame.x+frame.w/2+s.panX*g.rangeX,frame.y+frame.h/2+s.panY*g.rangeY);
   ctx.scale(s.mirror?-1:1,1);
   ctx.rotate(s.rotation*Math.PI/180);
   ctx.scale(g.scale,g.scale);
   ctx.drawImage(maskedPhoto(img,corrected(img,s),s.mask),-img.width/2,-img.height/2);
   ctx.restore();
 }
 if (!target.noText) for (const t of [...layers].reverse()) {
   if (t.visible) drawType(ctx,t,target,w,h,layout);
 }
}
function listeningPreview(canvas,img) {
 paint(canvas,img,targets.spotify,192,192);
}
async function redraw(){const token=++lastImageToken;try{const img=await loadImg(state.photo);await preloadText();if(token!==lastImageToken)return;const target=targets[state.format],rect=$('artwrap').getBoundingClientRect(),w=Math.max(1,Math.min(1600,Math.round(rect.width*(devicePixelRatio||1)))),h=Math.round(w*target.h/target.w);paint($('canvas'),img,target,w,h);updateSelection();listeningPreview($('listening'),img);const info=$('source-dims');if(info)info.textContent=img.width+' × '+img.height+' px'}catch(e){if(token===lastImageToken)toast(e.message)}}
function gallery(){const parent=$('gallery');parent.innerHTML=Array.from(media,([id,m])=>'<button class="tile '+(id===state.photo?'active':'')+'" data-id="'+id+'" aria-pressed="'+(id===state.photo)+'"><span class="thumb"><img alt="" src="'+m.src+'">'+(id===state.photo?'<span class="tick">'+icon('check')+'</span>':'')+'</span>'+esc(m.name)+'</button>').join('');$('libcount').textContent=String(media.size).padStart(2,'0');parent.querySelectorAll('button').forEach(b=>b.onclick=()=>change(()=>{if(state.photo!==b.dataset.id){state.photo=b.dataset.id;state.photoStyle={...defaults}}state.selected='image'}))}
function layerList(){const rows=[...state.text.map(t=>({id:t.id,label:t.value||'Empty text',visible:t.visible})),{id:'image',label:'Background',visible:state.photoStyle.visible}];$('layers').innerHTML=rows.map(t=>'<div class="layer '+(state.selected===t.id?'selected ':'')+(t.visible?'':'off')+'"><button class="layer-main" data-id="'+t.id+'"><span class="layer-icon">'+(t.id==='image'?'<img src="'+media.get(state.photo).src+'" alt="">':icon('type'))+'</span><span>'+esc(t.label)+'</span></button><button class="iconbtn visibility" data-id="'+t.id+'" aria-label="'+(t.visible?'Hide ':'Show ')+esc(t.label)+'">'+icon(t.visible?'eye':'eyeoff')+'</button></div>').join('');
 $('layers').querySelectorAll('.layer-main').forEach(b=>b.onclick=()=>{state.selected=b.dataset.id;sync();saveSoon()});$('layers').querySelectorAll('.visibility').forEach(b=>b.onclick=()=>change(()=>{const obj=b.dataset.id==='image'?state.photoStyle:state.text.find(t=>t.id===b.dataset.id);obj.visible=!obj.visible}))}
function segment(values,active,key){return '<div class="seg">'+values.map(([v,title,ic,label])=>'<button data-key="'+key+'" data-value="'+v+'" class="'+(v===active?'on':'')+'" aria-pressed="'+(v===active)+'" aria-label="'+title+'" title="'+title+'">'+(ic?icon(ic):'')+(label??(key==='align'?'':title))+'</button>').join('')+'</div>'}
function slider(k,l,min,max,value,suffix=''){return '<div class="fieldrow"><label class="labelrow compact" for="'+k+'">'+l+'<output class="value" id="'+k+'val">'+value+suffix+'</output></label><input type="range" id="'+k+'" min="'+min+'" max="'+max+'" value="'+value+'" style="--fill:'+((value-min)/(max-min)*100)+'%"></div>'}
function compositeControls(style) {
 return '<div class="group">'+slider('opacity','Image opacity',0,100,style.opacity??100,'%')+'<label class="fieldrow stack field">Canvas fill<input id="canvasfill" class="paint-chip" type="color" value="'+(state.fillColor||'#151513')+'"></label><div class="row fieldrow"><button class="softbtn" id="editmask">'+(style.mask?'Edit mask':'Object mask')+'</button>'+(style.mask?'<button class="softbtn" id="clearmask">Remove mask</button>':'')+'</div></div>';
}
function outlineControls(t) {
 const options=['round','bevel','miter'].map((value,i)=>'<option value="'+value+'" '+((t.outlineJoin||'round')===value?'selected':'')+'>'+['Round','Bevel','Sharp'][i]+'</option>').join('');
 return '<div class="group"><label class="mask-check"><input id="outline" type="checkbox" '+(t.outline?'checked':'')+'>Text outline</label>'+(t.outline?'<div class="twofields fieldrow"><label class="field">Width (% of type)<input type="number" id="outlinewidth" min="0.2" max="20" step="0.2" value="'+(t.outlineWidth??4)+'"></label><label class="field">Outline colour<input class="paint-chip" id="outlinecolor" type="color" value="'+(t.outlineColor||'#151513')+'"></label></div><label class="fieldrow stack field">Corners<select id="outlinejoin">'+options+'</select></label>':'')+'</div>';
}
function imageTools(){const s=state.photoStyle,m=media.get(state.photo);return '<div class="group"><h3>Source image</h3><div class="file-info"><img src="'+m.src+'" alt=""><div><b>'+esc(m.name)+'</b><small id="source-dims"></small></div></div></div>'+compositeControls(s)+'<div class="group"><h3>Framing</h3>'+segment([['Fill','Fill','fill'],['Fit','Fit','fit']],s.fit,'fit')+slider('zoom','Scale',100,250,s.zoom,'%')+'<div class="row fieldrow"><button id="rotate" class="softbtn">'+icon('rotate')+'Rotate</button><button id="flip" class="softbtn" aria-pressed="'+s.mirror+'">'+icon('flip')+'Flip</button></div></div><div class="group"><h3>Colour treatment</h3><div class="lookgrid">'+['Original','Film','Mono'].map(v=>'<button class="look '+(v===s.look?'on':'')+'" data-look="'+v+'" aria-pressed="'+(v===s.look)+'"><img src="'+m.src+'" alt="">'+v+'</button>').join('')+'</div></div><div class="group"><div class="grouphead"><h3>Adjustments</h3><button id="reset">Reset</button></div>'+slider('exposure','Exposure',-60,60,s.exposure)+slider('contrast','Contrast',-60,60,s.contrast)+'</div>'}
function shadowControls(layer) {
 const options = ['Off', ...Object.keys(shadowPresets)].map(name =>
   '<option '+(layer.shadow===name?'selected':'')+'>'+name+'</option>').join('');
 const settings = shadowSettings(layer);
 let fields = '';
 if (settings) {
   fields = slider('shadowOpacity','Shadow opacity',0,100,Math.round(settings.opacity),'%')
     + slider('shadowSize','Shadow size',0,50,settings.size,'%')
     + slider('shadowAngle','Shadow angle',0,360,settings.angle,'°')
     + '<p class="note">Size scales the blur and offset with the type. At 0° the shadow falls right, and at 90° it falls down.</p>';
 }
 return '<div class="group"><label class="field" for="shadow">Drop shadow</label><select id="shadow">'+options+'</select>'+fields+'</div>';
}
const textPresets=[
 {name:'Clean',font:'DM Sans',bold:true,italic:false,textCase:'none',tracking:0,leading:1.1,color:'#fff6df',outline:false,bg:false,shadow:'Off',underline:false},
 {name:'Poster',font:'Archivo Black',bold:false,italic:false,textCase:'upper',tracking:.02,leading:.95,color:'#ffffff',outline:false,bg:false,shadow:'Deep',underline:false},
 {name:'Editorial',font:'Playfair Display',bold:false,italic:true,textCase:'none',tracking:0,leading:1.05,color:'#fff6df',outline:false,bg:false,shadow:'Off',underline:false},
 {name:'Retro',font:'Young Serif',bold:false,italic:false,textCase:'upper',tracking:.04,leading:1.05,color:'#ffd9a0',outline:true,outlineColor:'#8a2d12',outlineWidth:5,outlineJoin:'round',bg:false,shadow:'Soft',underline:false},
 {name:'Label',font:'Space Mono',bold:true,italic:false,textCase:'upper',tracking:.12,leading:1.2,color:'#151513',outline:false,bg:true,bgColor:'#fff6df',bgPad:35,bgRadius:12,shadow:'Off',underline:false},
 {name:'Tech',font:'Space Grotesk',bold:true,italic:false,textCase:'lower',tracking:-.02,leading:1.05,color:'#ff895e',outline:false,bg:false,shadow:'Off',underline:false}
];
function typographyControls(t){
 return '<div class="group"><h3>Spacing &amp; case</h3>'+slider('txtracking','Letter spacing',-10,100,Math.round((t.tracking||0)*100),'%')+slider('txleading','Line spacing',70,220,Math.round(leadOf(t)*100),'%')
  +'<div class="fieldrow"><div class="labelrow">Letter case</div>'+segment([['none','Original case','','Aa'],['upper','Uppercase','','AA'],['lower','Lowercase','','aa'],['title','Title case','','Ab']],t.textCase||'none','textCase')+'</div>'
  +'<div class="row fieldrow"><button class="softbtn" id="underline" aria-pressed="'+!!t.underline+'"><u>U</u> Underline</button><button class="softbtn" id="strike" aria-pressed="'+!!t.strike+'"><s>S</s> Strike</button></div></div>'
  +'<div class="group"><h3>Transform</h3>'+slider('txrotation','Rotation',-180,180,Math.round(t.rotation||0),'°')+slider('txopacity','Opacity',0,100,t.opacity??100,'%')+'</div>';
}
function highlightControls(t){
 return '<div class="group"><label class="mask-check"><input id="bgbox" type="checkbox" '+(t.bg?'checked':'')+'>Highlight box</label>'+(t.bg?'<label class="fieldrow stack field">Box colour<input class="paint-chip" id="bgcolor" type="color" value="'+(t.bgColor||'#151513')+'"></label>'+slider('bgpad','Padding',0,100,t.bgPad??30,'%')+slider('bgradius','Corner radius',0,100,t.bgRadius??20,'%'):'')+'</div>';
}
function layerActions(t){
 const i=state.text.indexOf(t);
 return '<div class="group"><h3>Layer</h3><div class="row"><button class="softbtn" id="dupe">'+icon('copy')+'Duplicate</button><button class="softbtn" id="forward" '+(i===0?'disabled':'')+' aria-label="Bring forward">'+icon('up')+'Forward</button><button class="softbtn" id="backward" '+(i===state.text.length-1?'disabled':'')+' aria-label="Send backward">'+icon('down')+'Back</button></div></div>';
}
function presetControls(){
 return '<div class="group"><h3>Text styles</h3><div class="presetgrid">'+textPresets.map((p,i)=>'<button class="preset" data-preset="'+i+'" style="font-family:\''+p.font+'\';font-style:'+(p.italic?'italic':'normal')+';font-weight:'+(p.bold?700:400)+'">'+(p.textCase==='upper'?'AB':p.textCase==='lower'?'ab':'Ab')+'<small>'+p.name+'</small></button>').join('')+'</div></div>';
}
function textTools(t){const names=fonts.concat(Array.from(userFonts.keys()));return (targets[state.format].noText?'<p class="note">Spotify artist headers export with the image only.</p>':'')+presetControls()+'<div class="group"><label class="field" for="copy">Text content</label><textarea id="copy" maxlength="600">'+esc(t.value)+'</textarea></div><div class="group"><label class="field" for="font">Typeface</label><select id="font">'+names.map(n=>'<option '+(n===t.font?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select><div class="row fieldrow"><button class="softbtn" id="bold" aria-pressed="'+t.bold+'"><b>B</b> Bold</button><button class="softbtn" id="italic" aria-pressed="'+t.italic+'"><i>I</i> Italic</button></div><button id="uploadfont" class="softbtn full fieldrow">'+icon('upload')+'Upload font</button></div><div class="group"><div class="twofields"><label class="field">Size (%)<input type="number" id="size" min="1" max="80" step="0.1" value="'+t.size+'"></label><label class="field">Colour<span class="colorfield"><input type="color" id="color" value="'+t.color+'"><span id="hex">'+esc(t.color)+'</span></span></label></div><div class="fieldrow"><div class="labelrow">Line alignment</div>'+segment([['left','Align left','left'],['center','Align centre','center'],['right','Align right','right']],t.align,'align')+'</div></div>'+typographyControls(t)+highlightControls(t)+outlineControls(t)+shadowControls(t)+layerActions(t)+'<div class="group"><button id="removetext" class="softbtn full">'+icon('trash')+'Remove text layer</button></div>'}
function continuous(el,apply){let before=null;el.addEventListener('input',()=>{before??=snap();apply();redraw();saveSoon()});el.addEventListener('change',()=>{checkpoint(before);before=null});}
function bindRange(id, suffix, setValue) {
 const el = $(id);
 continuous(el, () => {
   setValue(Number(el.value));
   $(id+'val').textContent = el.value + suffix;
   el.style.setProperty('--fill', (el.value-el.min)/(el.max-el.min)*100+'%');
 });
}
function controls(){const t=selected(),s=state.photoStyle;$('imgtab').classList.toggle('on',!t);$('typetab').classList.toggle('on',!!t);$('imgtab').setAttribute('aria-pressed',!t);$('typetab').setAttribute('aria-pressed',!!t);$('controls').innerHTML=t?textTools(t):imageTools();
 $('controls').querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>change(()=>{(t||s)[b.dataset.key]=b.dataset.value;if(b.dataset.key==='fit')Object.assign(s,{panX:0,panY:0,zoom:100})}));
 if(!t){
 continuous($('canvasfill'),()=>state.fillColor=$('canvasfill').value);
 $('editmask').onclick=async()=>{const id=state.photo;try{const img=await loadImg(id);if(id===state.photo)openMaskEditor(img)}catch{toast('Could not open the image for masking.')}};
 if($('clearmask'))$('clearmask').onclick=()=>change(()=>delete s.mask);
 $('rotate').onclick=()=>change(()=>{s.rotation=(s.rotation+90)%360;s.panX=s.panY=0});$('flip').onclick=()=>change(()=>s.mirror=!s.mirror);$('reset').onclick=()=>change(()=>{s.exposure=s.contrast=0});
 $('controls').querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>change(()=>s.look=b.dataset.look));
 for(const key of ['opacity','zoom','contrast','exposure']){
   const suffix=(key==='opacity'||key==='zoom')?'%':'';
   bindRange(key,suffix,value=>{s[key]=value});
 }
 return}
 if (shadowPresets[t.shadow]) {
   const adjust = (key, value) => {
     t.shadowAdjustments ??= {};
     t.shadowAdjustments[t.shadow] ??= {};
     t.shadowAdjustments[t.shadow][key] = value;
   };
   bindRange('shadowOpacity','%',value=>adjust('opacity',value));
   bindRange('shadowSize','%',value=>adjust('size',value));
   bindRange('shadowAngle','°',value=>adjust('angle',value));
 }
 $('outline').onchange=e=>change(()=>t.outline=e.target.checked);
 if(t.outline){
   $('outlinewidth').onchange=e=>change(()=>t.outlineWidth=clamp(Number(e.target.value)||.2,.2,20));
   $('outlinejoin').onchange=e=>change(()=>t.outlineJoin=e.target.value);
   continuous($('outlinecolor'),()=>t.outlineColor=$('outlinecolor').value);
 }
 bindRange('txtracking','%',v=>t.tracking=v/100);bindRange('txleading','%',v=>t.leading=v/100);bindRange('txrotation','°',v=>t.rotation=v);bindRange('txopacity','%',v=>t.opacity=v);
 $('underline').onclick=()=>change(()=>t.underline=!t.underline);$('strike').onclick=()=>change(()=>t.strike=!t.strike);
 $('bgbox').onchange=e=>change(()=>t.bg=e.target.checked);
 if(t.bg){continuous($('bgcolor'),()=>t.bgColor=$('bgcolor').value);bindRange('bgpad','%',v=>t.bgPad=v);bindRange('bgradius','%',v=>t.bgRadius=v)}
 $('dupe').onclick=()=>duplicateText();$('forward').onclick=()=>moveText(-1);$('backward').onclick=()=>moveText(1);
 $('controls').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>change(()=>{const {name,...p}=textPresets[b.dataset.preset];for(const k of ['outline','bg','underline','strike'])t[k]=false;delete t.shadowAdjustments;Object.assign(t,p)}));
 lastText=t.id;continuous($('copy'),()=>{t.value=$('copy').value;layerList()});$('font').onchange=e=>change(()=>t.font=e.target.value);$('size').onchange=e=>change(()=>t.size=clamp(Number(e.target.value)||1,1,80));continuous($('color'),()=>{t.color=$('color').value;$('hex').textContent=t.color});$('bold').onclick=()=>change(()=>t.bold=!t.bold);$('italic').onclick=()=>change(()=>t.italic=!t.italic);$('shadow').onchange=e=>change(()=>t.shadow=e.target.value);$('uploadfont').onclick=()=>$('fontfile').click();$('removetext').onclick=removeText
}
function sync(){const target=targets[state.format];$('project').value=state.name;$('format').value=state.format;$('artwrap').style.setProperty('--aspect',target.w/target.h);$('dims').textContent=target.w+' × '+target.h+' px';$('guides').hidden=!guides;const a=area(target);$('guides').style.inset=[a.y,1-a.x-a.w,1-a.y-a.h,a.x].map(v=>Math.max(0,v)*100+'%').join(' ');$('guidebtn').setAttribute('aria-pressed',guides);$('dragtip').textContent=selected()?'Drag text to reposition':'Drag artwork to reposition';gallery();layerList();controls();historyUI();redraw()}
function duplicateText(){const t=selected();if(!t)return;change(()=>{const c=structuredClone(t);c.id=crypto.randomUUID();c.role='text';c.x=clamp(t.x+.03,0,1);c.y=clamp(t.y+.03,0,1);state.text.splice(state.text.indexOf(t),0,c);state.selected=c.id})}
function moveText(dir){const t=selected();if(!t)return;const i=state.text.indexOf(t),j=i+dir;if(j<0||j>=state.text.length)return;change(()=>{state.text.splice(i,1);state.text.splice(j,0,t)})}
function removeText(){const t=selected();if(!t)return;change(()=>{state.text=state.text.filter(l=>l!==t);state.selected=state.text[0]?.id||'image'})}
function updateSelection(){const box=$('selbox'),t=selected(),tgt=targets[state.format],cv=$('canvas');
 if(!t||!t.visible||!t.value||tgt.noText||!cv.width){box.hidden=true;return}
 const b=layoutText(cv.getContext('2d'),t,tgt,cv.width,cv.height),k=cv.clientWidth/cv.width,p=t.bg?b.size*(t.bgPad??30)/100:0;
 box.hidden=false;Object.assign(box.style,{left:(b.x-p)*k+'px',top:(b.y-p)*k+'px',width:(b.width+2*p)*k+'px',height:(b.height+2*p)*k+'px',transform:'rotate('+(t.rotation||0)+'deg)'})}
let handleOp=null;
$('selbox').addEventListener('pointerdown',e=>{const h=e.target.closest('[data-h]'),t=selected();if(!h||!t||e.button!==0)return;e.preventDefault();e.stopPropagation();
 const r=$('selbox').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;h.setPointerCapture(e.pointerId);
 handleOp={mode:h.dataset.h,id:e.pointerId,before:snap(),cx,cy,d0:Math.max(1,Math.hypot(e.clientX-cx,e.clientY-cy)),size:t.size}});
$('selbox').addEventListener('pointermove',e=>{if(!handleOp||handleOp.id!==e.pointerId)return;const t=selected();if(!t)return;const dx=e.clientX-handleOp.cx,dy=e.clientY-handleOp.cy;
 if(handleOp.mode==='rotate'){let a=Math.atan2(dy,dx)*180/Math.PI+90;a=((a+540)%360)-180;const near=Math.round(a/45)*45;a=e.shiftKey?Math.round(a/15)*15:Math.abs(a-near)<3?near:a;t.rotation=Math.round(a);if($('txrotation')){$('txrotation').value=t.rotation;$('txrotationval').textContent=t.rotation+'°';$('txrotation').style.setProperty('--fill',(t.rotation+180)/360*100+'%')}}
 else{t.size=clamp(Math.round(handleOp.size*Math.hypot(dx,dy)/handleOp.d0*10)/10,1,80);if($('size'))$('size').value=t.size}
 redraw()});
const endHandle=e=>{if(!handleOp||handleOp.id!==e.pointerId)return;const before=handleOp.before;handleOp=null;checkpoint(before);sync()};
$('selbox').addEventListener('pointerup',endHandle);$('selbox').addEventListener('pointercancel',endHandle);
function addText(){change(()=>{const t=textLayer();state.text.unshift(t);state.selected=t.id});$('copy').focus();$('copy').select()}
$('addlayer').onclick=addText;$('imgtab').onclick=()=>{state.selected='image';sync();saveSoon()};$('typetab').onclick=()=>{const t=state.text.find(l=>l.id===lastText)||state.text[0];if(!t)return addText();state.selected=t.id;sync();saveSoon()};
$('format').innerHTML=Object.entries(formats).map(([id,n])=>'<option value="'+id+'">'+n+'</option>').join('');
$('format').onchange=e=>change(()=>{state.format=e.target.value;if(!state.outputs.includes(state.format))state.outputs.push(state.format);if(targets[state.format].noText)state.selected='image'});
$('project').onchange=e=>change(()=>state.name=e.target.value.trim()||'Untitled release');
$('guidebtn').onclick=()=>{guides=!guides;sync()};
async function uploadImage(file){if(!file)return;try{const src=await fileData(file),id=crypto.randomUUID(),item={name:file.name.replace(/\.[^.]+$/,''),src};media.set(id,item);
 try{await loadImg(id)}catch(e){media.delete(id);imgs.delete(id);throw e}let stored=true;if(db)try{await dbPut('media',Array.from(media).filter(([k])=>!Object.hasOwn(builtins,k)))}catch{stored=false}
 change(()=>{state.photo=id;state.photoStyle={...defaults};state.selected='image'});toast(stored?'Image added to the library':'Image added for this session. Device storage is full.')}catch{toast('This image could not be opened. Try a JPG, PNG or WebP file.')}}
$('upload').onclick=()=>$('imagefile').click();$('imagefile').onchange=e=>{uploadImage(e.target.files[0]);e.target.value=''};
for(const el of [$('upload'),$('stage')]){el.ondragover=e=>{e.preventDefault();el.classList.add('drag')};el.ondragleave=()=>el.classList.remove('drag');el.ondrop=e=>{e.preventDefault();el.classList.remove('drag');uploadImage(e.dataTransfer.files[0])}}
async function addFace(name,src){const face=new FontFace(name,'url('+src+')');await face.load();document.fonts.add(face);userFonts.set(name,src)}
$('fontfile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{let base=file.name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N} _-]/gu,'').trim()||'Custom font',name=base,n=2;while(fonts.includes(name)||userFonts.has(name))name=base+' '+n++;
 await addFace(name,await fileData(file));let stored=true;if(db)try{await dbPut('fonts',Array.from(userFonts))}catch{stored=false}change(()=>{if(selected())selected().font=name});toast(stored?'Font added to your typefaces':'Font loaded for this session. Device storage is full.')}catch{toast('Could not read that font. Choose a TTF, OTF, WOFF or WOFF2 file.')}};
const canvas=$('canvas');
canvas.onpointerdown=async e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);const img=await loadImg(state.photo);if(!canvas.hasPointerCapture(e.pointerId))return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*canvas.width,y=(e.clientY-rect.top)/rect.height*canvas.height,tgt=targets[state.format],ctx=canvas.getContext('2d');let hit;
 if(!tgt.noText)hit=state.text.find(t=>{if(!t.visible||!t.value)return false;const b=layoutText(ctx,t,tgt,canvas.width,canvas.height);let px=x,py=y;if(t.rotation){const cx=b.x+b.width/2,cy=b.y+b.height/2,r=-t.rotation*Math.PI/180,dx=x-cx,dy=y-cy;px=cx+dx*Math.cos(r)-dy*Math.sin(r);py=cy+dx*Math.sin(r)+dy*Math.cos(r)}const p=Math.max(4,t.bg?b.size*(t.bgPad??30)/100:0);return px>=b.x-p&&px<=b.x+b.width+p&&py>=b.y-p&&py<=b.y+b.height+p});
 if(!hit&&!photoFrame(tgt,canvas.width,canvas.height))return;
 state.selected=hit?.id||'image';drag={id:e.pointerId,before:snap(),sx:e.clientX,sy:e.clientY,ox:hit?.x??state.photoStyle.panX,oy:hit?.y??state.photoStyle.panY,img,rect};sync()};
canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const {sx,sy,ox,oy,img,rect}=drag,dx=e.clientX-sx,dy=e.clientY-sy,t=selected(),target=targets[state.format];
 if(t){const a=area(target);t.x=clamp(ox+dx/(rect.width*a.w),0,1);t.y=clamp(oy+dy/(rect.height*a.h),0,1)}else{const s=state.photoStyle,frame=photoFrame(target,rect.width,rect.height);if(!frame)return;const g=geometry(img,s,frame.w,frame.h);s.panX=g.rangeX>.1?clamp(ox+dx/g.rangeX,-1,1):0;s.panY=g.rangeY>.1?clamp(oy+dy/g.rangeY,-1,1):0}redraw()};
canvas.ondblclick=()=>{if(selected()&&$('copy')){$('copy').focus();$('copy').select()}};
canvas.onlostpointercapture=()=>{if(drag){checkpoint(drag.before);drag=null;saveSoon()}};
new ResizeObserver(()=>redraw()).observe($('artwrap'));
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function openHelp(showShortcuts = false) {
  const dialog = $('help');
  const shortcuts = $('help-keys');
  shortcuts.open = showShortcuts;
  dialog.showModal();
  const body = dialog.querySelector('.help-body');
  body.scrollTop = 0;
  if (showShortcuts) {
    shortcuts.querySelector('summary').focus();
    body.scrollTop = body.scrollHeight;
  }
}
$('openhelp').onclick = () => openHelp();
$('shortcuts').onclick = () => openHelp(true);
$('help').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) {
    event.currentTarget.close();
  }
});

let layoutDraft, layoutImage, cardFrame;
const layoutDialog = $('layoutdlg');
const cards = $('layoutcards');
cards.innerHTML = Object.entries(coverLayouts).map(([id, layout]) =>
 '<label class="layout-card"><input type="radio" name="coverlayout" value="'+id+'"><canvas aria-hidden="true"></canvas><span>'+layout.name+'</span></label>'
).join('');
function updateDraftText(role, value) {
 let layer = layoutDraft.find(t=>t.role===role);
 if (!layer && value) {
   layer = role==='title'
     ? textLayer({role, font:'DM Serif Text', italic:true, size:20.1, y:.165})
     : textLayer({role, font:'Space Mono', size:2.6, y:.924, tracking:.28});
   layoutDraft.push(layer);
 }
 if (layer) layer.value=value;
}
function paintCards() {
 const size = Math.min(400,Math.max(200,Math.round(cards.querySelector('canvas').clientWidth * (devicePixelRatio||1))));
 for (const card of cards.children) paint(card.querySelector('canvas'),layoutImage,targets.spotify,size,size,card.querySelector('input').value,layoutDraft);
}
$('openlayouts').onclick = async () => {
 try {
   layoutImage = await loadImg(state.photo);
   await preloadText();
   layoutDraft = structuredClone(state.text);
   for (const role of ['title','artist']) $('release-'+role).value=layoutDraft.find(t=>t.role===role)?.value||'';
   const current = state.layout || 'full';
   for (const input of cards.querySelectorAll('input')) input.checked=input.value===current;
   layoutDialog.showModal();
   paintCards();
 } catch { toast('Could not load the cover previews. Please try again.') }
};
for (const role of ['title','artist']) $('release-'+role).oninput = event => {
 updateDraftText(role,event.target.value);
 cancelAnimationFrame(cardFrame);
 const draft=layoutDraft;
 cardFrame=requestAnimationFrame(async()=>{
   await preloadText(draft);
   if (layoutDialog.open && draft===layoutDraft) paintCards();
 });
};
layoutDialog.onclose = () => { cancelAnimationFrame(cardFrame); layoutDraft=null; layoutImage=null };
$('applylayout').onclick = () => {
 const layout=cards.querySelector('input:checked').value;
 change(()=>{
   state.layout=layout;
   state.text=layoutDraft;
   if (targets[state.format].w!==targets[state.format].h) {
     state.format='spotify';
     if (!state.outputs.includes('spotify')) state.outputs.push('spotify');
   }
   if (layout==='type' && state.selected==='image') state.selected=state.text.find(t=>t.role==='title')?.id||'image';
 });
 layoutDialog.close();
};
let preparedUrl,exportBusy=false;
function previewTargets(img){const wrapper=$('targets');wrapper.innerHTML='';for(const [id,t] of Object.entries(targets)){const label=document.createElement('label');label.className='choice';label.innerHTML='<input type="checkbox" value="'+id+'" '+(state.outputs.includes(id)?'checked':'')+'><canvas class="export-preview"></canvas><span><b>'+t.name+'</b><small>'+t.kind+'</small></span><span class="exportdims">'+t.w+' × '+t.h+'</span>';wrapper.append(label);paint(label.querySelector('canvas'),img,t,100,Math.round(100*t.h/t.w));label.querySelector('input').onchange=e=>{state.outputs=e.target.checked?[...new Set([...state.outputs,id])]:state.outputs.filter(k=>k!==id);clearDownload();exportSummary(img);saveSoon()}}}
function clearDownload(){if(preparedUrl){URL.revokeObjectURL(preparedUrl);preparedUrl=null}$('downloadlink').hidden=true}
function exportSummary(img){$('export-listening').hidden=!state.outputs.some(id=>targets[id].w===targets[id].h);const n=state.outputs.length;$('exportcount').textContent=n===1?'1 image':n+' images · ZIP';$('download').disabled=!n;$('download').innerHTML=icon('download')+(n>1?'Download ZIP':'Download image');
 const scales=state.outputs.filter(id=>{
   const t=targets[id],frame=photoFrame(t,t.w,t.h);
   return state.photoStyle.visible && frame && geometry(img,state.photoStyle,frame.w,frame.h).scale>1.005;
 });const notes=[];if(scales.length)notes.push('The '+img.width+' × '+img.height+' source will be enlarged. Use a larger original for release-quality artwork.');if(state.outputs.includes('header'))notes.push('Spotify artist headers use the image layer only.');$('exportnote').textContent=notes.join(' ');$('exportnote').className=notes.length?'exportwarnings':''}
async function showExport(){if(exportBusy)return;try{await preloadText();const img=await loadImg(state.photo);clearDownload();listeningPreview($('exportthumb'),img);previewTargets(img);exportSummary(img);$('exportdlg').showModal()}catch{toast('The artwork is still loading. Try again in a moment.')}}
$('export').onclick=showExport;
const asBlob=(c,type,q)=>new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(new Error('This browser could not render the artwork.')),type,q));
const crcTable=Uint32Array.from({length:256},(_,v)=>{for(let j=0;j<8;j++)v=(v&1)?0xedb88320^(v>>>1):v>>>1;return v>>>0});
function crc32(bytes){let v=0xffffffff;for(const byte of bytes)v=crcTable[(v^byte)&255]^(v>>>8);return(v^0xffffffff)>>>0}
// Store already-compressed images directly in a ZIP32 archive.
async function makeZip(files){const parts=[],central=[];let offset=0,centralSize=0;const now=new Date(),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
 for(const f of files){const data=new Uint8Array(await f.blob.arrayBuffer()),name=new TextEncoder().encode(f.name),crc=crc32(data),local=new Uint8Array(30+name.length),dir=new Uint8Array(46+name.length),lv=new DataView(local.buffer),dv=new DataView(dir.buffer);
 lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);
 for(const [v,n] of [[lv,0],[dv,2]]){v.setUint16(6+n,0x800,true);v.setUint16(10+n,time,true);v.setUint16(12+n,date,true);v.setUint32(14+n,crc,true);v.setUint32(18+n,data.length,true);v.setUint32(22+n,data.length,true);v.setUint16(26+n,name.length,true)}
 dv.setUint32(42,offset,true);local.set(name,30);dir.set(name,46);parts.push(local,data);central.push(dir);offset+=local.length+data.length;centralSize+=dir.length}
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'})}
$('exportdlg').addEventListener('cancel',e=>{if(exportBusy)e.preventDefault()});
$('download').onclick=async()=>{if(exportBusy||!state.outputs.length)return;exportBusy=true;const dlg=$('exportdlg');dlg.querySelectorAll('button,input').forEach(el=>el.disabled=true);clearDownload();const img=await loadImg(state.photo);
 try{await preloadText();const files=[],base=state.name.replace(/[<>:"/\\|?*\u0000-\u001f]+/g,'-').trim().slice(0,70)||'Artwork';for(const [i,id] of state.outputs.entries()){const t=targets[id];$('exportcount').textContent='Rendering '+(i+1)+' of '+state.outputs.length+'…';await new Promise(r=>setTimeout(r,20));const c=document.createElement('canvas');paint(c,img,t,t.w,t.h);let quality=.95,blob=await asBlob(c,'image/'+(t.ext==='jpg'?'jpeg':'png'),quality);
 while(t.limit&&blob.size>t.limit&&quality>.35){quality-=.1;blob=await asBlob(c,'image/jpeg',quality)}c.width=c.height=1;if(t.limit&&blob.size>t.limit)throw new Error('The banner exceeds the platform size limit. Try a simpler image.');files.push({blob,name:base+'-'+id+'-'+t.w+'x'+t.h+'.'+t.ext})}
 const single=files.length===1,blob=single?files[0].blob:await makeZip(files),a=$('downloadlink');preparedUrl=URL.createObjectURL(blob);a.href=preparedUrl;a.download=single?files[0].name:base+'-artwork.zip';a.hidden=false;a.textContent='Save '+a.download;a.click();$('exportcount').textContent='Export ready'}catch(e){$('exportcount').textContent=e.message||'Export failed. Please try again.'}finally{exportBusy=false;dlg.querySelectorAll('button,input').forEach(el=>el.disabled=false)}};
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;const cmd=e.metaKey||e.ctrlKey,k=e.key.toLowerCase(),editing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);if(cmd&&k==='e'){e.preventDefault();showExport();return}if(editing)return;if(cmd&&k==='d'&&selected()){e.preventDefault();duplicateText()}else if(!cmd&&(k==='delete'||k==='backspace')&&selected()){e.preventDefault();removeText()}else if(cmd&&k==='z'){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click()}else if(!cmd&&k==='g')$('guidebtn').click();else if(k==='?')openHelp();else if(k.startsWith('arrow')){e.preventDefault();const amount=e.shiftKey?.03:.003,dx=k==='arrowright'?amount:k==='arrowleft'?-amount:0,dy=k==='arrowdown'?amount:k==='arrowup'?-amount:0;change(()=>{const t=selected();if(t){t.x=clamp(t.x+dx,0,1);t.y=clamp(t.y+dy,0,1)}else{state.photoStyle.panX=clamp(state.photoStyle.panX+dx*4,-1,1);state.photoStyle.panY=clamp(state.photoStyle.panY+dy*4,-1,1)}})}});
function readProjectOnOpen() {
 const navigation = performance.getEntriesByType('navigation')[0];
 const reloaded = navigation?.type === 'reload' || performance.navigation?.type === 1;
 if (!reloaded) return dbGet('project');
 return new Promise((resolve, reject) => {
   const tx = db.transaction('workspace', 'readwrite');
   tx.objectStore('workspace').delete('project');
   tx.oncomplete = () => resolve(undefined);
   tx.onabort = () => reject(tx.error);
   tx.onerror = () => reject(tx.error);
 });
}
async function start() {
 for (const [id,name] of Object.entries(builtins)) media.set(id,{name,src:artworkSources[id]});
 try {
   db = await openDB();
   const [uploads, fonts, project] = await Promise.all([dbGet('media'), dbGet('fonts'), readProjectOnOpen()]);
   for (const [id, item] of uploads || []) media.set(id, item);
   for (const [name, src] of fonts || []) await addFace(name, src);
   if (project && media.has(project.photo) && targets[project.format]) {
     state = project;
     // Earlier projects stored the two starter layers at the end of the stack.
     // Added layers always went to the front. Preserve every layer and its text.
     if (state.text.length && state.text.every(layer => !layer.role)) {
       const last = state.text[state.text.length-1];
       const artist = last.tracking === .28 ? last : null;
       const title = state.text[state.text.length-(artist ? 2 : 1)];
       for (const layer of state.text) layer.role = 'text';
       if (title) title.role = 'title';
       if (artist) artist.role = 'artist';
     }
     $('savestatus').textContent = 'Saved locally · refresh resets cover';
   } else {
     $('savestatus').textContent = 'Fresh cover';
   }
 } catch {
   $('savestatus').textContent = 'Session workspace';
 }
 ready = true;
 sync();
}
setupMaskEditor();
start();
