#!/usr/bin/env python3
"""音乐高潮分析（对话框22，10-11）：回答用户在计划书上的批注——
「1:47 不一定是主高潮，只是类似的能量点；分析音频节拍再给结论」。
按小节（1.6216 s，相位 0.18 s，来自 音乐分析.py 的网格）逐小节统计：
  响度（时域 RMS，dB）、低频（30–150 Hz）、高频（2–10 kHz）、起音数、kick 数、频谱质心，
并把相邻 8 小节（一个乐句，约 13 s）平均后做排名与台阶对比。
输入：先 ffmpeg 转 22.05 kHz 单声道 float32（--pcm）；kick / 起音沿用 analysis/music/汪洋与浩渺_分析.json。
输出：analysis/music/汪洋与浩渺_高潮分析.json 和 协作/跨年秀编排宪章_图/音乐能量.png。
这是信号层面的检测，不是对旋律 / 主歌副歌的判断；「主高潮」最终要试听确认。"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy import signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

ROOT = Path(__file__).resolve().parents[2]
SR = 22050
BAR0, BAR = 0.18, 1.6216
OFFSET = 5.0                      # 演出时间 = 音乐时间 + 5（用户 10-09 17:14 倒计时，候选 A）
USER_ANCHOR = 107.2               # 用户说的 1:47（音乐时间）


def band_db(x, lo, hi):
    sos = signal.butter(4, [lo, hi], btype='band', fs=SR, output='sos')
    y = signal.sosfilt(sos, x)
    return y


def rms_db(y):
    return 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pcm', required=True)
    a = ap.parse_args()
    x = np.fromfile(a.pcm, dtype='<f4')
    dur = len(x) / SR
    ana = json.load(open(ROOT / 'analysis/music/汪洋与浩渺_分析.json'))
    kicks = np.array(ana['kickOnsetsMusicS'])
    ons = np.array(ana['onsetsMusicS'])
    lowx, highx = band_db(x, 30, 150), band_db(x, 2000, 10000)
    nbar = int((dur - BAR0) // BAR)
    bars = []
    for k in range(nbar):
        t0 = BAR0 + BAR * k
        i0, i1 = int(t0 * SR), int((t0 + BAR) * SR)
        seg = x[i0:i1]
        if len(seg) < SR // 2:
            continue
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        f = np.fft.rfftfreq(len(seg), 1 / SR)
        cent = float((f * S).sum() / (S.sum() + 1e-9))
        bars.append(dict(
            bar=k, startMusicS=round(t0, 3), startShowS=round(t0 + OFFSET, 3),
            rmsDb=round(float(rms_db(seg)), 2),
            peakDb=round(float(20 * np.log10(np.abs(seg).max() + 1e-9)), 2),
            lowDb=round(float(rms_db(lowx[i0:i1])), 2),
            highDb=round(float(rms_db(highx[i0:i1])), 2),
            onsets=int(((ons >= t0) & (ons < t0 + BAR)).sum()),
            kicks=int(((kicks >= t0) & (kicks < t0 + BAR)).sum()),
            centroidHz=round(cent)))
    r = np.array([b['rmsDb'] for b in bars]); h = np.array([b['highDb'] for b in bars])
    o = np.array([b['onsets'] for b in bars], float); lo = np.array([b['lowDb'] for b in bars])
    z = lambda v: (v - v.mean()) / (v.std() + 1e-9)
    score = z(r) + z(h) + z(o) + 0.5 * z(lo)           # 响度 + 亮度 + 起音密度 + 一半低频
    ma8 = lambda v: np.convolve(v, np.ones(8) / 8, mode='valid')   # 8 小节滑动平均，索引 = 起始小节
    r8, h8, o8, s8 = ma8(r), ma8(h), ma8(o), ma8(score)
    # 乐句：以 bar 1 起每 8 小节一句（bar 0 是弱起 / 淡入）
    phrases = []
    for p in range((len(bars) - 1) // 8):
        sl = slice(1 + 8 * p, 1 + 8 * p + 8)
        phrases.append(dict(
            phrase=p + 1, bars=f'{1 + 8 * p}–{8 + 8 * p}',
            startMusicS=bars[1 + 8 * p]['startMusicS'], startShowS=bars[1 + 8 * p]['startShowS'],
            rmsDb=round(float(r[sl].mean()), 2), highDb=round(float(h[sl].mean()), 2),
            onsets=round(float(o[sl].mean()), 1), lowDb=round(float(lo[sl].mean()), 2),
            score=round(float(score[sl].mean()), 2)))
    rank = sorted(phrases, key=lambda p: -p['score'])
    # 段落（沿用 noveltyPeaks 的段界）对比
    cuts = [0] + ana['noveltyPeaksMusicS'] + [dur]
    segs = []
    for c0, c1 in zip(cuts[:-1], cuts[1:]):
        idx = [i for i, b in enumerate(bars) if c0 <= b['startMusicS'] < c1]
        if not idx:
            continue
        segs.append(dict(startMusicS=round(c0, 1), endMusicS=round(c1, 1), startShowS=round(c0 + OFFSET, 1), bars=len(idx),
                         rmsDb=round(float(r[idx].mean()), 2), highDb=round(float(h[idx].mean()), 2),
                         onsets=round(float(o[idx].mean()), 1), lowDb=round(float(lo[idx].mean()), 2),
                         score=round(float(score[idx].mean()), 2)))
    for i, s in enumerate(segs):
        s['stepVsPrevDb'] = None if i == 0 else round(s['rmsDb'] - segs[i - 1]['rmsDb'], 2)
        s['stepVsPrevScore'] = None if i == 0 else round(s['score'] - segs[i - 1]['score'], 2)
    out = dict(format='df.music-climax-analysis/1', durationMusicS=round(dur, 2), offsetShowMinusMusic=OFFSET,
               barS=BAR, bar0S=BAR0, userAnchorMusicS=USER_ANCHOR, userAnchorBar=round((USER_ANCHOR - BAR0) / BAR, 2),
               note='响度=时域 RMS dB（相对满刻度）；score = z(响度)+z(高频)+z(起音数)+0.5·z(低频)；信号层面检测，不判断旋律，主高潮需试听确认',
               segments=segs, phrases=phrases, phraseRankByScore=[p['phrase'] for p in rank], bars=bars)
    (ROOT / 'analysis/music/汪洋与浩渺_高潮分析.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')

    # —— 图：逐小节响度 / 高频 / 起音，三块高能段着色，标注用户 1:47 与它前面的 1 小节静默 ——
    fig, axs = plt.subplots(3, 1, figsize=(13, 8.6), sharex=True)
    tx = np.array([b['startMusicS'] for b in bars])
    blocks = [(55.3, 66.7, '高潮 I\n短、跳升最大', '#f6ddcc'), (107.2, 133.2, '高潮 II（1:47 入口）\n两段各 7 小节', '#dbe8f7'), (165.6, 193.1, '终章 · 主高潮\n17 小节不间断最响最亮', '#fbe9a6')]
    yl = {0: (-20, -5), 1: (-35, -15), 2: (0, 7.6)}
    for ax, v, name, c in ((axs[0], r, '响度 RMS（dB）', '#2a5db0'), (axs[1], h, '高频 2–10 kHz（dB）', '#d4691e'), (axs[2], o, '每小节起音数', '#2f9e6e')):
        for (b0, b1, _, bc) in blocks:
            ax.axvspan(b0, b1, color=bc, alpha=.75, lw=0)
        ax.plot(tx, v, color=c, lw=1.0, alpha=.45)
        ax.plot(tx, np.convolve(v, np.ones(8) / 8, mode='same'), color=c, lw=2.2)
        ax.set_ylabel(name, fontsize=9)
        ax.axvline(USER_ANCHOR, color='#c0392b', lw=1.5)
        ax.grid(axis='y', alpha=.25)
    for ax, k in zip(axs, (0, 1, 2)):
        ax.set_ylim(*yl[k])
    ytop = yl[0][1]
    for (b0, b1, t, _) in blocks:
        axs[0].text((b0 + b1) / 2, ytop - .4, t, ha='center', va='top', fontsize=8.6, color='#333')
    axs[0].annotate('107.2 之前 1 小节（bar 65）\n响度掉 3 dB、低频掉 5 dB：静默位', xy=(106.4, -10.95), xytext=(62, -17.6), fontsize=8.4, color='#c0392b',
                    arrowprops=dict(arrowstyle='->', color='#c0392b', lw=.9))
    axs[0].text(USER_ANCHOR + 1, -18.2, '你的 1:47\n（音乐 107.2，bar 66）', color='#c0392b', fontsize=8.6, va='bottom')
    axs[1].annotate('回归时高频抬 3.5 dB', xy=(107.2, -19.3), xytext=(112, -31), fontsize=8.4, color='#c0392b', arrowprops=dict(arrowstyle='->', color='#c0392b', lw=.9))
    axs[2].set_xlim(0, 211)
    axs[2].set_xlabel('音乐时间（s）；演出时间 = +5')
    fig.suptitle('《汪洋与浩渺》逐小节能量（粗线 = 8 小节滑动平均；纵轴已截掉首尾淡入淡出）', fontsize=12, fontweight='bold', x=0.04, ha='left')
    plt.tight_layout(rect=(0, 0, 1, .96))
    fig.savefig(ROOT / '协作/跨年秀编排宪章_图/音乐能量.png', dpi=100, facecolor='white'); plt.close(fig)

    print('段落（音乐时间）')
    for s in segs:
        print(s)
    print('乐句按综合分排名（前 8）')
    for p in rank[:8]:
        print(p)
    print('用户 1:47 所在乐句：', [p for p in phrases if p['startMusicS'] <= USER_ANCHOR < p['startMusicS'] + 8 * BAR])


if __name__ == '__main__':
    main()
