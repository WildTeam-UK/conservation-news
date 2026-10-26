import assert from 'node:assert/strict';
import test from 'node:test';
import { publicRevisionSourceIds } from '../lib/revision-source-references';

void test('keeps the numbered sources linked to a combined revision', () => {
  const references = publicRevisionSourceIds([
    { id: 'source-1', source_item_id: 'item-existing' },
    { id: 'source-2', source_item_id: 'item-update-a' },
    { id: 'source-3', source_item_id: 'item-update-b' },
  ], ['item-update-a', 'item-update-b']);

  assert.deepEqual(references, ['source-2', 'source-3']);
});

void test('drops invalid, duplicate and unrelated public source references', () => {
  const references = publicRevisionSourceIds([
    { id: 'source-2', source_item_id: 'item-update' },
    { id: 'source-2', source_item_id: 'item-update' },
    { id: 'private-source', source_item_id: 'item-update' },
    { id: 'source-3', source_item_id: 'item-other' },
  ], ['item-update']);

  assert.deepEqual(references, ['source-2']);
});
