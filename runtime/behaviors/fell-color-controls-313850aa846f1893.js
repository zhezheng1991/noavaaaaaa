export default function install(app) {
 const layer=app.layers[app.config.layerId]; app.assert(layer,'Fells layer is missing.');
 const mount=app.getMount('fell-colors');
 const root=document.createElement('div'); root.style.cssText='display:grid;gap:14px;min-width:0;color:var(--calcite-color-text-1);font:14px/1.5 sans-serif';
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const note=make('p','Triangle size shows height. Color shows prominence; choose a ramp or edit its three samples.'); note.style.margin='0';root.append(note);
 const palettes={'Blue → red':['#2166ac','#f7f7f7','#b2182b'],'Purple → orange':['#542788','#f7f7f7','#b35806'],'Green → purple':['#1b7837','#f7f7f7','#762a83'],'Yellow → blue':['#ffffcc','#41b6c4','#253494']};
 const label=make('label','Color ramp');label.style.cssText='display:grid;gap:6px';
 const select=make('select');select.setAttribute('aria-label','Prominence color ramp');select.style.cssText='width:100%;min-width:0;padding:8px;background:var(--calcite-color-foreground-1);color:var(--calcite-color-text-1);border:1px solid var(--calcite-color-border-2)';
 for(const name of [...Object.keys(palettes),'Custom']){const o=make('option',name);o.value=name;select.append(o);}label.append(select);root.append(label);
 const ramp=make('div');ramp.style.cssText='height:22px;border:1px solid var(--calcite-color-border-2);border-radius:3px';ramp.setAttribute('role','img');root.append(ramp);
 const range=make('div','Low 0 m  →  High 912.2 m');root.append(range);
 const samples=make('div');samples.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px';root.append(samples);
 const inputs=[],hexes=[];const cleanups=[];
 const listen=(el,event,fn)=>{el.addEventListener(event,fn);cleanups.push(()=>el.removeEventListener(event,fn));};
 ['Low','Middle','High'].forEach((name,i)=>{const row=make('label',name);row.style.cssText='display:grid;gap:6px;min-width:0';const input=make('input');input.type='color';input.setAttribute('aria-label',name+' prominence color');input.style.cssText='width:100%;height:38px;box-sizing:border-box;cursor:pointer';const hex=make('span');hex.style.fontSize='12px';row.append(input,hex);samples.append(row);inputs.push(input);hexes.push(hex);listen(input,'input',()=>dispatch({colors:inputs.map(v=>v.value)}));});
 const buttons=make('div');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap';const reverse=make('button','Reverse ramp'),reset=make('button','Reset blue → red');for(const b of [reverse,reset]){b.type='button';b.style.cssText='padding:8px;cursor:pointer;border:1px solid var(--calcite-color-border-2);background:var(--calcite-color-foreground-1);color:var(--calcite-color-text-1)';buttons.append(b);}root.append(buttons);
 const status=make('p');status.setAttribute('aria-live','polite');status.style.margin='0';root.append(status);mount.replaceChildren(root);
 function current(){const v=layer.renderer.visualVariables.find(v=>v.type==='color');return v.stops.map(s=>s.color.toHex());}
 function sync(colors){inputs.forEach((v,i)=>{v.value=colors[i];hexes[i].textContent=colors[i];});ramp.style.background='linear-gradient(to right,'+colors.join(',')+')';ramp.setAttribute('aria-label','Prominence color samples: '+colors.join(', '));select.value=Object.keys(palettes).find(k=>palettes[k].every((c,i)=>c.toLowerCase()===colors[i].toLowerCase()))||'Custom';}
 function apply(payload={}){const colors=payload.preset?palettes[payload.preset]:payload.colors;app.assert(Array.isArray(colors)&&colors.length===3&&colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)),'Choose three valid colors.');const renderer=layer.renderer.clone();renderer.visualVariables=renderer.visualVariables.map(v=>{if(v.type!=='color')return v.clone();const copy=v.clone();copy.stops=v.stops.map((s,i)=>({value:s.value,label:s.label,color:colors[i]}));return copy;});layer.renderer=renderer;sync(colors);status.textContent='Ramp applied. Height sizing unchanged.';return {colors:current(),sizeField:renderer.visualVariables.find(v=>v.type==='size').field,symbol:renderer.symbol.style};}
 const action=app.actions.register('set-fell-ramp',apply);app.onCleanup(()=>action.remove());
 function dispatch(payload){Promise.resolve(app.actions.invoke('set-fell-ramp',payload)).catch(e=>{status.textContent='Could not change colors: '+e.message;app.reportError(e);});}
 listen(select,'change',()=>{if(palettes[select.value])dispatch({preset:select.value});});listen(reverse,'click',()=>dispatch({colors:current().reverse()}));listen(reset,'click',()=>dispatch({preset:'Blue → red'}));
 sync(current());status.textContent='Height: 37–978.07 m · symbol sizes: 5–24 pt';
 app.onCleanup(()=>{cleanups.forEach(fn=>fn());mount.replaceChildren();});
}