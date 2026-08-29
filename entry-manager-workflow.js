(() => {
  const VERSION='1.1.1';
  const params=new URLSearchParams(location.search);
  const accessToken=params.get('access')||'';
  const stateKey=accessToken?`waimarinoSpeedShearEntryManagerV3_${accessToken}`:'waimarinoSpeedShearEntryManagerV3_manual';
  const programmeKey=accessToken?`waimarinoEntryProgramme_${accessToken}`:'waimarinoEntryProgramme_manual';
  let bypassGradeId='';
  let pendingSubmittedGradeId='';
  let initialProgrammeOrderApplied=false;
  let decorateQueued=false;
  let initialised=false;

  function clean(v){return String(v||'').trim();}
  function readState(){try{return JSON.parse(localStorage.getItem(stateKey)||'null')||null;}catch(_){return null;}}
  function saveProgramme(program){if(!Array.isArray(program))return;try{sessionStorage.setItem(programmeKey,JSON.stringify(program));}catch(_){} }
  function readProgramme(){try{const p=JSON.parse(sessionStorage.getItem(programmeKey)||'[]');return Array.isArray(p)?p:[];}catch(_){return [];}}
  function programmeFromSetup(setup){const candidates=[setup?.competitionSetup?.program,setup?.competitionSetup?.programme,setup?.program,setup?.programme];return candidates.find(Array.isArray)||[];}

  // Capture the Booking Pack programme when the normal Entry Manager setup request is made.
  const nativeFetch=window.fetch?.bind(window);
  if(nativeFetch){
    window.fetch=async(...args)=>{
      const response=await nativeFetch(...args);
      try{
        const url=String(args[0]?.url||args[0]||'');
        if(url.includes('action=entry-manager')){
          response.clone().json().then(setup=>{
            const programme=programmeFromSetup(setup);
            if(programme.length){saveProgramme(programme);queueDecorate();}
          }).catch(()=>{});
        }
      }catch(_){}
      return response;
    };
  }

  function gradeName(card){return clean(card?.querySelector('.grade-title-row h3')?.textContent);}
  function normalisedProgramme(){
    return readProgramme().map((item,index)=>({
      grade:clean(item?.grade||item?.event||item?.name),
      round:clean(item?.round||item?.roundName||''),
      sequence:Number(item?.sequence)||index+1
    })).filter(x=>x.grade);
  }
  function heatGradeOrder(){
    const programme=normalisedProgramme();
    const heats=programme.filter(x=>/^heats?$/i.test(x.round));
    const source=heats.length?heats:programme;
    const seen=new Set();
    return source.map(x=>x.grade).filter(name=>{const k=name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  }

  function moveCardToIndex(grade,targetIndex){
    let safety=100;
    const step=()=>{
      if(--safety<0)return;
      const cards=[...document.querySelectorAll('#gradesContainer .grade-card')];
      const current=cards.findIndex(c=>gradeName(c).toLowerCase()===grade.toLowerCase());
      if(current<0||current===targetIndex)return;
      const card=cards[current];
      const action=current>targetIndex?'move-up':'move-down';
      const btn=card.querySelector(`[data-action="${action}"]`);
      if(!btn||btn.disabled)return;
      btn.click();
      window.setTimeout(step,55);
    };
    step();
  }

  function applyProgrammeOrder(){
    if(initialProgrammeOrderApplied)return;
    const order=heatGradeOrder();
    if(!order.length)return;
    const cards=[...document.querySelectorAll('#gradesContainer .grade-card')];
    if(!cards.length)return;
    initialProgrammeOrderApplied=true;
    const active=order.filter(name=>cards.some(c=>gradeName(c).toLowerCase()===name.toLowerCase()&&!c.classList.contains('submitted')));
    active.forEach((grade,index)=>window.setTimeout(()=>moveCardToIndex(grade,index),index*90));
    window.setTimeout(moveExistingSubmittedToBottom,active.length*100+150);
  }

  function moveExistingSubmittedToBottom(){
    const submitted=[...document.querySelectorAll('#gradesContainer .grade-card.submitted')].map(gradeName).filter(Boolean);
    submitted.forEach((grade,index)=>window.setTimeout(()=>moveGradeToBottom(grade,false),index*100));
  }

  function moveGradeToBottom(grade,collapse=true){
    let safety=100;
    const step=()=>{
      if(--safety<0)return;
      const cards=[...document.querySelectorAll('#gradesContainer .grade-card')];
      const card=cards.find(c=>gradeName(c).toLowerCase()===grade.toLowerCase());
      if(!card)return;
      if(collapse&&!card.classList.contains('collapsed')){
        card.querySelector('[data-action="toggle-collapse"]')?.click();
        return window.setTimeout(step,70);
      }
      const down=card.querySelector('[data-action="move-down"]');
      if(!down||down.disabled)return;
      down.click();
      window.setTimeout(step,70);
    };
    step();
  }

  function makeRemoveIcon(card){
    const remove=card.querySelector('[data-action="remove-grade"]');
    const tools=card.querySelector('.card-tools');
    if(!remove||!tools||remove.classList.contains('remove-grade-icon'))return;
    remove.textContent='';
    remove.className='icon-btn remove-grade-icon';
    remove.setAttribute('aria-label',`Remove ${gradeName(card)} grade`);
    remove.title='Remove grade';
    tools.appendChild(remove);
  }

  function moveDownloadsToFooter(card){
    const body=card.querySelector('.grade-body');
    if(!body)return;
    let footer=body.querySelector('.grade-download-footer');
    if(!footer){footer=document.createElement('div');footer.className='grade-download-footer';body.appendChild(footer);}
    ['download-grade','download-pdf'].forEach(action=>{
      const btn=card.querySelector(`[data-action="${action}"]`);
      if(btn&&btn.parentElement!==footer)footer.appendChild(btn);
    });
    const oldRow=card.querySelector('.grade-secondary-actions');
    if(oldRow&&!oldRow.querySelector('button'))oldRow.remove();
  }

  function decorateCards(){
    document.querySelectorAll('#gradesContainer .grade-card').forEach(card=>{
      makeRemoveIcon(card);
      moveDownloadsToFooter(card);
    });
  }

  function programmeStatus(grade,state){
    const g=(state?.grades||[]).find(x=>clean(x.name).toLowerCase()===grade.toLowerCase());
    return g?.submitted?'Submitted':'';
  }
  function renderProgramme(){
    const content=document.getElementById('programmeContent');
    if(!content)return;
    const programme=normalisedProgramme();
    if(!programme.length){
      content.innerHTML='<div class="programme-empty">The Programme of Events will appear here when this competition is loaded from its confirmed Booking Pack.</div>';
      return;
    }
    const state=readState();
    const firstActive=programme.find(item=>!programmeStatus(item.grade,state));
    content.innerHTML=`<div class="programme-list">${programme.map((item,index)=>{
      const status=programmeStatus(item.grade,state);
      const current=!status&&firstActive&&item.grade===firstActive.grade&&item.round===firstActive.round;
      return `<div class="programme-row ${status?'done':''} ${current?'current':''}"><span class="programme-number">${index+1}</span><div><div class="programme-grade">${escapeHtml(item.grade)}</div><div class="programme-round">${escapeHtml(item.round||'Event')}</div></div><span class="programme-state">${status||(current?'Next':'')}</span></div>`;
    }).join('')}</div>`;
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}

  function showWorkflowPrompt(card,button){
    const dialog=document.getElementById('submissionWorkflowDialog');
    const title=document.getElementById('submissionWorkflowTitle');
    const body=document.getElementById('submissionWorkflowBody');
    const confirm=document.getElementById('submissionWorkflowConfirm');
    const cancel=document.getElementById('submissionWorkflowCancel');
    const grade=gradeName(card);
    if(!dialog||!confirm||!cancel)return;
    title.textContent=`Close ${grade} entries?`;
    body.innerHTML=`<p>This will close ${escapeHtml(grade)} to new public entries and send the confirmed ${escapeHtml(grade)} roster to Waimarino Shears.</p><div class="workflow-note"><strong>After closing:</strong> the ${escapeHtml(grade)} card will automatically collapse and move to the bottom of the list. You can still expand it again at any time.</div>`;
    confirm.textContent='Close Entries';
    const cleanup=()=>{confirm.onclick=null;cancel.onclick=null;};
    cancel.onclick=()=>{cleanup();dialog.close();};
    confirm.onclick=()=>{
      cleanup();dialog.close();
      bypassGradeId=card.dataset.gradeId||grade;
      pendingSubmittedGradeId=card.dataset.gradeId||grade;
      button.click();
    };
    dialog.showModal();
  }

  function handleSubmitCapture(event){
    const button=event.target.closest('button[data-action="submit-grade"]');
    if(!button)return;
    const card=button.closest('.grade-card');
    if(!card||card.classList.contains('submitted'))return;
    const id=card.dataset.gradeId||gradeName(card);
    if(bypassGradeId===id){bypassGradeId='';return;}
    event.preventDefault();
    event.stopImmediatePropagation();
    showWorkflowPrompt(card,button);
  }

  function checkPendingSubmission(){
    if(!pendingSubmittedGradeId)return;
    const card=[...document.querySelectorAll('#gradesContainer .grade-card')].find(c=>(c.dataset.gradeId||gradeName(c))===pendingSubmittedGradeId);
    if(!card||!card.classList.contains('submitted'))return;
    const grade=gradeName(card);
    pendingSubmittedGradeId='';
    window.setTimeout(()=>moveGradeToBottom(grade,true),90);
  }

  function queueDecorate(){
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>{
      decorateQueued=false;
      decorateCards();
      checkPendingSubmission();
      applyProgrammeOrder();
    });
  }

  function initialise(){
    if(initialised)return;
    initialised=true;
    document.getElementById('programmeBtn')?.addEventListener('click',()=>{
      renderProgramme();
      document.getElementById('programmeDialog')?.showModal();
    });
    document.getElementById('closeProgrammeBtn')?.addEventListener('click',()=>document.getElementById('programmeDialog')?.close());
    const container=document.getElementById('gradesContainer');
    if(container)new MutationObserver(queueDecorate).observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    queueDecorate();
  }

  document.addEventListener('click',handleSubmitCapture,true);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }

  window.__waimarinoEntryManagerWorkflowVersion=VERSION;
})();