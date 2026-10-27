import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { blocksArticleArchive, shouldCreateCoverageUpdate } from '../lib/article-lifecycle.ts';

void test('active queue work must be removed before an article is archived', () => {
  assert.equal(blocksArticleArchive('queued'), true);
  assert.equal(blocksArticleArchive('scheduled'), true);
  assert.equal(blocksArticleArchive('publishing'), true);
  assert.equal(blocksArticleArchive('held'), false);
  assert.equal(blocksArticleArchive('cancelled'), false);
  assert.equal(blocksArticleArchive('published'), false);
  assert.equal(blocksArticleArchive(null), false);
});

void test('archived stories do not create editorial coverage-update work', () => {
  assert.equal(shouldCreateCoverageUpdate('archived'), false);
  assert.equal(shouldCreateCoverageUpdate('draft'), true);
  assert.equal(shouldCreateCoverageUpdate('published'), true);
  assert.equal(shouldCreateCoverageUpdate(null), true);
});
