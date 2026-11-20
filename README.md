# IPD RL Lab — Tekrarlı Mahkum İkilemi & 2 AI Ajan Düellosu

Oyun Teorisi'ndeki **Tekrarlı Mahkum İkilemi (Iterated Prisoner's Dilemma)** senaryosunu temel alan, arka uç (backend) gerektirmeden **%100 tarayıcı içinde (client-side)** gerçek zamanlı çalışan **Pekiştirmeli Öğrenme (Tabular Q-Learning) Laboratuvarı** ve **2 AI Ajan Düello Arenası**.

**Vite + React + TypeScript + Tailwind CSS v4** ile geliştirilmiştir; tüm simülasyon, makine öğrenmesi ve canlı grafik hesaplamaları doğrudan kullanıcının tarayıcısında yüksek performansla çalışır.

- **Canlı Demo:** [https://ipd.hamzafpv.com.tr](https://ipd.hamzafpv.com.tr)

---

## Öne Çıkan Özellikler

### 1. Pekiştirmeli Öğrenme (Tabular Q-Learning) & Oyun Teorisi Motoru
- **Bağımsız Q-Learning Ajanları:** **Agent Alpha** ve **Agent Beta**, birbirinden bağımsız birer Tabular Q-Learning tablosu ile sıfırdan strateji öğrenir.
- **Durum Uzayı (State Space):** Son 2 turda iki ajanın yaptığı hamlelerin tüm kombinasyonları (`INIT`, 4 tek turluk + 16 iki turluk durum — ör. `[C-C, C-D]`).
- **Aksiyonlar & Bellman Güncellemesi:** `COOPERATE` (İş Birliği) ve `DEFECT` (İhanet) aksiyonları için anlık ayarlanabilir:
  - Learning Rate (`α`)
  - Discount Factor (`γ`)
  - Exploration Rate (`ε`) ve otomatik **Epsilon Decay**
- **6 Seçilebilir Beyin Modu:** Her iki ajan için de ayrı ayrı seçilebilir:
  1. `Q-Learning AI` — Sıfırdan öğrenen pekiştirmeli öğrenme modeli
  2. `Tit-for-Tat` — İlk tur iş birliği yapar, sonra rakibin bir önceki hamlesini taklit eder
  3. `Grim Trigger` — Tek bir ihanet gördüğünde oyun sonuna kadar ihanet eder
  4. `Always Defect` — Her zaman ihanet eder
  5. `Always Cooperate` — Her zaman iş birliği yapar
  6. `Human Player` — Klavye veya butonlarla AI'a karşı manuel oyun
- **Dinamik Kazanç Matrisi (Payoff Matrix):** Varsayılan değerler (`R: +3/+3`, `T: +5`, `S: 0`, `P: +1/+1`) simülasyon sırasında canlı olarak değiştirilebilir veya hazır senaryo ön ayarları uygulanabilir.
- **Gürültü (Noise) Parametresi (`%0 – %20`):** Ajanın seçtiği kararın belirli bir olasılıkla yanlışlıkla tersine dönmesini simüle ederek stratejilerin hata toleransını test etmenizi sağlar.

### 2. Görsel Düello Arenası & Hız Kontrolü
- **Canlı Çarpışma Sahnesi:** Her turda ajanların kararları animasyonlu enerji hatlarıyla ortada çarpışır, kazanılan puanlar (`+5`, `+3`, `+1`, `0`) ve gürültü kaynaklı hamle kaymaları anlık gösterilir.
- **Zihinsel Durum Göstergesi:** RL ajanlarının o turda **`EXPLORING (Rastgele Deneme)`** mi yoksa **`EXPLOITING (Q-Table Kararı)`** modunda mı karar verdiği canlı izlenir.
- **4 Kademeli Hız Kontrolü:** `1x` (izleme), `10x`, `100x` ve animasyonları kapatıp saniyede **1.000+ tur** eğitim yapan **`TURBO`** modu.
- **Oynatma Araçları:** `Play / Pause`, `1 Tur İlerle (Step)` ve `Sıfırla (Reset Brain)` kontrolleri.

### 3. Canlı Telemetri, Q-Table Isı Haritası & Strateji Dedektörü
- **Akıcı HTML5 Canvas Grafikleri:**
  - Son 100 turun hareketli ortalamasına göre **İş Birliği Oranı (%)** çizgi grafiği
  - İki ajanın **Kümülatif Skor** karşılaştırma grafiği
- **Canlı Q-Table Isı Haritası (Heatmap):** Her iki RL ajanının 16 durum için `COOPERATE` ve `DEFECT` Q-değerlerini, tercih edilen aksiyonu, ziyaret sayısını ve o an aktif olan durumu renkli matris üzerinde gerçek zamanlı gösterir.
- **Strateji Dedektörü (Son 50 Tur):** Ajanların davranışlarına göre mevcut dengeyi otomatik etiketler (*"Karşılıklı İş Birliği Kuruldu"*, *"Nash Dengesi: İhanet Sarmalı"*, *"Alpha, Beta'yı Sömürüyor"* vb.).

### 4. Eğitilmiş Botlarla 1v1 & JSON Dışa/İçe Aktarma (`Bot Arenası`)
- Laboratuvarda eğittiğiniz **Agent Alpha** veya **Agent Beta** beyinlerini tek tıkla tarayıcıya (`localStorage`) kaydedebilir veya **`.json`** dosyası olarak dışa/içe aktarabilirsiniz.
- **Bot Arenası** sekmesinde kendi eğittiğiniz veya dışarıdan yüklediğiniz bir Q-Table botuna karşı birebir (**1v1**) maç yapabilir, botun politika özetini (iş birliği / ihanet eğilimi) inceleyebilirsiniz.

---

## Klavye Kısayolları (İnsan Oyuncu Modu)

| Ajan | İş Birliği (`COOPERATE`) | İhanet (`DEFECT`) |
| --- | :---: | :---: |
| **Agent Alpha (Sol)** | `C` | `D` |
| **Agent Beta (Sağ)** | `J` | `K` |

---

## Proje Mimarisi

```text
ipd-rl-lab/
├── index.html                          # Uygulama giriş noktası
├── vercel.json                         # Vercel statik deploy yapılandırması
├── vite.config.ts                      # Vite + React + Tailwind v4 ayarları
└── src/
    ├── App.tsx                         # Ana orkestratör, simülasyon döngüsü ve sekme yönetimi
    ├── engine/
    │   ├── types.ts                    # Paylaşılan TypeScript tipleri ve durum tanımları
    │   ├── qLearningAgent.ts           # Tabular Q-Learning sınıfı ve Bellman güncellemesi
    │   ├── strategies.ts               # Sabit stratejiler, durum kodlayıcı ve kazanç hesabı
    │   ├── strategyDetector.ts         # Son 50 tur denge ve strateji sınıflandırıcı
    │   ├── SimulationEngine.ts         # Yüksek hızlı simülasyon motoru ve telemetri tamponu
    │   └── botSerializer.ts            # Q-Table bot JSON dışa/içe aktarma ve localStorage yönetimi
    └── components/
        ├── Arena/
        │   ├── DuelStage.tsx           # Canlı düello sahnesi, enerji hatları ve insan kontrolleri
        │   └── ControlPanel.tsx        # Hız, beyin seçimi, hiperparametre, gürültü ve matris paneli
        ├── Analytics/
        │   ├── LiveCharts.tsx          # Retina uyumlu HTML5 Canvas telemetri grafikleri
        │   ├── QTableHeatmap.tsx       # 16 durumluk canlı Q-Table ısı haritası
        │   └── StrategyDetector.tsx    # Canlı denge etiketi ve dağılım çubuğu
        └── BotDuel/
            └── TrainedBotArena.tsx     # Eğitilmiş bot kütüphanesi ve 1v1 düello ekranı
```

---

## Teknoloji Yığını

- **Frontend:** React 18, TypeScript (`strict: true`), Vite 6
- **Stil & İkonlar:** Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React
- **Grafikler & ML:** Harici ML/grafik kütüphanesi olmadan saf TypeScript Tabular Q-Learning motoru ve HTML5 `<canvas>` 2D

---

## Yerel Kurulum

```bash
git clone https://github.com/0dayfpv/ipd-rl-lab.git
cd ipd-rl-lab
npm install
npm run dev
```

Üretim derlemesi almak için:

```bash
npm run build
npm run preview
```
