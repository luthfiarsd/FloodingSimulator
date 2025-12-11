# 🌊 Rising Sea Level & Tsunami Simulator

Simulasi 3D interaktif untuk memvisualisasikan dampak kenaikan permukaan air laut akibat perubahan iklim dan bencana tsunami terhadap wilayah pesisir.

## 📋 Deskripsi

Proyek ini merupakan simulator berbasis WebGL yang menampilkan:

- Kenaikan permukaan air laut dari tahun 2025-2200
- Simulasi gelombang tsunami yang realistis
- Model 3D kota pesisir dengan bangunan dan vegetasi
- Sistem barrier banjir untuk mitigasi bencana

## 🎯 Tujuan SDG

Proyek ini mendukung:

- **SDG 11**: Sustainable Cities and Communities - Membangun kota yang tangguh terhadap bencana alam
- **SDG 13**: Climate Action - Menunjukkan dampak nyata perubahan iklim terhadap wilayah pesisir

## 🚀 Cara Menjalankan

1. Download aset 3D dari [Google Drive](https://drive.google.com/drive/folders/1T3PuZzuvz898JFi1HOmMmNonC0jf5_tX?usp=sharing)
2. Ekstrak aset ke folder `assets/`
3. Buka file `index.html` di browser modern (Chrome/Firefox/Edge)

## 🎮 Kontrol

- **Mouse**: Putar dan zoom tampilan 3D
- **Year Slider**: Atur tahun untuk melihat proyeksi kenaikan air laut
- **Flood Barrier**: Aktifkan/nonaktifkan penghalang banjir
- **Trigger Tsunami**: Simulasikan gelombang tsunami

## 🛠️ Teknologi

- **Three.js**: Rendering 3D WebGL
- **dat.GUI**: Interface kontrol
- **JavaScript ES6**: Logika simulasi
- **HTML5/CSS3**: UI dan styling

## 📊 Fitur Utama

- Terrain 3D dengan tekstur realistis (pantai, jalan, trotoar)
- Model 3D: pohon, cottage, apartemen
- Water shader dengan efek gelombang dinamis
- Sistem pencahayaan dan bayangan
- Efek atmosfer (langit, awan, kabut)
- Simulasi tsunami dengan gelombang progresif
- Barrier banjir interaktif

## 📁 Struktur File

```
├── index.html              # File utama
├── floodingsimulator.js    # Logika simulasi
├── style.css               # Styling UI
└── assets/                 # Aset 3D (model OBJ dan tekstur)
```
