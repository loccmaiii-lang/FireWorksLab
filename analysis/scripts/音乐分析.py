#!/usr/bin/env python3
"""音乐分析（对话框22，10-09）：正式歌曲《汪洋与浩渺》的节拍 / 能量 / 低频起音 / 段落。
只用 numpy + scipy。输入：先 ffmpeg 转 22.05 kHz 单声道 float32（见 --pcm）。
输出 analysis/music/汪洋与浩渺_分析.json（musicS 与 showS 同时写，showS = musicS + 10）。
这些是检测结果，不是人工确认的曲式；高潮候选必须试听校准。"""
import argparse, json
from pathlib import Path
import numpy as np
from scipy import signal

SR = 22050
HOP = 512            # 23.2 ms
NFFT = 2048
OFFSET = None        # 演出偏移不在这里定：旧规范 10，候选 A 暂按 5（用户 10-09 17:14 倒计时描述），见 协作/编排候选A_汪洋与浩渺.md；本文件只给音乐时间

def load(path):
    return np.fromfile(path, dtype='<f4')

def stft_mag(x):
    f, t, Z = signal.stft(x, fs=SR, nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    return f, t, np.abs(Z)

def smooth(a, n):
    k = np.ones(n) / n
    return np.convolve(a, k, mode='same')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pcm', required=True)
    ap.add_argument('--out', default=str(Path(__file__).resolve().parents[1] / 'music' / '汪洋与浩渺_分析.json'))
    a = ap.parse_args()
    x = load(a.pcm)
    dur = len(x) / SR
    f, t, S = stft_mag(x)
    dt = t[1] - t[0]
    # 频带
    def band(lo, hi):
        m = (f >= lo) & (f < hi)
        return S[m].sum(0)
    low, mid, high = band(30, 150), band(150, 2000), band(2000, 10000)
    total = S.sum(0)
    # 起音强度：对数幅度的正向差分，分低频（鼓）与全频
    L = np.log1p(S * 10)
    flux = np.maximum(0, np.diff(L, axis=1)).sum(0)
    flux = np.concatenate([[0], flux])
    lm = (f >= 30) & (f < 180)
    flux_low = np.concatenate([[0], np.maximum(0, np.diff(L[lm], axis=1)).sum(0)])
    # 能量（RMS，dB）
    frame = int(1.0 / dt)
    rms = np.sqrt(smooth(total ** 2, 9))
    rms_db = 20 * np.log10(rms + 1e-9)
    # 每秒统计
    sec = []
    n_sec = int(dur)
    for s in range(n_sec):
        i0, i1 = int(s / dt), int((s + 1) / dt)
        sec.append(dict(musicS=s, rmsDb=round(float(rms_db[i0:i1].mean()), 2),
                        low=round(float(low[i0:i1].mean()), 2), high=round(float(high[i0:i1].mean()), 2),
                        onset=round(float(flux[i0:i1].sum()), 2), kick=round(float(flux_low[i0:i1].sum()), 2)))
    # 速度：对起音包络做自相关，60–200 BPM
    env = flux - smooth(flux, 43)
    env = np.maximum(env, 0)
    ac = signal.correlate(env, env, mode='full')[len(env) - 1:]
    lags = np.arange(len(ac)) * dt
    sel = (lags >= 60 / 200) & (lags <= 60 / 60)
    ac_s = ac.copy(); ac_s[~sel] = 0
    top = np.argsort(ac_s)[::-1]
    peaks = []
    for i in top:
        if all(abs(lags[i] - lags[j]) > 0.03 for j in peaks):
            peaks.append(i)
        if len(peaks) == 5:
            break
    tempo_cands = [dict(bpm=round(60 / lags[i], 2), strength=round(float(ac_s[i] / ac_s[peaks[0]]), 3)) for i in peaks]
    # 起音峰（全频 / 低频）
    def pick(env_, thr_sigma, min_gap):
        e = env_ - smooth(env_, 43)
        thr = e.mean() + thr_sigma * e.std()
        idx, _ = signal.find_peaks(e, height=thr, distance=int(min_gap / dt))
        return idx
    on_idx = pick(flux, 1.2, 0.18)
    kick_idx = pick(flux_low, 1.5, 0.25)
    # 段落：40 频带对数谱的新颖度（棋盘核）
    edges = np.geomspace(60, 9000, 41)
    B = np.stack([S[(f >= edges[i]) & (f < edges[i + 1])].sum(0) for i in range(40)])
    B = np.log1p(B * 5)
    blk = int(round(1.0 / dt))                # 1 秒一块
    n_blk = B.shape[1] // blk
    F = np.stack([B[:, i * blk:(i + 1) * blk].mean(1) for i in range(n_blk)], 0)
    F = (F - F.mean(0)) / (F.std(0) + 1e-6)
    Sim = F @ F.T / F.shape[1]
    K = 8
    g = np.exp(-0.5 * (np.arange(-K, K) + 0.5) ** 2 / (K / 2) ** 2)
    ker = np.outer(g, g) * np.sign(np.outer(np.arange(-K, K) + 0.5, np.arange(-K, K) + 0.5))
    nov = np.zeros(n_blk)
    for i in range(K, n_blk - K):
        nov[i] = (Sim[i - K:i + K, i - K:i + K] * ker).sum()
    nov = np.maximum(nov, 0)
    pk, _ = signal.find_peaks(nov, height=nov.mean() + 0.5 * nov.std(), distance=8)
    boundaries = [0] + [int(p) for p in pk] + [int(dur)]
    segs = []
    for b0, b1 in zip(boundaries, boundaries[1:]):
        i0, i1 = int(b0 / dt), int(b1 / dt)
        segs.append(dict(startMusicS=b0, endMusicS=b1, meanDb=round(float(rms_db[i0:i1].mean()), 2),
                         kick=round(float(flux_low[i0:i1].sum() / max(1, b1 - b0)), 2),
                         high=round(float(high[i0:i1].mean()), 2)))
    out = dict(
        format='df.music-analysis/1', source='汪洋与浩渺.wav（48 kHz / 24 bit / 双声道，本分析用 22.05 kHz 单声道）',
        durationMusicS=round(dur, 4), offsetS=OFFSET, status='detected_requires_listening_check',
        tempoCandidates=tempo_cands,
        onsetsMusicS=[round(float(t[i]), 3) for i in on_idx],
        kickOnsetsMusicS=[round(float(t[i]), 3) for i in kick_idx],
        perSecond=sec, segments=segs,
        noveltyPeaksMusicS=[int(p) for p in pk],
    )
    Path(a.out).parent.mkdir(exist_ok=True)
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    print('dur', round(dur, 2), 'onsets', len(on_idx), 'kick', len(kick_idx), 'segments', len(segs))
    print('tempo', tempo_cands[:3])

if __name__ == '__main__':
    main()
