/* Paguyuban RHDM — dynamic UI strings + content translations (Bahasa Indonesia).
 *
 * Split from i18n.js to keep each file readable. The first block extends the
 * same dictionary (for strings app.js builds at runtime); the second is the
 * content map that lang.js merges over data.js.
 */
window.ALDER_I18N = window.ALDER_I18N || {};
window.ALDER_I18N.id = window.ALDER_I18N.id || {};

Object.assign(window.ALDER_I18N.id, {
  /* app.js: market results + states */
  "listing": "barang",
  "listings": "barang",
  "{n} listings shown": "{n} barang ditampilkan",
  "Nothing in this category yet": "Belum ada apa pun di kategori ini",
  "No listings match": "Tidak ada barang yang cocok dengan",
  "Try a broader word, a different category, or clear the filters to see all {n} listings.": "Coba kata yang lebih umum, kategori lain, atau hapus saringan untuk melihat semua {n} barang.",
  "We could not reach the listing data. Your filters are preserved. If it keeps failing, contact the organiser.": "Kami tidak dapat mengambil data barang. Saringan Anda tetap tersimpan. Jika terus gagal, hubungi pengurus.",
  "Last attempted: just now": "Terakhir dicoba: baru saja",

  /* app.js: listing detail */
  "We could not find a listing with the reference": "Kami tidak menemukan barang dengan rujukan",
  "It may have sold or been taken down.": "Mungkin sudah terjual atau dicabut.",
  "No listing was specified.": "Tidak ada barang yang disebutkan.",
  "Listed": "Dipasang",
  "Saved to your shortlist.": "Disimpan ke daftar pilihan Anda.",
  "Removed from your shortlist.": "Dihapus dari daftar pilihan Anda.",
  "Payment and pickup happen offline, between the two of you.": "Pembayaran dan pengambilan dilakukan di luar situs, antara kalian berdua.",

  /* app.js: events */
  "Nothing is scheduled yet. The next Sunday roast will appear here once it is.": "Belum ada jadwal. Makan bersama berikutnya akan muncul di sini nanti.",
  "in {n} days": "{n} hari lagi",
  "today": "hari ini",
  "{n} going": "{n} hadir",

  /* app.js: home counts */
  "items in the market": "barang di pasar",
  "family members": "anggota komunitas",
  "events coming up": "acara mendatang",
  "shared recipes": "resep bersama",

  /* app.js: profiles */
  "{n} members": "{n} anggota",
  "{n} branches": "{n} cabang",
  "No profiles yet": "Belum ada profil",
  "The directory is empty.": "Direktori masih kosong.",
  "Not found": "Tidak ditemukan",
  "Profile not found": "Profil tidak ditemukan",
  "That profile is not here": "Profil itu tidak ada di sini",
  "We could not find a relative with that reference.": "Kami tidak menemukan kerabat dengan rujukan itu.",
  "Back to profiles": "Kembali ke profil",
  "Read more in the notebook": "Baca selengkapnya di buku catatan",
  "All profiles": "Semua profil",
  "In the market": "Di pasar",
  "Nothing listed in the market right now.": "Tidak ada barang di pasar saat ini.",
  "From the recipe box": "Dari buku resep",
  "Posted recently": "Baru-baru ini ditulis",

  /* app.js: albums */
  "Reunion 2025": "Reuni 2025",
  "The cabin kitchen": "Dapur pondok",
  "Ivy's first week": "Pekan pertama Ivy",
  "Coyote Creek, spring": "Coyote Creek, musim semi",
  "Nora's half-marathon": "Half-marathon Nora",
  "Grandpa Al's workshop": "Bengkel Kakek Al",
  "{n} photos": "{n} foto",
  "Before, during, and the countertop that was oak all along.": "Sebelum, selama, dan meja dapur yang ternyata kayu ek.",
  "Three days, one very competitive egg-and-spoon race.": "Tiga hari, satu lomba balap telur yang sangat kompetitif.",
  "Mostly sleeping. Occasionally not.": "Sebagian besar tidur. Sesekali tidak.",
  "The orchard, the hens, and Al's tomatoes in progress.": "Kebun, ayam-ayam, dan tomat Al yang sedang tumbuh.",
  "The finish line, and the face she made at kilometre 19.": "Garis finis, dan raut wajahnya di kilometer 19.",
  "Forty years of tools, catalogued at last.": "Empat puluh tahun perkakas, akhirnya terdata.",

  /* app.js: sell form validation + submit */
  "Give it at least 3 characters.": "Isi minimal 3 karakter.",
  "Keep the title under 70 characters.": "Judul maksimal 70 karakter.",
  "Pick a category.": "Pilih satu kategori.",
  "Enter a price, or 0 for free / borrow.": "Isi harga, atau 0 untuk gratis / pinjam.",
  "Price must be a number of 0 or more.": "Harga harus angka 0 atau lebih.",
  "Tell people where to find it.": "Beri tahu orang di mana barangnya.",
  "Write at least 20 characters, a sentence or two.": "Tulis minimal 20 karakter, satu dua kalimat.",
  "Keep it under 600 characters.": "Maksimal 600 karakter.",
  "Posting…": "Memasang…",
  "Posting your listing.": "Memasang barang Anda.",
  "Your listing was posted.": "Barang Anda sudah terpasang.",
  "{n} problems to fix": "{n} masalah perlu diperbaiki",

  /* misc */
  "Free / borrow": "Gratis / pinjam",

  /* catalog cog CRUD */
  "Edit the market": "Sunting pasar",
  "Catalog": "Katalog",
  "Close catalog": "Tutup katalog",
  "Manage listings": "Kelola barang",
  "Sign in as an admin to edit the market.": "Masuk sebagai admin untuk menyunting pasar.",
  "Manage what the family is selling": "Kelola apa yang dijual komunitas",
  "Add a listing": "Tambah barang",
  "Edit listing": "Sunting barang",
  "Edit": "Sunting",
  "Delete": "Hapus",
  "Cancel": "Batal",
  "Save listing": "Simpan barang",
  "Listing saved.": "Barang disimpan.",
  "Listing removed.": "Barang dihapus.",
  "Delete this listing? It will leave the market on this device.": "Hapus barang ini? Barang akan hilang dari pasar di perangkat ini.",
  "No listings yet": "Belum ada barang",
  "No photos yet": "Belum ada foto",
  "Remove photo": "Hapus foto",
  "SKU": "SKU",
  "Price unit": "Satuan harga",
  "Seller": "Penjual",
  "Details (one per line)": "Rincian (satu per baris)",
  "Tags (comma separated)": "Tag (pisahkan dengan koma)",
  "Images": "Gambar",
  "Photos are stored on this device. Keep them small.": "Foto disimpan di perangkat ini. Usahakan ukurannya kecil.",
  "Optional. Leave blank to generate one.": "Opsional. Kosongkan untuk dibuat otomatis.",
  "Tell people who has it.": "Beri tahu orang siapa yang punya.",
  "Fix the highlighted fields.": "Perbaiki kolom yang ditandai.",
  "e.g. RHDM-OAK01": "mis. RHDM-OAK01",
  "Unit, e.g. / pair": "Satuan, mis. / pasang"
});

