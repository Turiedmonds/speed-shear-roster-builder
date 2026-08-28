/*
System Operator Portal lifecycle guard.

The private operator portal writes operatorControl into the existing central
competition JSON record. This file makes the public Entry Manager web app
honour that status without adding another database or browser secret.
*/

function entryManagerOperatorControl_(record) {
  const current = record && record.operatorControl && typeof record.operatorControl === 'object'
    ? record.operatorControl
    : {};

  return {
    status: current.status === 'cancelled' ? 'cancelled' : 'active',
    depositStatus: current.depositStatus === 'paid' ? 'paid' : 'awaiting'
  };
}

function entryManagerAssertManagerTokenAvailable_(token) {
  return entryManagerAssertCompetitionAvailableByProperty_('entryManagerToken_', token);
}

function entryManagerAssertPublicTokenAvailable_(token) {
  return entryManagerAssertCompetitionAvailableByProperty_('entryPublicToken_', token);
}

function entryManagerAssertCompetitionAvailableByProperty_(propertyPrefix, token) {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Competition link is missing.');

  const fileId = PropertiesService.getScriptProperties().getProperty(propertyPrefix + clean);
  if (!fileId) throw new Error('Competition link was not found.');

  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (error) {
    throw new Error('This competition is no longer available.');
  }

  if (file.isTrashed()) throw new Error('This competition is no longer available.');

  let record;
  try {
    record = JSON.parse(file.getBlob().getDataAsString());
  } catch (error) {
    throw new Error('This competition record could not be read.');
  }

  const control = entryManagerOperatorControl_(record);
  if (control.status === 'cancelled') {
    throw new Error('This competition has been cancelled. Please contact the competition organiser if you believe this is incorrect.');
  }

  return true;
}

function entryManagerPrepareReferenceForSetup_(bookingReference) {
  const reference = String(bookingReference || '').trim();
  if (!reference) return;

  const properties = PropertiesService.getScriptProperties();
  const key = 'entryManagerReference_' + reference;
  const fileId = properties.getProperty(key);
  if (!fileId) return;

  try {
    const file = DriveApp.getFileById(fileId);
    if (file.isTrashed()) properties.deleteProperty(key);
  } catch (error) {
    properties.deleteProperty(key);
  }
}
