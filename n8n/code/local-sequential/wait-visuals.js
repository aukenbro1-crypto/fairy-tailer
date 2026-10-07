const source = $input.first().json;
const base = String($env.FAIRYTELLER_API_BASE_URL || '').replace(/\/$/, '');
const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline) {
  const job = await this.helpers.httpRequest({
    method: 'GET', url: base + '/api/fairyteller/jobs/' + source.jobId,
    headers: { Authorization: 'Bearer ' + $env.FAIRYTELLER_API_TOKEN }, json: true, timeout: 30000,
  });
  const state = job.artifacts?.fullVisuals;
  if (job.status === 'failed' || state?.status === 'failed') {
    throw new Error('Cannot assemble book: chapter illustrations failed');
  }
  const ready = new Set((state?.images || []).filter((image) => image.status === 'ready').map((image) => Number(image.chapter)));
  if (state?.status === 'ready' && [2, 3, 4, 5].every((n) => ready.has(n))) return [{ json: source }];
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
await this.helpers.httpRequest({
  method: 'PATCH', url: base + '/api/fairyteller/jobs/' + source.jobId,
  headers: { Authorization: 'Bearer ' + $env.FAIRYTELLER_API_TOKEN }, json: true,
  body: { status: 'failed', stage: 'visuals', error: { message: 'Timed out waiting for chapter illustrations' } },
});
throw new Error('Timed out waiting for chapter illustrations');
