(() => {
  const SCHEMA_VERSION = 2;
  const CONFIG_ENDPOINT = '';
  const SUBMISSION_ENDPOINT = '';
  const params = new URLSearchParams(location.search);
  const linkToken = params.get('access') || '';
  const STORAGE_KEY = linkToken ? `waimarinoSpeedShearEntryManagerV2_${linkToken}` : 'waimarinoSpeedShearEntryManagerV2_manual';

  const $ = id => document.getElementById(id);
  const els = {
    competitionName:$('competitionName'),competitionDate:$('competitionDate'),venue:$('venue'),bookingReference:$('bookingReference'),setupNotice:$('setupNotice'),
    publicEntryCard:$('publicEntryCard'),publicEntryUrl:$('publicEntryUrl'),copyPublicEntryBtn:$('copyPublicEntryBtn'),refreshEntriesBtn:$('refreshEntriesBtn'),
    gradeSelect:$('gradeSelect'),customGrade:$('customGrade'),addGradeBtn:$('addGradeBtn'),gradesContainer:$('gradesContainer'),
    submitAllBtn:$('submitAllBtn'),downloadAllBtn:$('downloadAllBtn'),loadBtn:$('loadBtn'),loadFile:$('loadFile'),globalStatus:$('globalStatus'),
    dialog:$('confirmDialog'),dialogTitle:$('dialogTitle'),dialogBody:$('dialogBody'),savedToast:$('savedToast')
  };

  let state = {
    schemaVersion:SCHEMA_VERSION,type:'speed_shear_entry_manager',bookingReference:'',accessToken:linkToken,publicEntryUrl:'',competition:{name:'',date:'',venue:''},grades:[],submissionHistory:[]
  };
  let saveTimer;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function clean(v){return String(v||'').trim().replace(/\s+/g,' ');}
  function key(v){return clean(v).toLowerCase();}
  function capitalizeWordSegment(value){
    const lower=String(value||'').toLowerCase();
    const idx=lower.search(/[a-z]/i);
    if(idx<0)return lower;
    return lower.slice(0,idx)+lower.charAt(idx).toUpperCase()+lower.slice(idx+1);
  }
  const ACRONYM_WHITELIST={NZ:'NZ',US:'US',USA:'USA',UK:'UK',UAE:'UAE',EU:'EU',SA:'SA',AU:'AU',AUS:'AUS',NSW:'NSW',VIC:'VIC',QLD:'QLD',ACT:'ACT',WA:'WA',NT:'NT','A&P':'A&P'};
  function smartTitle(value){
    const text=clean(value); if(!text)return '';
    return text.split(' ').map(word=>word.split('-').map(part=>{
      const match=part.match(/(^[^A-Za-z0-9]*)([A-Za-z0-9&']+)([^A-Za-z0-9]*$)/);
      if(!match)return capitalizeWordSegment(part);
      const [,lead,core,trail]=match;
      const upper=core.toUpperCase();
      let replacement='';
      if(upper==='MT')replacement='Mt';
      else if(Object.prototype.hasOwnProperty.call(ACRONYM_WHITELIST,upper))replacement=ACRONYM_WHITELIST[upper];
      else if(/^[A-Z]{2,4}$/.test(core))replacement=core;
      else{
        replacement=core.split("'").map(capitalizeWordSegment).join("'");
        replacement=replacement.replace(/^Mc([a-z])/,(_m,c)=>`Mc${c.toUpperCase()}`);
      }
      return `${lead}${replacement}${trail}`;
    }).join('-')).join(' ');
  }
  function competitorKey(c){return `${key(c.name)}|${key(c.town)}`;}
  function uid(){return crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
  function gradeById(id){return state.grades.find(g=>g.id===id);}
  function gradeByName(name){return state.grades.find(g=>key(g.name)===key(name));}
  function setStatus(msg,kind=''){els.globalStatus.className=`status ${kind}`;els.globalStatus.textContent=msg||'';}

  function syncHeaderToState(){
    state.competition.name=clean(els.competitionName.value);
    state.competition.date=els.competitionDate.value||'';
    state.competition.venue=clean(els.venue.value);
    state.bookingReference=clean(els.bookingReference.value);
  }
  function syncStateToHeader(){
    els.competitionName.value=state.competition.name||'';
    els.competitionDate.value=state.competition.date||'';
    els.venue.value=state.competition.venue||'';
    els.bookingReference.value=state.bookingReference||'';
    if(state.publicEntryUrl){els.publicEntryUrl.value=state.publicEntryUrl;els.publicEntryCard.classList.remove('hidden');}
  }
  function persist(){syncHeaderToState();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{persist();els.savedToast.classList.add('show');setTimeout(()=>els.savedToast.classList.remove('show'),900);},500);}
  function newGrade(name){return {id:uid(),name:clean(name),competitors:[],submissionVersion:0,lastSubmittedAt:null};}

  function addGrade(name){
    name=clean(name);if(!name)return;
    if(gradeByName(name)){setStatus(`${name} already exists.`,'warn');return;}
    state.grades.push(newGrade(name));els.customGrade.value='';render();scheduleSave();
  }

  function addCompetitor(gradeId,name,town='',extra={}){
    const grade=gradeById(gradeId);if(!grade)return false;
    const c={id:extra.id||uid(),name:smartTitle(name),town:smartTitle(town),phone:clean(extra.phone),email:clean(extra.email),source:extra.source||'manual',checkedIn:Boolean(extra.checkedIn),createdAt:extra.createdAt||new Date().toISOString()};
    if(!c.name||grade.competitors.some(x=>competitorKey(x)===competitorKey(c)))return false;
    grade.competitors.push(c);return true;
  }

  function mergeRemoteCompetitors(entries){
    let added=0;
    (entries||[]).forEach(entry=>{
      let grade=gradeByName(entry.grade);
      if(!grade){grade=newGrade(entry.grade);state.grades.push(grade);}
      const byId=grade.competitors.find(c=>entry.id&&c.id===entry.id);
      if(byId){
        byId.phone=clean(entry.phone);byId.email=clean(entry.email);byId.source='public-entry';byId.createdAt=entry.createdAt||byId.createdAt;return;
      }
      const byDetails=grade.competitors.find(c=>competitorKey(c)===competitorKey(entry));
      if(byDetails){
        byDetails.id=entry.id||byDetails.id;byDetails.phone=clean(entry.phone);byDetails.email=clean(entry.email);byDetails.source='public-entry';byDetails.createdAt=entry.createdAt||byDetails.createdAt;return;
      }
      if(addCompetitor(grade.id,entry.name,entry.town,{...entry,checkedIn:false,source:'public-entry'}))added++;
    });
    return added;
  }

  function parseLine(line){
    const text=clean(line);if(!text)return null;
    const comma=text.indexOf(',');if(comma>=0)return {name:clean(text.slice(0,comma)),town:clean(text.slice(comma+1))};
    const tab=text.match(/^(.*?)\t+(.*)$/);if(tab)return {name:clean(tab[1]),town:clean(tab[2])};
    const dash=text.match(/^(.*?)\s+[\-–—]\s+(.*)$/);if(dash)return {name:clean(dash[1]),town:clean(dash[2])};
    const spaces=text.match(/^(.*?)\s{2,}(\S.*)$/);if(spaces)return {name:clean(spaces[1]),town:clean(spaces[2])};
    return {name:text,town:''};
  }

  function checkedCount(g){return g.competitors.filter(c=>c.checkedIn).length;}
  function publicCount(g){return g.competitors.filter(c=>c.source==='public-entry').length;}
  function render(){
    syncStateToHeader();
    if(!state.grades.length){els.gradesContainer.innerHTML='<p class="status">No grades or events added yet.</p>';return;}
    els.gradesContainer.innerHTML=state.grades.map(g=>{
      const rows=g.competitors.map((c,i)=>`<tr data-cid="${esc(c.id)}"><td>${i+1}</td><td><input data-edit="name" value="${esc(c.name)}"></td><td><input data-edit="town" value="${esc(c.town)}"></td><td><div>${esc(c.phone||'')}</div><div class="small-note">${esc(c.email||'')}</div></td><td><button class="check-btn ${c.checkedIn?'checked':''}" data-action="toggle-check">${c.checkedIn?'Checked In ✓':'Not Checked In'}</button></td><td><button class="secondary" data-action="remove-competitor">Remove</button></td></tr>`).join('');
      return `<article class="grade-card" data-grade-id="${g.id}"><div class="grade-head"><div><h3>${esc(g.name)}</h3><div class="badges"><span class="badge">Total: ${g.competitors.length}</span><span class="badge green">Checked in: ${checkedCount(g)}</span>${publicCount(g)?`<span class="badge public">Online entries: ${publicCount(g)}</span>`:''}${g.submissionVersion?`<span class="badge">Submitted v${g.submissionVersion}</span>`:''}</div></div><div class="grade-actions"><button data-action="submit-grade">Submit ${esc(g.name)} Entries</button><button class="secondary" data-action="download-grade">Download</button><button class="secondary" data-action="remove-grade">Remove Grade</button></div></div><div class="quick-row"><input data-role="quick-name" placeholder="Competitor name"><input data-role="quick-town" placeholder="Hometown (optional)"><button data-action="add-competitor">Add Competitor</button></div><div class="bulk"><details><summary><strong>Add a list of names</strong></summary><textarea data-role="bulk-text" placeholder="One competitor per line. Name or Name, Town"></textarea><div class="bulk-actions"><button data-action="bulk-add">Add From List</button><span class="status" data-role="bulk-status"></span></div></details></div><table class="competitor-table"><thead><tr><th>#</th><th>Name</th><th>Town</th><th>Contact</th><th>Check-in</th><th>Remove</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No competitors added yet.</td></tr>'}</tbody></table></article>`;
    }).join('');
  }

  function submissionPayload(grades,mode){
    syncHeaderToState();
    return {schemaVersion:2,type:'speed_shear_roster_submission',bookingReference:state.bookingReference,accessToken:state.accessToken,competition:{...state.competition},submission:{mode,submittedAt:new Date().toISOString()},grades:Object.fromEntries(grades.map(g=>[g.name,g.competitors.filter(c=>c.checkedIn).map(c=>({name:c.name,town:c.town||''}))]))};
  }
  function unconfirmed(grades){return grades.flatMap(g=>g.competitors.filter(c=>!c.checkedIn).map(c=>({grade:g.name,name:c.name,town:c.town})));}
  async function confirmSubmission(grades,label){
    const missing=unconfirmed(grades),included=grades.reduce((n,g)=>n+checkedCount(g),0);
    if(!included){setStatus('There are no checked-in competitors to submit.','warn');return false;}
    if(!missing.length)return true;
    els.dialogTitle.textContent=`Submit ${label}?`;
    els.dialogBody.innerHTML=`<p><strong>${included} checked-in competitor${included===1?'':'s'} will be submitted.</strong></p><p>${missing.length} competitor${missing.length===1?' has':'s have'} not been checked in and will not be included:</p><ul>${missing.map(x=>`<li><strong>${esc(x.name)}</strong>${grades.length>1?` — ${esc(x.grade)}`:''}</li>`).join('')}</ul>`;
    els.dialog.showModal();
    return new Promise(resolve=>els.dialog.addEventListener('close',()=>resolve(els.dialog.returnValue==='confirm'),{once:true}));
  }
  function filename(payload,suffix){const comp=(payload.competition.name||'Competition').replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'');return `${comp}_${payload.bookingReference||'NoRef'}_${suffix}.json`;}
  function downloadJson(payload,name){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

  async function postManager(payload){
    if(!SUBMISSION_ENDPOINT)return {ok:false,offline:true};
    try{
      await fetch(SUBMISSION_ENDPOINT,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload)});
      return {ok:true};
    }catch(error){return {ok:false,error};}
  }

  async function sendSubmission(grades,mode,label){
    if(!await confirmSubmission(grades,label))return;
    const payload=submissionPayload(grades,mode);
    if(SUBMISSION_ENDPOINT){
      const result=await postManager(payload);
      if(!result.ok){setStatus('Could not send submission. A roster file has been downloaded as backup.','warn');downloadJson(payload,filename(payload,mode==='all'?'AllEntries':label));return;}
      setStatus(`${label} submission sent.`,'ok');
    }else{
      downloadJson(payload,filename(payload,mode==='all'?'AllEntries':label));
      setStatus('Backend connection is not deployed yet. Submission file downloaded for testing.','warn');
    }
    grades.forEach(g=>{g.submissionVersion=(g.submissionVersion||0)+1;g.lastSubmittedAt=new Date().toISOString();});
    state.submissionHistory.push({mode,grades:grades.map(g=>g.name),submittedAt:new Date().toISOString()});render();scheduleSave();
  }

  async function fetchCompetitionSetup(showMessage=false){
    const token=state.accessToken||linkToken;if(!token)return;
    if(!CONFIG_ENDPOINT){els.setupNotice.textContent='This competition link is ready for backend connection. The live booking handoff has not been deployed yet.';els.setupNotice.classList.remove('hidden');return;}
    try{
      const r=await fetch(`${CONFIG_ENDPOINT}?action=entry-manager&access=${encodeURIComponent(token)}`,{cache:'no-store'}),setup=await r.json();
      if(!setup.ok)throw new Error(setup.error||'Could not load competition');
      applySetup(setup);if(showMessage)setStatus('Entries refreshed.','ok');
    }catch(_){setStatus('Could not refresh this competition.','warn');}
  }

  function applySetup(setup){
    state.bookingReference=setup.bookingReference||state.bookingReference;state.accessToken=setup.accessToken||state.accessToken||linkToken;state.publicEntryUrl=setup.competitorEntryUrl||state.publicEntryUrl;state.competition={...state.competition,...(setup.competition||{})};
    const names=Array.isArray(setup.grades)?setup.grades:Object.keys(setup.competitionSetup?.events||{});names.forEach(name=>{if(!gradeByName(name))state.grades.push(newGrade(name));});
    const added=mergeRemoteCompetitors(setup.competitors||[]);els.setupNotice.textContent='Competition details and grades/events were loaded from the booking request. Please check them before adding competitors.';els.setupNotice.classList.remove('hidden');render();persist();if(added)setStatus(`${added} new online entr${added===1?'y':'ies'} loaded.`,'ok');
  }

  async function removeCompetitor(g,c){
    if(c.source==='public-entry'&&SUBMISSION_ENDPOINT){
      const result=await postManager({type:'speed_shear_manager_competitor_remove',accessToken:state.accessToken,competitorId:c.id});
      if(!result.ok){setStatus('Could not remove that online entry from the central competition record.','warn');return;}
    }
    g.competitors=g.competitors.filter(x=>x.id!==c.id);render();scheduleSave();
  }

  async function updatePublicCompetitor(g,c){
    if(c.source!=='public-entry'||!SUBMISSION_ENDPOINT)return true;
    const result=await postManager({type:'speed_shear_manager_competitor_update',accessToken:state.accessToken,competitorId:c.id,grade:g.name,name:c.name,town:c.town});
    if(!result.ok){setStatus('Could not save that online-entry change to the central competition record.','warn');return false;}
    return true;
  }

  els.gradeSelect.addEventListener('change',()=>els.customGrade.classList.toggle('hidden',els.gradeSelect.value!=='__custom__'));
  els.addGradeBtn.addEventListener('click',()=>addGrade(els.gradeSelect.value==='__custom__'?els.customGrade.value:els.gradeSelect.value));
  [els.competitionName,els.competitionDate,els.venue,els.bookingReference].forEach(el=>el.addEventListener('input',scheduleSave));
  els.copyPublicEntryBtn.addEventListener('click',async()=>{if(!state.publicEntryUrl)return;try{await navigator.clipboard.writeText(state.publicEntryUrl);setStatus('Public competitor entry link copied.','ok');}catch(_){els.publicEntryUrl.select();document.execCommand('copy');setStatus('Public competitor entry link copied.','ok');}});
  els.refreshEntriesBtn.addEventListener('click',()=>fetchCompetitionSetup(true));

  els.gradesContainer.addEventListener('click',async e=>{
    const btn=e.target.closest('button[data-action]');if(!btn)return;
    const card=btn.closest('.grade-card'),g=gradeById(card?.dataset.gradeId);if(!g)return;
    const action=btn.dataset.action;
    if(action==='add-competitor'){
      const n=card.querySelector('[data-role="quick-name"]'),t=card.querySelector('[data-role="quick-town"]');
      if(!addCompetitor(g.id,n.value,t.value))return setStatus('Enter a name, or check that the competitor is not already listed.','warn');render();scheduleSave();return;
    }
    if(action==='bulk-add'){
      const ta=card.querySelector('[data-role="bulk-text"]');let added=0,skipped=0;ta.value.split(/\r?\n/).forEach(line=>{const p=parseLine(line);if(!p)return;if(addCompetitor(g.id,p.name,p.town))added++;else skipped++;});card.querySelector('[data-role="bulk-status"]').textContent=`Added: ${added} • Skipped: ${skipped}`;ta.value='';render();scheduleSave();return;
    }
    if(action==='remove-grade'){state.grades=state.grades.filter(x=>x.id!==g.id);render();scheduleSave();return;}
    if(action==='submit-grade'){await sendSubmission([g],'grade',g.name);return;}
    if(action==='download-grade'){const p=submissionPayload([g],'grade');downloadJson(p,filename(p,g.name.replace(/\s+/g,'')));return;}
    const row=btn.closest('tr[data-cid]');if(!row)return;
    const c=g.competitors.find(x=>x.id===row.dataset.cid);if(!c)return;
    if(action==='toggle-check'){c.checkedIn=!c.checkedIn;render();scheduleSave();}
    if(action==='remove-competitor')await removeCompetitor(g,c);
  });

  els.gradesContainer.addEventListener('change',async e=>{
    const input=e.target.closest('input[data-edit]');if(!input)return;
    const card=input.closest('.grade-card'),row=input.closest('tr[data-cid]'),g=gradeById(card.dataset.gradeId),c=g?.competitors.find(x=>x.id===row.dataset.cid);if(!c)return;
    const previous={name:c.name,town:c.town};c[input.dataset.edit]=smartTitle(input.value);
    if(!c.name||g.competitors.some(x=>x.id!==c.id&&competitorKey(x)===competitorKey(c))){Object.assign(c,previous);setStatus('That edit would create a blank or duplicate competitor.','warn');render();scheduleSave();return;}
    if(!await updatePublicCompetitor(g,c)){Object.assign(c,previous);}
    render();scheduleSave();
  });

  els.submitAllBtn.addEventListener('click',()=>sendSubmission(state.grades,'all','all entries'));
  els.downloadAllBtn.addEventListener('click',()=>{const p=submissionPayload(state.grades,'all');downloadJson(p,filename(p,'FullRoster'));});
  els.loadBtn.addEventListener('click',()=>els.loadFile.click());
  els.loadFile.addEventListener('change',async()=>{
    const f=els.loadFile.files?.[0];if(!f)return;
    try{
      const p=JSON.parse(await f.text());
      if(p.type!=='roster_pack'||!p.rosters)throw new Error('Unsupported file');
      state.competition.name=p.competitionName||state.competition.name;
      state.grades=Object.entries(p.rosters).map(([name,list])=>{const g=newGrade(name);(list||[]).forEach(v=>{const c={id:uid(),name:smartTitle(v.name||v),town:smartTitle(v.town||''),phone:'',email:'',source:'import',checkedIn:false,createdAt:new Date().toISOString()};if(c.name&&!g.competitors.some(x=>competitorKey(x)===competitorKey(c)))g.competitors.push(c);});return g;});
      render();scheduleSave();setStatus('Roster file loaded.','ok');
    }catch(_){setStatus('Could not load that roster file.','warn');}finally{els.loadFile.value='';}
  });

  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved?.schemaVersion===SCHEMA_VERSION)state={...state,...saved,accessToken:linkToken||saved.accessToken||''};}catch(_){}
  render();if(linkToken)fetchCompetitionSetup(false);
})();
