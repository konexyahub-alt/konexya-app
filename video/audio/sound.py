"""Trilha sonora sintetizada, determinística e sincronizada com config.js.

Tudo é função do tempo e de sementes fixas: rodar de novo gera o mesmo arquivo, bit a bit.
Saída: out/audio.wav (48 kHz, estéreo, normalizado para -14 LUFS / -1 dBTP, padrão do Reels).

Camadas:
  pad      acordes (Ré menor) que mudam a cada cena
  sub      grave que sustenta e cresce até o Mapa Vivo
  pulse    pulso sutil de "rotina" (cenas 2 e 3)
  whoosh   entradas de texto
  pluck    pinos e etiquetas (notas do acorde, timbre de vidro)
  shimmer  desenho das rotas
  riser    subida até o Mapa Vivo + impacto
  outro    queda das luzes, impacto da marca e sino com cauda longa
"""
import json
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
SR = 48000

# ---------------------------------------------------------------------------------------------
# Parâmetros editáveis
# ---------------------------------------------------------------------------------------------
MIX = {
    "pad": 0.34,
    "sub": 0.24,
    "pulse": 0.20,
    "whoosh": 0.20,
    "pluck": 0.30,
    "shimmer": 0.10,
    "riser": 0.22,
    "impact": 0.55,
    "bell": 0.30,
    "reverb": 0.32,
}
BPM = 100
TARGET_LUFS = -14
SEED = 20261121

cues = json.loads(subprocess.check_output(["node", os.path.join(ROOT, "audio", "cues.js")], cwd=ROOT))
DUR = cues["duration"]
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(SEED)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(start, a, hold, r, curve=2.0):
    """Envelope por tempo absoluto: ataque a, sustenta hold, solta r (s)."""
    x = t - start
    e = np.zeros(N)
    up = (x >= 0) & (x < a)
    e[up] = (x[up] / a) ** curve
    mid = (x >= a) & (x < a + hold)
    e[mid] = 1
    down = (x >= a + hold) & (x < a + hold + r)
    e[down] = (1 - (x[down] - a - hold) / r) ** curve
    return e


