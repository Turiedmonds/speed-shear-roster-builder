/*
Standalone Google Apps Script web-app router for the Entry Manager.
The deployment URL is added to entry-manager.js and competitor-entry.js after deployment.

Required Script Property:
ENTRY_MANAGER_SHARED_SECRET = a long random secret shared only with the Booking Receiver Apps Script project.
*/

const ENTRY_MANAGER_SHORT_CODE_LENGTH = 20;
const ENTRY_MANAGER_PUBLIC_BASE_URL = 'https://entries.waimarinoshears.com/';
const ENTRY_MANAGER_MANAGER_RESULT_TTL_SECONDS = 300;

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action || '').trim();
    if (action === 'entry-manager') {
      entryManagerAssertManagerTokenAvailable_(e.parameter.access || '');
      const setup = entryManagerPublicSetup_(e.parameter.access || '');
      setup.competitorEntryUrl = entryManagerShortPublicUrlFromLong_(setup.competitorEntryUrl || '');
      return entryManagerJsonResponse_(setup);
    }
    if (action === 'competitor-entry') {
      entryManagerAssertPublicTokenAvailable_(e.parameter.entry || '');
      return entryManagerJsonResponse_(entryManagerCompetitorSetupV4_(e.parameter.entry || ''));
    }
    if (action === 'competitor-entry-result') {
      entryManagerAssertPublicTokenAvailable_(e.parameter.entry || '');
      return entryManagerJsonResponse_(entryManagerPublicSubmissionResult_(e.parameter.entry || '', e.parameter.requestId || ''));
    }
    if (action === 'manager-write-result') {
      const accessToken = e.parameter.access || '';
      entryManagerAssertManagerTokenAvailable_(accessToken);
      return entryManagerJsonResponse_(entryManagerManagerWriteResult_(accessToken, e.parameter.requestId || ''));
    }
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
        entryManagerAssertPublicTokenAvailable_(payload.entryToken || '');
        const result = entryManagerSaveCompetitorEntryV4_(payload);
        entryManagerStorePublicSubmissionResult_(payload.entryToken || '', payload.requestId || '', result);
        return entryManagerJsonResponse_(result);
      } catch (error) {
        const result = {ok:false,error:String(error && error.message || error)};
        entryManagerStorePublicSubmissionResult_(payload.entryToken || '', payload.requestId || '', result);
        return entryManagerJsonResponse_(result);
      }
    }

    if (entryManagerIsManagerWritePayload_(payload)) {
      entryManagerAssertManagerTokenAvailable_(payload.accessToken || '');
      const result = entryManagerDispatchManagerWrite_(payload);
      entryManagerStoreManagerWriteResult_(payload.accessToken || '', payload.requestId || '', result);
      return entryManagerJsonResponse_(result);
    }

    throw new Error('Unsupported Entry Manager request.');
  } catch (error) {
    console.error(error);
    const result = {ok:false,error:String(error && error.message || error)};
    if (entryManagerIsManagerWritePayload_(payload)) {
      try {
        entryManagerStoreManagerWriteResult_(payload.accessToken || '', payload.requestId || '', result);
      } catch (storeError) {
        console.error('Could not store manager write failure result:', storeError);
      }
    }
    return entryManagerJsonResponse_(result);
  }
}

function entryManagerIsManagerWritePayload_(payload) {
  const type = String(payload && payload.type || '');
  return type.indexOf('speed_shear_manager_') === 0 || type === 'speed_shear_roster_submission';
}

function entryManagerDispatchManagerWrite_(payload) {
  if (payload.type === 'speed_shear_manager_entry_settings') return entryManagerSaveEntrySettings_(payload);
  if (payload.type === 'speed_shear_manager_grade_settings') return entryManagerSaveGradeSettings_(payload);
  if (payload.type === 'speed_shear_manager_grade_add') return entryManagerAddGrade_(payload);
  if (payload.type === 'speed_shear_manager_grade_remove') return entryManagerRemoveGrade_(payload);
  if (payload.type === 'speed_shear_manager_grade_reorder') return entryManagerReorderGrades_(payload);
  if (payload.type === 'speed_shear_manager_competitor_upsert') return entryManagerUpsertCompetitor_(payload);
  if (payload.type === 'speed_shear_manager_competitor_checkin') return entryManagerSetCheckIn_(payload);
  if (payload.type === 'speed_shear_manager_competitor_update') return entryManagerUpdateCompetitor_(payload);
  if (payload.type === 'speed_shear_manager_competitor_remove') return entryManagerRemoveCompetitor_(payload);
  if (payload.type === 'speed_shear_roster_submission') return entryManagerSaveSubmissionV3_(payload);
  throw new Error('Unsupported Entry Manager manager request.');
}

function entryManagerManagerWriteResult_(accessToken, requestId) {
  const cleanRequestId = String(requestId || '').trim();
  if (!cleanRequestId) throw new Error('Manager write request ID is missing.');
  const cached = CacheService.getScriptCache().get(entryManagerManagerWriteCacheKey_(accessToken, cleanRequestId));
  if (!cached) return {ok:false,pending:true};
  try {
    return JSON.parse(cached);
  } catch (_) {
    return {ok:false,error:'The saved manager result could not be read.'};
  }
}

function entryManagerStoreManagerWriteResult_(accessToken, requestId, result) {
  const cleanAccessToken = String(accessToken || '').trim();
  const cleanRequestId = String(requestId || '').trim();
  if (!cleanAccessToken || !cleanRequestId) return;
  CacheService.getScriptCache().put(
    entryManagerManagerWriteCacheKey_(cleanAccessToken, cleanRequestId),
    JSON.stringify(result || {ok:false,error:'No manager result was returned.'}),
    ENTRY_MANAGER_MANAGER_RESULT_TTL_SECONDS
  );
}

function entryManagerManagerWriteCacheKey_(accessToken, requestId) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(accessToken || '') + '|' + String(requestId || ''),
    Utilities.Charset.UTF_8
  );
  return 'managerWrite_' + digest.map(function (value) {
    const byte = value < 0 ? value + 256 : value;
    return ('0' + byte.toString(16)).slice(-2);
  }).join('');
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
  return ENTRY_MANAGER_PUBLIC_BASE_URL + 'manage/?c=' + encodeURIComponent(entryManagerShortCode_(token));
}

function entryManagerShortCompetitorUrl_(token) {
  return ENTRY_MANAGER_PUBLIC_BASE_URL + 'enter/?c=' + encodeURIComponent(entryManagerShortCode_(token));
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

  const token = matches[0].slice(propertyPrefix.length);
  if (propertyPrefix === 'entryManagerToken_') entryManagerAssertManagerTokenAvailable_(token);
  if (propertyPrefix === 'entryPublicToken_') entryManagerAssertPublicTokenAvailable_(token);
  return token;
}

function entryManagerCreateCompetitionFromSetup_(setupPayload) {
  entryManagerPrepareReferenceForSetup_(setupPayload.bookingReference || '');

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
