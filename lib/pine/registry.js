// Katalog builtin Pine yang didukung DCMS. Satu sumber untuk interpreter
// (urutan parameter), cek kompilasi, autocomplete, dan panel referensi.

export const CATEGORY = {
    SERIES: "Seri harga",
    INDICATOR: "Indikator",
    INPUT: "Input (jadi field pengaturan)",
    DISPLAY: "Tampilan",
    LOGIC: "Logika & matematika",
    COLOR: "Warna",
    COLLECTION: "Array & map",
    DRAWING: "Objek gambar",
    TEXT: "String & log",
    CONTEXT: "Waktu, simbol & bar",
};

export const CATEGORY_ORDER = [
    CATEGORY.SERIES, CATEGORY.INDICATOR, CATEGORY.INPUT, CATEGORY.DISPLAY, CATEGORY.LOGIC,
    CATEGORY.COLOR, CATEGORY.COLLECTION, CATEGORY.DRAWING, CATEGORY.TEXT, CATEGORY.CONTEXT,
];

const fn = (params, doc, category, extra = {}) => ({ params, doc, category, ...extra });
const ta = (params, doc) => fn(params, doc, CATEGORY.INDICATOR, { stateful: true });

export const FUNCTIONS = {
    // Indikator
    "ta.sma": ta(["source", "length"], "Rata-rata sederhana"),
    "ta.ema": ta(["source", "length"], "Rata-rata eksponensial"),
    "ta.rma": ta(["source", "length"], "Rata-rata bergerak Wilder (dipakai RSI dan ATR)"),
    "ta.wma": ta(["source", "length"], "Rata-rata berbobot linear"),
    "ta.vwma": ta(["source", "length"], "Rata-rata berbobot volume"),
    "ta.swma": ta(["source"], "Rata-rata simetris 4 bar"),
    "ta.hma": ta(["source", "length"], "Hull moving average"),
    "ta.rsi": ta(["source", "length"], "Relative Strength Index"),
    "ta.macd": ta(["source", "fastlen", "slowlen", "siglen"], "MACD. Mengembalikan [macd, signal, histogram]"),
    "ta.stoch": ta(["source", "high", "low", "length"], "Stochastic %K"),
    "ta.atr": ta(["length"], "Average True Range"),
    "ta.tr": ta(["handle_na"], "True range bar ini"),
    "ta.bb": ta(["series", "length", "mult"], "Bollinger Bands. Mengembalikan [tengah, atas, bawah]"),
    "ta.stdev": ta(["source", "length", "biased"], "Standar deviasi"),
    "ta.variance": ta(["source", "length", "biased"], "Varians"),
    "ta.dev": ta(["source", "length"], "Deviasi rata-rata absolut"),
    "ta.vwap": ta(["source"], "VWAP yang direset tiap hari (UTC)"),
    "ta.highest": ta(["source", "length"], "Nilai tertinggi dalam length bar"),
    "ta.lowest": ta(["source", "length"], "Nilai terendah dalam length bar"),
    "ta.highestbars": ta(["source", "length"], "Jarak (negatif) ke bar tertinggi"),
    "ta.lowestbars": ta(["source", "length"], "Jarak (negatif) ke bar terendah"),
    "ta.change": ta(["source", "length"], "Selisih dengan nilai length bar lalu"),
    "ta.mom": ta(["source", "length"], "Momentum: source dikurangi source[length]"),
    "ta.crossover": ta(["source1", "source2"], "true saat source1 memotong ke atas source2"),
    "ta.crossunder": ta(["source1", "source2"], "true saat source1 memotong ke bawah source2"),
    "ta.cross": ta(["source1", "source2"], "true saat kedua seri saling memotong"),
    "ta.rising": ta(["source", "length"], "true bila source naik selama length bar"),
    "ta.falling": ta(["source", "length"], "true bila source turun selama length bar"),
    "ta.pivothigh": ta(["source", "leftbars", "rightbars"], "Harga pivot high, terkonfirmasi setelah rightbars bar"),
    "ta.pivotlow": ta(["source", "leftbars", "rightbars"], "Harga pivot low, terkonfirmasi setelah rightbars bar"),
    "ta.linreg": ta(["source", "length", "offset"], "Nilai garis regresi linear"),
    "ta.cci": ta(["source", "length"], "Commodity Channel Index"),
    "ta.mfi": ta(["series", "length"], "Money Flow Index"),
    "ta.cum": ta(["source"], "Jumlah kumulatif sejak bar pertama"),
    "ta.barssince": ta(["condition"], "Jumlah bar sejak condition terakhir true"),
    "ta.valuewhen": ta(["condition", "source", "occurrence"], "Nilai source saat condition true ke-n"),
    "ta.median": ta(["source", "length"], "Median dalam length bar"),

    // Input
    input: fn(["defval", "title", "tooltip", "inline", "group", "display"], "Input umum; tipe mengikuti nilai default", CATEGORY.INPUT, { input: "auto" }),
    "input.int": fn(["defval", "title", "minval", "maxval", "step", "tooltip", "inline", "group", "confirm", "options", "display"], "Angka bulat yang bisa diatur user", CATEGORY.INPUT, { input: "int" }),
    "input.float": fn(["defval", "title", "minval", "maxval", "step", "tooltip", "inline", "group", "confirm", "options", "display"], "Angka desimal yang bisa diatur user", CATEGORY.INPUT, { input: "float" }),
    "input.bool": fn(["defval", "title", "tooltip", "inline", "group", "confirm", "display"], "Saklar true/false", CATEGORY.INPUT, { input: "bool" }),
    "input.string": fn(["defval", "title", "options", "tooltip", "inline", "group", "confirm", "display"], "Teks atau pilihan", CATEGORY.INPUT, { input: "string" }),
    "input.color": fn(["defval", "title", "tooltip", "inline", "group", "confirm", "display"], "Pilihan warna", CATEGORY.INPUT, { input: "color" }),
    "input.source": fn(["defval", "title", "tooltip", "inline", "group", "display"], "Pilihan seri harga (close, hl2, …)", CATEGORY.INPUT, { input: "source" }),

    // Tampilan
    indicator: fn(["title", "shorttitle", "overlay", "format", "precision", "scale", "max_bars_back", "timeframe", "timeframe_gaps", "explicit_plot_zorder", "max_lines_count", "max_labels_count", "max_boxes_count", "calc_bars_count", "max_polylines_count"], "Nama dan pengaturan dasar indikator", CATEGORY.DISPLAY),
    plot: fn(["series", "title", "color", "linewidth", "style", "trackprice", "histbase", "offset", "join", "editable", "show_last", "display"], "Gambar garis di chart", CATEGORY.DISPLAY),
    plotshape: fn(["series", "title", "style", "location", "color", "offset", "text", "textcolor", "editable", "size", "show_last", "display"], "Gambar bentuk saat series true", CATEGORY.DISPLAY),
    plotchar: fn(["series", "title", "char", "location", "color", "offset", "text", "textcolor", "editable", "size", "show_last", "display"], "Gambar karakter saat series true", CATEGORY.DISPLAY),
    hline: fn(["price", "title", "color", "linestyle", "linewidth", "editable", "display"], "Garis horizontal tetap", CATEGORY.DISPLAY),
    fill: fn(["hline1", "hline2", "color", "title", "editable", "fillgaps", "display"], "Isi area di antara dua plot atau hline", CATEGORY.DISPLAY),
    bgcolor: fn(["color", "offset", "editable", "show_last", "title", "display"], "Warna latar per bar", CATEGORY.DISPLAY),
    barcolor: fn(["color", "offset", "editable", "show_last", "title", "display"], "Warna candle per bar", CATEGORY.DISPLAY),
    alertcondition: fn(["condition", "title", "message"], "Diterima, tapi notifikasi belum aktif (rencana versi 2)", CATEGORY.DISPLAY),

    // Logika & matematika
    na: fn(["x"], "true bila nilai kosong (na)", CATEGORY.LOGIC),
    nz: fn(["source", "replacement"], "Ganti na dengan 0 atau nilai pengganti", CATEGORY.LOGIC),
    fixnan: fn(["source"], "Ganti na dengan nilai valid terakhir", CATEGORY.LOGIC, { stateful: true }),
    int: fn(["x"], "Ubah ke bilangan bulat", CATEGORY.LOGIC),
    float: fn(["x"], "Ubah ke desimal", CATEGORY.LOGIC),
    bool: fn(["x"], "Ubah ke true/false", CATEGORY.LOGIC),
    string: fn(["x"], "Ubah ke teks", CATEGORY.LOGIC),
    "math.abs": fn(["number"], "Nilai absolut", CATEGORY.LOGIC),
    "math.max": fn(["number0", "number1"], "Nilai terbesar dari beberapa angka", CATEGORY.LOGIC, { variadic: true }),
    "math.min": fn(["number0", "number1"], "Nilai terkecil dari beberapa angka", CATEGORY.LOGIC, { variadic: true }),
    "math.avg": fn(["number0", "number1"], "Rata-rata beberapa angka", CATEGORY.LOGIC, { variadic: true }),
    "math.round": fn(["number", "precision"], "Pembulatan", CATEGORY.LOGIC),
    "math.round_to_mintick": fn(["number"], "Bulatkan ke tick harga", CATEGORY.LOGIC),
    "math.floor": fn(["number"], "Pembulatan ke bawah", CATEGORY.LOGIC),
    "math.ceil": fn(["number"], "Pembulatan ke atas", CATEGORY.LOGIC),
    "math.pow": fn(["base", "exponent"], "Pangkat", CATEGORY.LOGIC),
    "math.sqrt": fn(["number"], "Akar kuadrat", CATEGORY.LOGIC),
    "math.exp": fn(["number"], "e pangkat number", CATEGORY.LOGIC),
    "math.log": fn(["number"], "Logaritma natural", CATEGORY.LOGIC),
    "math.log10": fn(["number"], "Logaritma basis 10", CATEGORY.LOGIC),
    "math.sign": fn(["number"], "Tanda angka: 1, 0, atau -1", CATEGORY.LOGIC),
    "math.sum": fn(["source", "length"], "Jumlah bergulir length bar", CATEGORY.LOGIC, { stateful: true }),
    "math.sin": fn(["angle"], "Sinus", CATEGORY.LOGIC),
    "math.cos": fn(["angle"], "Kosinus", CATEGORY.LOGIC),
    "math.tan": fn(["angle"], "Tangen", CATEGORY.LOGIC),
    "math.atan": fn(["number"], "Arctangen", CATEGORY.LOGIC),
    "math.todegrees": fn(["radians"], "Radian ke derajat", CATEGORY.LOGIC),
    "math.toradians": fn(["degrees"], "Derajat ke radian", CATEGORY.LOGIC),
    "math.random": fn(["min", "max", "seed"], "Angka acak", CATEGORY.LOGIC),

    // Warna
    "color.new": fn(["color", "transp"], "Warna dengan transparansi 0–100", CATEGORY.COLOR),
    "color.rgb": fn(["red", "green", "blue", "transp"], "Warna dari komponen RGB", CATEGORY.COLOR),
    "color.from_gradient": fn(["value", "bottom_value", "top_value", "bottom_color", "top_color"], "Warna gradasi berdasarkan nilai", CATEGORY.COLOR),
    "color.r": fn(["color"], "Komponen merah", CATEGORY.COLOR),
    "color.g": fn(["color"], "Komponen hijau", CATEGORY.COLOR),
    "color.b": fn(["color"], "Komponen biru", CATEGORY.COLOR),
    "color.t": fn(["color"], "Transparansi", CATEGORY.COLOR),
    color: fn(["x"], "Ubah ke warna", CATEGORY.COLOR),

    // Array & map
    "array.new": fn(["size", "initial_value"], "Array baru, contoh array.new<float>(10, 0)", CATEGORY.COLLECTION),
    "array.new_float": fn(["size", "initial_value"], "Array angka desimal", CATEGORY.COLLECTION),
    "array.new_int": fn(["size", "initial_value"], "Array bilangan bulat", CATEGORY.COLLECTION),
    "array.new_bool": fn(["size", "initial_value"], "Array true/false", CATEGORY.COLLECTION),
    "array.new_string": fn(["size", "initial_value"], "Array teks", CATEGORY.COLLECTION),
    "array.new_color": fn(["size", "initial_value"], "Array warna", CATEGORY.COLLECTION),
    "array.new_line": fn(["size", "initial_value"], "Array line", CATEGORY.COLLECTION),
    "array.new_label": fn(["size", "initial_value"], "Array label", CATEGORY.COLLECTION),
    "array.new_box": fn(["size", "initial_value"], "Array box", CATEGORY.COLLECTION),
    "array.from": fn(["arg0", "arg1"], "Array dari daftar nilai", CATEGORY.COLLECTION, { variadic: true }),
    ...Object.fromEntries([
        ["get", ["id", "index"], "Ambil elemen (indeks negatif dihitung dari belakang)"],
        ["set", ["id", "index", "value"], "Ubah elemen"],
        ["push", ["id", "value"], "Tambah di akhir"],
        ["pop", ["id"], "Ambil dan hapus elemen terakhir"],
        ["shift", ["id"], "Ambil dan hapus elemen pertama"],
        ["unshift", ["id", "value"], "Tambah di awal"],
        ["insert", ["id", "index", "value"], "Sisipkan elemen"],
        ["remove", ["id", "index"], "Hapus elemen"],
        ["clear", ["id"], "Kosongkan array"],
        ["size", ["id"], "Jumlah elemen"],
        ["first", ["id"], "Elemen pertama"],
        ["last", ["id"], "Elemen terakhir"],
        ["copy", ["id"], "Salinan array"],
        ["slice", ["id", "index_from", "index_to"], "Potongan array"],
        ["concat", ["id1", "id2"], "Gabungkan array kedua ke array pertama"],
        ["includes", ["id", "value"], "true bila nilai ada"],
        ["indexof", ["id", "value"], "Indeks pertama nilai, -1 bila tidak ada"],
        ["lastindexof", ["id", "value"], "Indeks terakhir nilai"],
        ["sum", ["id"], "Jumlah elemen"],
        ["avg", ["id"], "Rata-rata elemen"],
        ["min", ["id", "nth"], "Nilai terkecil ke-n"],
        ["max", ["id", "nth"], "Nilai terbesar ke-n"],
        ["median", ["id"], "Median elemen"],
        ["range", ["id"], "Selisih maksimum dan minimum"],
        ["stdev", ["id", "biased"], "Standar deviasi elemen"],
        ["variance", ["id", "biased"], "Varians elemen"],
        ["sort", ["id", "order"], "Urutkan elemen"],
        ["sort_indices", ["id", "order"], "Indeks hasil pengurutan"],
        ["reverse", ["id"], "Balik urutan"],
        ["fill", ["id", "value", "index_from", "index_to"], "Isi rentang dengan satu nilai"],
        ["join", ["id", "separator"], "Gabungkan jadi teks"],
        ["every", ["id"], "true bila semua elemen true"],
        ["some", ["id"], "true bila ada elemen true"],
        ["abs", ["id"], "Array nilai absolut"],
        ["percentile_linear_interpolation", ["id", "percentage"], "Persentil dengan interpolasi"],
    ].map(([name, params, doc]) => [`array.${name}`, fn(params, doc, CATEGORY.COLLECTION)])),
    "map.new": fn([], "Map baru, contoh map.new<float, float>()", CATEGORY.COLLECTION),
    ...Object.fromEntries([
        ["put", ["id", "key", "value"], "Simpan pasangan kunci-nilai"],
        ["get", ["id", "key"], "Ambil nilai, na bila tidak ada"],
        ["contains", ["id", "key"], "true bila kunci ada"],
        ["remove", ["id", "key"], "Hapus kunci"],
        ["keys", ["id"], "Array semua kunci"],
        ["values", ["id"], "Array semua nilai"],
        ["size", ["id"], "Jumlah pasangan"],
        ["clear", ["id"], "Kosongkan map"],
        ["copy", ["id"], "Salinan map"],
        ["put_all", ["id", "id2"], "Salin semua pasangan dari map lain"],
    ].map(([name, params, doc]) => [`map.${name}`, fn(params, doc, CATEGORY.COLLECTION)])),

    // Objek gambar
    "line.new": fn(["x1", "y1", "x2", "y2", "xloc", "extend", "color", "style", "width"], "Garis antara dua titik", CATEGORY.DRAWING),
    "label.new": fn(["x", "y", "text", "xloc", "yloc", "color", "style", "textcolor", "size", "textalign", "tooltip"], "Label teks di chart", CATEGORY.DRAWING),
    "box.new": fn(["left", "top", "right", "bottom", "border_color", "border_width", "border_style", "extend", "xloc", "bgcolor", "text", "text_size", "text_color"], "Kotak di chart", CATEGORY.DRAWING),
    "polyline.new": fn(["points", "curved", "closed", "xloc", "line_color", "fill_color", "line_style", "line_width"], "Garis bersambung dari array chart.point", CATEGORY.DRAWING),
    "chart.point.new": fn(["time", "index", "price"], "Titik chart", CATEGORY.DRAWING),
    "chart.point.from_index": fn(["index", "price"], "Titik chart dari bar_index", CATEGORY.DRAWING),
    "chart.point.from_time": fn(["time", "price"], "Titik chart dari waktu", CATEGORY.DRAWING),
    "chart.point.now": fn(["price"], "Titik chart di bar sekarang", CATEGORY.DRAWING),
    "chart.point.copy": fn(["id"], "Salinan titik chart", CATEGORY.DRAWING),
    ...Object.fromEntries([
        ["line", "delete", ["id"]], ["line", "copy", ["id"]], ["line", "get_x1", ["id"]], ["line", "get_x2", ["id"]],
        ["line", "get_y1", ["id"]], ["line", "get_y2", ["id"]], ["line", "get_price", ["id", "x"]],
        ["line", "set_x1", ["id", "x"]], ["line", "set_x2", ["id", "x"]], ["line", "set_y1", ["id", "y"]], ["line", "set_y2", ["id", "y"]],
        ["line", "set_xy1", ["id", "x", "y"]], ["line", "set_xy2", ["id", "x", "y"]], ["line", "set_color", ["id", "color"]],
        ["line", "set_width", ["id", "width"]], ["line", "set_style", ["id", "style"]], ["line", "set_extend", ["id", "extend"]],
        ["line", "set_xloc", ["id", "x1", "x2", "xloc"]],
        ["label", "delete", ["id"]], ["label", "copy", ["id"]], ["label", "get_x", ["id"]], ["label", "get_y", ["id"]],
        ["label", "get_text", ["id"]], ["label", "set_x", ["id", "x"]], ["label", "set_y", ["id", "y"]], ["label", "set_xy", ["id", "x", "y"]],
        ["label", "set_point", ["id", "point"]], ["label", "set_text", ["id", "text"]], ["label", "set_color", ["id", "color"]],
        ["label", "set_textcolor", ["id", "textcolor"]], ["label", "set_style", ["id", "style"]], ["label", "set_size", ["id", "size"]],
        ["label", "set_tooltip", ["id", "tooltip"]], ["label", "set_textalign", ["id", "textalign"]], ["label", "set_yloc", ["id", "yloc"]],
        ["label", "set_xloc", ["id", "x", "xloc"]],
        ["box", "delete", ["id"]], ["box", "copy", ["id"]], ["box", "get_left", ["id"]], ["box", "get_right", ["id"]],
        ["box", "get_top", ["id"]], ["box", "get_bottom", ["id"]], ["box", "set_left", ["id", "left"]], ["box", "set_right", ["id", "right"]],
        ["box", "set_top", ["id", "top"]], ["box", "set_bottom", ["id", "bottom"]], ["box", "set_lefttop", ["id", "left", "top"]],
        ["box", "set_rightbottom", ["id", "right", "bottom"]], ["box", "set_bgcolor", ["id", "color"]], ["box", "set_border_color", ["id", "color"]],
        ["box", "set_border_width", ["id", "width"]], ["box", "set_border_style", ["id", "style"]], ["box", "set_extend", ["id", "extend"]],
        ["box", "set_text", ["id", "text"]], ["box", "set_text_color", ["id", "text_color"]], ["box", "set_text_size", ["id", "text_size"]],
        ["polyline", "delete", ["id"]],
    ].map(([kind, name, params]) => [`${kind}.${name}`, fn(params, `${kind}.${name.replace(/_/g, " ")}`, CATEGORY.DRAWING)])),

    // String & log
    "str.tostring": fn(["value", "format"], "Ubah nilai jadi teks", CATEGORY.TEXT),
    "str.tonumber": fn(["string"], "Ubah teks jadi angka", CATEGORY.TEXT),
    "str.format": fn(["formatString", "arg0"], "Teks dengan placeholder {0}, {1}, …", CATEGORY.TEXT, { variadic: true }),
    "str.length": fn(["string"], "Panjang teks", CATEGORY.TEXT),
    "str.upper": fn(["source"], "Huruf kapital", CATEGORY.TEXT),
    "str.lower": fn(["source"], "Huruf kecil", CATEGORY.TEXT),
    "str.contains": fn(["source", "str"], "true bila teks memuat str", CATEGORY.TEXT),
    "str.startswith": fn(["source", "str"], "true bila diawali str", CATEGORY.TEXT),
    "str.endswith": fn(["source", "str"], "true bila diakhiri str", CATEGORY.TEXT),
    "str.replace_all": fn(["source", "target", "replacement"], "Ganti semua kemunculan", CATEGORY.TEXT),
    "str.split": fn(["string", "separator"], "Pecah jadi array teks", CATEGORY.TEXT),
    "str.substring": fn(["source", "begin_pos", "end_pos"], "Potongan teks", CATEGORY.TEXT),
    "str.trim": fn(["source"], "Buang spasi di tepi", CATEGORY.TEXT),
    "log.info": fn(["message", "arg0"], "Tulis pesan ke console", CATEGORY.TEXT, { variadic: true }),
    "log.warning": fn(["message", "arg0"], "Tulis peringatan ke console", CATEGORY.TEXT, { variadic: true }),
    "log.error": fn(["message", "arg0"], "Tulis error ke console", CATEGORY.TEXT, { variadic: true }),
    "runtime.error": fn(["message"], "Hentikan script dengan pesan error", CATEGORY.TEXT),

    // Konteks
    "timeframe.in_seconds": fn(["timeframe"], "Lama timeframe dalam detik", CATEGORY.CONTEXT),
    "request.security": fn(["symbol", "timeframe", "expression", "gaps", "lookahead", "ignore_invalid_symbol", "currency", "calc_bars_count"], "Hanya timeframe chart yang sama; timeframe lain menyusul di versi 2", CATEGORY.CONTEXT),
    "request.security_lower_tf": fn(["symbol", "timeframe", "expression", "ignore_invalid_symbol", "currency", "ignore_invalid_timeframe", "calc_bars_count"], "Belum ada data timeframe kecil: memakai bar chart sendiri", CATEGORY.CONTEXT),
};

