/** Serialize edits so rapid +/- clicks read the latest persisted actor value. */
const writes = new Map();
export function changeLife(actor, { delta, value } = {}) {
  if (!actor?.isOwner) return Promise.resolve();
  const key = actor.uuid ?? actor.id;
  const task = (writes.get(key) ?? Promise.resolve()).then(async () => {
    if (!actor.isOwner) return;
    const life = actor.system.lifePoints;
    const next = delta == null ? value : life.value + delta;
    if (!Number.isInteger(next)) return;
    const clamped = Math.max(0, Math.min(life.max, next));
    if (clamped !== life.value) await actor.update({ "system.lifePoints.value": clamped });
  }).catch(error => ui.notifications.error(error.message));
  writes.set(key, task);
  task.finally(() => { if (writes.get(key) === task) writes.delete(key); });
  return task;
}
