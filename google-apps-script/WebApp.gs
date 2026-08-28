/*
Standalone Google Apps Script web-app router for the Entry Manager.
The deployment URL is added to entry-manager.js and competitor-entry.js after deployment.

Required Script Property:
ENTRY_MANAGER_SHARED_SECRET = a long random secret shared only with the Booking Receiver Apps Script project.
*/

const ENTRY_MANAGER_SHORT_CODE_LENGTH = 20;

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action || '').trim();
    if (action === 'entry-manager') {
      const setup = entryManagerPublicSetup_(e.parameter.access || '');
      setup.competitorEntryUrl = entryManagerShortPublicUrlFromLong_(setup.competitorEntryUrl || '');
      return entryManagerJsonResponse_(setup);
    }
    if (action === 'competitor-entry') return entryManagerJsonResponse_(entryManagerCompetitorSetupV4_(e.parameter.entry || ''));
    if (action === 'competitor-entry-result') return entryManagerJsonResponse_(entryManagerPublicSubmissionResult_(e.parameter.entry || '', e.parameter.requestId || ''));
    if (action === 'resolve-public-code') {
      return entryManagerJsonResponse_({ok:true,token:entryManagerResolveTokenPrefix_('entryPublicToken_', e.parameter.code || '')});
    }
    if (action === 'resolve-manager-code') {
      return entryManagerJsonResponse_({ok:true,token:entryManagerResolveTokenPrefix_('entryManagerToken_', e.parameter.code || '')});
    }
    return entryManagerJsonResponse_({ok:true, service:'Waimarino Shears Entry Manager'});
  } catch (error) {
    console.error(error);
    return entryManagerJsonResponse_({ok:false,error:String(error && error.message || error)});
  }
}

function doPost(e) {
  let payload = null;
  try {
    payload = entryManagerParseRequest_(e);
    if (payload.type === 'entry_manager_competition_setup') {
      entryManagerAuthoriseSetup_(payload);
      return entryManagerJsonResponse_(entryManagerCreateCompetitionFromSetup_(payload));
    }
    if (payload.type === 'speed_shear_competitor_entry') {
      try {
        const result = entryManagerSaveCompetitorEntryV4_(payload);
        entryManagerStorePublicSubmissionResult_(payload.entryToken || '', payload.requestId || '', result);
        return entryManagerJsonResponse_(result);
      } catch (error) {
        const result = {ok:false,error:String(error && error.message || error)};
        entryManagerStorePublicSubmissionResult_(payload.entryToken || '', payload.requestId || '', result);
        return entryManagerJsonResponse_(result);
      }
    }
    if (payload.type === 'speed_shear_manager_entry_settings') return entryManagerJsonResponse_(entryManagerSaveEntrySettings_(payload));
    if (payload.type === 'speed_shear_manager_grade_settings') return entryManagerJsonResponse_(entryManagerSaveGradeSettings_(payload));
    if (payload.type === 'speed_shear_manager_grade_add') return entryManagerJsonResponse_(entryManagerAddGrade_(payload));
    if (payload.type === 'speed_shear_manager_grade_remove') return entryManagerJsonResponse_(entryManagerRemoveGrade_(payload));
    if (payload.type === 'speed_shear_manager_grade_reorder') return entryManagerJsonResponse_(entryManagerReorderGrades_(payload));
    if (payload.type === 'speed_shear_manager_competitor_upsert') return entryManagerJsonResponse_(entryManagerUpsertCompetitor_(payload));
    if (payload.type === 'speed_shear_manager_competitor_checkin') return entryManagerJsonResponse_(entryManagerSetCheckIn_(payload));
    if (payload.type === 'speed_shear_manager_competitor_update') return entryManagerJsonResponse_(entryManagerUpdateCompetitor_(payload));
    if (payload.type === 'speed_shear_manager_competitor_remove') return entryManagerJsonResponse_(entryManagerRemoveCompetitor_(payload));
    if (payload.type === 'speed_shear_roster_submission') return entryManagerJsonResponse_(entryManagerSaveSubmissionV3_(payload));
    throw new Error('Unsupported Entry Manager request.');
  } catch (error) {
    console.error(error);
    return entryManagerJsonResponse_({ok:false,error:String(error && error.message || error)});
  }
}

function entryManagerParseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Request data was empty.');
  try { return JSON.parse(e.postData.contents); }
  catch (_) { throw new Error('Request data was not valid JSON.'); }
}

function entryManagerAuthoriseSetup_(payload) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('ENTRY_MANAGER_SHARED_SECRET') || '');
  const supplied = String(payload.sharedSecret || '');
  if (!expected) throw new Error('Entry Manager shared secret is not configured.');
  if (!supplied || supplied !== expected) throw new Error('Entry Manager setup request was not authorised.');
  delete payload.sharedSecret;
}

function entryManagerShortCode_(token) {
  return String(token || '').trim().slice(0, ENTRY_MANAGER_SHORT_CODE_LENGTH);
}

function entryManagerShortManagerUrl_(token) {
  return ENTRY_MANAGER_SETTINGS.publicBaseUrl + 'm.html?c=' + encodeURIComponent(entryManagerShortCode_(token));
}

function entryManagerShortCompetitorUrl_(token) {
  return ENTRY_MANAGER_SETTINGS.publicBaseUrl + 'e.html?c=' + encodeURIComponent(entryManagerShortCode_(token));
}

function entryManagerShortPublicUrlFromLong_(url) {
  const match = /[?&]entry=([^&#]+)/.exec(String(url || ''));
  if (!match) return String(url || '');
  let token = '';
  try { token = decodeURIComponent(match[1]); } catch (_) { token = match[1]; }
  return entryManagerShortCompetitorUrl_(token);
}

function entryManagerResolveTokenPrefix_(propertyPrefix, code) {
  const cleanCode = String(code || '').trim().toLowerCase();
  if (!/^[a-f0-9]{20}$/.test(cleanCode)) throw new Error('This entry link code is invalid.');

  const properties = PropertiesService.getScriptProperties().getProperties();
  const matches = Object.keys(properties).filter(key => {
    if (key.indexOf(propertyPrefix) !== 0) return false;
    return key.slice(propertyPrefix.length).toLowerCase().indexOf(cleanCode) === 0;
  });

  if (matches.length !== 1) throw new Error('This entry link could not be found.');
  return matches[0].slice(propertyPrefix.length);
}

function entryManagerCreateCompetitionFromSetup_(setupPayload) {
  const pack = {
    identity: {bookingReference: String(setupPayload.bookingReference || '')},
    booking: {
      competitionName: String(setupPayload.competition && setupPayload.competition.name || ''),
      competitionDate: String(setupPayload.competition && setupPayload.competition.date || ''),
      venue: String(setupPayload.competition && setupPayload.competition.venue || ''),
      contactPerson: String(setupPayload.organiser && setupPayload.organiser.name || ''),
      email: String(setupPayload.organiser && setupPayload.organiser.email || ''),
      phone: String(setupPayload.organiser && setupPayload.organiser.phone || '')
    },
    competitionSetup: {
      events: JSON.parse(JSON.stringify(setupPayload.competitionSetup && setupPayload.competitionSetup.events || {})),
      program: JSON.parse(JSON.stringify(setupPayload.competitionSetup && setupPayload.competitionSetup.program || []))
    }
  };

  const created = entryManagerCreateCompetition_(pack);
  return {
    ok:true,
    ...created,
    entryManagerUrl:entryManagerShortManagerUrl_(created.managerToken),
    competitorEntryUrl:entryManagerShortCompetitorUrl_(created.publicEntryToken)
  };
}
