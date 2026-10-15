/* 本机反馈仅写浏览器；用户导出的JSON由下次巡检接回Git。在线数据库由原入口处理。 */
(function (global) {
  'use strict';
  const KEY = 'fwb.local-feedback.v1';
  const BOARD = 'https://claude.ai/artifact/BWDYBCixRrt5NgtcaigHkv';
  const ALLOWED = new Set(['feedback', 'feedbackAt', 'answer', 'status', 'statusBefore',
    'doneAt', 'syncedAt', 'syncedTo', 'next', 'nextDoneAt', 'updatedAt']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b);
  class Session {
    constructor(storage, view) {
      this.storage = storage;
      this.base = clone(view);
      this.aliases = view['本地视图']?.['行映射'] || {};
      const text = storage.getItem(KEY);
      this.data = text ? JSON.parse(text) : { format: 'df.board-local-edits/1',
        clientId: global.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
        rows: {}, drafts: {}, sequence: 0 };
      if (this.data.format !== 'df.board-local-edits/1' || !this.data.rows || !this.data.drafts)
        throw new Error('本机反馈存储格式不认识，已保留原数据');
      const acknowledged = new Set(view['本地视图']?.['反馈已入Git'] || []);
      const next = clone(this.data);
      let changed = false;
      for (const [key, row] of Object.entries(next.rows)) {
        if (acknowledged.has(row.eventId)) { delete next.rows[key]; changed = true; }
      }
      if (changed) this.commit(next);
    }
    commit(next) {
      // 持久化成功后再改内存，配额或权限错误不假报保存成功。
      this.storage.setItem(KEY, JSON.stringify(next));
      this.data = next;
    }
    count() { return Object.keys(this.data.rows).length; }
    drafts() {
      const result = clone(this.data.drafts);
      for (const [key, value] of Object.entries(this.data.drafts)) {
        const [type, coll, row] = key.split(':');
        if (this.aliases[row]) {
          const mapped = [type, coll, this.aliases[row]].join(':');
          if (!(mapped in result)) result[mapped] = value;
          delete result[key];
        }
      }
      return result;
    }
    setDraft(key, value) {
      const next = clone(this.data);
      const [type, coll, row] = key.split(':');
      for (const oldKey of Object.keys(next.drafts)) {
        const [oldType, oldColl, oldRow] = oldKey.split(':');
        if (oldKey !== key && oldType === type && oldColl === coll && this.aliases[oldRow] === row)
          delete next.drafts[oldKey];
      }
      if (value === null) delete next.drafts[key]; else next.drafts[key] = value;
      this.commit(next);
    }
    write(collection, row, patch, at) {
      if (!['items', 'resources', 'dialogs'].includes(collection) || !this.base[collection]?.[row])
        throw new Error('本机反馈目标不存在');
      if (Object.keys(patch).some(key => !ALLOWED.has(key))) throw new Error('本机只保存勾选、作答和反馈');
      const next = clone(this.data), key = collection + ':' + row;
      const aliasKey = Object.keys(next.rows).find(k => next.rows[k].collection === collection && this.aliases[next.rows[k].row] === row);
      const event = next.rows[key] || (aliasKey && next.rows[aliasKey]) || { collection, row, fields: {}, baseValues: {} };
      if (aliasKey && aliasKey !== key) delete next.rows[aliasKey];
      event.row = row;
      for (const [field, value] of Object.entries(patch)) {
        if (field === 'updatedAt') continue;
        if (!(field in event.baseValues)) event.baseValues[field] = this.base[collection][row][field] ?? '';
        if (same(value, event.baseValues[field])) {
          delete event.fields[field]; delete event.baseValues[field];
        } else event.fields[field] = value;
      }
      if (Object.keys(event.fields).length) {
        next.sequence = (next.sequence || 0) + 1;
        event.at = at;
        event.eventId = next.clientId + ':' + next.sequence;
        next.rows[key] = event;
      } else delete next.rows[key];
      this.commit(next);
    }
    apply(rows) {
      for (const coll of ['items', 'resources', 'dialogs']) {
        for (const row of rows[coll] || []) {
          const event = this.data.rows[coll + ':' + row._id] || Object.values(this.data.rows).find(e => e.collection === coll && this.aliases[e.row] === row._id);
          if (event) Object.assign(row, clone(event.fields), { _localUserPending: true, updatedAt: event.at });
        }
      }
      return rows;
    }
    export(at) {
      return { format: 'df.board-feedback/1', board: BOARD,
        baseSnapshotAt: this.base['本地视图']?.['在线快照时间'] || this.base['导出时间'],
        viewAt: this.base['本地视图']?.['生成时间'] || '', exportedAt: at,
        entries: clone(Object.values(this.data.rows)) };
    }
  }
  global.FWBLocal = { Session, KEY, BOARD };
})(typeof window !== 'undefined' ? window : globalThis);
