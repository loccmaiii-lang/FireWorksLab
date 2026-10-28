/* 结构区的只读视觉注解；不修改节点、选择、显隐或观察状态。 */
(() => {
  'use strict';
  const iconNames = Object.freeze({
    '效果':'sparkles', '图层':'stack-2', '发射器':'circles',
    '分组':'hierarchy-2', '输出':'package', '设置':'adjustments-horizontal'
  });

  function decorate(nodes, selectedId) {
    const stack = [];
    const rows = nodes.map((node, index) => {
      stack.length = node.level;
      const ancestors = stack.slice();
      stack[node.level] = index;
      return {node, index, ancestors, icon:iconNames[node.kind] || 'hierarchy-2'};
    });
    const selected = rows.find(row => row.node.id === selectedId);
    const selectedPath = selected ? [...selected.ancestors, selected.index] : [];
    const edges = selectedPath.slice(1).map((end, index) => ({
      start:selectedPath[index], end, level:rows[end].node.level
    }));
    const hasNextSibling = index => {
      const level = rows[index].node.level;
      for (let next=index+1; next<rows.length; next++) {
        if (rows[next].node.level <= level) return rows[next].node.level === level;
      }
      return false;
    };
    return rows.map(row => {
      const guides = [];
      for (let level=1; level<=row.node.level; level++) {
        const branch = level === row.node.level;
        if (!branch && !hasNextSibling(row.ancestors[level])) continue;
        const activeEdge = edges.find(edge => edge.level===level && edge.start<row.index && row.index<=edge.end);
        guides.push({level, branch, continues:branch && hasNextSibling(row.index),
          active:!!activeEdge, activeTurn:!!activeEdge && row.index===activeEdge.end,
          activeBelow:!!activeEdge && row.index<activeEdge.end});
      }
      return {...row, onPath:selectedPath.includes(row.index), guides};
    });
  }

  function guidesMarkup(guides) {
    return `<span class="tree-guides" aria-hidden="true">${guides.map(guide =>
      `<span class="tree-guide${guide.branch?' is-branch':''}${guide.continues?' continues':''}${guide.active?' is-active':''}${guide.activeTurn?' active-turn':''}${guide.activeBelow?' active-below':''}" style="--guide-level:${guide.level}"></span>`
    ).join('')}</span>`;
  }
  window.StructureTree = Object.freeze({decorate, guidesMarkup});
})();