// Seri dan konstanta yang dibaca sebagai nama, bukan dipanggil.
export const VARIABLES = {
    open: { doc: "Harga buka", category: CATEGORY.SERIES },
    high: { doc: "Harga tertinggi", category: CATEGORY.SERIES },
    low: { doc: "Harga terendah", category: CATEGORY.SERIES },
    close: { doc: "Harga tutup", category: CATEGORY.SERIES },
    volume: { doc: "Volume", category: CATEGORY.SERIES },
    hl2: { doc: "(high + low) / 2", category: CATEGORY.SERIES },
    hlc3: { doc: "(high + low + close) / 3", category: CATEGORY.SERIES },
    ohlc4: { doc: "(open + high + low + close) / 4", category: CATEGORY.SERIES },
    hlcc4: { doc: "(high + low + close + close) / 4", category: CATEGORY.SERIES },
    time: { doc: "Waktu buka bar (ms)", category: CATEGORY.SERIES },
    time_close: { doc: "Waktu tutup bar (ms)", category: CATEGORY.SERIES },
    bar_index: { doc: "Nomor bar, mulai dari 0", category: CATEGORY.SERIES },
    last_bar_index: { doc: "Nomor bar terakhir", category: CATEGORY.CONTEXT },
    last_bar_time: { doc: "Waktu bar terakhir", category: CATEGORY.CONTEXT },
    timenow: { doc: "Waktu sekarang (ms)", category: CATEGORY.CONTEXT },
    na: { doc: "Nilai kosong", category: CATEGORY.LOGIC },
    "ta.obv": { doc: "On Balance Volume", category: CATEGORY.INDICATOR },
    "ta.tr": { doc: "True range", category: CATEGORY.INDICATOR },
    "ta.vwap": { doc: "VWAP harian dari hlc3", category: CATEGORY.INDICATOR },
    "barstate.isfirst": { doc: "true di bar pertama", category: CATEGORY.CONTEXT },
    "barstate.islast": { doc: "true di bar terakhir", category: CATEGORY.CONTEXT },
    "barstate.ishistory": { doc: "true di bar historis", category: CATEGORY.CONTEXT },
    "barstate.isrealtime": { doc: "true di bar berjalan", category: CATEGORY.CONTEXT },
    "barstate.isconfirmed": { doc: "true bila bar sudah tutup", category: CATEGORY.CONTEXT },
    "barstate.isnew": { doc: "true di awal bar", category: CATEGORY.CONTEXT },
    "barstate.islastconfirmedhistory": { doc: "true di bar historis terakhir", category: CATEGORY.CONTEXT },
    "syminfo.mintick": { doc: "Tick harga terkecil", category: CATEGORY.CONTEXT },
    "syminfo.tickerid": { doc: "ID simbol, contoh BITUNIX:BTCUSDT", category: CATEGORY.CONTEXT },
    "syminfo.ticker": { doc: "Nama simbol", category: CATEGORY.CONTEXT },
    "syminfo.basecurrency": { doc: "Mata uang dasar", category: CATEGORY.CONTEXT },
    "syminfo.currency": { doc: "Mata uang kutipan", category: CATEGORY.CONTEXT },
    "syminfo.pricescale": { doc: "1 / mintick", category: CATEGORY.CONTEXT },
    "timeframe.period": { doc: "Timeframe chart, contoh '5' atau 'D'", category: CATEGORY.CONTEXT },
    "timeframe.multiplier": { doc: "Angka timeframe", category: CATEGORY.CONTEXT },
    "timeframe.isintraday": { doc: "true untuk timeframe di bawah harian", category: CATEGORY.CONTEXT },
    "timeframe.isdaily": { doc: "true untuk timeframe harian", category: CATEGORY.CONTEXT },
    "timeframe.isminutes": { doc: "true untuk timeframe menit", category: CATEGORY.CONTEXT },
    "chart.bg_color": { doc: "Warna latar chart", category: CATEGORY.COLOR },
    "chart.fg_color": { doc: "Warna teks chart", category: CATEGORY.COLOR },
    year: { doc: "Tahun bar", category: CATEGORY.CONTEXT },
    month: { doc: "Bulan bar", category: CATEGORY.CONTEXT },
    dayofmonth: { doc: "Tanggal bar", category: CATEGORY.CONTEXT },
    dayofweek: { doc: "Hari dalam minggu (1 = Minggu)", category: CATEGORY.CONTEXT },
    hour: { doc: "Jam bar (UTC)", category: CATEGORY.CONTEXT },
    minute: { doc: "Menit bar", category: CATEGORY.CONTEXT },
};

