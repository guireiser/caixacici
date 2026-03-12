function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deriveCdiFromSelic(selicAnual) {
  return toNumber(selicAnual) - 0.1;
}

function normalizeIndexSnapshot(snapshot = {}) {
  const selicAnual = toNumber(snapshot.selicAnual);
  const ipcaAnual = toNumber(snapshot.ipcaAnual);
  const cdiAnual =
    snapshot.cdiAnual === undefined || snapshot.cdiAnual === null
      ? deriveCdiFromSelic(selicAnual)
      : toNumber(snapshot.cdiAnual);

  return {
    selicAnual,
    ipcaAnual,
    cdiAnual,
  };
}

function isUpdatedToday(lastUpdateAt) {
  if (!lastUpdateAt) {
    return false;
  }
  const updateDate = new Date(lastUpdateAt);
  if (Number.isNaN(updateDate.getTime())) {
    return false;
  }
  const today = new Date();
  return (
    updateDate.getFullYear() === today.getFullYear() &&
    updateDate.getMonth() === today.getMonth() &&
    updateDate.getDate() === today.getDate()
  );
}

export { deriveCdiFromSelic, isUpdatedToday, normalizeIndexSnapshot };
