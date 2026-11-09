import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istanbulScheduleInput, parseIstanbulSchedule } from '../../lib/content-editor/urls';

test('schedule input preserves local draft time across renders and UTC save/readback', () => {
  for (const timezone of ['UTC', 'America/New_York', 'Europe/Istanbul']) {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      const local = '2026-11-01T09:00';
      assert.equal(istanbulScheduleInput(local), local);
      assert.equal(istanbulScheduleInput(istanbulScheduleInput(local)), local);
      const stored = parseIstanbulSchedule(local)?.toISOString();
      assert.equal(stored, '2026-11-01T06:00:00.000Z');
      assert.equal(istanbulScheduleInput(stored), local);
      assert.equal(istanbulScheduleInput(null), '');
      assert.equal(istanbulScheduleInput('invalid'), '');
    } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
  }
});
