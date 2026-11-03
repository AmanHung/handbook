import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrainingTargets, getTrainingVideoIds, getLinkedTrainingTargets,
  getVideoTopic, getVideoSeries, getVideoEmbedUrl, auditVideoLinks,
} from '../src/utils/videoLibrary.js';

const items = [
  { id: 'first', category_id: 'OPD', title: '兒科磨粉處方調劑' },
  { id: 'second', category_id: 'OPD', title: '兒科磨粉處方調劑' },
  { id: 'other', category_id: 'UD', title: '兒科磨粉處方調劑' },
  { id: 'blank', category_id: 'extra', title: '' },
];

test('群組涵蓋所有子項目，且同名跨分類的訓練分開', () => {
  const targets = buildTrainingTargets(items);
  assert.equal(targets.length, 2);
  assert.deepEqual(targets[0].items.map(item => item.id), ['first', 'second']);
});

test('連在第二筆子項目的影片仍能出現在護照與反向連結，且不重複', () => {
  const targets = buildTrainingTargets(items);
  const videos = [
    { id: 'v2', title: '系列-02', trainingItemIds: ['second', 'first'] },
    { id: 'v1', title: '系列-01', trainingItemIds: ['second'] },
    { id: 'v3', trainingItemIds: ['other'] },
  ];
  assert.deepEqual(getTrainingVideoIds(videos, ['first', 'second']), ['v1', 'v2']);
  assert.deepEqual(getLinkedTrainingTargets(videos[0], targets).map(target => target.id), ['first']);
  assert.deepEqual(getTrainingVideoIds(videos, 'other'), ['v3']);
});

test('稽核分辨未連結、有效連結與含失效編號的部分有效連結', () => {
  const result = auditVideoLinks([
    { id: 'unlinked' }, { id: 'valid', trainingItemIds: ['second'] },
    { id: 'partial', trainingItemIds: ['first', 'removed'] },
  ], buildTrainingTargets(items));
  assert.equal(result[0].targets.length, 0);
  assert.equal(result[1].targets.length, 1);
  assert.deepEqual(result[2].invalidIds, ['removed']);
});

test('分類區分設備操作、管制法規、中藥與未知新分類', () => {
  assert.equal(getVideoTopic({ category: '兒科分包機操作' }), 'equipment');
  assert.equal(getVideoTopic({ category: '特殊製劑調配' }), 'preparation');
  assert.equal(getVideoTopic({ title: '管制藥品與注意事項', category: '管制藥品智慧藥櫃' }), 'dispensing');
  assert.equal(getVideoSeries({ title: '中藥飲片辨識', category: '教學訓練' }), '中藥訓練');
  assert.equal(getVideoTopic({ category: '新增課程' }), 'other');
});

test('播放器支援 YouTube 與 Drive，清單保留外連，排除仿冒網域', () => {
  for (const url of ['https://youtu.be/kzw3fa5TBrs', 'https://m.youtube.com/watch?v=kzw3fa5TBrs',
    'https://www.youtube.com/shorts/kzw3fa5TBrs?si=test']) {
    assert.equal(getVideoEmbedUrl(url), 'https://www.youtube.com/embed/kzw3fa5TBrs');
  }
  assert.equal(getVideoEmbedUrl('https://drive.google.com/file/d/abc_123/view'), 'https://drive.google.com/file/d/abc_123/preview');
  assert.equal(getVideoEmbedUrl('https://www.youtube.com/playlist?list=example'), '');
  assert.equal(getVideoEmbedUrl('https://youtube.com.example.com/watch?v=kzw3fa5TBrs'), '');
});
