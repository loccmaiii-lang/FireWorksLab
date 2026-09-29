// 迭代区里的花型类条目（数据在 tool/data/review.js，由 analysis/scripts/review_to_baker.py 生成；刷新烘焙器即更新）
const FW_REVIEW_LIST = typeof FW_REVIEW !== 'undefined' ? FW_REVIEW : [];
const PENDING_REPLICAS = FW_REVIEW_LIST.filter(e => e.kind === 'preset').map(e => ({ ...e, status: '迭代区 · ' + e.task, fromReview: true }));
