(() => {
  const CONFIG_ENDPOINT = '';
  const SUBMISSION_ENDPOINT = '';
  const params = new URLSearchParams(location.search);
  const entryToken = params.get('entry') || '';
  let latestSetup = null;
  const els = {
    competitionName: document.getElementById('competitionName'),competitionDate: document.getElementById('competitionDate'),competitionVenue: document.getElementById('competitionVenue'),
    loadingBox: document.getElementById('loadingBox'),errorBox: document.getElementById('errorBox'),form: document.getElementById('entryForm'),name: document.getElementById('name'),town: document.getElementById('town'),grade: document.getElementById('grade'),phone: document.getElementById('phone'),email: document.getElementById('email'),privacyAccepted: document.getElementById('privacyAccepted'),privacyEmail: document.getElementById('privacyEmail'),submitBtn: document.getElementById('submitBtn'),statusBox: document.getElementById('statusBox')
  };

  function humanDate(value){if(!value)return '';const d=new Date(`${value}T00:00:00`);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('en-NZ',{dateStyle:'long'}).format(d);}
  function humanDateTime(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-NZ',{dateStyle:'medium',timeStyle:'short'}).format(d);}
  function setError(message){els.loadingBox.classList.add('hidden');els.form.classList.add('hidden');els.errorBox.textContent=message;els.errorBox.classList.remove('hidden');}
  function setStatus(message,type){els.statusBox.className=`status ${type||''}`;els.statusBox.textContent=message;els.statusBox.classList.remove('hidden');}

  function applySetup(setup){
    latestSetup=setup;els.competitionName.textContent=setup.competition?.name||'Competition entry';els.competitionDate.textContent=humanDate(setup.competition?.date||'');els.competitionVenue.textContent=setup.competition?.venue||'';
    if(setup.privacyContact){els.privacyEmail.textContent=setup.privacyContact;els.privacyEmail.href=`mailto:${setup.privacyContact}`;}
    els.loadingBox.classList.add('hidden');
    if(setup.entriesOpen===false){const cutoff=humanDateTime(setup.autoCloseAt||'');setError(cutoff?`Public entries for this competition are closed. The online entry cutoff was ${cutoff}. Please contact the competition organiser if on-the-day entries are available.`:'Public entries for this competition are closed. Please contact the competition organiser if on-the-day entries are available.');return;}
    els.errorBox.classList.add('hidden');
    els.grade.innerHTML='<option value="">Select grade / event</option>'+(setup.grades||[]).map(name=>`<option value="${String(name).replaceAll('&','&amp;').replaceAll('"','&quot;')}">${String(name).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</option>`).join('');els.form.classList.remove('hidden');
  }

  async function requestSetup(){
    if(!entryToken)throw new Error('missing link');
    const response=await fetch(`${CONFIG_ENDPOINT}?action=competitor-entry&entry=${encodeURIComponent(entryToken)}`,{cache:'no-store'}),setup=await response.json();
    if(!setup.ok)throw new Error(setup.error||'Competition could not be loaded.');return setup;
  }

  async function loadSetup(){
    if(!entryToken)return setError('This competitor entry link is incomplete. Please ask the competition organiser for the correct link.');
    if(!CONFIG_ENDPOINT){els.loadingBox.textContent='Public competitor entry form is built and ready for backend deployment.';return;}
    try{applySetup(await requestSetup());}catch(_){setError('This competition entry form could not be loaded. Please contact the competition organiser.');}
  }

  els.form.addEventListener('submit',async event=>{
    event.preventDefault();els.statusBox.classList.add('hidden');const name=els.name.value.trim(),town=els.town.value.trim(),grade=els.grade.value,phone=els.phone.value.trim(),email=els.email.value.trim();
    if(!name)return setStatus('Please enter your name.','error');if(!grade)return setStatus('Please choose your grade or event.','error');if(!phone&&!email)return setStatus('Please provide a mobile number or email address.','error');if(!els.privacyAccepted.checked)return setStatus('Please read and accept the privacy notice before submitting.','error');
    if(!SUBMISSION_ENDPOINT)return setStatus('The entry form is ready, but the live submission connection has not been deployed yet.','error');

    els.submitBtn.disabled=true;els.submitBtn.textContent='Checking entries…';
    try{
      if(CONFIG_ENDPOINT){latestSetup=await requestSetup();if(latestSetup.entriesOpen===false){applySetup(latestSetup);return;}}
      const payload={schemaVersion:1,type:'speed_shear_competitor_entry',entryToken,name,town,grade,phone,email,privacyAccepted:true,submittedAt:new Date().toISOString()};
      els.submitBtn.textContent='Submitting…';
      await fetch(SUBMISSION_ENDPOINT,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload)});
      els.form.reset();setStatus('Entry submitted. Your entry is still subject to the organiser’s payment and check-in process.','success');
    }catch(_){setStatus('Your entry could not be sent. Please contact the competition organiser.','error');}
    finally{els.submitBtn.disabled=false;els.submitBtn.textContent='Submit Entry';}
  });

  loadSetup();
})();