def smooth(a, b):
    k = np.clip((t - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_lp(x, f0, f1, a, b, blocks=200):
    """Filtro passa-baixa com corte que varia no tempo (por blocos com sobreposição)."""
    out = np.zeros_like(x)
    edges = np.linspace(0, N, blocks + 1).astype(int)
    for i in range(blocks):
        s, e = edges[i], edges[i + 1]
        tm = (s + e) / 2 / SR
        k = np.clip((tm - a) / (b - a), 0, 1)
        f = f0 * (f1 / f0) ** k
        pad = 2048
        s0 = max(0, s - pad)
        seg = lp(x[s0:e], min(f, SR / 2 - 100))
        out[s:e] = seg[s - s0:]
    return out


# ---------------------------------------------------------------------------------------------
# Pad: acordes por cena (vozes em MIDI), osciladores serrilhados desafinados e filtrados.
# ---------------------------------------------------------------------------------------------
CHORDS = [
    (0.0, [50, 57, 60, 64, 69]),  # Ré m (add9) — abertura
    (3.2, [46, 53, 57, 60, 65]),  # Si♭ maj7 — rotina
    (7.0, [41, 48, 57, 60, 64]),  # Fá (add9)/Lá — Mapa Vivo, abre
    (9.6, [43, 50, 58, 62, 65]),  # Sol m9
    (12.0, [50, 57, 62, 64, 69]),  # Ré sus2 — marca, resolve
]


def saw(freq, phase=0.0):
    # Serra com poucas harmônicas (suave, sem aliasing).
    out = np.zeros(N)
    for k in range(1, 9):
        out += np.sin(2 * np.pi * freq * k * t + phase * k) / k
    return out


pad = np.zeros((N, 2))
for i, (start, notes) in enumerate(CHORDS):
    end = CHORDS[i + 1][0] if i + 1 < len(CHORDS) else DUR
    xf = 0.9
    e = smooth(start - xf * 0.5, start + xf) * (1 - smooth(end - xf * 0.5, end + xf * 0.5) if end < DUR else 1)
    for j, m in enumerate(notes):
        f = midi(m)
        for ch, det in ((0, -0.07), (1, 0.07)):
            v = saw(f * 2 ** (det / 12), phase=rng.uniform(0, 6.28))
            pad[:, ch] += v * e * (0.9 if j else 1.1) / len(notes)
# Brilho do pad abre no Mapa Vivo e fecha antes da marca.
cut = sweep_lp(pad[:, 0], 500, 2600, 3.0, 8.0)
pad[:, 0] = cut
pad[:, 1] = sweep_lp(pad[:, 1], 500, 2600, 3.0, 8.0)
pad[:, 0] = hp(pad[:, 0], 90)
pad[:, 1] = hp(pad[:, 1], 90)
pad *= (0.35 + 0.65 * smooth(0.0, 2.2))[:, None] * (1 - 0.75 * smooth(11.6, 13.2))[:, None] * (1 + 0.6 * smooth(13.6, 14.4))[:, None]
pad *= (1 - smooth(15.2, 16.0))[:, None]

# ---------------------------------------------------------------------------------------------
# Sub
# ---------------------------------------------------------------------------------------------
root = np.interp(t, [c[0] for c in CHORDS], [midi(c[1][0] - 12) for c in CHORDS])
step_root = np.array([midi(next(c for c in reversed(CHORDS) if c[0] <= x)[1][0] - 12) for x in t[::480]])
step_root = np.repeat(step_root, 480)[:N]
sub_phase = 2 * np.pi * np.cumsum(step_root) / SR
sub = np.sin(sub_phase) * (0.2 + 0.8 * smooth(0.5, 7.0)) * (1 - smooth(11.8, 12.8))
sub = lp(sub, 140)

# ---------------------------------------------------------------------------------------------
# Pulso da rotina: clique suave em colcheias, de 3.4 s a 12 s, acento no tempo.
# ---------------------------------------------------------------------------------------------
pulse = np.zeros(N)
beat = 60 / BPM
k = 0
tick_noise = rng.standard_normal(int(0.05 * SR))
while True:
    tm = 3.4 + k * beat / 2
    if tm > 12.0:
        break
    s = int(tm * SR)
    L = len(tick_noise)
    seg = tick_noise * np.exp(-np.arange(L) / (0.008 * SR)) * (1.0 if k % 2 == 0 else 0.55)
    pulse[s:s + L] += seg[: max(0, min(L, N - s))]
    k += 1
pulse = bp(pulse, 2500, 9000) * (smooth(3.4, 5.5) * 0.6 + 0.4 * smooth(7.0, 7.6)) * (1 - smooth(11.0, 12.0))

# ---------------------------------------------------------------------------------------------
# Whooshes nas entradas de texto
# ---------------------------------------------------------------------------------------------
noise = rng.standard_normal(N)
whoosh = np.zeros(N)
for b in cues["texts"]:
    e = env_adsr(b["in"] - 0.25, 0.3, 0.05, 0.55)
    whoosh += bp(noise, 600, 5000) * e
whoosh = lp(whoosh, 7000)

# ---------------------------------------------------------------------------------------------
# Plucks de vidro em pinos e etiquetas
# ---------------------------------------------------------------------------------------------
pluck = np.zeros((N, 2))
events = []
p = cues["pins"]
events += [(p["home"]["pin"], 81, 0.0), (p["work"]["pin"], 76, 0.4), (p["gym"]["pin"], 79, -0.4)]
events += [(p["home"]["label"], 76, 0.25), (p["gym"]["label"], 72, -0.35), (p["work"]["label"], 79, 0.35)]
for tm, m, pan in events:
    x = t - tm
    on = x >= 0
    f = midi(m)
    v = np.zeros(N)
    v[on] = (np.sin(2 * np.pi * f * x[on]) + 0.35 * np.sin(2 * np.pi * f * 2.01 * x[on]) + 0.12 * np.sin(2 * np.pi * f * 3.98 * x[on])) * np.exp(-x[on] / 0.45)
    v[on] *= np.clip(x[on] / 0.003, 0, 1)
    pluck[:, 0] += v * np.sqrt(0.5 * (1 - pan))
    pluck[:, 1] += v * np.sqrt(0.5 * (1 + pan))

# ---------------------------------------------------------------------------------------------
# Shimmer das rotas: tom agudo que sobe enquanto a rota é desenhada
# ---------------------------------------------------------------------------------------------
shimmer = np.zeros(N)
for a, b in (cues["routes"]["work"], cues["routes"]["gym"]):
    k = np.clip((t - a) / (b - a), 0, 1)
    f = midi(86) * 2 ** (k * 7 / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = smooth(a, a + 0.3) * (1 - smooth(b - 0.2, b + 0.4))
    shimmer += (np.sin(ph) * 0.6 + bp(noise, 6000, 12000) * 0.5) * e
shimmer = hp(shimmer, 2000)

# ---------------------------------------------------------------------------------------------
# Subida até o Mapa Vivo e impacto
# ---------------------------------------------------------------------------------------------
riser = sweep_lp(noise, 300, 9000, 5.4, 7.0) * smooth(5.4, 6.95) ** 2 * (1 - smooth(6.95, 7.05))


def impact(tm, f0=58, f1=34, dur=1.8):
    x = t - tm
    on = x >= 0
    out = np.zeros(N)
    f = f1 + (f0 - f1) * np.exp(-x[on] / 0.12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    out[on] = np.sin(ph) * np.exp(-x[on] / (dur / 3)) * np.clip(x[on] / 0.004, 0, 1)
    click = lp(noise, 1800) * env_adsr(tm, 0.002, 0.0, 0.12)
    return out + click * 0.4


imp = impact(7.0) * 0.8 + impact(cues["outro"]["wordmark"][0] - 0.05, 52, 30, 3.2)

# Inspiração reversa antes da marca: ruído que cresce e corta no impacto.
o = cues["outro"]
pre = sweep_lp(noise, 200, 5000, o["dotToMark"][0], o["wordmark"][0] - 0.05) * smooth(o["dotToMark"][0] - 0.2, o["wordmark"][0] - 0.06) ** 3
pre *= 1 - smooth(o["wordmark"][0] - 0.06, o["wordmark"][0] - 0.02)

# Sino da marca (parciais inarmônicos leves), mais um toque na varredura de luz.
bell = np.zeros(N)
for tm, base, gain in ((o["wordmark"][0] - 0.05, 74, 1.0), (14.9, 81, 0.35)):
    x = t - tm
    on = x >= 0
    for ratio, amp, dec in ((1, 1, 3.2), (2.0, 0.5, 2.2), (2.76, 0.28, 1.6), (5.4, 0.12, 0.8), (1.5, 0.35, 2.6)):
        bell[on] += amp * gain * np.sin(2 * np.pi * midi(base) * ratio * x[on]) * np.exp(-x[on] / dec) * np.clip(x[on] / 0.002, 0, 1)

# ---------------------------------------------------------------------------------------------
# Mixagem, reverberação e masterização
# ---------------------------------------------------------------------------------------------
def stereo(x, width=0.0):
    return np.stack([x * (1 - width), x * (1 + width)], axis=1)


dry = (
    pad * MIX["pad"]
    + stereo(sub) * MIX["sub"]
    + stereo(pulse, 0.15) * MIX["pulse"]
    + stereo(whoosh, -0.2) * MIX["whoosh"]
    + pluck * MIX["pluck"]
    + stereo(shimmer, 0.25) * MIX["shimmer"]
    + stereo(riser + pre * 0.8) * MIX["riser"]
    + stereo(imp) * MIX["impact"]
    + stereo(bell, 0.1) * MIX["bell"]
)

# Reverb: resposta ao impulso sintética (ruído com decaimento exponencial), canais descorrelacionados.
ir_len = int(3.0 * SR)
irt = np.arange(ir_len) / SR
ir = np.stack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)], axis=1) * np.exp(-irt / 0.75)[:, None]
ir[:, 0] = lp(ir[:, 0], 6000)
ir[:, 1] = lp(ir[:, 1], 6000)
ir /= np.sqrt((ir ** 2).sum(axis=0))
send = dry - stereo(sub) * MIX["sub"]  # grave sem reverb
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
mix = dry + wet * MIX["reverb"]
mix[:, 0] = hp(mix[:, 0], 25)
mix[:, 1] = hp(mix[:, 1], 25)
# Fade final e início limpo.
mix *= (np.clip(t / 0.02, 0, 1) * (1 - smooth(15.3, 16.0)))[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.7

os.makedirs(OUT, exist_ok=True)
raw = os.path.join(OUT, "audio_raw.wav")
wavfile.write(raw, SR, (mix * 32767).astype(np.int16))

# Loudness: duas passagens do loudnorm do FFmpeg (medição + aplicação linear).
meas = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", raw, "-af", f"loudnorm=I={TARGET_LUFS}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
af = (
    f"loudnorm=I={TARGET_LUFS}:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
    f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
)
final = os.path.join(OUT, "audio.wav")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-ar", str(SR), "-t", str(DUR), final], check=True)
print(f"→ out/audio.wav  (entrada {m['input_i']} LUFS → {TARGET_LUFS} LUFS)")
