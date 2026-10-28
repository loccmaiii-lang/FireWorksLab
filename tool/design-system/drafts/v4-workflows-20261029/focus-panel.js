/* 分组聚焦草稿：外壳拥有数据、历史和保存；此文件只组织参数面板。 */
(function () {
  "use strict";

  const GROUPS = [
    { id: "shape", label: "外形", description: "确定星群如何分布与成形。" },
    { id: "motion", label: "运动", description: "调整展开速度、受力与燃烧节奏。" },
    { id: "look", label: "光色", description: "调整颜色、亮度和可见细节。" },
    { id: "output", label: "输出", description: "检查时长、取景与贴图配置。" }
  ];

  function sameValue(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function getValue(values, param) {
    return values && Object.prototype.hasOwnProperty.call(values, param.id)
      ? values[param.id]
      : param.default;
  }

  function isChanged(ctx, param) {
    return !sameValue(getValue(ctx.values, param), getValue(ctx.initialValues, param));
  }

  function groupList(ctx) {
    return GROUPS.map(base => ({ ...base, ...(ctx.groups || []).find(group => group.id === base.id) }));
  }

  function errorText(ctx, param) {
    const value = ctx.errors && ctx.errors[param.id];
    if (!value) return "";
    if (Array.isArray(value)) return value.join("；");
    if (typeof value === "object") return value.message || "请检查此参数的输入。";
    return String(value);
  }

  function elementId(value) {
    return "focus-" + encodeURIComponent(String(value));
  }

  function renderParam(ctx, param) {
    const e = ctx.escape;
    const changed = isChanged(ctx, param);
    const error = errorText(ctx, param);
    const labelId = elementId(param.id) + "-label";
    const help = param.help ? String(param.help) : "";
    const bounds = param.hard_bounds || param.hardBounds;
    const boundText = bounds && (bounds.min !== undefined || bounds.max !== undefined)
      ? `合法范围：${bounds.min === undefined ? "不限" : bounds.min} — ${bounds.max === undefined ? "不限" : bounds.max}${param.unit ? " " + param.unit : ""}`
      : "";
    const details = help || boundText
      ? `<details class="focus-help" data-help="focus-${e(param.id)}"><summary>参数说明</summary><div>${help ? `<p>${e(help)}</p>` : ""}${boundText ? `<p>${e(boundText)}</p>` : ""}</div></details>`
      : "";

    return `<article class="focus-param focus-type-${e(param.type)}${changed ? " is-changed" : ""}${error ? " has-error" : ""}" data-focus-param="${e(param.id)}" aria-labelledby="${labelId}">
      <div class="focus-row-head">
        <label class="focus-param-title" id="${labelId}"><span>${e(param.label)}</span>${ctx.english && param.en ? `<span class="focus-param-en" lang="en">${e(param.en)}</span>` : ""}</label>
        <div class="focus-row-tools">${changed ? '<span class="focus-modified-label">已改</span>' : ""}<button type="button" class="u-button u-quiet u-inline u-icon focus-reset" data-reset-param="${e(param.id)}" title="${changed ? "恢复到原配方" : "与原配方一致"}" aria-label="恢复${e(param.label)}到原配方"${changed ? "" : " disabled"}>${ctx.icon("undo")}</button></div>
      </div>
      <div class="focus-control">${ctx.renderField(param, { hideLabel: true, instance: "focus", hideMeta: true })}</div>
      ${details}
    </article>`;
  }

  function render(ctx) {
    const e = ctx.escape;
    const params = ctx.params || [];
    const groups = groupList(ctx);
    const active = groups.find(group => group.id === ctx.activeGroup) || groups[0];
    const searching = Boolean(String(ctx.search || "").trim());
    const filtering = searching || Boolean(ctx.onlyChanged);
    const counts = groups.map(group => {
      const members = params.filter(param => param.group === group.id);
      return { ...group, params: members, changed: members.filter(param => isChanged(ctx, param)).length, errors: members.filter(param => errorText(ctx, param)).length };
    });
    const current = counts.find(group => group.id === active.id);
    const visibleCount = filtering ? params.length : current.params.length;
    const contentId = "focus-parameter-content";
    const scrollSection = searching ? "search" : ctx.onlyChanged ? "changed" : active.id;

    const tabs = counts.map(group => `<button type="button" role="tab" class="focus-group-tab" id="focus-tab-${e(group.id)}" data-group="${e(group.id)}" aria-controls="${contentId}" aria-selected="${group.id === active.id}" tabindex="${group.id === active.id ? "0" : "-1"}" aria-label="${e(group.label)}，${filtering ? "匹配" : "共"}${group.params.length}项，${group.changed}项改动${group.errors ? "，" + group.errors + "项需检查" : ""}">
      <span class="focus-tab-name">${e(group.label)}${group.errors ? '<span class="focus-tab-error" aria-hidden="true">!</span>' : ""}</span>
      <span class="focus-tab-meta"><span>${group.params.length} 项</span><span class="focus-tab-changes${group.changed ? " has-changes" : ""}">改 ${group.changed}</span></span>
    </button>`).join("");

    const title = filtering ? (searching ? "搜索结果" : "本次改动") : active.label + "参数";
    const description = filtering
      ? (searching ? `在四组中查找“${ctx.search}”${ctx.onlyChanged ? "，仅看改动" : ""}。` : "集中查看相对原配方发生变化的参数。")
      : active.description;
    let content = "";
    if (visibleCount === 0) {
      content = `<div class="focus-empty"><strong>${searching ? "未找到匹配参数" : ctx.onlyChanged ? "还没有改动参数" : "这一组没有可调整参数"}</strong><p>${searching ? "换个关键词，或关闭“仅改动”再找。" : ctx.onlyChanged ? "关闭“仅改动”后，可继续浏览和调整全部参数。" : "可从上方选择其他组继续查看。"}</p></div>`;
    } else if (filtering) {
      content = counts.filter(group => group.params.length).map(group => `<section class="focus-result-group" aria-labelledby="focus-result-${e(group.id)}"><header class="focus-result-heading"><h4 id="focus-result-${e(group.id)}">${e(group.label)}</h4><span>${group.params.length} 项${group.changed ? " · 改动 " + group.changed : ""}</span><button type="button" class="u-button u-quiet u-inline focus-open-group" data-group="${e(group.id)}">查看此组</button></header><div class="focus-fields">${group.params.map(param => renderParam(ctx, param)).join("")}</div></section>`).join("");
    } else {
      content = `<div class="focus-fields">${current.params.map(param => renderParam(ctx, param)).join("")}</div>`;
    }

    return `<section class="focus-panel" aria-label="分组聚焦参数面板">
      <div class="focus-group-nav"><div class="focus-group-tabs" role="tablist" aria-label="参数分组">${tabs}</div>${filtering ? `<p class="focus-filter-context">${searching ? "搜索" : "仅改动"}覆盖四组；退出筛选后回到<strong>${e(active.label)}</strong>。</p>` : ""}</div>
      <div class="focus-scroll panel-scroll" data-panel-scroll="focus" data-scroll-section="${e(scrollSection)}">
        <div class="focus-group-heading"><div class="focus-heading-line"><h3>${e(title)}</h3><span class="focus-visible-count">${visibleCount} 项</span></div>${description ? `<details class="focus-group-description" data-help="focus-group-${e(scrollSection)}"><summary>${filtering ? "筛选说明" : "分组说明"}</summary><p>${e(description)}</p></details>` : ""}</div>
        <div class="focus-parameter-content" id="${contentId}"${filtering ? ' role="region" aria-label="跨组筛选结果"' : ` role="tabpanel" aria-labelledby="focus-tab-${e(active.id)}"`}>${content}</div>
        ${visibleCount ? `<p class="focus-list-end">${filtering ? "筛选结果" : "这一组的参数"}已全部显示。修改由上方“保存”写入草稿。</p>` : ""}
      </div>
    </section>`;
  }

  function afterRender(host) {
    const panel = host.matches && host.matches(".focus-panel") ? host : host.querySelector(".focus-panel");
    if (!panel) return;
    // 控件ID由外壳生成；原生label只关联本行实际控件，不新增选择状态或点击控制器。
    panel.querySelectorAll(".focus-param").forEach(row => {
      const label = row.querySelector("label.focus-param-title");
      const control = row.querySelector('.focus-control input[data-param][id]:not([type="range"]):not([type="hidden"]), .focus-control select[data-param][id], .focus-control textarea[data-param][id]');
      if (label && control && control.dataset.param === row.dataset.focusParam) label.htmlFor = control.id;
    });
    const tablist = panel.querySelector('[role="tablist"]');
    if (!tablist || tablist.dataset.focusKeyboardBound) return;
    tablist.dataset.focusKeyboardBound = "true";
    tablist.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const index = tabs.indexOf(event.target);
      if (index < 0) return;
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      const group = tabs[next].dataset.group;
      tabs[next].focus({ preventScroll: true });
      tabs[next].click();
      // 外壳可能同步重绘；只恢复同一页签的焦点，不修改业务状态。
      window.requestAnimationFrame(() => {
        const replacement = Array.from(host.querySelectorAll('.focus-group-tab')).find(tab => tab.dataset.group === group);
        if (replacement) replacement.focus({ preventScroll: true });
      });
    });
  }

  window.PanelDesigns = window.PanelDesigns || {};
  window.PanelDesigns.focus = { render, afterRender };
})();
