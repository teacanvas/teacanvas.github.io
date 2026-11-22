# TEA CANVAS 데모 영상 배경음악: 저작권 걱정 없이 직접 합성한 잔잔한 음악 3가지
# 사용법: python3 tools/make-music.py [길이(초)]  → exhibit/music/a-piano.wav, b-pad.wav, c-musicbox.wav
import numpy as np, wave, os, sys

SR = 44100
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 88.0
OUT = os.path.join(os.path.dirname(__file__), '..', 'exhibit', 'music')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
N = int(SR * DUR)
t_all = np.arange(N) / SR

def hz(m):  # MIDI 번호 → 주파수
    return 440.0 * 2 ** ((m - 69) / 12)

def env(n, a, d):  # 부드러운 시작 + 지수 감쇠
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    att = np.clip(t / a, 0, 1) if a > 0 else 1
    return e * att

def reverb(x, secs=3.2, mix=.35):
    n = int(SR * secs)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * secs / 6))
    ir[:int(SR * .02)] = 0
    ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n
    F = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:len(x)]
    return (1 - mix) * x + mix * y * 1.6

def add(buf, start, sig, gain=1.0):
    s = int(start * SR)
    if s < 0: sig = sig[-s:]; s = 0
    if s >= len(buf) or not len(sig): return
    e = min(len(buf), s + len(sig))
    buf[s:e] += sig[:e - s] * gain

def piano(f, dur=4.0, vel=.5):  # 배음 + 감쇠로 만든 부드러운 피아노 느낌
    n = int(SR * dur); t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (amp, dec) in enumerate([(1, 1.6), (.45, 1.0), (.22, .7), (.12, .45), (.06, .3)], start=1):
        s += amp * np.sin(2 * np.pi * f * k * t * (1 + .0004 * k)) * np.exp(-t / dec)
    return s * env(n, .006, 9) * vel

def bell(f, dur=3.5, vel=.4):  # 오르골: 비조화 배음
    n = int(SR * dur); t = np.arange(n) / SR
    s = np.zeros(n)
    for r, amp, dec in [(1, 1, 1.3), (2.76, .35, .6), (5.4, .15, .3), (8.93, .06, .18)]:
        s += amp * np.sin(2 * np.pi * f * r * t) * np.exp(-t / dec)
    return s * env(n, .002, 9) * vel

def pad(freqs, dur, vel=.12):  # 천천히 차오르고 사라지는 따뜻한 화음
    n = int(SR * dur); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-.0025, 0, .0025):
            s += np.sin(2 * np.pi * f * (1 + det) * t + rng.random() * 6.28) * (1 / (1 + abs(det) * 200))
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return s * shape * vel / len(freqs)

def drop(f=1400, vel=.18):  # 물방울: 위로 살짝 휘는 짧은 소리
    n = int(SR * .35); t = np.arange(n) / SR
    fr = f * (1 + 1.2 * np.exp(-t / .03))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * np.exp(-t / .07) * vel

# 화음 진행: Fmaj7 – Am7 – Dm9 – B♭maj7 (따뜻하고 잔잔하게)
CH = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60, 64], [46, 50, 53, 57]]
BAR = 3.75  # 64bpm, 4박

def finish(x, name, fade_in=2.5, fade_out=4.5):
    x = reverb(x)
    n = len(x); t = np.arange(n) / SR
    x *= np.clip(t / fade_in, 0, 1) * np.clip((DUR - t) / fade_out, 0, 1)
    x /= (np.abs(x).max() + 1e-9); x *= .5   # 영상 위에 깔리도록 작게
    l = x; r = np.roll(x, int(SR * .012)) * .96  # 살짝 넓은 소리
    st = (np.stack([l, r], 1) * 32767).astype(np.int16)
    p = os.path.join(OUT, name)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
    print('완료:', p)

# A. 찻잔 피아노: 느린 아르페지오 + 낮은 음
A = np.zeros(N)
bar = 0; t0 = 0.0
pat = [0, 2, 1, 3, 2, 1]
while t0 < DUR:
    ch = CH[bar % 4]
    add(A, t0, piano(hz(ch[0] - 12), 6, .35))
    for i, idx in enumerate(pat):
        add(A, t0 + i * BAR / 6 + rng.random() * .02, piano(hz(ch[idx % len(ch)] + 12), 4, .22 + .05 * (i == 0)))
    if bar % 2 == 1:
        add(A, t0 + BAR * .75, piano(hz(ch[-1] + 24), 3, .08))
    bar += 1; t0 += BAR
finish(A, 'a-piano.wav')

# B. 물방울 패드: 천천히 숨 쉬는 화음 + 가끔 물방울
B = np.zeros(N)
bar = 0; t0 = 0.0
while t0 < DUR:
    ch = CH[bar % 4]
    add(B, t0 - .8, pad([hz(m) for m in ch], BAR * 2.2, .5))
    add(B, t0, pad([hz(ch[0] - 12)], BAR * 1.6, .35))
    for k in range(2):
        if rng.random() < .7:
            add(B, t0 + rng.random() * BAR, drop(hz(ch[rng.integers(len(ch))] + 24), .07))
    bar += 1; t0 += BAR
finish(B, 'b-pad.wav', 4, 6)

# C. 오르골: 펜타토닉 멜로디 + 옅은 화음
C = np.zeros(N)
mel = [72, 74, 77, 79, 77, 74, 72, 69, 72, 74, 72, 67, 69, 72, 74, 77]
bar = 0; t0 = 0.0; mi = 0
while t0 < DUR:
    ch = CH[bar % 4]
    add(C, t0, pad([hz(m) for m in ch], BAR * 1.2, .28))
    for i in range(4):
        if (bar + i) % 5 == 4: continue  # 숨 쉬는 쉼표
        add(C, t0 + i * BAR / 4, bell(hz(mel[mi % len(mel)]), 3.2, .22)); mi += 1
    bar += 1; t0 += BAR
finish(C, 'c-musicbox.wav')