const NAMED_COLOR_KEYS = ["aqua", "black", "blue", "fuchsia", "gray", "green", "lime", "maroon", "navy", "olive", "orange", "purple", "red", "silver", "teal", "white", "yellow"];

// Konstanta enum bernilai string. Nilainya dipakai renderer.
export const ENUMS = {
    shape: ["xcross", "cross", "triangleup", "triangledown", "flag", "circle", "arrowup", "arrowdown", "labelup", "labeldown", "square", "diamond"],
    location: ["abovebar", "belowbar", "top", "bottom", "absolute"],
    size: ["auto", "tiny", "small", "normal", "large", "huge"],
    extend: ["none", "left", "right", "both"],
    xloc: ["bar_index", "bar_time"],
    yloc: ["price", "abovebar", "belowbar"],
    order: ["ascending", "descending"],
    format: ["mintick", "percent", "volume", "price", "inherit"],
    position: ["top_left", "top_center", "top_right", "middle_left", "middle_center", "middle_right", "bottom_left", "bottom_center", "bottom_right"],
    text: ["align_left", "align_center", "align_right", "wrap_auto", "wrap_none"],
    font: ["family_default", "family_monospace"],
    barmerge: ["gaps_on", "gaps_off", "lookahead_on", "lookahead_off"],
    alert: ["freq_all", "freq_once_per_bar", "freq_once_per_bar_close"],
    "line": ["style_solid", "style_dotted", "style_dashed", "style_arrow_left", "style_arrow_right", "style_arrow_both"],
    "label": ["style_none", "style_xcross", "style_cross", "style_triangleup", "style_triangledown", "style_flag", "style_circle", "style_arrowup", "style_arrowdown", "style_label_up", "style_label_down", "style_label_left", "style_label_right", "style_label_lower_left", "style_label_lower_right", "style_label_upper_left", "style_label_upper_right", "style_label_center", "style_square", "style_diamond", "style_text_outline"],
    "plot": ["style_line", "style_linebr", "style_stepline", "style_stepline_diamond", "style_histogram", "style_cross", "style_area", "style_areabr", "style_columns", "style_circles"],
    "hline": ["style_solid", "style_dotted", "style_dashed"],
};