/* ── content ──────────────────────────────────────────────────────────── */
window.ALDER_I18N_CONTENT = window.ALDER_I18N_CONTENT || {};
window.ALDER_I18N_CONTENT.id = {
  site: {
    tagline: "Kabar komunitas, resep, dan pasar yang dijalankan anggota"
  },
  categories: {
    handmade: "Buatan tangan",
    secondhand: "Barang bekas",
    services: "Jasa",
    produce: "Hasil bumi",
    rentals: "Sewa",
    digital: "Digital"
  },
  listings: {
    "oak-dining-table": {
      title: "Meja makan kayu ek, muat delapan orang",
      blurb: "Sudah dipoles ulang musim semi lalu. Cukup panjang untuk seluruh cabang kedua, dan cukup jujur soal bekas gelas di salah satu sudutnya.",
      condition: "Sudah lama dipakai",
      details: [
        "182 x 92 cm, nyaman untuk delapan orang",
        "Kayu ek solid, dipoles ulang 2025",
        "Ada bekas gelas di sudut utara, difoto apa adanya",
        "Hanya ambil sendiri, kami bantu mengangkat"
      ],
      tags: ["mebel", "ambil sendiri", "sudah dipoles"]
    },
    "sourdough-starter": {
      title: "Biang roti sourdough + panduan satu halaman",
      blurb: "Satu toples biang yang sudah ada di komunitas sejak 2011, plus lembar panduan yang benar-benar menjelaskan cara merawatnya.",
      condition: "Baru",
      details: [
        "Biang aktif, siap diberi makan",
        "Termasuk panduan pemberian makan satu halaman",
        "Bawa toples sendiri atau pakai toples saya",
        "Isi ulang gratis kalau mati di bulan pertama, itu tanggung jawab Anda"
      ],
      tags: ["roti", "dapur", "ramah pemula"]
    },
    "handknit-wool-socks": {
      title: "Kaus kaki wol rajutan tangan, sesuai pesanan",
      blurb: "Merino, tidak sengaja tahan mesin cuci dan sama sekali tidak tahan pengering. Sebutkan ukuran dan warna, saya mulai merajut.",
      condition: "Baru",
      details: [
        "100% merino, dua lapis",
        "Ukuran 36 sampai 47 EU",
        "Pilih warna garisnya",
        "Pengerjaan dua pekan di musim reuni"
      ],
      tags: ["rajutan", "musim dingin", "sesuai pesanan"]
    },
    "beginner-guitar-lessons": {
      title: "Kursus gitar pemula, 30 menit",
      blurb: "Untuk yang dapat gitar saat ulang tahun lalu tidak pernah menyentuhnya lagi. Bisa lewat panggilan video atau langsung saat Anda ke kota.",
      condition: "n/a",
      details: [
        "30 menit, lewat video atau langsung",
        "Sesi pertama gratis untuk usia di bawah 16 tahun",
        "Bawa gitar yang masih bisa disetel",
        "Saya lambat membalas email, kirim pesan singkat saja"
      ],
      tags: ["musik", "kursus", "ramah anak"]
    },
    "backyard-eggs": {
      title: "Telur ayam pekarangan, satu lusin",
      blurb: "Enam ayam, telur lebih banyak daripada yang bisa dihabiskan dua orang. Ambil di gerbang, kotaknya di teras.",
      condition: "Segar",
      details: [
        "Warna cokelat campur, dipanen tiap hari",
        "Kotak jujur di teras",
        "Maksimal dua lusin per pekan agar semua kebagian",
        "Tidak ada telur saat pekan reuni, ayamnya juga libur"
      ],
      tags: ["telur", "mingguan", "ambil di teras"]
    },
    "trailer-loan-july": {
      title: "Pinjam kereta kemah, satu pekan",
      blurb: "Muat empat orang, enak ditarik apa pun yang punya kaitan. Gratis untuk komunitas, asal tangki airnya dikosongkan saat dikembalikan.",
      condition: "Pinjam",
      details: [
        "Muat empat orang, ada dapur kecil",
        "Sudah dipesan untuk pekan reuni, tanyakan pekan lain",
        "Kembalikan dengan tangki air kosong dan bagian dalam disapu",
        "Anda mengurus kaitan dan asuransinya"
      ],
      tags: ["kemah", "pinjam", "gratis komunitas"]
    },
    "recipe-ebook": {
      title: "Buku Resep RHDM (PDF)",
      blurb: "Empat puluh satu resep yang dikumpulkan selama tiga reuni, sudah diketik rapi. Termasuk sambal tomat hijau yang bertahun-tahun tak pernah ditulis.",
      condition: "Baru",
      details: [
        "41 resep, 68 halaman, PDF",
        "Dikirim lewat email setelah pembayaran",
        "Tata letak siap cetak",
        "Gratis untuk siapa pun yang menyumbang resep"
      ],
      tags: ["resep", "pdf", "hadiah"]
    },
    "vintage-film-camera": {
      title: "Kamera film lama, masih berfungsi penuh",
      blurb: "Diservis musim semi ini, lapisan cahaya diganti, rana akurat. Disertai dua rol film supaya bisa langsung dipakai.",
      condition: "Bagus",
      details: [
        "SLR 35mm, lensa 50mm f/1.8",
        "Diservis musim semi 2026, lapisan cahaya diganti",
        "Termasuk dua rol film",
        "Saya siap memandu sampai rol pertama selesai"
      ],
      tags: ["fotografi", "film", "sudah diservis"]
    },
    "tomato-seedlings": {
      title: "Bibit tomat, satu pak isi enam",
      blurb: "San Marzano dan ceri, sudah diaklimatisasi dan siap masuk tanah. Saya menanam terlalu banyak lagi.",
      condition: "Siap tanam",
      details: [
        "Enam bibit per pak, varietas campur",
        "Sudah diaklimatisasi, siap ke tanah",
        "Bawa wadah untuk mengangkutnya",
        "Tanya apa saja, saya tetap akan bercerita"
      ],
      tags: ["berkebun", "musim semi", "sayuran"]
    },
    "photo-retouching": {
      title: "Penyuntingan foto pernikahan dan reuni",
      blurb: "Kirimkan yang ingin Anda bingkai. Saya perbaiki warna, debu, dan kerabat yang matanya terpejam, lalu kirim balik berkas siap cetak.",
      condition: "n/a",
      details: [
        "Sampai 25 foto per kelompok",
        "Warna, debu, dan restorasi dasar",
        "Berkas siap cetak dalam sepekan",
        "Potongan komunitas, harga itu sudah final"
      ],
      tags: ["fotografi", "restorasi", "cetak"]
    },
    "jigsaw-and-drill": {
      title: "Gergaji ukir dan bor, dipinjam akhir pekan",
      blurb: "Perkakas bagus, lebih baik kalau dipakai. Pinjam untuk akhir pekan, kembalikan dengan bit masih di kotaknya.",
      condition: "Pinjam",
      details: [
        "Gergaji ukir kabel dan bor 18V",
        "Dua baterai, pengisi daya, bit beragam",
        "Pinjaman akhir pekan, lebih lama bisa diatur",
        "Mohon jangan dipinjamkan lagi tanpa bertanya"
      ],
      tags: ["perkakas", "pinjam", "akhir pekan"]
    },
    "green-tomato-relish": {
      title: "Sambal tomat hijau, satu toples",
      blurb: "Dibuat saat musim dingin datang lebih awal. Resepnya akhirnya ditulis, dari batch inilah kami akhirnya menuliskannya.",
      condition: "Baru",
      details: [
        "Toples 500 ml, tertutup rapat",
        "Tahan setahun di lemari sejuk",
        "Cocok untuk apa saja, terutama telur",
        "Resepnya ada di buku resep baru"
      ],
      tags: ["olahan", "dapur", "musim gugur"]
    }
  },
  members: {
    "Pearl Alder": { branch: "Kakek-nenek", role: "Penjaga resep komunitas", bio: "Masih orang yang dihubungi siapa pun ketika resep hilang. Memegang cara asli simpul kayu manis dan tidak suka diburu-buru." },
    "Al Alder": { branch: "Kakek-nenek", role: "Menanam tomat lebih banyak daripada yang bisa dihabiskan siapa pun", bio: "Kebun, ayam-ayam, dan tomat lebih banyak daripada yang muat di lumbung. Tahun ini genap delapan puluh dan sudah melarang pidato." },
    "June Whitlock": { branch: "Cabang kedua", role: "Biang roti, buku digital, dan nasihat yang tidak diminta", bio: "Penjaga biang roti keluarga sejak 2011. Menuliskan segala sesuatu agar tidak ada yang menebak dua kali." },
    "Ray Whitlock": { branch: "Cabang kedua", role: "Penyelamat mebel", bio: "Mengamplas meja, memperbaiki kursi, dan jujur soal bekas air. Hanya diambil sendiri, ia akan membantu mengangkatnya." },
    "Nora Alder": { branch: "Cabang ketiga", role: "Merajut, berlari, mengirim barang", bio: "Kaus kaki merino pesanan, dan yang pertama di antara kami menuntaskan half-marathon Bend. Sudah mendaftar untuk jarak penuh." },
    "Theo Alder": { branch: "Cabang ketiga", role: "Guru gitar, lambat membalas email", bio: "Les bagi siapa pun di keluarga yang meminta. Emailnya dibalas akhirnya. Lebih baik bertemu langsung." },
    "Priya Raman": { branch: "Cabang keempat", role: "Memotret semuanya", bio: "Album-album ada karena ia terus memotret. Foto pertama Ivy miliknya." },
    "Dev Okafor": { branch: "Cabang keempat", role: "Kamera dan alat kemah", bio: "Meminjamkan kamera yang bagus dan kereta kemah ketika sedang kosong. Tahu tenda mana yang masih lengkap pasaknya." },
    "Grandma Ivy": { branch: "Kakek-nenek", role: "Anggota termuda, paling mahir tidur", bio: "Lahir tanggal empat, berat delapan pon, sudah jadi anggota cabang keempat yang paling tenang." },
    "Marcus Alder": { branch: "Cabang kedua", role: "Menjaga situs tetap berjalan", bio: "Pengurusnya. Kabar, tanggal, dan pasar semuanya lewat dia. Kirimi email jika sesuatu harus ada di situs." }
  },
  events: [
    { title: "Makan bersama + panggilan video", place: "Semua orang, di mana pun berada", kind: "Rutin", note: "Kamera menyala pukul enam. Pearl yang memasak daging domba dan menceritakannya." },
    { title: "Malam permainan sepupu", place: "Rumah Nora dan Theo, Bend", kind: "Langsung", note: "Bawa camilan dan dendam. Permainan papan dilarang setelah kejadian terakhir." },
    { title: "Ulang tahun ke-80 Kakek Al", place: "Lumbung Coyote Creek", kind: "Momen penting", note: "Bawa makanan. Al minta tanpa sambutan, dan justru itu yang akan terjadi." },
    { title: "Bawa makanan panen + hari pasar", place: "Lumbung Coyote Creek", kind: "Hari pasar", note: "Bawa apa pun yang berlebihan. Meja dibuka pukul sepuluh." },
    { title: "Akhir pekan reuni RHDM", place: "Coyote Creek, OR", kind: "Reuni", note: "Pondok sudah dipesan. Kereta kemah sudah dipakai. Resep ke June paling lambat tanggal 1." }
  ],
  news: [
    { title: "Nora menuntaskan half-marathon Bend", tag: "Pencapaian", excerpt: "Kali ketiga mendaftar, kali pertama finis, dan menurut Theo ia sudah mendaftar untuk jarak penuh." },
    { title: "Dapur pondok akhirnya selesai", tag: "Proyek", excerpt: "Dua musim panas, satu cerobong yang keras kepala, dan meja dapur yang ternyata kayu ek sejak awal. Fotonya ada di album." },
    { title: "Selamat datang, Ivy", tag: "Kelahiran", excerpt: "Lahir tanggal empat, berat delapan pon, sudah jadi anggota cabang keempat yang paling tenang. Foto pertamanya sudah diunggah." },
    { title: "Pasar melewati empat puluh barang", tag: "Kabar situs", excerpt: "Mulanya hanya dua kantong tomat. Kini ada kereta kemah, kamera, dan buku resep di sini." },
    { title: "Sambal tomat hijau: resep ditemukan kembali", tag: "Dapur", excerpt: "Pearl membuatnya, kami memakannya, dan sebelas tahun tak seorang pun menuliskannya. Sekarang sudah tertulis." }
  ],
  recipes: [
    { title: "Simpul kayu manis Pearl", tags: ["Panggang", "Minggu"], note: "Yang selalu muncul di setiap reuni. Adonannya didiamkan semalaman, jangan diburu-buru." },
    { title: "Cabai Coyote Creek", tags: ["Makan malam", "Porsi besar"], note: "Cukup untuk satu lumbung. Al bersikeras memakai kopi di dalamnya dan itu tidak bisa ditawar." },
    { title: "Sourdough June, ditulis dengan benar", tags: ["Roti", "Lambat"], note: "Panduan satu halaman yang menyertai biang roti, diketik untuk yang kehilangan salinannya." },
    { title: "Sambal tomat hijau", tags: ["Olahan", "Musim gugur"], note: "Ditemukan kembali pada 2026 setelah sebelas tahun semua orang mengira orang lain menyimpannya." }
  ]
};