// Nilai enum `line.style_dashed` disimpan sebagai "dashed", dsb.
export function enumValue(namespace, key) {
    return key.startsWith("style_") ? key.slice("style_".length) : key;
}

export const DISPLAY_FLAGS = { none: 0, pane: 1, data_window: 2, price_scale: 4, status_line: 8, all: 15 };

export const CONSTANT_NAMES = new Set([
    ...NAMED_COLOR_KEYS.map((key) => `color.${key}`),
    ...Object.entries(ENUMS).flatMap(([namespace, keys]) => keys.map((key) => `${namespace}.${key}`)),
    ...Object.keys(DISPLAY_FLAGS).map((key) => `display.${key}`),
    "math.pi", "math.e", "math.phi", "math.rphi",
]);

// Namespace yang tidak boleh dipakai. Pesan ini muncul saat kompilasi.
export const UNSUPPORTED = {
    strategy: "strategy.* (backtest) belum didukung. Rencana versi 2.",
    table: "table.* belum didukung. Rencana versi 2.",
    matrix: "matrix.* belum didukung.",
    linefill: "linefill.* belum didukung.",
    "request.financial": "request.financial belum didukung.",
    "request.economic": "request.economic belum didukung.",
};

export const NAMESPACES = new Set([
    "ta", "math", "input", "color", "array", "map", "line", "label", "box", "polyline", "chart", "str", "log", "runtime",
    "timeframe", "request", "barstate", "syminfo", "shape", "location", "size", "extend", "xloc", "yloc", "order", "format",
    "display", "position", "text", "font", "barmerge", "alert", "plot", "hline", "strategy", "table", "matrix", "linefill",
]);

export function signatureOf(name) {
    const spec = FUNCTIONS[name];
    if (!spec) return name;
    return `${name}(${spec.params.join(", ")}${spec.variadic ? ", …" : ""})`;
}

// Entri untuk autocomplete dan drawer referensi.
export function catalogEntries() {
    const functions = Object.entries(FUNCTIONS).map(([name, spec]) => ({
        name, kind: "fungsi", signature: signatureOf(name), doc: spec.doc, category: spec.category,
    }));
    const variables = Object.entries(VARIABLES).map(([name, spec]) => ({
        name, kind: "seri", signature: name, doc: spec.doc, category: spec.category,
    }));
    const colors = NAMED_COLOR_KEYS.map((key) => ({ name: `color.${key}`, kind: "warna", signature: `color.${key}`, doc: "Warna bawaan", category: CATEGORY.COLOR }));
    const constants = Object.entries(ENUMS).flatMap(([namespace, keys]) => keys.map((key) => ({
        name: `${namespace}.${key}`, kind: "konstanta", signature: `${namespace}.${key}`, doc: "Konstanta", category: CATEGORY.DISPLAY,
    })));
    const keywords = ["if", "else", "for", "to", "by", "in", "while", "switch", "var", "varip", "break", "continue", "type", "method", "and", "or", "not", "true", "false"]
        .map((name) => ({ name, kind: "kata kunci", signature: name, doc: "Kata kunci", category: CATEGORY.LOGIC }));
    return [...functions, ...variables, ...colors, ...constants, ...keywords];
}

export function levenshtein(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const distance = Array.from({ length: rows }, (_, index) => [index]);
    for (let col = 1; col < cols; col += 1) distance[0][col] = col;
    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            const cost = a[row - 1] === b[col - 1] ? 0 : 1;
            distance[row][col] = Math.min(distance[row - 1][col] + 1, distance[row][col - 1] + 1, distance[row - 1][col - 1] + cost);
        }
    }
    return distance[a.length][b.length];
}

export function suggestName(name, candidates) {
    let best = null;
    let bestScore = Infinity;
    for (const candidate of candidates) {
        const score = levenshtein(name, candidate);
        if (score < bestScore) {
            best = candidate;
            bestScore = score;
        }
    }
    const limit = Math.max(2, Math.floor(name.length / 4));
    return bestScore <= limit ? best : null;
}
