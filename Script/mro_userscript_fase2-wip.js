// ==UserScript==
// @name         MRO Manipulation Pillar Tool
// @namespace    http://tampermonkey.net/
// @version      3.9.7
// @description  Unified audit tool for OV Segmentation + XDOF BBOX + Dense ID (+ R2PS/Tron HMI auto-fill), last updated 8/27/2026 by @kvnmora
// @author       @andrzvn @kvnmora @mpablom
// @match        https://app.labelbox.com/projects/*
// @match        https://app.labelbox.com/projects/*/data-rows/*
// @match        https://app.labelbox.com/projects/*/review-rework/*
// @match        https://prod.hmi.tron.robotics.amazon.dev/*
// @match        https://far-annotations.gamma.harmony.a2z.com/*
// @match        https://phonetool.amazon.com/*
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://cdn.jsdelivr.net/npm/interactjs@1.10.27/dist/interact.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// ==/UserScript==


(function() {
    'use strict';

    const version = 'V3.9.7'; // 8/27/2026: R2PS (Tron HMI) auto-fill por poll (jobId->Image ID, stream->Use Case, segmentos->Total Labels, takt del AA). Sin batch ni rework (reglas del programa). associateLogin pendiente de probe.

    // Use case selector (default: OV Segmentation)
    const USE_CASE = {
        current: 'openVocabulary' // 'openVocabulary' | 'ovBbox' | 'denseID'
    };

    // Internal key -> name written to the final file (keep consistent with the master file)
    const USE_CASE_LABELS = {
        openVocabulary: 'FAR Open Vocabulary Segmentation',
        ovBbox: 'XDOF BBOX', // renombrado 2026-08-20 (antes 'FAR Open Vocabulary BBOX'); KNIME normaliza el historico
        denseID: 'Dense ID',
        pcsConceptBbox: 'PCS Concept BBox' // 2026-08-20: nuevo Use Case en Harmony
    };

    // Auto-generado por tools/gen_batch_map.py desde el Batch Tracker — 60 batches
    const PROJECT_ID_TO_BATCH = {
        "cmmwjbpfl0xvz07t8ge1w2cyw": "p-ov-2026-03-18",
        "cmoho4gir002n070i48n47q0j": "p-ov-2026-04-27",
        "cmot0oie20w5f07xgagvrcl6a": "p-ov-2026-05-05",
        "cmpfqapfo0ier072c9g8ue9ja": "p-ov-2026-05-21",
        "cmpn9vjyo0axv07xkcvawa9ad": "p-ov-2026-05-26",
        "cmpve2wyf0idr07w43psnemhc": "p-ov-2026-06-01",
        "cmpylh69007nf070f9hhhc7uw": "p-ov-2026-06-03",
        "cmq5s2cwm0tk007zdb5hvc4is": "p-ov-2026-06-08",
        "cmq7aknwp0mzv070edcoe2l2z": "p-ov-2026-06-09",
        "cmqked2q207j10720efnd6va5": "p-ov-2026-06-19",
        "cmqpkfltx0kqd070t9i8u0yj2": "p-ov-2026-06-22",
        "cmqsb68vm0ba708weec3jbzhl": "p-ov-2026-06-24",
        "cmqscrgmm0frx07y7as2c2zm9": "p-ov-presence-2026-06-24",
        "cmr3qab9w0oii07zbbptdgsh6": "p-ov-presence-802Z",
        "cmr16fipt0h8007zl6por5dd3": "p-ov-presence-640Z",
        "cmr9fhi3901pr07zz8inb9ufz": "p-ov-presence-218Z",
        "cmrcablnp08o307xj5qolceg2": "p-ov-presence-103Z",
        "cmrcctvl60doi07y09jcnatcq": "p-ov-presence-115Z",
        "cmrjk7hp75axp07wr5gsu0ol2": "p-ov-presence-211Z",
        "cmre73euk0a97072og010bbig": "p-ov-presence-615Z",
        "cmrkukiqu0miz07xegrb68yy9": "p-ov-presence-001Z",
        "cmrmej7kj1hl7071l4iab7jys": "p-ov-presence-639Z",
        "cmrmhvm2l0xir071jhqn7dlnz": "p-ov-presence-016Z",
        "cmrm83ijt0rj5070i5x9ybqq5": "p-ov-presence-629Z",
        "cmrmmn1kg018807vf2szi2wzn": "p-ov-presence-335Z",
        "cmrslnlo302li070v85ez767y": "p-ov-presence-238Z",
        "cmrso25tk035g07zj3apx8j6r": "p-ov-presence-956Z",
        "cmrtv5b8a09rb07xt6d6u9e76": "p-ov-bbox-606Z",
        "cmrz82a6r09w607422pbh7yzf": "p-ov-bbox-632Z",
        "cms69e31b0ju207311mlr16q0": "p-ov-2026-07-29",
        "cms4uxdi9007h07z111fm4yu0": "p-ov-presence-525Z",
        "cms59szke0995070yd448bd1p": "p-ov-presence-154Z",
        "cms3lwejl06ki071j4mo6fydu": "p-ov-presence-456Z",
        "cms69frg40h2w072jhd4cge01": "p-ov-presence-923Z",
        "cms69a9730fuk070q4s81axlt": "p-ov-bbox-506Z",
        "cmsdeb4r20eco071n7vnv89u6": "p-ov-bbox-009Z",
        "cmsgdzd8h0cfz0705h6mj8btp": "p-ov-bbox-418Z",
        "cmsnfz55z035g0701hi4lf9eq": "p-ov-bbox-430Z",
        "cmsqe3gub0om407xkcvkcbphe": "p-ov-bbox-511Z",
        "cmsqe3i5z0wvx07377228bzp1": "p-ov-bbox-513Z",
        "cmnijaqsu0lao073og7sg2au8": "p-fdc5",
        "cmntvknmy088608xaggc1e1qz": "p-477b",
        "cmo3jefbt06z907y88w0o64qs": "p-658d",
        "cmohauqw80a9407wm0mvr1m6z": "p-86b9",
        "cmoi1e0950w94070wai0n3sbo": "p-8048",
        "cmos6fuj60a8e070r83hr7lto": "p-eda0",
        "cmp53cfh309kd07yod4c5cruy": "p-e255",
        "cmpjpo7f008cf072ocveybstz": "p-62f4",
        "cmpwskok509kz072b8be75sxq": "p-ee5f",
        "cmqifk6z5008z08wg2bu35t62": "p-f147",
        "cmr29lwhc0osf070f833x1z1v": "p-fd99",
        "cmrmka4k41hgp071bel5j4k1i": "p-8941",
        "cms5uff4v02b307uu81ik44p6": "p-06cc",
        "cmsrm8nr7005g071k1tfjgpoc": "p-a4aa",
        "cmrcrf33r29jc07xrcamr7ikj": "p-dc1b-xl-s1-0708",
        "cmrcs5hku00oh07xodoum2zya": "p-dc1b-xl-s2-0708",
        "cmmccu8px0kuq070u1srubxiy": "t-ov-2026-03-04",
        "cmpn8zzt30f99070mhvuldnmx": "t-ov-2026-05-26",
        "cmr10x5l20knu07z88bam3o72": "t-ov-2026-06-30",
        "cmrf7gbl2081d07zzhiw6099x": "t-ov-2026-07-10"
};

    // ---- Helpers puros (Fase 1) — MANTENER idénticos a tests/mro_helpers.mjs ----
    function extractProjectId(url) {
        const m = /\/projects\/([a-z0-9]+)(?:\/|$)/i.exec(url || '');
        return m ? m[1] : null;
    }
    function workWeekFromDate(isoDate) {
        const base = new Date(isoDate + 'T00:00:00Z');
        base.setUTCDate(base.getUTCDate() + 1);
        const target = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
        const dayNum = (target.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
        const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
        firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
        return 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
    }
    function batchForProjectId(pid, map) {
        return (pid && map[pid]) ? map[pid] : null;
    }

    const VALID_USE_CASES = Object.keys(USE_CASE_LABELS);

    const USE_CASE_STORAGE_KEY = 'mroSelectedUseCase';
    try {
        const savedUseCase = localStorage.getItem(USE_CASE_STORAGE_KEY);
        if (VALID_USE_CASES.indexOf(savedUseCase) !== -1) {
            USE_CASE.current = savedUseCase;
        }
    } catch (e) {}

    // MRO Copy File Name state (shared across use cases)
    let hasCopiedFilename = false;
    let lastCopiedFilename = '';
    let lastCopiedContextKey = '';
    let currentImageCounter = 1;

    // Mejora 7: A/D shortcut unlock state (reset per job)
    let assessmentSavedForCurrentJob = false;

    // PCS Concept BBox (Harmony) — estado por job.
    let harmonyAaSeconds = null;   // SPL del AA (segundos) leido del timeline
    let harmonyQaStartMs = null;   // inicio del cronometro de QA (job abierto)
    let harmonyCurrentAsset = null;// asset id del job actual (para detectar cambio de job)
    let harmonyPollTimer = null;   // poll de auto-fill (Harmony es SPA)

    // R2PS (Tron HMI) — estado por job. Espejo del bloque de Harmony (SPA con poll).
    let tronAaSeconds = null;      // takt del AA (segundos) leido del tab "Response/Takt time"
    let tronQaStartMs = null;      // inicio del cronometro de QA (job abierto)
    let tronCurrentJob = null;     // job id (UUID) actual, para detectar cambio de job
    let tronPollTimer = null;      // poll de auto-fill (Tron es SPA)

    // Job counter state (visible count only Ã¢â‚¬" no time tracking)
    let jobCounter = GM_getValue('jobCounter', 0);

    // Login to Manager mapping
    const loginToManagerMap = {
        // chakeyla team
        'aguvangi': 'chakeyla',
        'aleqrar': 'chakeyla',
        'aramiii': 'chakeyla',
        'darioaco': 'chakeyla',
        'escasarr': 'chakeyla',
        'espisab': 'chakeyla',
        'jchavesv': 'chakeyla',
        'jeylad': 'chakeyla',
        'jocartav': 'chakeyla',
        'joshkenr': 'chakeyla',
        'lauqo': 'chakeyla',
        'ltraube': 'chakeyla',
        'luisvalv': 'chakeyla',
        'mbads': 'chakeyla',
        'mongelan': 'chakeyla',
        'navafabr': 'chakeyla',
        'obryapad': 'chakeyla',
        'padiandk': 'chakeyla',
        'sabralva': 'chakeyla',
        'svbryane': 'chakeyla',
        'valcmps': 'chakeyla',
        'yarregat': 'chakeyla',

        // chacstep team
        'angelygm': 'chacstep',
        'ashravar': 'chacstep',
        'barraufa': 'chacstep',
        'fueqmanu': 'chacstep',
        'genesmad': 'chacstep',
        'gianfrxn': 'chacstep',
        'jonaykel': 'chacstep',
        'kseguras': 'chacstep',
        'maireant': 'chacstep',
        'mpablom': 'chacstep',
        'npridelg': 'chacstep',
        'nuvand': 'chacstep',
        'paulanga': 'chacstep',
        'paulosac': 'chacstep',
        'pauroj': 'chacstep',
        'rfemo': 'chacstep',
        'rojasfos': 'chacstep',
        'seguraaz': 'chacstep',
        'vmadrdan': 'chacstep',
        'yoelking': 'chacstep',
        'zunielia': 'chacstep',

        // muriller team
        'alejsg': 'muriller',
        'alexbh': 'muriller',
        'antchacr': 'muriller',
        'bonillgc': 'muriller',
        'carbermz': 'muriller',
        'dsarco': 'muriller',
        'greilon': 'muriller',
        'janicetf': 'muriller',
        'jocelykg': 'muriller',
        'karoalsi': 'muriller',
        'lemolinz': 'muriller',
        'neichamb': 'muriller',
        'nkellyh': 'muriller',
        'ortizamn': 'muriller',
        'pacunaxi': 'muriller',
        'recioyer': 'muriller',
        'reychela': 'muriller',
        'ritchelv': 'muriller',
        'smithyru': 'muriller',
        'steefany': 'muriller',

        // joraray team
        'allivm': 'joraray',
        'chrchavp': 'joraray',
        'cvillafr': 'joraray',
        'dnlpch': 'joraray',
        'emafalla': 'joraray',
        'geovnn': 'joraray',
        'ivanniap': 'joraray',
        'kristhg': 'joraray',
        'kvnmora': 'joraray',
        'lopdanas': 'joraray',
        'momooij': 'joraray',
        'moncame': 'joraray',
        'oribedoy': 'joraray',
        'valerseg': 'joraray',
        'valesanq': 'joraray',

        // ruizday team
        'artavipr': 'ruizday',
        'dvarelax': 'ruizday',
        'gutifgab': 'ruizday',
        'hernazer': 'ruizday',
        'jostjims': 'ruizday',
        'kemperez': 'ruizday',
        'marivraa': 'ruizday',
        'mbrenesa': 'ruizday',
        'nustevew': 'ruizday',
        'piedjorg': 'ruizday',
        'rmvasque': 'ruizday',
        'rowgenes': 'ruizday',
        'sibajaco': 'ruizday',
        'upmariaj': 'ruizday',
        'valrodrt': 'ruizday',
        'varelavj': 'ruizday',
        'vavalery': 'ruizday',
        'vmadrizp': 'ruizday',
        'vvalmarc': 'ruizday',
        'xvardavi': 'ruizday',
        'yadirex': 'ruizday',

        // vicvama team
        'aguzmkat': 'vicvama',
        'allialva': 'vicvama',
        'ancasang': 'vicvama',
        'anyflorb': 'vicvama',
        'arceian': 'vicvama',
        'brylancr': 'vicvama',
        'cisneabr': 'vicvama',
        'dylqn': 'vicvama',
        'ericsola': 'vicvama',
        'jeauscaf': 'vicvama',
        'josuefab': 'vicvama',
        'lopezsib': 'vicvama',
        'nichshad': 'vicvama',
        'qmarioal': 'vicvama',
        'rojaamar': 'vicvama',
        'rojasmeg': 'vicvama',
        'solanomv': 'vicvama',
        'somelanv': 'vicvama',
        'tenalexa': 'vicvama',
        'ysoligab': 'vicvama',

        // alfarda team
        'aarramr': 'alfarda',
        'alfajoha': 'alfarda',
        'anskeeli': 'alfarda',
        'blopaa': 'alfarda',
        'campsu': 'alfarda',
        'centenje': 'alfarda',
        'degorv': 'alfarda',
        'gamboawg': 'alfarda',
        'herkm': 'alfarda',
        'hjuanpah': 'alfarda',
        'jdaniesu': 'alfarda',
        'jessibqr': 'alfarda',
        'jimenzz': 'alfarda',
        'joalrest': 'alfarda',
        'josgrefs': 'alfarda',
        'kmongea': 'alfarda',
        'melcvasq': 'alfarda',
        'rabelkis': 'alfarda',
        'ramospda': 'alfarda',
        'rivaszag': 'alfarda',
        'riveratu': 'alfarda',
        'ulloaxhe': 'alfarda',
        'yjandres': 'alfarda',

        // duddb team
        'allamtra': 'duddb',
        'bvratna': 'duddb',
        'cbboddu': 'duddb',
        'gdivyak': 'duddb',
        'gunasiri': 'duddb',
        'iamankii': 'duddb',
        'keertani': 'duddb',
        'kogowtha': 'duddb',
        'mmhdfaw': 'duddb',
        'nandinyy': 'duddb',
        'pagidala': 'duddb',
        'pkchilak': 'duddb',
        'pravalyp': 'duddb',
        'rasaipr': 'duddb',
        'rockyasp': 'duddb',
        'sarojbk': 'duddb',
        'skallag': 'duddb',
        'spck': 'duddb',
        'swetakmr': 'duddb',
        'ujyothii': 'duddb',
        'venkako': 'duddb',
        'vmouni': 'duddb',
        'vshnuuu': 'duddb',

        // jayagade team
        'ankijhar': 'jayagade',
        'anvana': 'jayagade',
        'arkaroy': 'jayagade',
        'bsreddie': 'jayagade',
        'ibhanupa': 'jayagade',
        'jaanuu': 'jayagade',
        'kalplsin': 'jayagade',
        'nihayath': 'jayagade',
        'prakoll': 'jayagade',
        'rachgopa': 'jayagade',
        'saitejv': 'jayagade',
        'shispihu': 'jayagade',
        'sidkonda': 'jayagade',
        'smrutiac': 'jayagade',
        'sowmigam': 'jayagade',
        'sresthar': 'jayagade',
        'toragopi': 'jayagade',
        'vaishx': 'jayagade',
        'varshvai': 'jayagade',
        'vkmlb': 'jayagade',
        'vooditej': 'jayagade',
        'nikituru': 'jayagade',
        'piybasak': 'jayagade',

        // anmokum team
        'chinngej': 'anmokum',
        'durmalle': 'anmokum',
        'gadasow': 'anmokum',
        'hanshjai': 'anmokum',
        'hariiii': 'anmokum',
        'imgeetha': 'anmokum',
        'jhanu': 'anmokum',
        'meenavjk': 'anmokum',
        'mvswamy': 'anmokum',
        'myasasw': 'anmokum',
        'nikkiisi': 'anmokum',
        'nikmoksh': 'anmokum',
        'ondebjit': 'anmokum',
        'perewarb': 'anmokum',
        'pradnysa': 'anmokum',
        'rajjamwa': 'anmokum',
        'richpmal': 'anmokum',
        'rztiwari': 'anmokum',
        'sahideva': 'anmokum',
        'samdxt': 'anmokum',
        'sanjmoc': 'anmokum',
        'shsonamu': 'anmokum',
        'snehamit': 'anmokum',

        // paiyakhi team
        'aishuuuu': 'paiyakhi',
        'amanptra': 'paiyakhi',
        'animisb': 'paiyakhi',
        'annazhee': 'paiyakhi',
        'azazulna': 'paiyakhi',
        'buggvena': 'paiyakhi',
        'chindve': 'paiyakhi',
        'chjlaxmi': 'paiyakhi',
        'deepsanm': 'paiyakhi',
        'dsvarap': 'paiyakhi',
        'epankajp': 'paiyakhi',
        'gdahiya': 'paiyakhi',
        'hoox': 'paiyakhi',
        'htejashw': 'paiyakhi',
        'iamsaik': 'paiyakhi',
        'kjagady': 'paiyakhi',
        'mandhoun': 'paiyakhi',
        'pabdshai': 'paiyakhi',
        'pranavit': 'paiyakhi',
        'saknik': 'paiyakhi',
        'sisdeep': 'paiyakhi',
        'skskk': 'paiyakhi',
        'suffa': 'paiyakhi',
        'vvvedal': 'paiyakhi',
        'yreddyhe': 'paiyakhi',

        // sharmpal team
        'ahsolank': 'sharmpal',
        'akachatu': 'sharmpal',
        'angshupy': 'sharmpal',
        'ashashah': 'sharmpal',
        'gvem': 'sharmpal',
        'nkaanan': 'sharmpal',
        'rkparis': 'sharmpal',
        'saimarep': 'sharmpal',
        'shubhveq': 'sharmpal',
        'sohamcho': 'sharmpal',
        'suljkhan': 'sharmpal',
        'suprsint': 'sharmpal',
        'vaazhagi': 'sharmpal',
        'vkkurra': 'sharmpal',

        // abhyud team
        'abishaiw': 'abhyud',
        'akasnand': 'abhyud',
        'amarenda': 'abhyud',
        'amsharad': 'abhyud',
        'chalapah': 'abhyud',
        'chopsana': 'abhyud',
        'hsyesamy': 'abhyud',
        'ikkushan': 'abhyud',
        'kakattab': 'abhyud',
        'keermomi': 'abhyud',
        'mobandi': 'abhyud',
        'saisvish': 'abhyud',
        'savaedhe': 'abhyud',
        'sharmpal': 'abhyud',
        'sinchcmk': 'abhyud',
        'smzman': 'abhyud',
        'srisaiak': 'abhyud',
        'srisreef': 'abhyud',
        'vbpavani': 'abhyud',

        // abhigyap team
        'akbathul': 'abhigyap',
        'anithayn': 'abhigyap',
        'ankulahu': 'abhigyap',
        'arusir': 'abhigyap',
        'ashaikkh': 'abhigyap',
        'earlanan': 'abhigyap',
        'faisalfy': 'abhigyap',
        'galghat': 'abhigyap',
        'haannam': 'abhigyap',
        'hussmow': 'abhigyap',
        'ianissha': 'abhigyap',
        'kitiedk': 'abhigyap',
        'lakshmcu': 'abhigyap',
        'mtpranes': 'abhigyap',
        'mvarunkr': 'abhigyap',
        'namisrav': 'abhigyap',
        'nnagakav': 'abhigyap',
        'padmapls': 'abhigyap',

        // kirtima team
        'maygoswa': 'kirtima',
        'mssritej': 'kirtima',
        'nikansh': 'kirtima',
        'pjampana': 'kirtima',
        'rajnitis': 'kirtima',

        // prveev team
        'abhyud': 'prveev',
        'maheept': 'prveev',
        'snghoj': 'prveev',
        'vvargasu': 'prveev',

        // vshru team
        'anmokum': 'vshru',
        'duddb': 'vshru',
        'jayagade': 'vshru',
        'paiyakhi': 'vshru',
        'srkoushi': 'vshru',
        'ydushjay': 'vshru',

        // ydushjay team
        'chirgadd': 'ydushjay',
        'garavula': 'ydushjay',
        'gsamyu': 'ydushjay',
        'iprakarr': 'ydushjay',
        'jyovaib': 'ydushjay',
        'keerboda': 'ydushjay',
        'kinnukin': 'ydushjay',
        'kiraarne': 'ydushjay',
        'kjagrut': 'ydushjay',
        'kumpalad': 'ydushjay',
        'mskhann': 'ydushjay',
        'muskanf': 'ydushjay',
        'nishhaa': 'ydushjay',
        'pavanpes': 'ydushjay',
        'pawanydv': 'ydushjay',
        'priyaasp': 'ydushjay',
        'ramypra': 'ydushjay',
        'reddyknb': 'ydushjay',
        'shasonuh': 'ydushjay',
        'sheddy': 'ydushjay',
        'silkyj': 'ydushjay',
        'simskhan': 'ydushjay',
        'syarava': 'ydushjay',
        'symajid': 'ydushjay',
        'yeshadi': 'ydushjay',

        // akasnand team
        'ahamedir': 'akasnand',
        'alekyap': 'akasnand',
        'bodlac': 'akasnand',
        'brahmanp': 'akasnand',
        'desakric': 'akasnand',
        'ebalotia': 'akasnand',
        'jayaraph': 'akasnand',
        'jjpathak': 'akasnand',
        'mmmanvi': 'akasnand',
        'mohaavez': 'akasnand',
        'mohdvami': 'akasnand',
        'nepriyan': 'akasnand',
        'nittuk': 'akasnand',
        'nvkrs': 'akasnand',
        'ragatiws': 'akasnand',
        'sababegu': 'akasnand',
        'sppavani': 'akasnand',
        'ssoophia': 'akasnand',
        'ushasun': 'akasnand',
        'yashmir': 'akasnand',
        'zainabjm': 'akasnand',

        // bfelipel team
        'aaangulo': 'bfelipel',
        'andcalv': 'bfelipel',
        'calebjca': 'bfelipel',
        'corraaro': 'bfelipel',
        'gloart': 'bfelipel',
        'hurtajul': 'bfelipel',
        'ibermuds': 'bfelipel',
        'pablague': 'bfelipel',
        'sarji': 'bfelipel',

        // smariaec team
        'alfarda': 'smariaec',
        'bumariao': 'smariaec',
        'chacstep': 'smariaec',
        'chakeyla': 'smariaec',
        'joraray': 'smariaec',
        'mabarcap': 'smariaec',
        'mesenh': 'smariaec',
        'muriller': 'smariaec',
        'vicvama': 'smariaec',

        // pawshiva team
        'duvrohit': 'pawshiva',
        'elbharg': 'pawshiva',
        'inamishm': 'pawshiva',
        'kambankh': 'pawshiva',
        'kikkr': 'pawshiva',
        'lameerud': 'pawshiva',
        'malledys': 'pawshiva',
        'masadrag': 'pawshiva',
        'naazaqsa': 'pawshiva',
        'nakkirtk': 'pawshiva',
        'nandishz': 'pawshiva',
        'nnllm': 'pawshiva',
        'pbsaikum': 'pawshiva',
        'prashnka': 'pawshiva',
        'rdevulap': 'pawshiva',
        'rifakha': 'pawshiva',
        'saalz': 'pawshiva',
        'sairajua': 'pawshiva',
        'shivagor': 'pawshiva',
        'shrawm': 'pawshiva',
        'srshrav': 'pawshiva',
        'suhbandi': 'pawshiva',
        'tanuraw': 'pawshiva',
        'tiwarkug': 'pawshiva',

        // aflopzz team
        'amysolis': 'aflopzz',
        'calfaroa': 'aflopzz',
        'chjuanca': 'aflopzz',
        'cristopy': 'aflopzz',
        'daniialb': 'aflopzz',
        'dvvindas': 'aflopzz',
        'emabeguz': 'aflopzz',
        'gelizona': 'aflopzz',
        'gezsanch': 'aflopzz',
        'gtdarren': 'aflopzz',
        'jenarg': 'aflopzz',
        'jeymarin': 'aflopzz',
        'jimcro': 'aflopzz',
        'jmurilld': 'aflopzz',
        'nunelias': 'aflopzz',
        'reitrejo': 'aflopzz',
        'sgaitana': 'aflopzz',
        'solajusf': 'aflopzz',
        'vkeortiz': 'aflopzz',
        'yesely': 'aflopzz',

        // srkoushi team
        'bhoomenv': 'srkoushi',
        'fcharban': 'srkoushi',
        'imragu': 'srkoushi',
        'itsbasha': 'srkoushi',
        'ivarshi': 'srkoushi',
        'mahmarg': 'srkoushi',
        'moincmad': 'srkoushi',
        'navyasmy': 'srkoushi',
        'rdeepae': 'srkoushi',
        'ruthviel': 'srkoushi',
        'sahidsim': 'srkoushi',
        'sajjamad': 'srkoushi',
        'sampriir': 'srkoushi',
        'sihanand': 'srkoushi',
        'sravyaad': 'srkoushi',
        'subhalur': 'srkoushi',
        'syedkhmm': 'srkoushi',
        'syednazm': 'srkoushi',
        'tahur': 'srkoushi',
        'tejesaam': 'srkoushi',
        'vepanjer': 'srkoushi',
        'vkdileep': 'srkoushi',
        'zackymd': 'srkoushi',
        'zulesami': 'srkoushi',

        // mssritej team
        'adeeya': 'mssritej',
        'aharsraj': 'mssritej',
        'aishwafv': 'mssritej',
        'alqamaa': 'mssritej',
        'appakaly': 'mssritej',
        'bandanp': 'mssritej',
        'basjahna': 'mssritej',
        'bibijsha': 'mssritej',
        'boddulue': 'mssritej',
        'bommaman': 'mssritej',
        'burugpra': 'mssritej',
        'bymadhuu': 'mssritej',
        'charuty': 'mssritej',
        'chchenna': 'mssritej',
        'ckasala': 'mssritej',
        'dagwarve': 'mssritej',
        'dharahas': 'mssritej',
        'durgapmk': 'mssritej',
        'dwsuresh': 'mssritej',
        'gunnisur': 'mssritej',
        'gutnanit': 'mssritej',
        'haritejc': 'mssritej',
        'harshuu': 'mssritej',
        'hsurabhi': 'mssritej',
        'humasn': 'mssritej',
        'imeabhay': 'mssritej',
        'indrarac': 'mssritej',
        'jadswath': 'mssritej',
        'janakich': 'mssritej',
        'jvnidhi': 'mssritej',
        'kanakaas': 'mssritej',
        'karaltan': 'mssritej',
        'keertia': 'mssritej',
        'kukatlpr': 'mssritej',
        'kulkmand': 'mssritej',
        'lavadamo': 'mssritej',
        'magantim': 'mssritej',
        'majumdde': 'mssritej',
        'malshreu': 'mssritej',
        'mathuvav': 'mssritej',
        'moafrozw': 'mssritej',
        'monisasi': 'mssritej',
        'msharaan': 'mssritej',
        'neelimch': 'mssritej',
        'nihgopir': 'mssritej',
        'nikhiii': 'mssritej',
        'nimmalve': 'mssritej',
        'nkarahar': 'mssritej',
        'ojaisury': 'mssritej',
        'opushpen': 'mssritej',
        'pawrteja': 'mssritej',
        'pnarasit': 'mssritej',
        'praneerd': 'mssritej',
        'pritwins': 'mssritej',
        'qharvelu': 'mssritej',
        'rakespen': 'mssritej',
        'ramkhrl': 'mssritej',
        'reddasan': 'mssritej',
        'revaedhu': 'mssritej',
        'roshniks': 'mssritej',
        'saikittu': 'mssritej',
        'saisrav': 'mssritej',
        'sandyeep': 'mssritej',
        'sankdevi': 'mssritej',
        'sarlak': 'mssritej',
        'sdthumma': 'mssritej',
        'sebiseb': 'mssritej',
        'shajaays': 'mssritej',
        'sirisrc': 'mssritej',
        'skrupamo': 'mssritej',
        'sodurgam': 'mssritej',
        'sunilzk': 'mssritej',
        'swethden': 'mssritej',
        'syeaiman': 'mssritej',
        'tbshree': 'mssritej',
        'thotramy': 'mssritej',
        'vamthumm': 'mssritej',
        'venkyvr': 'mssritej',

    };
    // Function to get manager from associate login
    function getManagerFromLogin(associateLogin) {
        if (!associateLogin || associateLogin.trim() === '') {
            return '';
        }
        const login = associateLogin.trim().toLowerCase();
        return loginToManagerMap[login] || '';
    }

    // Modern styles (kept from Open Vocabulary base)
    const styles = `
        .audit-popup {
            padding-top: 26px;
            position: fixed !important;
            right: 10px;
            top: 20px;
            background-color: #0D1216 !important;
            color: #E8E8E8 !important;
            opacity: 1 !important;
            padding: 14px;
            border-radius: 12px;
            z-index: 2147483000 !important;
            width: 320px;
            max-height: 96vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.35);
            border: 1px solid #333C42;
            font-family: 'Amazon Ember', Arial, sans-serif;
            font-size: 13px;
        }

        .drag-handle {
            width: 100%;
            height: 20px;
            background-color: #333C42;
            cursor: move;
            position: absolute;
            top: 0;
            left: 0;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
        }

        .audit-popup h3 {
            margin: 0 0 20px 0;
            color: #E3E9F0;
            font-size: 18px;
            font-weight: 500;
            line-height: 1.25;
            white-space: normal;
            max-width: 100%;
            padding-right: 80px;
            box-sizing: border-box;
        }
        .audit-popup .form-group {
            margin-bottom: 10px;
        }
        .audit-popup label {
            display: block;
            margin-bottom: 4px;
            color: #E8E8E8;
            font-size: 13px;
            font-weight: 500;
        }
        .audit-popup input, .audit-popup select, .audit-popup textarea {
            width: 100%;
            padding: 6px 10px;
            border-radius: 6px;
            background-color: #333C42;
            border: 1px solid #333C42;
            color: #E8E8E8;
            font-size: 13px;
            transition: border-color 0.2s;
            margin: 0;
        }
        .audit-popup input[type="date"]::-webkit-calendar-picker-indicator {
            filter: brightness(0);
            cursor: pointer;
            opacity: 0.8;
        }
        .audit-popup input[type="date"]::-webkit-calendar-picker-indicator:hover {
            opacity: 1;
        }
        .audit-popup input:focus, .audit-popup select:focus, .audit-popup textarea:focus {
            background-color: #333C42;
            border-color: #2876D3;
            box-shadow: 0 0 0 2px rgba(92,170,255,0.3);
            outline: none;
        }
        .audit-popup button {
            background-color: #2876D3;
            color: #FFFFFF;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .audit-popup button:hover {
            background-color: #4A9AEE;
        }
        .error-counts {
            background: #333C42;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .error-counts h4 {
            margin: 0 0 10px 0;
            color: #E8E8E8;
        }
        .audit-popup input[readonly], #isDefective:disabled {
            background-color: #333C42;
            border-color: #333C42;
            color: #999999;
            cursor: not-allowed;
            border: 1px solid #333C42;
        }
        .clear-memory-btn,
        .change-sp-folder-btn {
            background: none !important;
            border: none !important;
            margin-top: 15px !important;
            margin-bottom: 0 !important;
            color:rgb(150, 150, 150) !important;
            cursor: pointer !important;
            padding: 5px 5px 0 5px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            text-decoration: none !important;
            display: inline-block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        .clear-memory-btn:hover,
        .change-sp-folder-btn:hover {
            color: #E8E8E8 !important;
        }
        .capture-error-btn {
            width: 50%;
            margin-top: 4px;
            text-align: center;
            display: block;
            margin-left: auto;
            margin-right: auto;
            background-color: #2876D3;
            color: #FFFFFF;
        }
        .capture-error-btn:hover {
            background-color: #4A9AEE;
            color: #FFFFFF;
        }
        .export-btn {
            background: #008000 !important;
            width: 45% !important;
            margin-bottom: 10px;
            float: left;
        }
        .export-btn:hover {
            background: #006B7C;
        }
        .export-btn:disabled {
            color:rgb(68, 68, 68) !important;
        }
        .show-data-btn {
            background: #2876D3;
            width: 45%;
            margin-bottom: 10px;
            float: right;
        }
        .show-data-btn:hover {
            background: #4A9AEE;
        }
        .csv-export-btn {
            background: #008296 !important;
            width: 45% !important;
            margin-bottom: 10px;
            float: left;
        }
        .csv-export-btn:hover {
            background: #0a6b7a !important;
        }
        .upload-sp-btn {
            background: #FF8C00 !important;
            width: 45% !important;
            margin-bottom: 10px;
            float: right;
            text-align: center;
        }
        .upload-sp-btn:hover {
            background: #E07B00 !important;
        }
        .upload-sp-btn:disabled {
            color: rgb(68, 68, 68) !important;
        }
        .batch-hint {
            font-size: 11px;
            color: #7fb2ff;
            margin-top: 4px;
            min-height: 14px;
        }
        .defective-note {
            font-size: 12px;
            color: #cfd6dd;
            background: #0D1216;
            border-radius: 6px;
            padding: 8px;
            margin-bottom: 10px;
            line-height: 1.35;
            display: none;
        }
        .button-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 15px 0;
        }
        .export-btn, .show-data-btn {
            flex: 1.5;
            margin: 0;
        }
        .minimize-btn {
            position: absolute;
            right: 10px;
            top: 10px;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
            color: #2876D3;
        }
        .clear-job-btn {
            position: absolute;
            right: 50px;
            top: 10px;
            background: #333C42;
            border: none;
            font-size: 14px;
            cursor: pointer;
            padding: 5px 10px;
            color: white;
            border-radius: 4px;
        }
        .clear-job-btn:hover {
            background: #4A5568;
        }
        .audit-popup button:disabled,
        .audit-popup input:disabled,
        .readonly-state {
            background-color: #333C42;
            border-color: #333C42;
            color: #999999;
            opacity: 0.6;
            cursor: not-allowed;
        }
        .popup-icon {
            position: fixed !important;
            right: 20px;
            top: 20px;
            background: #0D1216 !important;
            color: white !important;
            opacity: 1 !important;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            z-index: 2147483000 !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.35);
            border: 1px solid #333C42;
            display: none;
        }
        .rework-group, .error-classification-group {
            visibility: visible;
        }
        .hideIt{
            display: none;
        }
        .error-classification-group {
            background-color: #333C42 !important;
            padding: 10px !important;
            border-radius: 6px !important;
            margin-top: 6px !important;
            margin-bottom: 6px !important;
            flex-direction: column; /* cuando se muestra (display:flex) apila y deja al select llenar */
            box-sizing: border-box;
            width: 100% !important;
            position: relative !important;
            z-index: 1000 !important;
        }
        .error-classification-group.visible {
            display: block !important;
        }
        .error-classification-group select {
            width: 100% !important;
            margin-bottom: 15px !important;
            display: block !important;

        }
        .error-classification-group label {
            display: block !important;
            margin-bottom: 5px !important;
        }

        /* OV Segmentation + OV Bbox: hide Correct/Incorrect/Missing multi-select UI (DOM retained for reuse) */
        .ovseg-hidden-labels-multi-section {
            display: none !important;
        }

        .rework-group {
            background-color: #333C42 !important;
            padding: 10px !important;
            border-radius: 6px !important;
            margin-top: 6px !important;
            margin-bottom: 6px !important;
            width: 100% !important;
            position: relative !important;
            z-index: 1000 !important;
        }
        .rework-group.visible {
            display: block !important;
        }
        .rework-group select {
            width: 100% !important;
            margin-bottom: 15px !important;
            display: block !important;

        }
        .rework-group label {
            display: block !important;
            margin-bottom: 5px !important;
        }


        #correctLabels, #incorrectLabels, #missingLabels {
            width: 100%;
            height: 100px !important;
            padding: 8px;
            border: 1px solid #DDD;
            border-radius: 6px;
            overflow-y: auto;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }
        #correctLabels option, #incorrectLabels option, #missingLabels option {
            padding: 5px;
            margin: 2px 0;
        }
        #correctLabels option:checked, #incorrectLabels option:checked, #missingLabels option:checked {
            background-color: #2876D3;
            color: white;
        }
        .data-preview-popup {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 10000;
            width: 90%;
            max-width: 1200px;
            max-height: 80vh;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            display: none;
        }
        .data-preview-popup .close-btn {
            position: absolute;
            right: 10px;
            top: 10px;
            background: #0D1216;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
        }
        .data-preview-popup .preview-edit-btn,
        .data-preview-popup .preview-save-btn {
            position: absolute;
            top: 10px;
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            color: #fff;
            font-size: 13px;
        }
        .data-preview-popup .preview-edit-btn { right: 70px; background: #2876D3; }
        .data-preview-popup .preview-edit-btn:hover { background: #4A9AEE; }
        .data-preview-popup .preview-save-btn { right: 150px; background: #008000; }
        .data-preview-popup .preview-save-btn:hover { background: #0a9a0a; }
        .data-preview-popup td.mro-editable-cell {
            background: #fffbe6;
            outline: 1px dashed #2876D3;
            cursor: text;
        }
        .data-preview-table-container {
            max-height: calc(80vh - 100px);
            overflow-y: auto;
            margin-top: 20px;
        }
        .data-preview-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .data-preview-table th,
        .data-preview-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .data-preview-table th {
            background-color: #0D1216;
            color: white;
            position: sticky;
            top: 0;
        }
        .data-preview-table tbody td {
            color:rgb(0, 0, 0);
        }
        .data-preview-table tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .data-preview-table tr:hover {
            background-color: #ddd;
        }
        .readonly-state {
            opacity: 0.6;
            cursor: not-allowed;
            pointer-events: none;
        }

        .date-week-container {
            display: flex;
            gap: 10px;
            width: 100%;
        }

        #useCaseSelector {
            width: 260px !important;
            max-width: 260px !important;
        }

        .date-field {
            flex: 2;
        }

        .week-field {
            flex: 1;
        }

        .clear-memory-version-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .version {
            font-size: 0.9em;
            font-style: italic;
            color: var(--color-mid-gray);
            margin-top: 35px;
        }

        /* ==== Toggle buttons (replace dropdowns for Use Case / Is Rework / Is Defective / Rework Status) ==== */
        .toggle-btn {
            flex: 1;
            padding: 8px 0;
            border-radius: 6px;
            border: 2px solid #555;
            background: #333C42 !important;
            color: #E8E8E8 !important;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }
        .toggle-btn:hover {
            border-color: #2876D3;
        }
        .toggle-btn.active {
            background: #2876D3 !important;
            border-color: #2876D3;
            color: #fff !important;
        }
        .toggle-btn-group {
            display: flex;
            gap: 6px;
            margin-top: 3px;
            margin-bottom: 10px;
        }
        .rework-round-control {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 4px;
            margin-bottom: 15px;
        }
        .rework-round-control button {
            width: 32px;
            height: 32px;
            padding: 0;
            font-size: 18px;
            line-height: 1;
            border-radius: 6px;
            background: #4A5568;
            color: #fff;
            border: none;
        }
        .rework-round-control button:hover {
            background: #2876D3;
        }
        .rework-round-control button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #reworkRoundDisplay {
            font-size: 16px;
            font-weight: 600;
            min-width: 24px;
            text-align: center;
        }

        /* Total Labels +/- control (Dense ID) */
        .total-labels-control {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .total-labels-control input {
            flex: 1;
        }
        .total-labels-control button {
            width: 32px;
            height: 32px;
            padding: 0;
            font-size: 18px;
            line-height: 1;
            border-radius: 6px;
            background: #4A5568;
            color: #fff;
            border: none;
            flex-shrink: 0;
        }
        .total-labels-control button:hover {
            background: #2876D3;
        }

        /* Job counter bar */
        .job-counter-bar {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-top: 15px;
            margin-bottom: 5px;
            gap: 10px;
        }
        .job-counter-label {
            font-size: 13px;
            color: #aaa;
        }
        .job-counter-num {
            font-size: 20px;
            font-weight: 700;
            color: #E8E8E8;
            line-height: 1;
        }

        /* Force-hidden selects: overrides the !important display:block set on
           .rework-group select / .error-classification-group select for the
           selects we keep only as internal state (real UI is the toggle buttons) */
        .mro-hidden-select {
            display: none !important;
        }
        /* CSP-safe hide: en Harmony los style="display:none" inline se bloquean,
           asi que los elementos ocultos llevan tambien esta clase (via stylesheet). */
        .mro-hidden {
            display: none !important;
        }
        /* PCS: multi-select de Issues (Error Classification > Root Cause) */
        /* El contenedor del defecto llena el alto del bloque, y el select llena el contenedor
           -> si el bloque es mas alto, el select muestra mas opciones sin scroll. */
        #defectiveYesContainer {
            display: flex;
            flex-direction: column;
            height: 100%;      /* llena el alto del bloque (que tiene alto definido al redimensionar) */
            min-height: 0;
            width: 100%;
            box-sizing: border-box;
        }
        .audit-popup select.pcs-issues-select {
            flex: 1 1 auto;
            height: auto;
            min-height: 140px;
            padding: 4px;
        }
        .audit-popup select.pcs-issues-select optgroup {
            color: #9DB4C8;
            font-weight: 700;
            font-style: normal;
        }
        .audit-popup select.pcs-issues-select option {
            color: #E8E8E8;
            padding: 3px 6px 3px 12px;
        }
        /* Botón para alternar layout angosto/ancho (horizontal) */
        .layout-toggle-btn {
            position: absolute;
            right: 110px;
            top: 10px;
            background: #333C42;
            border: none;
            font-size: 15px;
            line-height: 1;
            cursor: pointer;
            padding: 4px 8px;
            color: #E8E8E8;
            border-radius: 4px;
        }
        .layout-toggle-btn:hover { background: #2876D3; }
        /* Editor de layout: cada bloque se arrastra a gusto (posicion absoluta),
           y el panel se puede redimensionar. Persistido por usuario (GM). */
        .audit-popup.layout-editing {
            overflow: visible;
            outline: 2px dashed #2876D3;
            outline-offset: -2px;
            padding-top: 30px; /* espacio para la barra de edicion */
        }
        .audit-popup.layout-editing > *:not(.drag-handle):not(.minimize-btn):not(.layout-toggle-btn):not(.clear-job-btn) {
            outline: 1px dashed #4A9AEE;
            cursor: move;
        }
        /* En edicion, revelar las secciones dinamicas (Rework / Defective) para poder
           posicionarlas; durante la auditoria apareceran donde las hayas dejado. */
        .audit-popup.layout-editing .hideIt { display: block !important; }
        .mro-edit-hint {
            position: absolute;
            top: 0; left: 0; right: 0;
            background: #2876D3;
            color: #fff;
            font-size: 11px;
            text-align: center;
            padding: 5px 6px;
            border-radius: 8px 8px 0 0;
            z-index: 20;
            box-sizing: border-box;
        }
        .mro-hint-btn {
            background: #0D1216;
            color: #fff;
            border: 1px solid #fff;
            border-radius: 4px;
            font-size: 11px;
            padding: 2px 10px;
            margin-left: 6px;
            cursor: pointer;
        }
        .mro-hint-btn:hover { background: #333C42; }
        /* Handles de redimension (bordes y esquinas) en modo edicion */
        .mro-rz { position: absolute; z-index: 25; background: transparent; }
        .mro-rz-n { top: -3px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
        .mro-rz-s { bottom: -3px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
        .mro-rz-e { right: -3px; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }
        .mro-rz-w { left: -3px; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }
        .mro-rz-ne { top: -4px; right: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
        .mro-rz-nw { top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; }
        .mro-rz-se { bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: nwse-resize; background: #2876D3; border-radius: 2px; }
        .mro-rz-sw { bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
        /* Handle de redimension por bloque (esquina inferior derecha), solo en edicion */
        .mro-block-rz { display: none; }
        .audit-popup.layout-editing .mro-block-rz {
            display: block;
            position: absolute;
            bottom: 0; right: 0;
            width: 12px; height: 12px;
            background: #4A9AEE;
            border-radius: 2px 0 2px 0;
            cursor: nwse-resize;
            z-index: 26;
        }
        /* CSP-safe: los botones inferiores flotan (left/right); estas clases separan
           las filas via el stylesheet (el style="clear:both" inline lo bloquea Harmony). */
        .mro-clear { clear: both; }
        .copy-filename-status {
            clear: both;
            padding-top: 8px;
            font-size: 13px;
            color: #d33;
        }

        /* Compact Use Case toggle buttons (3 use cases must fit in one row) */
        .toggle-btn-group.usecase-toggle-group {
            margin-top: 2px;
            margin-bottom: 12px;
            gap: 4px;
        }
        .toggle-btn-group.usecase-toggle-group .toggle-btn {
            padding: 6px 2px;
            font-size: 11px;
            line-height: 1.2;
            white-space: nowrap;
        }

        /* Job counter pinned near the top so it's visible without scrolling */
        .job-counter-bar-top {
            margin-top: 6px;
            margin-bottom: 14px;
            padding-top: 4px;
            padding-bottom: 10px;
            border-bottom: 1px solid #333C42;
        }
    `;

    // Initialize currentAuditData
    let currentAuditData = {
        imageId: '',
        batchName:'',
        workWeek:'',
        isRework:'',
        reworkRound:'',
        reworkStatus:'',
        associateLogin: '',
        labelCount: '',
        isDefective: '',
        correctLabels: '',
        incorrectLabels: '',
        missingLabels: '',
        errorClassification: '',
        rootCause: '',
        usecase: 'FAR Open Vocabulary Segmentation',
        auditor: '', // Read dynamically from #auditorLogin field
        manager: '',
        jobURL: window.location.href,
        timestamp: null
    };

     //Use case specific (Open Vocabulary Segmentation)
    // Error Classification list (v3.3.2). Root Causes are dependent on the selected
    // Error Classification (see ovRootCausesByEC below).
    const ovErrorTypes = [
        'Select Error Classification',
        'Label Correctness',
        'Label Exhaustivity',
        'Mask Quality',
        'Masking Tool',
        'Invalid Images',
        'Invalid Concepts',
        'Complex Segmentation',
        'Edge Cases'
    ];

    // OV Segmentation Root Causes grouped by Error Classification (v3.3.2).
    // The dropdown/CSV value is the short `name` (numbered when the same name repeats
    // inside a group, e.g. "Label Correctness 1/2/3"). `comment` is the suggested comment
    // shown as a note below the dropdown; `note` is an extra reviewer note when present.
    const ovRootCausesByEC = {
        'Label Correctness': [
            { name: 'Label Correctness 1', comment: 'Target concept is present. Please apply masks to all visible instances.' },
            { name: 'Label Correctness 2', comment: 'Target concept is NOT present. Please remove every mask before submission.' },
            { name: 'Label Correctness 3', comment: 'Only apply a mask to the visible parts of the TC.' }
        ],
        'Label Exhaustivity': [
            { name: 'Label Exhaustivity 1', comment: 'Missing mask(s). [X] number of TC(s) is missing a mask.' },
            { name: 'Label Exhaustivity 2', comment: 'Blurred TC instance(s) missed.' }
        ],
        'Mask Quality': [
            { name: 'Mask Quality 1', comment: 'Mask must follow the boundaries of the TC without leaking into other elements in the image.' },
            { name: 'Mask Quality 2', comment: 'Missing Maskâ€”A significant part of the TC was left unsegmented.' },
            { name: 'Mask Quality 3', comment: 'Delete floating pixels outside the boundaries of the TC.', note: 'NOTE for reviewers: small and clearly easy to miss floating pixels are acceptable.' },
            { name: 'Mask Quality 4', comment: 'Structural Hole: Missed cropping out big hole.', note: 'Note: If a labeler cropped holes that did not require cropping properly, approve the job. Reach to manager or labeler to explain it is not necessary. However, this is not reason for rejection.' }
        ],
        'Masking Tool': [
            { name: 'Countable Noun Mask Logic', comment: 'apply a mask per individual instance (e.g. four cats = four masks)' },
            { name: 'Group-based Concepts', comment: 'apply one mask per group' },
            { name: 'Continuous Surface Area', comment: 'apply one mask per continuous region' },
            { name: 'Collective Noun', comment: 'apply one mask for all the individual elements that compose the collective, even if they are spatially separated.' },
            { name: 'Granular Non-countable Nouns', comment: 'one mask per visible cluster + any single instance that may be separated from the main cluster.' }
        ],
        'Invalid Images': [
            { name: 'Stock Image', comment: 'Image has stock library identificators such as watermarks/urls/banners and an ID number. Delete all masks and classify job as Stock Image.' },
            { name: 'Sensitive Content', comment: 'There are no defects related to sensitive content. If a labeler annotates an image and procedure is followed, approve the job.', note: 'Give notice to your manager, if you notice this classification is being misused to avoid working the job.' }
        ],
        'Invalid Concepts': [
            { name: 'Abstract/Intangible', comment: 'TC represents an emotion, mental state, character trait, or non-physical idea that has no visual form. Delete masks and classify them as an Invalid Concept.' },
            { name: 'Lack Definable Boundaries', comment: 'TC has a visual representation in the image, but TC boundaries are not clear; hence, no mask can be applied. Delete all masks and classify as an Invalid Concept.' },
            { name: 'Present as text', comment: 'TC is found in the image in written form.', note: 'Note: Signs composed of letters should be masked if auto-segmentation tool performs well.' },
            { name: 'Unclear Concept', comment: 'The target concept is worded in a way we cannot determine the object it wants. Usually, the text prompt is an adjectival. Delete all masks and choose invalid concept.' },
            { name: 'Quantifier Concept', comment: "The target concept is invalidated specifically when it consists of a spelled-out number word (such as 'two', 'three', 'four') preceding the noun. Delete all masks and choose invalid concept." },
            { name: 'Invalid Language', comment: 'Target concept appears in another language that is not English', note: 'Note: For names of plants or recipes that appear to be loan words from other languages or scientific names, use the Merriam-Webster dictionary only as a consulting resource. If you get a result and understand what the concept is referring to, attempt masking. In case of doubt, mark as not present.' },
            { name: 'Long Target Concept', comment: 'Unusual long target concepts that are messily worded. Delete all masks and choose invalid concept.' }
        ],
        'Complex Segmentation': [
            { name: 'Complex Segmentation 1', comment: 'TC does not have an intricate structure. Attempt segmentation.' },
            { name: 'Complex Segmentation 2', comment: 'There is not a high volume of instances. Please attempt segmentation.' },
            { name: 'Complex Segmentation 3', comment: 'Resulting masks are too messy due to intricate structure or high volume of instances. Please remove all masks and classify as complex segmentation.', note: 'Note: If a labeler attempted masking a complex image and the job seems correct according to SOP guidelines, approve the job.' }
        ],
        'Edge Cases': [
            { name: 'Whole-image Mask', comment: 'TC encompasses the entire image. Please apply mask to all the image.', note: 'Note: consider concepts where meaning can affect what is mask such as baseball which refers to the sport and its components or just the ball of the game. Remember, as long as the TC matches the object being masked, please favor approval.' },
            { name: 'Reflections', comment: 'Reflections of the TC must be labeled as separate instances. Please apply the additional masks following the corresponding mask logic.' },
            { name: 'Shadows 1', comment: 'apply a single mask to the shadow even if you can distinguish the individual objects casting it.' },
            { name: 'Shadows 2', comment: 'spatially separated shadows must have their own mask.' },
            { name: 'General Concept', comment: 'When the TC is present in the image in the form of multiple distinct objects, favor the segmentation of the most common interpretation.' }
        ]
    };

    //Use case specific (OV Bbox - defective YES section only)
    // Bbox has no real Error Classification, so we keep a single option to stay
    // consistent with the other use cases' format.
    const bboxErrorTypes = [
        'Select Error Classification',
        'Job Rejected Reason'
    ];

    // OV Bbox Root Causes (v3.3.2). Each carries the suggested comment shown as a note
    // below the dropdown (DC1B-style). The dropdown/CSV value is the short `name`.
    const bboxRootCauses = [
        { name: 'Missed instance (FN)', comment: 'FN: There is a visible instance of the target concept missing a bounding box. Please annotate all visible instances.' },
        { name: 'Multiple missed instances', comment: 'FN: [X] visible instances of the concept are missing annotations. Please re-scan the image and add bounding boxes for all instances.' },
        { name: 'Duplicate box', comment: 'FP: Duplicate bounding box on the same instance. Each instance should have only one box. Please delete the duplicate.' },
        { name: 'Wrong concept', comment: 'FP: Bounding box labeled as [wrong_concept] but the object is a [correct_concept]. Please reassign or delete.' },
        { name: 'Box too loose', comment: 'BBOX: Bounding box is too loose â€” cannot identify which instance it refers to. Please tighten to cover only the object.' },
        { name: 'Concept incorrectly marked absent', comment: 'FN: Concept marked as "not present" but there are visible instances in the image. Please change to "yes" and add bounding boxes.' },
        { name: 'Stacked objects not separated', comment: 'BBOX: The stacked/grouped objects are visually separable and should have individual bounding boxes. Please split into one box per instance.' },
        { name: 'Box too tight', comment: 'BBOX: Bounding box for object is too tight â€” it misses a significant portion of the object. Please expand the box to cover the full visible extent.' },
        { name: 'Box on wrong location', comment: 'FP: Bounding box is placed on an area where no instance of the target concept exists. Please delete or reposition to the correct object.' }
    ];

    //Use case specific (Dense ID - defective YES section only)
    const denseErrorTypes = [
        'Select Error Classification',
        'Incorrect Match Code',
        'Incorrect Multiple Match Code',
        'Missed Code Item',
        'Multiple Missed Code Item',
        'Incorrect Skip Image',
        'Incorrect Label (No match/unsure)',
        'Incorrect Polygon Shape'
    ];

    // Dense ID Root Causes grouped by Error Classification (v3.3.2, from the Dense ID SOP).
    // Root Cause names are kept identical to the historical values (dashboard continuity);
    // `comment` is the SOP Definition, shown as the suggested comment note below the dropdown.
    const denseRootCausesByEC = {
        'Incorrect Match Code': [
            { name: 'Match Code Not Present', comment: 'Associate pasted code from a previous job, a code that was not present on the job' },
            { name: 'Adjacent Match Code Selection Error', comment: 'The key is to clearly convey that the error was due to selecting a nearby incorrect code rather than the intended correct one. This helps distinguish it from other types of match code errors that might occur for different reasons' },
            { name: 'Incomplete Code Entry', comment: 'This classification helps identify training opportunities and potential UI/process improvements to prevent incomplete code copying' },
            { name: 'Code Mismatch - No Correlation', comment: 'The selection was not a simple proximity error. There was no logical connection between the item and selected code. The error appears to be arbitrary rather than a misunderstanding of similar codes' }
        ],
        'Incorrect Multiple Match Code': [
            { name: 'Match Code Not Present', comment: 'Associate pasted code from a previous job, a code that was not present on the job' },
            { name: 'Adjacent Match Code Selection Error', comment: 'The key is to clearly convey that the error was due to selecting a nearby incorrect code rather than the intended correct one. This helps distinguish it from other types of match code errors that might occur for different reasons' },
            { name: 'Incomplete Code Entry', comment: 'This classification helps identify training opportunities and potential UI/process improvements to prevent incomplete code copying' },
            { name: 'Code Mismatch - No Correlation', comment: 'The selection was not a simple proximity error. There was no logical connection between the item and selected code. The error appears to be arbitrary rather than a misunderstanding of similar codes' }
        ],
        'Missed Code Item': [
            { name: 'Item omission', comment: 'When the required code was not annotated to the item' },
            { name: 'Blurry-Image', comment: 'When the associate incorrectly annotates the image as invalid due to the quality (slight blurriness) of the image itself.' },
            { name: 'Poor-Lighting', comment: 'When the associate incorrectly annotates the image as invalid due to the quality (light, flashes, dark parts) of the image itself.' }
        ],
        'Multiple Missed Code Item': [
            { name: 'Item omission', comment: 'When the required code was not annotated to the item' },
            { name: 'Blurry-Image', comment: 'When the associate incorrectly annotates the image as invalid due to the quality (slight blurriness) of the image itself.' },
            { name: 'Poor-Lighting', comment: 'When the associate incorrectly annotates the image as invalid due to the quality (light, flashes, dark parts) of the image itself.' }
        ],
        'Incorrect Skip Image': [
            { name: 'Invalid skip determination', comment: 'When the associate incorrectly annotates the image as invalid, being the image completely annotable.' }
        ],
        'Incorrect Label (No match/unsure)': [
            { name: 'Misclassification', comment: 'When the annotator incorrectly applied the "No Match/Unsure" category in situations where a definitive classification should have been made.' },
            { name: 'Label selected/correct label', comment: 'It refers to errors or discrepancies that occur when the label or classification assigned to an item does not accurately reflect its true nature or category.' },
            { name: 'Label mismatch - Unsure/No Match', comment: 'A classification error occurring when the correct label cannot be confidently assigned (Unsure) or when no existing label adequately describes the item (No Match).' },
            { name: 'Label mismatch - No Match/Unsure', comment: 'This happens when no existing label adequately matches the item being classified, or when there is significant uncertainty about which label to apply.' },
            { name: 'Label mismatch - Unsure/Missing Code', comment: 'A classification error that primarily occurs when the required classification code is absent from the existing system, or when there is uncertainty in selecting the appropriate code from available options.' },
            { name: 'Label mismatch - No Match/Missing Code', comment: 'A classification error that occurs when the required classification code is not available in the current system' },
            { name: 'Label mismatch - Incorrect code/No match', comment: 'A classification error occurring when an inappropriate code is assigned to an item or situation, and no existing code in the system accurately represents the correct classification.' },
            { name: 'Label mismatch - Incorrect code/Unsure', comment: 'A classification error that occurs when an incorrect code has been applied, and there is uncertainty about which existing code should be used as the correct replacement.' }
        ],
        'Incorrect Polygon Shape': [
            { name: 'Polygon misalignment', comment: 'When the annotator inappropriately modified the original polygon boundaries from the original one.' }
        ]
    };

    // Defective Options
    const defectiveOptions = [
        'Select..',
        'No',
        'Yes',
        'Skipped'
    ];

    // Rework Options
    const reworkOptions = [
        'Select..',
        'Yes',
        'No'
    ];

    // Rework rounds
    const reworkRoundOptions = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
    ];

    // Rework status
    const reworkStatusOptions = [
        'Select..',
        'Approved',
        'Rejected'
    ];

    //Correct-Incorrect-Missing labels (Open Vocabulary list retained exactly)
    const overallLabels = [
        { value: 'Tote', label: 'Tote', selected: false },
        { value: 'Object', label: 'Object', selected: false },
        { value: 'Book', label: 'Book', selected: false },
        { value: 'An object with cuboid shape', label: 'An object with cuboid shape', selected: false },
        { value: 'Cylindrical object', label: 'Cylindrical object', selected: false },
        { value: 'An object inside a paper bag', label: 'An object inside a paper bag', selected: false },
        { value: 'Loose bag', label: 'Loose bag', selected: false },
        { value: 'Trash', label: 'Trash', selected: false },
        { value: 'Book Spine', label: 'Book Spine', selected: false },
        { value: 'Hole', label: 'Hole', selected: false },
        { value: 'Occluded part', label: 'Occluded part', selected: false },
        { value: 'Robot', label: 'Robot', selected: false },
        { value: 'Human', label: 'Human', selected: false },
        { value: 'Checkboard attached to a robot', label: 'Checkboard attached to a robot', selected: false },
        { value: 'Is Hole Or Occluded Part For', label: 'Is Hole Or Occluded Part For', selected: false },
    ];

    // Core Functions
    //function to format date and time
    function formatDateTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const options = {
            timeZone: 'America/Costa_Rica',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    // Function to calculate Amazon Work Week from a date
    // Amazon weeks start on Sunday and end on Saturday

    function calculateWorkWeekFromDate(dateString) {
        if (!dateString || dateString.trim() === '' || isNaN(new Date(dateString).getTime())) {
            return '';
        }

        const date = new Date(dateString);
        const year = date.getFullYear();

        // For 2026, WW1 starts on Sunday December 28, 2025
        if (year === 2026 || (year === 2025 && date >= new Date(2025, 11, 27))) {
            const ww1Start2026 = new Date(2025, 11, 27); // December 28, 2025

            if (date >= ww1Start2026) {
                const daysSinceWW1 = Math.floor((date.getTime() - ww1Start2026.getTime()) / (1000 * 60 * 60 * 24));
                const weekNumber = Math.floor(daysSinceWW1 / 7) + 1;
                return weekNumber.toString();
            }
        }

        // Find the first Sunday of the year
        const firstSundayOfYear = new Date(year, 0, 1);
        while (firstSundayOfYear.getDay() !== 0) {
            firstSundayOfYear.setDate(firstSundayOfYear.getDate() + 1);
        }

        // Find the last Sunday of previous year (starts WorkWeek 1)
        const lastSundayPrevYear = new Date(year - 1, 11, 31);
        while (lastSundayPrevYear.getDay() !== 0) {
            lastSundayPrevYear.setDate(lastSundayPrevYear.getDate() - 1);
        }

        // Handle dates before the first Sunday of the year
        if (date < firstSundayOfYear) {
            if (date >= lastSundayPrevYear) {
                return "1";
            } else {
                return "1"; // Simplified for current year implementation
            }
        }

        // Calculate week number (first Sunday starts WorkWeek 2)
        const daysSinceFirstSunday = Math.floor((date.getTime() - firstSundayOfYear.getTime()) / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor((daysSinceFirstSunday + 1) / 7) + 2;
        return weekNumber.toString();
    }

    // DenseID-only helper (used only when USE_CASE.current === 'denseID' AND Is Defective === 'Yes')
    function populateIdentifiableObjects(count) {
        const correctLabels = document.getElementById('correctLabels');
        const incorrectLabels = document.getElementById('incorrectLabels');

        if (!correctLabels || !incorrectLabels) {
            return;
        }

        // Clear existing options
        correctLabels.innerHTML = '';
        incorrectLabels.innerHTML = '';

        // Populate with identifiable objects
        for (let i = 1; i <= count; i++) {
            const option = `<option value="IO ${i}">IO ${i}</option>`;
            correctLabels.innerHTML += option;
            incorrectLabels.innerHTML += option;
        }

        // Update labels with count
        const correctLabel = document.getElementById('correctLabelsLabel');
        const incorrectLabel = document.getElementById('incorrectLabelsLabel');

        if (correctLabel && incorrectLabel) {
            if (count > 0) {
                correctLabel.textContent = `Correct Objects (${count})`;
                incorrectLabel.textContent = `Incorrect Objects (${count})`;
            } else {
                correctLabel.textContent = `Correct Objects`;
                incorrectLabel.textContent = `Incorrect Objects`;
            }
        }
    }

    function getUseCaseLabel() {
        return USE_CASE_LABELS[USE_CASE.current] || USE_CASE_LABELS.openVocabulary;
    }

    // Use cases that expose the Total Labels control
    // PCS Concept BBox: manual (el conteo vive en el iframe del anotador, no legible).
    function usesTotalLabels() {
        return USE_CASE.current === 'denseID' || USE_CASE.current === 'ovBbox' || USE_CASE.current === 'pcsConceptBbox';
    }

    // OV Bbox starts at 0 and the QA adjusts it; the other use cases start empty
    function getDefaultTotalLabels() {
        return USE_CASE.current === 'ovBbox' ? '0' : '';
    }

    function applyDefaultTotalLabels() {
        if (USE_CASE.current !== 'ovBbox') return;
        const labelCountInput = document.getElementById('labelCount');
        if (!labelCountInput) return;
        if (!labelCountInput.value || labelCountInput.value.trim() === '') {
            labelCountInput.value = '0';
        }
    }

    // v3.3.2: short labels for the batch-name auto-detection hint
    const USE_CASE_SHORT_LABELS = {
        openVocabulary: 'OV Segmentation',
        ovBbox: 'XDOF BBOX',
        denseID: 'Dense ID',
        pcsConceptBbox: 'PCS Concept BBox'
    };

    // v3.3.2: Best-effort detect the Use Case from the batch name.
    //   - contains "bbox"                 -> OV Bbox   (check first: OV Bbox batches also contain "ov")
    //   - contains "ov" / "segmentation"  -> OV Segmentation
    //   - matches p-#### / t-#### only     -> Dense ID
    // Returns 'ovBbox' | 'openVocabulary' | 'denseID' | null.
    function detectUseCaseFromBatch(name) {
        if (!name) return null;
        const s = name.trim().toLowerCase();
        if (!s) return null;
        if (/^p-pcs|pcs[-_ ]?concept/.test(s)) return 'pcsConceptBbox'; // antes que bbox: p-pcs-bbox-* contiene "bbox"
        if (/bbox/.test(s)) return 'ovBbox';
        if (/(^|[^a-z])ov([^a-z]|$)|ov[-_]?seg|segmentation/.test(s)) return 'openVocabulary';
        if (/^[pt]-[0-9a-f]+$/.test(s)) return 'denseID'; // Dense = p-/t- + hex (p-fdc5, p-477b, p-8048...)
        return null;
    }

    // v3.3.2: Auto-switch the Use Case toggle from the batch name and show a hint the QA
    // can override. No-op when nothing is detected (leaves the current selection untouched).
    function applyUseCaseDetectionFromBatch(name) {
        const detected = detectUseCaseFromBatch(name);
        const hint = document.getElementById('batchHint');
        if (!detected) return;
        if (detected !== USE_CASE.current) {
            const selector = document.getElementById('useCaseSelector');
            if (selector) {
                selector.value = detected;
                selector.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (window.__mroToggleSetters) {
                window.__mroToggleSetters.setUseCaseToggle(detected, false);
            }
        }
        if (hint) hint.textContent = `Use Case auto-set to ${USE_CASE_SHORT_LABELS[detected]} from batch name`;
    }

    // PCS Concept BBox — Error Classification + Root Causes (SOP v1.0.0 §10).
    // Dependiente (EC -> Root Cause), mismo mecanismo que OV Segmentation.
    const pcsErrorTypes = [
        'Select Error Classification',
        'Label Correctness',
        'Label Exhaustivity',
        'Mask Quality',
        'Masking Tool',
        'Invalid Images',
        'Edge Cases'
    ];
    const pcsRootCausesByEC = {
        'Label Correctness': [
            { name: 'Label Correctness 1', comment: 'Target concept is present. Please apply a bounding box to all visible instances. (add extra details if necessary)' },
            { name: 'Label Correctness 2', comment: 'Target concept is NOT present. Please remove the bounding box. (add extra details if necessary)' },
            { name: 'Label Correctness 3', comment: 'Select "skip concept" and delete box. Image requires the bounding box to be applied to the whole image, or the concept is Abstract or Intangible / Lacks Definable Boundaries / Unclear Concept / Quantifier Concept / Invalid Language / Long Target Concepts.' },
        ],
        'Label Exhaustivity': [
            { name: 'Label Exhaustivity 1', comment: 'Missing bounding box. Instances on the (top left / top right / bottom left / bottom right / center / center top / center bottom) were missed.' },
            { name: 'Label Exhaustivity 2', comment: 'Blurred TC instance(s) missed.' },
        ],
        'Mask Quality': [
            { name: 'Mask Quality 1', comment: 'Bounding Box must be applied as close as possible to the boundaries of the object. A gap of 5 pixels is accepted.' },
            { name: 'Mask Quality 2', comment: 'Poor Box Application — a significant part of the TC was left out of the box.' },
        ],
        'Masking Tool': [
            { name: 'Countable Noun Mask Logic', comment: 'Apply a box per individual instance (e.g. four cats = four boxes).' },
            { name: 'Group-based Concepts', comment: 'Apply one box per group.' },
            { name: 'Continuous Surface Area', comment: 'Apply one box per continuous region.' },
            { name: 'Collective Noun', comment: 'Apply one box for all the individual elements that compose the collective, even if they are spatially separated.' },
            { name: 'Granular Non-countable Nouns', comment: 'One box per visible cluster + any single instance that may be separated from the main cluster.' },
        ],
        'Invalid Images': [
            { name: 'Stock Image', comment: 'Image has stock-library identificators such as watermarks/urls/banners and an ID number. Skip Image.' },
            { name: 'Sensitive Content', comment: 'There are no defects related to sensitive content. If a labeler annotates the image and procedure is followed, approve the job. Give notice to your manager if this classification is being misused to avoid working the job.' },
        ],
        'Edge Cases': [
            { name: 'Reflections', comment: 'Reflections of the TC must be labeled as separate instances. Please apply the additional boxes following the corresponding mask logic.' },
            { name: 'Shadows 1', comment: 'Apply a single mask to the whole shadow even if you can distinguish the individual objects casting it.' },
            { name: 'Shadows 2', comment: 'Spatially separated shadows must have their own mask.' },
            { name: 'Text 1', comment: 'Only apply a bounding box to the object. Ignore the text.' },
            { name: 'Text 2', comment: 'The only reference available in the image to the TC is present in text form. Please apply a box to the text.' },
            { name: 'General Concept', comment: 'When the TC is present in the image as multiple distinct objects, favor the segmentation of the most common interpretation. Note: when the most common interpretation is missing, only mask one type of instance.' },
        ],
    };

    // XDOF BBOX — Issue Categories (SOP v2.0.0 §6). Mismo multi-select que PCS.
    const xdofErrorTypes = ['FN', 'FP', 'BBOX', 'SOP'];
    const xdofRootCausesByEC = {
        'FN': [
            { name: 'FN - Visible instance missing a bbox', comment: 'There is a visible instance of the target concept missing a bounding box. Please annotate all visible instances.' },
            { name: 'FN - Multiple instances missing', comment: '[X] visible instances of the concept are missing annotations. Please re-scan the image and add bounding boxes for all instances.' },
            { name: 'FN - Concept is present but no bboxes drawn', comment: 'The concept has no bounding boxes but there are visible instances in the image. Please add bounding boxes for all instances.' },
        ],
        'FP': [
            { name: 'FP - Duplicate bbox on same instance', comment: 'Box #[X] is a duplicate on the same instance. Each instance should have only one box. Please delete the duplicate.' },
            { name: 'FP - Box on wrong object', comment: 'Box #[X] is on a wrong object, not the target concept. Please delete.' },
            { name: 'FP - Box on reflection/shadow/robot arm', comment: 'Box #[X] is on a reflection/shadow/robot arm. Only annotate real physical objects. Please delete.' },
            { name: 'FP - Box on area with no instance', comment: 'Box #[X] is placed on an area where no instance of the target concept exists. Please delete or reposition to the correct object.' },
        ],
        'BBOX': [
            { name: 'BBOX - Box too loose', comment: 'Box #[X] is too loose — includes too much background. Please tighten to fit the object more closely.' },
            { name: 'BBOX - Box too tight', comment: 'Box #[X] is too tight — it misses a significant portion of the object. Please expand to cover the full visible extent.' },
            { name: 'BBOX - Separable objects grouped', comment: 'The grouped objects are visually separable and should have individual bounding boxes. Please split into one box per instance.' },
        ],
        'SOP': [
            { name: 'SOP - Concept approach not followed', comment: 'The approach for this concept is defined in the Concept Vocabulary Guide: "[paste the relevant instruction here]". Please correct accordingly.' },
        ],
    };

    // Use cases que usan el multi-select de Issues (Error Classification > Root Cause).
    function usesMultiIssues() {
        return USE_CASE.current === 'pcsConceptBbox' || USE_CASE.current === 'ovBbox';
    }
    // Taxonomia (EC -> [{name,comment}]) del multi-select segun el Use Case actual.
    function multiIssuesTaxonomy() {
        if (USE_CASE.current === 'pcsConceptBbox') return pcsRootCausesByEC;
        if (USE_CASE.current === 'ovBbox') return xdofRootCausesByEC;
        return null;
    }
    // Categoria (Error Classification) a la que pertenece un Root Cause del multi-select.
    function pcsCategoryOf(rcName) {
        const map = multiIssuesTaxonomy();
        if (!map) return null;
        for (const ec in map) {
            if (map[ec].some(rc => rc.name === rcName)) return ec;
        }
        return null;
    }
    // Lee el multi-select de issues -> { rootCauses:[...], categories:[...] } (unicas).
    function readPcsIssues() {
        const sel = document.getElementById('pcsIssues');
        if (!sel) return { rootCauses: [], categories: [] };
        const rootCauses = Array.from(sel.selectedOptions).map(o => o.value);
        const categories = [];
        rootCauses.forEach(n => { const c = pcsCategoryOf(n); if (c && !categories.includes(c)) categories.push(c); });
        return { rootCauses, categories };
    }

    function renderDefectiveYesSection() {
        const container = document.getElementById('defectiveYesContainer');
        if (!container) return;

        if (USE_CASE.current === 'denseID') {
            // Dense ID defective YES section (structure/behavior only; styling retained from base)
            container.innerHTML = `
                <label>Identifiable Objects:</label>
                <input type="number" id="identifiableObjects" class="label-input" placeholder="Enter number of objects" min="1" max="100">

                <label id="correctLabelsLabel">Correct Objects</label>
                <select id="correctLabels" name="correctLabels" multiple="multiple" size="3" style="height: 100px;">
                </select>

                <label id="incorrectLabelsLabel">Incorrect Objects</label>
                <select id="incorrectLabels" name="incorrectLabels" multiple="multiple" size="3" style="height: 100px;">
                </select>

                <label id="missingLabelsLabel">Missing Objects</label>
                <select id="missingLabels" name="missingLabels" multiple="multiple" size="3" style="height: 100px;">
                    <option value="IO">IO</option>
                </select>

                <label>Error Classification:</label>
                <select id="errorType">
                    ${denseErrorTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
                <label>Root Cause:</label>
                <select id="rootCause">
                    <option value="Select Root Cause">Select Root Cause</option>
                </select>
                <div id="defectiveNote" class="defective-note"></div>
            `;
        } else if (usesMultiIssues()) {
            // PCS Concept BBox (SOP §10) y XDOF BBOX (SOP v2.0.0 §6): multi-select de Issues.
            // Correct/Incorrect/Missing se mantienen en el DOM (ocultos por CSS) para no romper lecturas.
            container.innerHTML = `
                <div class="ovseg-hidden-labels-multi-section">
                <label>Correct Labels</label>
                <select id="correctLabels" name="correctLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
                </select>

                <label>Incorrect Labels</label>
                <select id="incorrectLabels" name="incorrectLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
                </select>

                <label>Missing Labels</label>
                <select id="missingLabels" name="missingLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
                </select>
                </div>

                <label>Issue(s) — select one or more (Error Classification &rsaquo; Root Cause):</label>
                <select id="pcsIssues" class="pcs-issues-select" multiple size="10">
                    ${Object.keys(multiIssuesTaxonomy() || {}).map(ec => `
                    <optgroup label="${escHtml(ec)}">
                        ${multiIssuesTaxonomy()[ec].map(rc => `<option value="${escHtml(rc.name)}">${escHtml(rc.name)}</option>`).join('')}
                    </optgroup>`).join('')}
                </select>
                <div id="defectiveNote" class="defective-note"></div>
            `;
        } else {
            // Open Vocabulary defective YES section (kept exactly as base)
            container.innerHTML = `
                <div class="ovseg-hidden-labels-multi-section">
                <label>Correct Labels</label>
                <select id="correctLabels" name="correctLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item, index) =>
                        `<option value="${item.value}">${item.label}</option>`
                    ).join('')}
                </select>

                <label>Incorrect Labels</label>
                <select id="incorrectLabels" name="incorrectLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item, index) =>
                        `<option value="${item.value}">${item.label}</option>`
                    ).join('')}
                </select>

                <label>Missing Labels</label>
                <select id="missingLabels" name="missingLabels" multiple="multiple" size="3" style="height: 100px;">
                    ${overallLabels.map((item, index) =>
                        `<option value="${item.value}">${item.label}</option>`
                    ).join('')}
                </select>
                </div>

                <label>Error Classification:</label>
                <select id="errorType">
                    ${ovErrorTypes.map(type =>
                        `<option value="${type}">${type}</option>`
                    ).join('')}
                </select>
                <label>Root Cause:</label>
                <select id="rootCause">
                    <option value="Select Root Cause">Select Root Cause</option>
                </select>
                <div id="defectiveNote" class="defective-note"></div>
            `;
        }
    }

    // v3.3.2: Root Cause map for the current use case (dependent dropdowns).
    // OV Bbox uses a flat list (no Error Classification dependency) and returns null here.
    function getRootCauseMapForUseCase() {
        if (USE_CASE.current === 'openVocabulary') return ovRootCausesByEC;
        if (USE_CASE.current === 'denseID') return denseRootCausesByEC;
        if (USE_CASE.current === 'pcsConceptBbox') return pcsRootCausesByEC;
        return null;
    }

    // Escape text for safe insertion into innerHTML
    function escHtml(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // v3.3.2: Populate the Root Cause dropdown based on the selected Error Classification
    // (OV Segmentation and Dense ID). Always keeps the placeholder as the first option.
    // No-op for use cases without a dependency map (e.g. OV Bbox).
    function populateDependentRootCauses(ec) {
        const rootCauseEl = document.getElementById('rootCause');
        const map = getRootCauseMapForUseCase();
        if (!rootCauseEl || !map) return;
        const list = map[ec] || [];
        let html = '<option value="Select Root Cause">Select Root Cause</option>';
        html += list.map(rc => `<option value="${escHtml(rc.name)}">${escHtml(rc.name)}</option>`).join('');
        rootCauseEl.innerHTML = html;
        rootCauseEl.value = 'Select Root Cause';
    }

    // Flat lookup of a dependent Root Cause entry (OV Seg / Dense) by its name
    function findRootCauseEntry(name) {
        const map = getRootCauseMapForUseCase();
        if (!map) return null;
        for (const ec in map) {
            const found = map[ec].find(rc => rc.name === name);
            if (found) return found;
        }
        return null;
    }

    // v3.3.2: Show the suggested comment (plus any extra reviewer note) under the Root
    // Cause dropdown, for OV Bbox, OV Segmentation and Dense ID. Hidden when nothing applies.
    function updateDefectiveNote() {
        const noteEl = document.getElementById('defectiveNote');
        if (!noteEl) return;

        // PCS / XDOF: multi-select -> muestra el comentario sugerido de CADA issue seleccionado.
        if (usesMultiIssues()) {
            const { rootCauses } = readPcsIssues();
            const parts = [];
            const map = multiIssuesTaxonomy() || {};
            rootCauses.forEach(name => {
                const ec = pcsCategoryOf(name);
                const entry = ec ? (map[ec] || []).find(rc => rc.name === name) : null;
                if (entry && entry.comment) parts.push(`<b>${escHtml(name)}:</b> ${escHtml(entry.comment)}`);
            });
            if (parts.length) { noteEl.innerHTML = parts.join('<br><br>'); noteEl.style.display = 'block'; }
            else { noteEl.innerHTML = ''; noteEl.style.display = 'none'; }
            return;
        }

        const rootCauseEl = document.getElementById('rootCause');
        const val = rootCauseEl ? rootCauseEl.value : '';
        let entry = null;
        if (val && val !== 'Select Root Cause') {
            if (USE_CASE.current === 'ovBbox') {
                entry = bboxRootCauses.find(r => r.name === val) || null;
            } else {
                entry = findRootCauseEntry(val);
            }
        }
        let html = '';
        if (entry) {
            if (entry.comment) html = `<b>Suggested comment:</b> ${escHtml(entry.comment)}`;
            if (entry.note) html += (html ? '<br><br>' : '') + escHtml(entry.note);
        }
        if (html) {
            noteEl.innerHTML = html;
            noteEl.style.display = 'block';
        } else {
            noteEl.innerHTML = '';
            noteEl.style.display = 'none';
        }
    }

    function attachDefectiveYesListeners() {
        const attachOnce = (el, eventName) => {
            if (!el) return;
            const key = `__mroValidation_${eventName}`;
            if (el.dataset && el.dataset[key] === '1') return;
            el.addEventListener(eventName, () => checkCaptureButtonState());
            if (el.dataset) el.dataset[key] = '1';
        };

        attachOnce(document.getElementById('errorType'), 'change');
        attachOnce(document.getElementById('rootCause'), 'change');
        attachOnce(document.getElementById('correctLabels'), 'change');
        attachOnce(document.getElementById('incorrectLabels'), 'change');
        attachOnce(document.getElementById('missingLabels'), 'change');

        // PCS: multi-select de issues -> nota (comentarios) + re-validar.
        const pcsIssuesEl = document.getElementById('pcsIssues');
        if (pcsIssuesEl && !(pcsIssuesEl.dataset && pcsIssuesEl.dataset.__mroPcsAttached === '1')) {
            pcsIssuesEl.addEventListener('change', function() { updateDefectiveNote(); checkCaptureButtonState(); });
            if (pcsIssuesEl.dataset) pcsIssuesEl.dataset.__mroPcsAttached = '1';
        }

        // v3.3.2: dependent Root Cause (OV Seg) + guidance note (OV Seg / OV Bbox)
        const errorTypeEl = document.getElementById('errorType');
        if (errorTypeEl && !(errorTypeEl.dataset && errorTypeEl.dataset.__mroNoteAttached === '1')) {
            errorTypeEl.addEventListener('change', function() {
                // OV Segmentation and Dense ID have a dependent Root Cause list. Repopulating
                // resets Root Cause to the placeholder, so re-validate afterwards to avoid
                // leaving Save enabled with a stale root cause. (No-op for OV Bbox.)
                populateDependentRootCauses(this.value);
                updateDefectiveNote();
                checkCaptureButtonState();
            });
            if (errorTypeEl.dataset) errorTypeEl.dataset.__mroNoteAttached = '1';
        }
        const rootCauseElNote = document.getElementById('rootCause');
        if (rootCauseElNote && !(rootCauseElNote.dataset && rootCauseElNote.dataset.__mroNoteAttached === '1')) {
            rootCauseElNote.addEventListener('change', updateDefectiveNote);
            if (rootCauseElNote.dataset) rootCauseElNote.dataset.__mroNoteAttached = '1';
        }
        // Initialize note state whenever the defective section is (re)mounted
        updateDefectiveNote();

        const identifiableObjectsInput = document.getElementById('identifiableObjects');
        if (USE_CASE.current === 'denseID' && identifiableObjectsInput) {
            attachOnce(identifiableObjectsInput, 'input');
            attachOnce(identifiableObjectsInput, 'change');

            if (identifiableObjectsInput.dataset && identifiableObjectsInput.dataset.__mroPopulateAttached === '1') {
                return;
            }
            identifiableObjectsInput.addEventListener('input', function() {
                const count = parseInt(this.value);
                if (count && count > 0 && count <= 100) {
                    populateIdentifiableObjects(count);
                    checkCaptureButtonState();
                } else if (this.value === '') {
                    populateIdentifiableObjects(0);
                    checkCaptureButtonState();
                }
            });
            if (identifiableObjectsInput.dataset) {
                identifiableObjectsInput.dataset.__mroPopulateAttached = '1';
            }
        }
    }

    // Helper: MRO context key (reset counter when this changes)
    function getCurrentMroContextKey() {
        const imageId = document.getElementById('imageId')?.value?.trim() || '';
        const batchName = document.getElementById('batchName')?.value?.trim() || '';
        const isRework = document.getElementById('isRework')?.value || 'Select..';
        const reworkRound = (isRework === 'Yes')
            ? (document.getElementById('reworkRound')?.value || '')
            : '0';
        return `${imageId}||${batchName}||${reworkRound}`;
    }

    function resetMroCopyStateForContext(newContextKey) {
        hasCopiedFilename = false;
        lastCopiedFilename = '';
        lastCopiedContextKey = newContextKey || '';
        currentImageCounter = 1;
    }

    function showCopyFilenameError(message) {
        const statusDiv = document.getElementById('copyFilenameStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.color = '#d33';
        }
    }

    function clearCopyFilenameError() {
        const statusDiv = document.getElementById('copyFilenameStatus');
        if (statusDiv) {
            statusDiv.textContent = '';
        }
    }

    // Helper: success feedback (JustWalk-style: green + auto-hide)
    function showCopyFilenameSuccess(message) {
        const statusDiv = document.getElementById('copyFilenameStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.color = '#008000';
            setTimeout(() => {
                if (statusDiv.textContent === message) {
                    statusDiv.textContent = '';
                }
            }, 2500);
        }
    }

    // Helper function to copy text to clipboard (reuse JustWalk behavior)
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (fallbackErr) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // Validate required fields for MRO Copy File Name
    function validateCopyFilenameFields() {
        const associateLogin = document.getElementById('associateLogin')?.value?.trim();
        const imageId = document.getElementById('imageId')?.value?.trim();
        const batchName = document.getElementById('batchName')?.value?.trim();
        const isRework = document.getElementById('isRework')?.value;

        if (!associateLogin || !imageId || !batchName || !isRework || isRework === 'Select..') {
            return { ok: false, error: 'Error: Please fill Associate Login, Image ID, Batch Name, and Is Rework first' };
        }

        if (isRework === 'Yes') {
            const reworkRound = document.getElementById('reworkRound')?.value;
            const reworkStatus = document.getElementById('reworkStatus')?.value;
            if (!reworkRound || reworkStatus === 'Select..') {
                return { ok: false, error: 'Error: Please complete Rework Round and Rework Status' };
            }
        }

        return { ok: true };
    }

    function generateMroFilename(counterOverride) {
        const associateLogin = document.getElementById('associateLogin')?.value?.trim();
        const imageId = document.getElementById('imageId')?.value?.trim();
        const batchName = document.getElementById('batchName')?.value?.trim();
        const isRework = document.getElementById('isRework')?.value;
        const reworkRound = (isRework === 'Yes') ? (document.getElementById('reworkRound')?.value || '') : '0';
        const imageCounter = typeof counterOverride === 'number' ? counterOverride : currentImageCounter;
        return `${associateLogin}.${imageId}.${batchName}.${imageCounter}.${reworkRound}`;
    }

    async function copyMroFilename() {
        try {
            clearCopyFilenameError();

            const validation = validateCopyFilenameFields();
            if (!validation.ok) {
                showCopyFilenameError(validation.error);
                return;
            }

            const currentContextKey = getCurrentMroContextKey();
            const contextChanged = lastCopiedContextKey !== currentContextKey;
            if (contextChanged) {
                resetMroCopyStateForContext(currentContextKey);
            }

            const currentFilename = generateMroFilename();

            // Only show SweetAlert if the context is same AND filename matches last copied
            if (hasCopiedFilename && lastCopiedFilename === currentFilename && lastCopiedContextKey === currentContextKey) {
                const result = await Swal.fire({
                    title: "You already copied this filename.",
                    text: "What do you want to do?",
                    icon: "question",
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: "Copy same filename",
                    denyButtonText: "Increase counter and copy",
                    cancelButtonText: "Cancel",
                    confirmButtonColor: "#2876D3",
                    denyButtonColor: "#008296",
                    cancelButtonColor: "#0D1216"
                });

                if (result.isConfirmed) {
                    const success = await copyToClipboard(lastCopiedFilename);
                    if (!success) {
                        showCopyFilenameError('Error: Could not copy to clipboard');
                    } else {
                        showCopyFilenameSuccess(`Filename Copied: ${lastCopiedFilename}`);
                    }
                    return;
                } else if (result.isDenied) {
                    currentImageCounter = (currentImageCounter || 1) + 1;
                    const newFilename = generateMroFilename();
                    const success = await copyToClipboard(newFilename);
                    if (success) {
                        lastCopiedFilename = newFilename;
                        hasCopiedFilename = true;
                        showCopyFilenameSuccess(`Filename Copied: ${newFilename}`);
                    } else {
                        showCopyFilenameError('Error: Could not copy to clipboard');
                    }
                    return;
                } else {
                    return;
                }
            }

            // Default: copy current filename
            const success = await copyToClipboard(currentFilename);
            if (success) {
                hasCopiedFilename = true;
                lastCopiedFilename = currentFilename;
                lastCopiedContextKey = currentContextKey;
                showCopyFilenameSuccess(`Filename Copied: ${currentFilename}`);
            } else {
                showCopyFilenameError('Error: Could not copy to clipboard');
            }
        } catch (error) {
            console.error('Error copying MRO filename:', error);
            showCopyFilenameError('Error: ' + error.message);
        }
    }

    //function to create the main popup
    // CSP-proof style injection. Harmony (Amazon internal) usa un CSP con nonce
    // (style-src 'self' 'nonce-...') que bloquea TANTO el <style> inyectado como
    // GM_addStyle. La via que SI pasa ese CSP es un Constructable StyleSheet
    // aplicado por adoptedStyleSheets (es CSSOM programatico, no un <style>).
    function injectStyles(css) {
        // 1) Constructable StyleSheet -> adoptedStyleSheets: NO sujeto a CSP style-src.
        try {
            if (typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype
                && 'adoptedStyleSheets' in Document.prototype) {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(css);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
                return;
            }
        } catch (e) { /* realm/isolated-world quirk -> siguiente via */ }
        // 2) GM_addStyle (Tampermonkey) -> pasa el CSP en la mayoria de paginas.
        try {
            if (typeof GM_addStyle === 'function') { GM_addStyle(css); return; }
        } catch (e) { /* fallthrough */ }
        // 3) <style> normal -> donde el CSP permite estilos inline (Labelbox/Tron/phonetool).
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        (document.head || document.documentElement).appendChild(styleSheet);
    }

    // Estilos críticos del contenedor puestos vía CSSOM (element.style.*): esto es
    // INMUNE al CSP y garantiza que el panel nunca salga "casi invisible" ni mal
    // ubicado, aunque el stylesheet completo no llegue a aplicarse.
    function applyContainerHardStyles(el) {
        Object.assign(el.style, {
            position: 'fixed', right: '10px', top: '20px',
            backgroundColor: '#0D1216', color: '#E8E8E8', opacity: '1',
            zIndex: '2147483000', width: '320px', maxHeight: '96vh',
            overflowY: 'auto', padding: '14px', paddingTop: '26px',
            borderRadius: '12px', border: '1px solid #333C42',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            fontFamily: "'Amazon Ember', Arial, sans-serif", fontSize: '13px',
        });
    }

    // SweetAlert en paginas con CSP estricto (Harmony): su CSS se inyecta con un
    // <style> que el CSP bloquea -> los popups salen transparentes/camuflados.
    // Un MutationObserver aplica estilos inline (via CSSOM, inmunes al CSP) a cada
    // popup que aparece, para que se vean bien. Solo fuera de Labelbox (ahi ya funciona).
    function styleSwalNode(container) {
        if (!container || container.__mroSwalStyled) return;
        container.__mroSwalStyled = true;
        // Tema OSCURO, consistente con el panel del script (mismo palette).
        Object.assign(container.style, {
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: '2147483600', background: 'rgba(0,0,0,0.55)'
        });
        const popup = container.querySelector('.swal2-popup');
        if (popup) Object.assign(popup.style, {
            background: '#0D1216', color: '#E8E8E8', borderRadius: '10px',
            border: '1px solid #333C42',
            padding: '1.6em', maxWidth: '32em', width: '32em', boxSizing: 'border-box',
            boxShadow: '0 8px 30px rgba(0,0,0,0.55)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            fontFamily: "'Amazon Ember', Arial, sans-serif"
        });
        const title = container.querySelector('.swal2-title');
        if (title) Object.assign(title.style, { color: '#E3E9F0', fontSize: '1.5em', fontWeight: '600', margin: '0 0 .5em', padding: '0' });
        const htmlC = container.querySelector('.swal2-html-container');
        if (htmlC) Object.assign(htmlC.style, { color: '#E8E8E8', fontSize: '1.05em', margin: '.4em 0 0', lineHeight: '1.4' });
        const actions = container.querySelector('.swal2-actions');
        if (actions) Object.assign(actions.style, { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1.4em', flexWrap: 'wrap' });
        container.querySelectorAll('.swal2-styled').forEach(btn => {
            Object.assign(btn.style, { padding: '.6em 1.5em', borderRadius: '6px', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1em', margin: '0' });
            // confirm: si no trae color propio (confirmButtonColor via CSSOM) -> acento del tool.
            if (btn.classList.contains('swal2-confirm') && !btn.style.backgroundColor) btn.style.backgroundColor = '#2876D3';
            if (btn.classList.contains('swal2-cancel') && !btn.style.backgroundColor) btn.style.backgroundColor = '#333C42';
        });
        container.querySelectorAll('.swal2-input, .swal2-textarea, .swal2-select').forEach(inp => {
            Object.assign(inp.style, { background: '#333C42', border: '1px solid #333C42', borderRadius: '6px', padding: '.55em .7em', fontSize: '1em', width: '100%', boxSizing: 'border-box', margin: '.9em 0 0', color: '#E8E8E8' });
        });
        // Icono: color del anillo/contenido segun el tipo (en Harmony el simbolo interno puede no
        // dibujarse por el CSP, pero el color queda consistente; en Labelbox sale completo).
        const icon = container.querySelector('.swal2-icon');
        if (icon) {
            const byType = { 'swal2-warning': '#f8bb86', 'swal2-error': '#f27474', 'swal2-success': '#a5dc86', 'swal2-info': '#3fc3ee', 'swal2-question': '#87adbd' };
            let col = '#f8bb86';
            for (const k in byType) if (icon.classList.contains(k)) col = byType[k];
            icon.style.borderColor = col;
            const content = icon.querySelector('.swal2-icon-content');
            if (content) content.style.color = col;
        }
    }
    function installSwalCspFix() {
        if (window.__mroSwalObserver) return;
        // Se aplica en TODAS las paginas para que los popups sean consistentes (tema oscuro)
        // en todo el script, no solo en Harmony.
        const obs = new MutationObserver(muts => {
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (!n || n.nodeType !== 1) continue;
                    if (n.classList && n.classList.contains('swal2-container')) styleSwalNode(n);
                    else if (n.querySelector) { const c = n.querySelector('.swal2-container'); if (c) styleSwalNode(c); }
                }
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        window.__mroSwalObserver = obs;
    }

    function createPopup() {
        try {
            injectStyles(styles);

            const popup = document.createElement('div');
            popup.className = 'audit-popup';
            applyContainerHardStyles(popup);

            const html = `
            <div class="drag-handle"></div>
            <button class="minimize-btn">-</button>
            <button class="layout-toggle-btn" id="layoutToggleBtn" title="Editar layout: arrastrá los bloques a gusto. Shift+clic para resetear.">&#9998;</button>
            <button id="clearJobBtn" class="clear-job-btn">Clear</button>
            <div class="job-counter-bar job-counter-bar-top">
                <span class="job-counter-label">Jobs sent</span>
                <span class="job-counter-num" id="jobCounterDisplay">0</span>
            </div>
            <div class="job-counter-bar job-counter-bar-top" id="qaLoginBar" title="Clic para definir/cambiar tu login de QA" style="font-weight:bold; margin-top:6px; cursor:pointer;">
                <span class="job-counter-label" style="font-weight:bold;">QA</span>
                <span class="job-counter-num" id="auditorLoginDisplay" style="font-weight:bold;">—</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:flex-start; gap:10px; padding-right: 120px; margin-top: 12px;">
                <select id="useCaseSelector" class="mro-hidden-select" style="display:none">
                    <option value="openVocabulary">OV Segmentation</option>
                    <option value="ovBbox">XDOF BBOX</option>
                    <option value="pcsConceptBbox">PCS Concept BBox</option>
                    <option value="denseID">Dense ID</option>
                </select>
            </div>
            <div class="toggle-btn-group usecase-toggle-group">
                <button type="button" class="toggle-btn" id="ucOvBtn">OV Segmentation</button>
                <button type="button" class="toggle-btn" id="ucBboxBtn">XDOF BBOX</button>
                <button type="button" class="toggle-btn" id="ucDenseBtn">Dense ID</button>
                <button type="button" class="toggle-btn" id="ucPcsBtn">PCS BBox</button>
            </div>
            <div class="form-group">
                <label for="imageId">Image ID:</label>
                <input type="text" id="imageId" class="readonly-field" readonly>
            </div>
            <div class="form-group">
                <label for="batchName">Batch Name:</label>
                <input type="text" id="batchName" class="label-input" placeholder="Add the batch name">
                <div id="batchHint" class="batch-hint"></div>
            </div>
            <div class="form-group mro-hidden" style="display:none;">
                <label for="auditorLogin">Auditor Login:</label>
                <input type="text" id="auditorLogin" class="label-input" placeholder="Add your login">
            </div>
            <div class="date-week-container">
                <div class="form-group date-field">
                    <label for="date">Date:</label>
                    <input type="date" id="date" class="label-input">
                </div>
                <div class="form-group week-field">
                    <label for="workWeek">Work Week:</label>
                    <input type="text" id="workWeek" class="label-input" min="1" max="53" placeholder="1-53">
                </div>
            </div>
            <div class="form-group">
                <label>Is Rework:</label>
                <select id="isRework" class="mro-hidden-select" style="display:none">
                    ${reworkOptions.map(option =>
                        `<option value="${option}">${option}</option>`
                    ).join('')}
                </select>
                <div class="toggle-btn-group">
                    <button type="button" class="toggle-btn" id="reworkYesBtn">Yes</button>
                    <button type="button" class="toggle-btn" id="reworkNoBtn">No</button>
                </div>
            </div>

            <div id="reworkGroupBlock" class="hideIt form-group rework-group">

                <label>Rework Round:</label>
                <select id="reworkRound" class="mro-hidden-select" style="display:none">
                    ${reworkRoundOptions.map(option =>
                        `<option value="${option}">${option}</option>`
                    ).join('')}
                </select>
                <div class="rework-round-control">
                    <button type="button" id="rrMinus">-</button>
                    <span id="reworkRoundDisplay">1</span>
                    <button type="button" id="rrPlus">+</button>
                </div>

                <label>Rework Status</label>
                <select id="reworkStatus" class="mro-hidden-select" style="display:none">
                    ${reworkStatusOptions.map(option =>
                        `<option value="${option}">${option}</option>`
                    ).join('')}
                </select>
                <div class="toggle-btn-group">
                    <button type="button" class="toggle-btn" id="rsApprovedBtn">Approved</button>
                    <button type="button" class="toggle-btn" id="rsRejectedBtn">Rejected</button>
                </div>

            </div>

            <div class="form-group">
                <label>Associate Login:</label>
                <input type="text" id="associateLogin" class="label-input" placeholder="Add AA Login">
            </div>
            <div class="form-group" id="totalConceptsGroup">
                <label>Total Concepts:</label>
                <input type="text" id="totalConcepts" class="label-input" placeholder="Number of concepts in this job">
            </div>
            <div class="form-group" id="totalLabelsGroup">
                <label>Total Labels:</label>
                <div class="total-labels-control">
                    <button type="button" id="labelMinus">-</button>
                    <input type="text" id="labelCount" class="label-input" placeholder="Enter total (10 or 4+4+2)">
                    <button type="button" id="labelPlus">+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Is Defective:</label>
                <select id="isDefective" class="mro-hidden-select" style="display:none">
                    ${defectiveOptions.map(option =>
                        `<option value="${option}">${option}</option>`
                    ).join('')}
                </select>
                <div class="toggle-btn-group">
                    <button type="button" class="toggle-btn" id="defYesBtn">Yes</button>
                    <button type="button" class="toggle-btn" id="defNoBtn">No</button>
                    <button type="button" class="toggle-btn" id="defSkipBtn">Skip</button>
                </div>
            </div>
            <div id="errorClassGroupBlock" class="hideIt form-group error-classification-group">
                <div id="defectiveYesContainer"></div>
            </div>
            <div class="form-group mro-actions">
                <button id="captureErrorBtn" class="capture-error-btn">Save Assessment</button>
            </div>
            <div class="form-group mro-actions">
                <button id="copyFileNameBtn" class="export-btn">Copy Filename</button>
                <button id="showDataBtn" class="show-data-btn">Show Data</button>
                <div id="copyFilenameStatus" class="copy-filename-status"></div>
            </div>
            <div class="form-group mro-actions">
                <button id="exportCsvBtn" class="csv-export-btn">Export to CSV</button>
                <button id="uploadSpBtn" class="upload-sp-btn">Upload to SP</button>
                <div class="mro-clear"></div>
                <button id="changeSpFolderBtn" class="change-sp-folder-btn">Change SP Folder</button>
            </div>
            <div class="clear-memory-version-row">
                <button id="clearMemoryBtn" class="clear-memory-btn">Clear Memory</button>
                <p class="version">${version}</p>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        `;

            popup.innerHTML = html;
            document.body.appendChild(popup);
            //--------------------------------------------------------
            // dragging functionality
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            const POSITION_KEY = 'mroPopupPosition';

            function restorePopupPosition() {
                try {
                    const raw = GM_getValue(POSITION_KEY, ''); // GM: Harmony/Labelbox bloquean localStorage
                    if (!raw) return;
                    const pos = JSON.parse(raw);
                    const x = Number(pos?.left);
                    const y = Number(pos?.top);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                    xOffset = x;
                    yOffset = y;
                    currentX = x;
                    currentY = y;
                    initialX = x;
                    initialY = y;
                    setTranslate(x, y, popup);
                } catch (e) {
                    // ignore invalid storage
                }
            }

            function persistPopupPosition() {
                try {
                    if (!Number.isFinite(xOffset) || !Number.isFinite(yOffset)) return;
                    GM_setValue(POSITION_KEY, JSON.stringify({
                        top: String(yOffset),
                        left: String(xOffset)
                    }));
                } catch (e) {
                    // ignore storage errors
                }
            }

            function constrainPopupToViewport() {
                const margin = 10;
                const rect = popup.getBoundingClientRect();
                const vw = window.innerWidth || document.documentElement.clientWidth || 0;
                const vh = window.innerHeight || document.documentElement.clientHeight || 0;
                if (!vw || !vh) return;

                let dx = 0;
                let dy = 0;

                if (rect.top < margin) dy = margin - rect.top;
                if (rect.left < margin) dx = margin - rect.left;
                if (rect.right > vw - margin) dx = (vw - margin) - rect.right;
                if (rect.bottom > vh - margin) dy = (vh - margin) - rect.bottom;

                if (dx !== 0 || dy !== 0) {
                    const nextX = (Number.isFinite(xOffset) ? xOffset : 0) + dx;
                    const nextY = (Number.isFinite(yOffset) ? yOffset : 0) + dy;
                    xOffset = nextX;
                    yOffset = nextY;
                    currentX = nextX;
                    currentY = nextY;
                    initialX = nextX;
                    initialY = nextY;
                    setTranslate(nextX, nextY, popup);
                }
            }

            const dragHandle = popup.querySelector('.drag-handle');

            dragHandle.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            let dragBaseL = 0, dragBaseT = 0, dragMouseX = 0, dragMouseY = 0;
            function dragStart(e) {
                if (e.target !== dragHandle) return;
                isDragging = true;
                if (popup.classList.contains('layout-custom')) {
                    const r = popup.getBoundingClientRect();
                    dragBaseL = parseInt(popup.style.left) || r.left;
                    dragBaseT = parseInt(popup.style.top) || r.top;
                    dragMouseX = e.clientX; dragMouseY = e.clientY;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
            }

            function dragEnd(e) {
                if (!isDragging) return;
                isDragging = false;
                if (popup.classList.contains('layout-custom')) {
                    if (typeof saveCustomLayout === 'function') saveCustomLayout();
                } else {
                    initialX = currentX;
                    initialY = currentY;
                    constrainPopupToViewport();
                    persistPopupPosition();
                }
            }

            function drag(e) {
                if (!isDragging) return;
                e.preventDefault();
                if (popup.classList.contains('layout-custom')) {
                    popup.style.left = (dragBaseL + e.clientX - dragMouseX) + 'px';
                    popup.style.top  = (dragBaseT + e.clientY - dragMouseY) + 'px';
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    setTranslate(currentX, currentY, popup);
                }
            }

            function setTranslate(xPos, yPos, el) {
                el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
            }
            //--------------------------------------------------------

            restorePopupPosition();
            constrainPopupToViewport();
            persistPopupPosition();

            const errorGroup = document.querySelector('.error-classification-group');
            console.log('Error classification group after creation:', {
                exists: !!errorGroup,
                display: errorGroup ? errorGroup.style.display : 'element not found',
                html: errorGroup ? errorGroup.innerHTML : 'element not found'
            });

            const reworkGroup = document.querySelector('.rework-group');
            console.log('Rework group after creation:', {
                exists: !!reworkGroup,
                display: reworkGroup ? reworkGroup.style.display : 'element not found',
                html: reworkGroup ? reworkGroup.innerHTML : 'element not found'
            });


            const popupIcon = document.createElement('div');
            popupIcon.className = 'popup-icon';
            popupIcon.textContent = '📋';
            // Blindaje CSP-proof del ícono (display lo manejan minimize/maximize).
            Object.assign(popupIcon.style, {
                position: 'fixed', right: '20px', top: '20px',
                background: '#0D1216', color: '#FFFFFF', opacity: '1',
                width: '40px', height: '40px', borderRadius: '50%',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', lineHeight: '1', cursor: 'pointer',
                zIndex: '2147483000', border: '1px solid #333C42',
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)', display: 'none',
            });
            document.body.appendChild(popupIcon);

            console.log('Popup created successfully');
            // Default usecase label
            currentAuditData.usecase = getUseCaseLabel();
            // Render default defective YES content (hidden by default until IsDefective === 'Yes')
            renderDefectiveYesSection();
            attachDefectiveYesListeners();
            setupEventListeners();
            checkCaptureButtonState();
            //logic to load image ID automatically

            //logic to update image ID automatically if the URL changes

        } catch (error) {
            console.error('Error creating popup:', error);
        }
    }

    //function to create the preview of what is saved so far
    function createDataPreviewPopup() {
        const popup = document.createElement('div');
        popup.className = 'data-preview-popup';
        popup.id = 'dataPreviewPopup';

        const closeButton = document.createElement('button');
        closeButton.className = 'close-btn';
        closeButton.textContent = 'Close';
        closeButton.onclick = () => popup.style.display = 'none';

        // Editar los datos guardados ANTES de subirlos (por si se guardo un dato mal).
        const editBtn = document.createElement('button');
        editBtn.className = 'preview-edit-btn';
        editBtn.id = 'previewEditBtn';
        editBtn.textContent = 'Edit';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'preview-save-btn';
        saveBtn.id = 'previewSaveBtn';
        saveBtn.textContent = 'Save changes';
        saveBtn.style.display = 'none';

        editBtn.onclick = () => {
            const entering = editBtn.textContent === 'Edit';
            if (entering) {
                editBtn.textContent = 'Cancel';
                saveBtn.style.display = '';
                setPreviewEditable(true);
            } else {
                editBtn.textContent = 'Edit';
                saveBtn.style.display = 'none';
                showDataPreview(); // cancelar -> re-render con los valores originales
            }
        };
        saveBtn.onclick = () => {
            savePreviewEdits();
            editBtn.textContent = 'Edit';
            saveBtn.style.display = 'none';
            showDataPreview(); // re-render con lo guardado
            if (typeof Swal !== 'undefined') {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success',
                    title: 'Changes saved (not uploaded yet)', showConfirmButton: false, timer: 2500 });
            }
        };

        const tableContainer = document.createElement('div');
        tableContainer.className = 'data-preview-table-container';

        popup.appendChild(closeButton);
        popup.appendChild(editBtn);
        popup.appendChild(saveBtn);
        popup.appendChild(tableContainer);
        document.body.appendChild(popup);
    }

    // Activa/desactiva la edicion de las celdas del preview (contenteditable).
    function setPreviewEditable(on) {
        const tc = document.querySelector('#dataPreviewPopup .data-preview-table-container');
        if (!tc) return;
        tc.querySelectorAll('td[data-field]').forEach(td => {
            td.contentEditable = on ? 'true' : 'false';
            td.classList.toggle('mro-editable-cell', on);
        });
    }
    // Guarda los cambios del preview de vuelta a los audits en memoria (GM), sin subir.
    function savePreviewEdits() {
        const tc = document.querySelector('#dataPreviewPopup .data-preview-table-container');
        if (!tc) return;
        const audits = GM_getValue('audits', []);
        tc.querySelectorAll('tr[data-idx]').forEach(tr => {
            const idx = parseInt(tr.getAttribute('data-idx'), 10);
            if (!(idx >= 0 && idx < audits.length)) return;
            tr.querySelectorAll('td[data-field]').forEach(td => {
                audits[idx][td.getAttribute('data-field')] = (td.textContent || '').trim();
            });
            // re-derivar Manager si cambio el Associate Login
            if (typeof getManagerFromLogin === 'function') {
                audits[idx].manager = getManagerFromLogin(audits[idx].associateLogin);
            }
        });
        GM_setValue('audits', audits);
    }

    //function to print the html in the preview popup
    function showDataPreview() {
        const popup = document.getElementById('dataPreviewPopup');
        const tableContainer = popup.querySelector('.data-preview-table-container');
        const audits = GM_getValue('audits', []);

        if (audits.length === 0) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "No audit data available to display",
            });
            return;
        }

        // Create table HTML
        let tableHTML = `
            <table class="data-preview-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Image ID</th>
                        <th>Batch Name</th>
                        <th>Work Week</th>
                        <th>Is Rework</th>
                        <th>Rework Round</th>
                        <th>Rework Status</th>
                        <th>Associate Login</th>
                        <th>Total Labels</th>
                        <th>Is Defective</th>
                        <th>Correct Labels</th>
                        <th>Incorrect Labels</th>
                        <th>Missing Labels</th>
                        <th>Error Classification</th>
                        <th>Root Cause</th>
                        <th>Use Case</th>
                    </tr>
                </thead>
                <tbody>
        `;

        audits.forEach((audit, i) => {
            const c = (field, val) => `<td data-field="${field}">${escHtml(val)}</td>`;
            tableHTML += `
                <tr data-idx="${i}">
                    <td>${escHtml(formatDateTime(audit.timestamp))}</td>
                    ${c('imageId', audit.imageId)}
                    ${c('batchName', audit.batchName)}
                    ${c('workWeek', audit.workWeek)}
                    ${c('isRework', audit.isRework)}
                    ${c('reworkRound', audit.reworkRound)}
                    ${c('reworkStatus', audit.reworkStatus)}
                    ${c('associateLogin', audit.associateLogin)}
                    ${c('labelCount', audit.labelCount)}
                    ${c('isDefective', audit.isDefective)}
                    ${c('selectedLabels', audit.selectedLabels)}
                    ${c('selectedLabels2', audit.selectedLabels2)}
                    ${c('selectedLabels3', audit.selectedLabels3)}
                    ${c('errorClassification', audit.errorClassification)}
                    ${c('rootCause', audit.rootCause)}
                    ${c('usecase', audit.usecase)}
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        tableContainer.innerHTML = tableHTML;
        // reset del estado de edicion cada vez que se (re)abre
        const _eb = document.getElementById('previewEditBtn');
        const _sb = document.getElementById('previewSaveBtn');
        if (_eb) _eb.textContent = 'Edit';
        if (_sb) _sb.style.display = 'none';
        popup.style.display = 'block';
    }

    // ==== Toggle button helpers (Use Case / Is Rework / Is Defective / Rework Status / Rework Round) ====
    function setToggleActive(activeId, allIds) {
        allIds.forEach(id => {
            if (!id) return;
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('active');
            if (id === activeId) el.classList.add('active');
        });
    }

    let currentReworkRoundValue = 1;

    function updateReworkRoundDisplay(val) {
        currentReworkRoundValue = Math.min(10, Math.max(1, val));
        const displayEl = document.getElementById('reworkRoundDisplay');
        if (displayEl) displayEl.textContent = currentReworkRoundValue;
        const selectEl = document.getElementById('reworkRound');
        if (selectEl) {
            selectEl.value = currentReworkRoundValue;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ===== Editor de layout: arrastrá cada bloque a gusto (posicion absoluta) + panel
    // redimensionable. Persistido por usuario en GM (localStorage esta bloqueado en Harmony). =====
    const LAYOUT_KEY = 'mroCustomLayout';
    let mroEditingLayout = false;

    function mroLayoutBlocks() {
        const popup = document.querySelector('.audit-popup');
        if (!popup) return [];
        return [...popup.children].filter(el =>
            el.nodeType === 1 && el.tagName !== 'SCRIPT' &&
            !el.classList.contains('drag-handle') &&
            !el.classList.contains('minimize-btn') &&
            !el.classList.contains('layout-toggle-btn') &&
            !el.classList.contains('clear-job-btn') &&
            !el.classList.contains('mro-edit-hint') &&
            !el.classList.contains('mro-rz'));
    }
    // firma estable del bloque (no depende del orden): id + clase distintiva (para
    // desambiguar ids duplicados como #myElement), luego id interno o texto del label.
    function mroBlockSig(el, idx) {
        const cls = (String(el.className || '').trim().split(/\s+/).find(c => c && c !== 'form-group' && c !== 'hideIt')) || '';
        if (el.id) return 'id:' + el.id + (cls ? ':' + cls : '');
        const inner = el.querySelector('[id]');
        if (inner) return 'iid:' + inner.id;
        const lbl = el.querySelector('label');
        if (lbl && lbl.textContent.trim()) return 'lb:' + lbl.textContent.trim().slice(0, 24);
        return 'ix:' + idx;
    }
    // Busca la posicion guardada de un bloque: primero por firma exacta; si no, por su clase
    // distintiva UNICA (tolera cambios de firma/id historicos). No usa fallback si la clase
    // se repite (ej. mro-actions) para no confundir bloques.
    function mroFindSaved(saved, el, i) {
        const exact = saved[mroBlockSig(el, i)];
        if (exact) return exact;
        const cls = (String(el.className || '').trim().split(/\s+/).find(c => c && c !== 'form-group' && c !== 'hideIt' && c !== 'mro-actions')) || '';
        if (cls) {
            const keys = Object.keys(saved).filter(k => k !== '__panel' && k.endsWith(':' + cls));
            if (keys.length === 1) return saved[keys[0]];
        }
        return null;
    }
    function mroReadLayout() {
        try { return JSON.parse(GM_getValue(LAYOUT_KEY, '') || 'null') || {}; } catch (e) { return {}; }
    }
    // Pin del panel a left/top (sin transform ni right) para posicionar/redimensionar limpio.
    function mroPinPopup(popup) {
        const r = popup.getBoundingClientRect();
        popup.style.right = 'auto';
        popup.style.transform = 'none';
        popup.style.left = Math.round(r.left) + 'px';
        popup.style.top = Math.round(r.top) + 'px';
    }
    function applyCustomLayout() {
        const popup = document.querySelector('.audit-popup');
        if (!popup) return;
        const saved = mroReadLayout();
        if (!saved || !Object.keys(saved).length) { popup.classList.remove('layout-custom'); return; }
        // Auto-sane: layouts guardados con el bug viejo (medir-mientras-mutaba) apilaban casi
        // todos los bloques en el mismo top. Si detectamos ese colapso, descartamos el layout
        // corrupto y volvemos al orden normal (el usuario re-personaliza limpio, sin tocar nada).
        const tops = Object.keys(saved).filter(k => k !== '__panel').map(k => saved[k] && saved[k].top);
        if (tops.length >= 4) {
            const counts = {};
            tops.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
            const maxSameTop = Math.max(...Object.values(counts));
            if (maxSameTop >= Math.ceil(tops.length / 2)) {
                GM_setValue(LAYOUT_KEY, ''); // limpiar layout corrupto
                popup.classList.remove('layout-custom');
                return;
            }
        }
        popup.classList.add('layout-custom');
        popup.style.right = 'auto'; popup.style.transform = 'none'; popup.style.overflow = 'visible';
        const P = saved.__panel;
        if (P) {
            if (Number.isFinite(P.left)) popup.style.left = P.left + 'px';
            if (Number.isFinite(P.top))  popup.style.top  = P.top + 'px';
            if (P.width)  popup.style.width  = P.width + 'px';
            if (P.height) popup.style.height = P.height + 'px';
        }
        // Dos pasadas: 1) planificar (medir natural SOLO los visibles sin guardado, antes de mutar),
        // 2) aplicar. Asi TODO bloque manejado queda 'absolute' -> los ocultos (rework/issues) nunca
        // vuelven al flujo cuando se muestran (esa era la causa de que "saltaran arriba").
        const pr2 = popup.getBoundingClientRect();
        const plan = mroLayoutBlocks().map((el, i) => {
            const b = mroFindSaved(saved, el, i);
            if (b) return { el, b };
            if (el.offsetParent === null) return { el, b: null }; // oculto y sin guardar -> no tocar
            const r = el.getBoundingClientRect();
            return { el, b: { left: Math.round(r.left - pr2.left), top: Math.round(r.top - pr2.top), width: Math.round(r.width), height: 0 } };
        });
        plan.forEach(p => {
            if (!p.b) return;
            p.el.style.position = 'absolute';
            p.el.style.left = p.b.left + 'px'; p.el.style.top = p.b.top + 'px';
            if (p.b.width) p.el.style.setProperty('width', p.b.width + 'px', 'important');
            if (p.b.height) { p.el.style.height = p.b.height + 'px'; p.el.style.overflow = 'auto'; }
        });
    }
    // Re-aplica la posicion/tamaño guardado de UN bloque (para secciones que se muestran/ocultan
    // -> al mostrarse deben volver a su lugar del layout, no al flujo normal).
    function mroApplySavedPos(el) {
        const popup = document.querySelector('.audit-popup');
        if (!popup || !el || !popup.classList.contains('layout-custom')) return;
        const b = mroFindSaved(mroReadLayout(), el, 0);
        if (!b) return;
        el.style.position = 'absolute';
        el.style.left = b.left + 'px'; el.style.top = b.top + 'px';
        if (b.width) el.style.setProperty('width', b.width + 'px', 'important');
        if (b.height) { el.style.height = b.height + 'px'; el.style.overflow = 'auto'; }
    }
    function saveCustomLayout() {
        const popup = document.querySelector('.audit-popup');
        if (!popup) return;
        const r = popup.getBoundingClientRect();
        const data = { __panel: {
            left: parseInt(popup.style.left) || Math.round(r.left),
            top:  parseInt(popup.style.top)  || Math.round(r.top),
            width: parseInt(popup.style.width) || Math.round(r.width),
            height: parseInt(popup.style.height) || Math.round(r.height)
        } };
        mroLayoutBlocks().forEach((el, i) => {
            if (el.style.position === 'absolute') {
                data[mroBlockSig(el, i)] = {
                    left: parseInt(el.style.left) || 0,
                    top: parseInt(el.style.top) || 0,
                    width: parseInt(el.style.width) || 0,
                    height: parseInt(el.style.height) || 0
                };
            }
        });
        GM_setValue(LAYOUT_KEY, JSON.stringify(data));
    }
    // === Drag + resize por BLOQUE con interact.js (libreria probada, reemplaza el codigo a mano) ===
    // draggable mueve el bloque (left/top). resizable cambia ancho+alto desde el borde der/inferior.
    // Los listeners solo actuan en modo edicion; ademas se habilita/deshabilita en enter/exit.
    function mroWireBlock(el) {
        if (el.__mroInteract || typeof interact === 'undefined') return;
        el.__mroInteract = true;
        interact(el)
            .draggable({
                ignoreFrom: 'input, textarea, select, button, .toggle-btn',
                listeners: {
                    move(event) {
                        if (!mroEditingLayout) return;
                        const t = event.target;
                        t.style.position = 'absolute';
                        t.style.left = ((parseFloat(t.style.left) || 0) + event.dx) + 'px';
                        t.style.top  = ((parseFloat(t.style.top)  || 0) + event.dy) + 'px';
                    },
                    end() { if (mroEditingLayout) saveCustomLayout(); }
                }
            })
            .resizable({
                edges: { right: true, bottom: true },
                margin: 10,
                listeners: {
                    move(event) {
                        if (!mroEditingLayout) return;
                        const t = event.target;
                        // width con !important -> vence el "width:100% !important" de rework/error groups
                        t.style.setProperty('width', Math.max(60, Math.round(event.rect.width)) + 'px', 'important');
                        t.style.height = Math.max(24, Math.round(event.rect.height)) + 'px';
                        t.style.overflow = 'auto';
                    },
                    end() { if (mroEditingLayout) saveCustomLayout(); }
                }
            });
    }
    // habilita/deshabilita el arrastre+resize de todos los bloques (solo durante la edicion)
    function mroEnableBlockInteract(on) {
        if (typeof interact === 'undefined') return;
        mroLayoutBlocks().forEach(el => { mroWireBlock(el); interact(el).draggable(on); interact(el).resizable(on); });
    }
    // resize del PANEL entero con interact.js (los 4 bordes + esquinas)
    function mroWirePanel(popup) {
        if (popup.__mroInteract || typeof interact === 'undefined') return;
        popup.__mroInteract = true;
        interact(popup).resizable({
            edges: { left: true, right: true, top: true, bottom: true },
            margin: 12,
            listeners: {
                move(event) {
                    if (!mroEditingLayout) return;
                    const t = event.target;
                    t.style.width  = Math.max(280, Math.round(event.rect.width)) + 'px';
                    t.style.height = Math.max(180, Math.round(event.rect.height)) + 'px';
                    t.style.left = (Math.round((parseFloat(t.style.left) || 0) + event.deltaRect.left)) + 'px';
                    t.style.top  = (Math.round((parseFloat(t.style.top)  || 0) + event.deltaRect.top)) + 'px';
                },
                end() { if (mroEditingLayout) saveCustomLayout(); }
            }
        });
    }
    function mroEnablePanelInteract(popup, on) { mroWirePanel(popup); if (typeof interact !== 'undefined') interact(popup).resizable(on); }
    // Handles de redimension en los 4 bordes + 4 esquinas (para dar la forma que uno quiera).
    function addResizeHandles(popup) {
        if (popup.querySelector('.mro-rz')) return;
        ['n','s','e','w','ne','nw','se','sw'].forEach(dir => {
            const h = document.createElement('div');
            h.className = 'mro-rz mro-rz-' + dir;
            h.addEventListener('mousedown', (e) => {
                e.preventDefault(); e.stopPropagation();
                const sx = e.clientX, sy = e.clientY;
                const r = popup.getBoundingClientRect();
                const W = r.width, H = r.height, L = r.left, T = r.top;
                const move = (ev) => {
                    const dx = ev.clientX - sx, dy = ev.clientY - sy;
                    let w = W, hh = H, l = L, t = T;
                    if (dir.includes('e')) w = W + dx;
                    if (dir.includes('s')) hh = H + dy;
                    if (dir.includes('w')) { w = W - dx; l = L + dx; }
                    if (dir.includes('n')) { hh = H - dy; t = T + dy; }
                    if (w < 280) { if (dir.includes('w')) l = L + (W - 280); w = 280; }
                    if (hh < 180) { if (dir.includes('n')) t = T + (H - 180); hh = 180; }
                    popup.style.width = Math.round(w) + 'px';
                    popup.style.height = Math.round(hh) + 'px';
                    popup.style.left = Math.round(l) + 'px';
                    popup.style.top = Math.round(t) + 'px';
                };
                const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); saveCustomLayout(); };
                document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
            });
            popup.appendChild(h);
        });
    }
    function removeResizeHandles(popup) { popup.querySelectorAll('.mro-rz').forEach(h => h.remove()); }
    function enterEditLayout() {
        const popup = document.querySelector('.audit-popup');
        if (!popup) return;
        // Aviso amable (una vez por sesion): mejor personalizar fuera de un job.
        if (!window.__mroEditWarnShown && typeof Swal !== 'undefined') {
            window.__mroEditWarnShown = true;
            Swal.fire({
                icon: 'info',
                title: 'Before you customize',
                text: 'For the best experience, we kindly recommend customizing the layout while you are not actively reviewing a job. Rearranging and resizing takes a little time, so doing it between jobs helps avoid interrupting your review.',
                confirmButtonText: 'Got it',
                confirmButtonColor: '#2876D3'
            });
        }
        mroEditingLayout = true;
        popup.classList.add('layout-custom', 'layout-editing');
        popup.style.overflow = 'visible'; // que se vean los handles de los bordes
        mroPinPopup(popup); // left/top, sin transform ni right
        // 1) MEDIR todas las posiciones/anchos naturales ANTES de mutar. CRITICO: si medimos
        //    mientras volvemos cada bloque 'absolute' uno por uno, cada bloque que sale del flujo
        //    colapsa a los de abajo hacia arriba -> todos terminan apilados en la esquina (top:15).
        //    Por eso "Issues saltaba arriba": quedaba pegado arriba si no se arrastraba. (repro verificado)
        const pr = popup.getBoundingClientRect();
        const measured = mroLayoutBlocks().map(el => {
            const r = el.getBoundingClientRect();
            return { el, w: Math.round(r.width), l: Math.round(r.left - pr.left), t: Math.round(r.top - pr.top) };
        });
        // 2) recien ahora aplicamos posicion absoluta + ancho fijo + draggable/resize
        measured.forEach(m => {
            if (m.el.style.position !== 'absolute') {
                m.el.style.setProperty('width', m.w + 'px', 'important');
                m.el.style.position = 'absolute';
                m.el.style.left = m.l + 'px';
                m.el.style.top = m.t + 'px';
            }
            mroWireBlock(m.el); // interact.js: draggable + resizable
        });
        // 2) recien ahora damos lienzo (los bloques ya tienen ancho fijo, no se estiran)
        if ((parseInt(popup.style.width) || 0) < 520) popup.style.width = '860px';
        if ((parseInt(popup.style.height) || 0) < 520) popup.style.height = '640px';
        // barra superior con botones Listo / Reset
        if (!popup.querySelector('.mro-edit-hint')) {
            const bar = document.createElement('div');
            bar.className = 'mro-edit-hint';
            const span = document.createElement('span');
            span.textContent = 'Editando: arrastrá los bloques · redimensioná el panel desde los bordes y cada bloque desde su esquina azul · ';
            bar.appendChild(span);
            const doneBtn = document.createElement('button');
            doneBtn.type = 'button'; doneBtn.className = 'mro-hint-btn'; doneBtn.textContent = 'Listo';
            doneBtn.addEventListener('click', (ev) => { ev.stopPropagation(); exitEditLayout(); });
            bar.appendChild(doneBtn);
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button'; resetBtn.className = 'mro-hint-btn'; resetBtn.textContent = 'Reset';
            resetBtn.addEventListener('click', (ev) => { ev.stopPropagation(); resetCustomLayout(); });
            bar.appendChild(resetBtn);
            popup.insertBefore(bar, popup.firstChild);
        }
        mroEnablePanelInteract(popup, true); // interact.js: resize del panel
        mroEnableBlockInteract(true);        // interact.js: drag+resize de cada bloque
        saveCustomLayout();
    }
    function exitEditLayout() {
        const popup = document.querySelector('.audit-popup');
        if (!popup) return;
        mroEditingLayout = false;
        popup.classList.remove('layout-editing');
        const h = popup.querySelector('.mro-edit-hint'); if (h) h.remove();
        mroEnablePanelInteract(popup, false);
        mroEnableBlockInteract(false);
        saveCustomLayout();
    }
    function resetCustomLayout() {
        GM_setValue(LAYOUT_KEY, '');
        const popup = document.querySelector('.audit-popup');
        if (!popup) return;
        mroEditingLayout = false;
        const h = popup.querySelector('.mro-edit-hint'); if (h) h.remove();
        mroEnablePanelInteract(popup, false);
        mroEnableBlockInteract(false);
        // limpiar TODOS los bloques a su estado natural
        mroLayoutBlocks().forEach(el => { el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.width = ''; });
        popup.classList.remove('layout-custom', 'layout-editing');
        // limpiar el panel y re-aplicar los estilos base (vuelve a la derecha, angosto)
        popup.style.left = ''; popup.style.top = ''; popup.style.right = ''; popup.style.width = ''; popup.style.height = ''; popup.style.transform = ''; popup.style.overflow = '';
        applyContainerHardStyles(popup);
    }
    function toggleLayoutMode(e) {
        if (e && e.shiftKey) { resetCustomLayout(); return; }  // Shift+clic tambien resetea
        if (mroEditingLayout) exitEditLayout(); else enterEditLayout();
    }
    function applyLayoutMode() { applyCustomLayout(); }

    function setupToggleButtons() {
        // Use Case toggle
        const ucOvBtn = document.getElementById('ucOvBtn');
        const ucBboxBtn = document.getElementById('ucBboxBtn');
        const ucDenseBtn = document.getElementById('ucDenseBtn');
        const ucPcsBtn = document.getElementById('ucPcsBtn');
        const useCaseSelector = document.getElementById('useCaseSelector');

        const setUseCaseToggle = (val, fireChange) => {
            if (useCaseSelector) {
                useCaseSelector.value = val;
                if (fireChange) {
                    useCaseSelector.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            const activeId = val === 'denseID' ? 'ucDenseBtn'
                : (val === 'ovBbox' ? 'ucBboxBtn'
                : (val === 'pcsConceptBbox' ? 'ucPcsBtn' : 'ucOvBtn'));
            setToggleActive(activeId, ['ucOvBtn', 'ucBboxBtn', 'ucDenseBtn', 'ucPcsBtn']);
        };

        if (ucOvBtn) ucOvBtn.addEventListener('click', () => setUseCaseToggle('openVocabulary', true));
        if (ucBboxBtn) ucBboxBtn.addEventListener('click', () => setUseCaseToggle('ovBbox', true));
        if (ucDenseBtn) ucDenseBtn.addEventListener('click', () => setUseCaseToggle('denseID', true));
        if (ucPcsBtn) ucPcsBtn.addEventListener('click', () => setUseCaseToggle('pcsConceptBbox', true));
        // Initialize visual state to match current USE_CASE (without re-firing change on first load)
        setUseCaseToggle(USE_CASE.current, false);

        // Is Rework toggle
        const reworkYesBtn = document.getElementById('reworkYesBtn');
        const reworkNoBtn = document.getElementById('reworkNoBtn');
        const isReworkSelect = document.getElementById('isRework');

        const setReworkToggle = (val, fireChange) => {
            if (isReworkSelect) {
                isReworkSelect.value = val;
                if (fireChange) {
                    isReworkSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            setToggleActive(val === 'Yes' ? 'reworkYesBtn' : 'reworkNoBtn', ['reworkYesBtn', 'reworkNoBtn']);
        };

        if (reworkYesBtn) reworkYesBtn.addEventListener('click', () => { setReworkToggle('Yes', true); checkCaptureButtonState(); });
        if (reworkNoBtn) reworkNoBtn.addEventListener('click', () => { setReworkToggle('No', true); checkCaptureButtonState(); });

        // Is Defective toggle
        const defYesBtn = document.getElementById('defYesBtn');
        const defNoBtn = document.getElementById('defNoBtn');
        const defSkipBtn = document.getElementById('defSkipBtn');
        const isDefectiveSelect = document.getElementById('isDefective');

        const setDefectiveToggle = (val, fireChange) => {
            if (isDefectiveSelect) {
                isDefectiveSelect.value = val;
                if (fireChange) {
                    isDefectiveSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            const activeId = val === 'Yes' ? 'defYesBtn' : (val === 'Skipped' ? 'defSkipBtn' : 'defNoBtn');
            setToggleActive(activeId, ['defYesBtn', 'defNoBtn', 'defSkipBtn']);
        };

        if (defYesBtn) defYesBtn.addEventListener('click', () => { setDefectiveToggle('Yes', true); checkCaptureButtonState(); });
        if (defNoBtn) defNoBtn.addEventListener('click', () => { setDefectiveToggle('No', true); checkCaptureButtonState(); });
        if (defSkipBtn) defSkipBtn.addEventListener('click', () => { setDefectiveToggle('Skipped', true); checkCaptureButtonState(); });

        // Rework Status toggle
        const rsApprovedBtn = document.getElementById('rsApprovedBtn');
        const rsRejectedBtn = document.getElementById('rsRejectedBtn');
        const reworkStatusSelect = document.getElementById('reworkStatus');

        const setReworkStatusToggle = (val, fireChange) => {
            if (reworkStatusSelect) {
                reworkStatusSelect.value = val;
                if (fireChange) {
                    reworkStatusSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            setToggleActive(val === 'Approved' ? 'rsApprovedBtn' : (val === 'Rejected' ? 'rsRejectedBtn' : null), ['rsApprovedBtn', 'rsRejectedBtn']);
        };

        if (rsApprovedBtn) rsApprovedBtn.addEventListener('click', () => { setReworkStatusToggle('Approved', true); checkCaptureButtonState(); });
        if (rsRejectedBtn) rsRejectedBtn.addEventListener('click', () => { setReworkStatusToggle('Rejected', true); checkCaptureButtonState(); });

        // Rework Round +/- control
        const rrMinus = document.getElementById('rrMinus');
        const rrPlus = document.getElementById('rrPlus');
        if (rrMinus) rrMinus.addEventListener('click', () => { updateReworkRoundDisplay(currentReworkRoundValue - 1); checkCaptureButtonState(); });
        if (rrPlus) rrPlus.addEventListener('click', () => { updateReworkRoundDisplay(currentReworkRoundValue + 1); checkCaptureButtonState(); });
        // Initialize display without firing change (select already defaults to 1)
        const displayEl = document.getElementById('reworkRoundDisplay');
        if (displayEl) displayEl.textContent = currentReworkRoundValue;

        // Expose setters so other functions (clearQuick, isDefective handler, etc.) can sync the visual toggle state
        window.__mroToggleSetters = {
            setUseCaseToggle,
            setReworkToggle,
            setDefectiveToggle,
            setReworkStatusToggle,
            updateReworkRoundDisplay
        };
    }

    //function to setup all event listeners
    function setupEventListeners() {
        // Setup all the basic event listeners
        document.getElementById('captureErrorBtn').addEventListener('click', captureError);
        document.getElementById('copyFileNameBtn').addEventListener('click', copyMroFilename);
        document.getElementById('showDataBtn').addEventListener('click', showDataPreview);
        document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
        document.getElementById('uploadSpBtn').addEventListener('click', uploadToSharePoint);
        document.getElementById('changeSpFolderBtn').addEventListener('click', changeSpFolder);
        document.querySelector('.minimize-btn').addEventListener('click', minimizePopup);
        document.querySelector('.popup-icon').addEventListener('click', maximizePopup);
        document.getElementById('clearMemoryBtn').addEventListener('click', clearMemory);
        document.querySelector('.clear-job-btn').addEventListener('click', clearJob);
        // Layout angosto/ancho (horizontal), persistido por GM (localStorage esta bloqueado en Harmony)
        const _layoutBtn = document.getElementById('layoutToggleBtn');
        if (_layoutBtn) _layoutBtn.addEventListener('click', toggleLayoutMode);
        applyLayoutMode(); // restaurar la eleccion guardada

        document.querySelectorAll('input[type=number]').forEach(input => {input.addEventListener('wheel',function(e){e.preventDefault();});});

        // Wire up the toggle buttons (replaces dropdown UI for Use Case / Is Rework / Is Defective / Rework Status / Rework Round)
        setupToggleButtons();

        // F8: copy filename (same logic as button; works even if popup is minimized)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F8') {
                e.preventDefault();
                copyMroFilename();
            }
        });

        // Mejora 7A: Enter key = click Save Assessment
        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;
            const activeEl = document.activeElement;
            const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
            // Don't fire if user is typing in input/textarea
            if (tag === 'input' || tag === 'textarea') return;
            // Don't fire if SweetAlert is visible
            const swalVisible = typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible();
            if (swalVisible) return;
            const captureBtn = document.getElementById('captureErrorBtn');
            if (captureBtn && !captureBtn.disabled) {
                e.preventDefault();
                captureBtn.click();
                console.log('Save Assessment triggered via Enter key');
            }
        });

        // Mejora 3: Persist Auditor Login in localStorage (survives page refresh)
        const auditorLoginInput = document.getElementById('auditorLogin');
        if (auditorLoginInput) {
            // Restore from localStorage
            const savedAuditorLogin = localStorage.getItem('mroAuditorLogin');
            if (savedAuditorLogin) {
                auditorLoginInput.value = savedAuditorLogin;
            }
            // Save on change
            auditorLoginInput.addEventListener('input', function() {
                localStorage.setItem('mroAuditorLogin', this.value);
                checkCaptureButtonState();
            });
            auditorLoginInput.addEventListener('change', function() {
                localStorage.setItem('mroAuditorLogin', this.value);
                checkCaptureButtonState();
            });
        }

        // Persist Batch Name in localStorage (survives page refresh)
        const batchNameInputPersist = document.getElementById('batchName');
        if (batchNameInputPersist) {
            const savedBatchName = localStorage.getItem('mroBatchName');
            if (savedBatchName) {
                batchNameInputPersist.value = savedBatchName;
                // Note: the Use Case is restored from its own persisted key (mroSelectedUseCase),
                // so we do NOT auto-detect on load â€” detection runs when the QA edits the batch.
            }
            ['input', 'change'].forEach(evt => {
                batchNameInputPersist.addEventListener(evt, function() {
                    localStorage.setItem('mroBatchName', this.value);
                    // v3.3.2: auto-switch Use Case from the batch name (with override hint)
                    applyUseCaseDetectionFromBatch(this.value);
                });
            });
        }

        // Date: always auto-fill with today's date on load, so it never has to be set manually
        // and it rolls over automatically day to day. Work Week is recalculated to match.
        const dateInputAutoFill = document.getElementById('date');
        if (dateInputAutoFill) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            dateInputAutoFill.value = todayStr;
            const workWeekInputAutoFill = document.getElementById('workWeek');
            if (workWeekInputAutoFill) {
                const calculatedWW = calculateWorkWeekFromDate(todayStr);
                if (calculatedWW) workWeekInputAutoFill.value = calculatedWW;
            }
        }

        // Total Labels +/- buttons (Dense ID / OV Bbox)
        const labelMinusBtn = document.getElementById('labelMinus');
        const labelPlusBtn = document.getElementById('labelPlus');
        const stepLabelCount = (delta) => {
            const labelCountInput = document.getElementById('labelCount');
            if (!labelCountInput) return;
            const currentRaw = labelCountInput.value.trim();
            let currentVal = 0;
            if (/^\s*\d+(\s*\+\s*\d+)*\s*$/.test(currentRaw)) {
                currentVal = currentRaw.split(/\s*\+\s*/).map(n => parseInt(n.trim(), 10)).reduce((a, b) => a + b, 0);
            } else {
                currentVal = parseInt(currentRaw, 10);
                if (isNaN(currentVal)) currentVal = 0;
            }
            currentVal = Math.max(0, currentVal + delta);
            labelCountInput.value = currentVal.toString();
            labelCountInput.dispatchEvent(new Event('input', { bubbles: true }));
            labelCountInput.dispatchEvent(new Event('change', { bubbles: true }));
        };
        if (labelMinusBtn) labelMinusBtn.addEventListener('click', () => stepLabelCount(-1));
        if (labelPlusBtn) labelPlusBtn.addEventListener('click', () => stepLabelCount(1));

        // Total Labels keyboard shortcuts: + / - (Dense ID / OV Bbox)
        // Only fires when the QA is NOT typing in a field, so writing sums like "4+4"
        // inside the Total Labels input keeps working normally.
        document.addEventListener('keydown', function(e) {
            if (e.key !== '+' && e.key !== '-') return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (!usesTotalLabels()) return;

            const totalLabelsGroup = document.getElementById('totalLabelsGroup');
            if (!totalLabelsGroup || totalLabelsGroup.style.display === 'none') return;

            const activeEl = document.activeElement;
            const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (activeEl && activeEl.isContentEditable === true) return;

            const swalVisible = typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible();
            if (swalVisible) return;

            e.preventDefault();
            stepLabelCount(e.key === '+' ? 1 : -1);
        });

        // Use case selector (kept for internal state sync; UI now driven by toggle buttons)
        const useCaseSelector = document.getElementById('useCaseSelector');
        if (useCaseSelector) {
            useCaseSelector.value = USE_CASE.current;
            useCaseSelector.addEventListener('change', function() {
                USE_CASE.current = VALID_USE_CASES.indexOf(this.value) !== -1 ? this.value : 'openVocabulary';
                currentAuditData.usecase = getUseCaseLabel();
                try { localStorage.setItem(USE_CASE_STORAGE_KEY, USE_CASE.current); } catch (e) {}

                // Keep the toggle buttons in sync (covers programmatic changes to the select)
                if (window.__mroToggleSetters) {
                    window.__mroToggleSetters.setUseCaseToggle(USE_CASE.current, false);
                }

                // Harmony: si el QA cambia el Use Case a mano, el batch (auto-derivado) sigue al
                // nuevo Use Case -> la decision sigue al Use Case, no al reves.
                if (mroIsHarmonyReviewTask()) {
                    const _ev = readHarmonyTimeline();
                    const _bEl = document.getElementById('batchName');
                    if (_ev.length && _bEl && _bEl.getAttribute('data-user-modified') !== 'true') {
                        const _b = hPcsBatchFromTimeline(_ev, batchPrefixForUseCase(USE_CASE.current));
                        if (_b && _bEl.value !== _b) { _bEl.value = _b; _bEl.dispatchEvent(new Event('change', { bubbles: true })); }
                    }
                }

                // Mejora 4: Toggle Total Labels visibility (+ OV Bbox default of 0)
                updateTotalLabelsVisibility();

                // If defective section is currently visible, swap the defective YES content in-place
                const isDefectiveValue = document.getElementById('isDefective')?.value;
                if (isDefectiveValue === 'Yes') {
                    renderDefectiveYesSection();
                    attachDefectiveYesListeners();
                }
                checkCaptureButtonState();
            });

            try {
                const savedUseCase = localStorage.getItem(USE_CASE_STORAGE_KEY);
                if (savedUseCase && savedUseCase !== useCaseSelector.value) {
                    useCaseSelector.value = savedUseCase;
                    useCaseSelector.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.__mroToggleSetters) {
                        window.__mroToggleSetters.setUseCaseToggle(savedUseCase, false);
                    }
                }
            } catch (e) {}
        }

        // Setup the isDefective change handler with enhanced debugging
        const isDefectiveSelect = document.getElementById('isDefective');
        if (!isDefectiveSelect) {
            console.error('isDefective select element not found');
            return;
        }

        // Setup the isRework change handler with enhanced debugging
        const isReworkSelect = document.getElementById('isRework');
        if (!isReworkSelect) {
            console.error('isRework select element not found');
            return;
        }

        // Reset counter when Batch Name changes
        const batchNameInput = document.getElementById('batchName');
        if (batchNameInput) {
            ['input', 'change'].forEach(evt => {
                batchNameInput.addEventListener(evt, () => {
                    const currentContextKey = getCurrentMroContextKey();
                    if (currentContextKey !== lastCopiedContextKey) {
                        resetMroCopyStateForContext(currentContextKey);
                    }
                    clearCopyFilenameError();
                });
            });
        }

        // Reset counter when Rework Round changes (when visible/used)
        const reworkRoundSelect = document.getElementById('reworkRound');
        if (reworkRoundSelect) {
            reworkRoundSelect.addEventListener('change', () => {
                const currentContextKey = getCurrentMroContextKey();
                if (currentContextKey !== lastCopiedContextKey) {
                    resetMroCopyStateForContext(currentContextKey);
                }
                clearCopyFilenameError();
            });
        }

        // Clear copy errors when Associate Login or Is Rework changes
        const associateLoginInput = document.getElementById('associateLogin');
        if (associateLoginInput) {
            ['input', 'change'].forEach(evt => associateLoginInput.addEventListener(evt, clearCopyFilenameError));
        }
        isReworkSelect.addEventListener('change', () => {
            const currentContextKey = getCurrentMroContextKey();
            if (currentContextKey !== lastCopiedContextKey) {
                resetMroCopyStateForContext(currentContextKey);
            }
            clearCopyFilenameError();
        });

        //ensure that the multiple select is properly initialized and responding to changes
        const correctLabelsSelect = document.getElementById('correctLabels');
        if (correctLabelsSelect) {
            correctLabelsSelect.addEventListener('change', function() {
                console.log('Correct labels changed:',
                    Array.from(this.selectedOptions).map(opt => opt.value));
                checkCaptureButtonState();
            });
        } else {
            console.error('Correct labels select not found');
        }

        //ensure that the multiple select is properly initialized and responding to changes
        const incorrectLabelsSelect = document.getElementById('incorrectLabels');
        if (incorrectLabelsSelect) {
            incorrectLabelsSelect.addEventListener('change', function() {
                console.log('Incorrect labels changed:',
                    Array.from(this.selectedOptions).map(opt => opt.value));
                checkCaptureButtonState();
            });
        } else {
            console.error('Incorrect labels select not found');
        }

        //ensure that the multiple select is properly initialized and responding to changes
        const missingLabelsSelect = document.getElementById('missingLabels');
        if (missingLabelsSelect) {
            missingLabelsSelect.addEventListener('change', function() {
                console.log('Missing labels changed:',
                    Array.from(this.selectedOptions).map(opt => opt.value));
                checkCaptureButtonState();
            });
        } else {
            console.error('Missing labels select not found');
        }

        //listen if isdefective is yes or no, based on this hide or dont hide ec group
        // Store previous value to detect when changing from "Skipped" to other options
        // Use window scope to make it accessible for reset between jobs
        window.previousIsDefectiveValue = isDefectiveSelect.value;

        isDefectiveSelect.addEventListener('change', function() {
            console.log('IsDefective change event triggered');
            const currentValue = this.value;
            const previousValue = window.previousIsDefectiveValue || 'Select..';

            const errorClassificationGroup = document.querySelector('.error-classification-group');
            if (!errorClassificationGroup) {
                console.error('Error classification group element not found');
                return;
            }

            console.log('Current isDefective value:', currentValue);
            console.log('Previous isDefective value:', previousValue);
            console.log('Error classification group current display:', errorClassificationGroup.style.display);

            // Handle transition from "Skipped" to "Yes" or "No": clear auto-set values
            // IMPORTANT: Only reset if we're actually transitioning FROM Skipped in the CURRENT job
            // Check that the current form state matches a Skipped job (Total Labels = 0, IsRework = No)
            // This prevents side effects from previous jobs
            const labelCountInput = document.getElementById('labelCount');
            const isReworkSelect = document.getElementById('isRework');
            const isActuallySkippedContext = labelCountInput && labelCountInput.value === '0' &&
                                            isReworkSelect && isReworkSelect.value === 'No';

            if (previousValue === 'Skipped' && (currentValue === 'Yes' || currentValue === 'No') && isActuallySkippedContext) {

                // Clear Total Labels (reset to the use case default: empty, or 0 for OV Bbox)
                if (labelCountInput && labelCountInput.value === '0') {
                    labelCountInput.value = getDefaultTotalLabels();
                    labelCountInput.dispatchEvent(new Event('input', { bubbles: true }));
                    labelCountInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Reset IsRework to default "Select.."
                if (isReworkSelect && isReworkSelect.value === 'No') {
                    isReworkSelect.value = 'Select..';
                    // Trigger change event to update rework group visibility
                    isReworkSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.__mroToggleSetters) {
                        setToggleActive(null, ['reworkYesBtn', 'reworkNoBtn']);
                    }
                }
            }

            // Keep the toggle button visual state in sync (covers programmatic changes to the select)
            if (window.__mroToggleSetters) {
                const activeId = currentValue === 'Yes' ? 'defYesBtn' : (currentValue === 'Skipped' ? 'defSkipBtn' : (currentValue === 'No' ? 'defNoBtn' : null));
                setToggleActive(activeId, ['defYesBtn', 'defNoBtn', 'defSkipBtn']);
            }

            if (currentValue === 'Yes') {
                // Ensure correct defective YES UI is mounted for current use case
                renderDefectiveYesSection();
                attachDefectiveYesListeners();

                console.log('Attempting to show error classification group');
                errorClassificationGroup.style.display = 'block'; // igual que rework-group (que funciona)
                errorClassificationGroup.classList.remove('hideIt');
                mroApplySavedPos(errorClassificationGroup); // volver a su lugar del layout custom (si aplica)

                // Force a reflow
                void errorClassificationGroup.offsetHeight;

                console.log('After showing:', {
                    display: errorClassificationGroup.style.display,
                    visibility: errorClassificationGroup.style.visibility,
                    classList: errorClassificationGroup.classList.toString()
                });

            } else {
                console.log('Attempting to hide error classification group');
                errorClassificationGroup.style.display = 'none';
                errorClassificationGroup.classList.add('hideIt');
            }

            // Handle "Skipped" case: auto-set Total Labels to 0 and IsRework to "No"
            if (currentValue === 'Skipped') {
                const labelCountInput = document.getElementById('labelCount');
                const isReworkSelect = document.getElementById('isRework');
                const reworkGroup = document.querySelector('.rework-group');

                if (labelCountInput) {
                    labelCountInput.value = '0';
                    // Trigger events to update validation
                    labelCountInput.dispatchEvent(new Event('input', { bubbles: true }));
                    labelCountInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                if (isReworkSelect) {
                    isReworkSelect.value = 'No';
                    // Trigger change event to hide rework group
                    isReworkSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.__mroToggleSetters) {
                        setToggleActive('reworkNoBtn', ['reworkYesBtn', 'reworkNoBtn']);
                    }
                }

                // Ensure rework group is hidden
                if (reworkGroup) {
                    reworkGroup.style.display = 'none';
                    reworkGroup.classList.add('hideIt');
                }
            }

            // Update previous value for next change
            window.previousIsDefectiveValue = currentValue;

            // Check if the elements are in the DOM
            console.log('ErrorType select exists:', !!document.getElementById('errorType'));
            console.log('RootCause select exists:', !!document.getElementById('rootCause'));

            checkCaptureButtonState();
        });

        //listen if isrework is yes or no, based on this hide or dont hide rework group
        isReworkSelect.addEventListener('change', function() {
            console.log('IsRework change event triggered');

            const reworkGroup = document.querySelector('.rework-group');
            if (!reworkGroup) {
                console.error('Rework group element not found');
                return;
            }

            console.log('Current isRework value:', this.value);
            console.log('Rework group current display:', reworkGroup.style.display);

            // Keep the toggle button visual state in sync (covers programmatic changes to the select)
            if (window.__mroToggleSetters) {
                const activeId = this.value === 'Yes' ? 'reworkYesBtn' : (this.value === 'No' ? 'reworkNoBtn' : null);
                setToggleActive(activeId, ['reworkYesBtn', 'reworkNoBtn']);
            }

            if (this.value === 'Yes') {
                console.log('Attempting to show rework group');
                reworkGroup.style.display = 'block';
                reworkGroup.classList.remove('hideIt');
                mroApplySavedPos(reworkGroup); // volver a su lugar del layout custom (si aplica)

                // Force a reflow
                void reworkGroup.offsetHeight;

                console.log('After showing:', {
                    display: reworkGroup.style.display,
                    visibility: reworkGroup.style.visibility,
                    classList: reworkGroup.classList.toString()
                });

            } else {
                console.log('Attempting to hide rework group');
                reworkGroup.style.display = 'none';
                reworkGroup.classList.add('hideIt');
            }

            // Check if the elements are in the DOM
            console.log('Rework Round exists:', !!document.getElementById('reworkRound'));
            console.log('Rework Status exists:', !!document.getElementById('reworkStatus'));

            checkCaptureButtonState();
        });

        // Add input and change event listeners for all relevant fields
        ['batchName','date','workWeek','reworkRound','reworkStatus','labelCount','totalConcepts', 'associateLogin', 'errorType', 'rootCause','correctLabels','incorrectLabels','missingLabels', 'identifiableObjects'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                ['input', 'change'].forEach(eventType => {
                    element.addEventListener(eventType, () => {
                        console.log(`${id} ${eventType} event triggered`);
                        checkCaptureButtonState();
                    });
                });
            }
        });

        // Add specific event listener for date to auto-calculate work week
        const dateInput = document.getElementById('date');
        if (dateInput) {
            // Listen for 'change' event when user selects a date from the calendar
            dateInput.addEventListener('change', function() {
                // Get the selected date value
                const selectedDate = this.value;
                console.log('Date selected:', selectedDate);

                // Calculate work week from the selected date
                const calculatedWorkWeek = calculateWorkWeekFromDate(selectedDate);

                // If we got a valid work week, update the work week input field
                if (calculatedWorkWeek) {
                    const workWeekInput = document.getElementById('workWeek');
                    if (workWeekInput) {
                        workWeekInput.value = calculatedWorkWeek;
                        console.log('Auto-calculated work week:', calculatedWorkWeek);
                        // Trigger validation since work week field changed
                        checkCaptureButtonState();
                    }
                }
            });
        }

        // Initialize Smart Total Labels
        applySmartTotalLabels();

        // Initial state check
        const eg = document.querySelector('.error-classification-group');
        const rg = document.querySelector('.rework-group');
        console.log('Initial setup complete. Current form state:', {
            isDefectiveValue: isDefectiveSelect.value,
            errorClassificationVisible: eg ? eg.style.display : 'n/a',
            isReworkValue: isReworkSelect.value,
            reworkVisible: rg ? rg.style.display : 'n/a'
        });
    }

    //function to disable inputs and buttons if the image ID is Not found.
    function updateElementState(elementId, shouldBeReadonly) {
        const element = document.getElementById(elementId);
        if (!element) return;
        if (shouldBeReadonly) {
            element.classList.add('readonly-state');
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.setAttribute('readonly', 'readonly');
            } else if (element.tagName === 'BUTTON' || element.tagName === 'SELECT') {
                element.disabled = true;
            }
        } else {
            element.classList.remove('readonly-state');
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.removeAttribute('readonly');
            } else if (element.tagName === 'BUTTON' || element.tagName === 'SELECT') {
                element.disabled = false;
            }
        }
    }

    //function that checks if the Save Assessment button should be enabled
    function checkCaptureButtonState() {
        const imageId = document.getElementById('imageId').value;

        const batchName = document.getElementById('batchName').value;
        const workWeek = document.getElementById('workWeek').value;
        const isRework = document.getElementById('isRework').value;

        const reworkRound = document.getElementById('reworkRound').value;
        const reworkStatus = document.getElementById('reworkStatus').value;

        const associateLogin = document.getElementById('associateLogin').value;
        const totalLabels = document.getElementById('labelCount').value;
        const auditorLoginValue = document.getElementById('auditorLogin') ? document.getElementById('auditorLogin').value.trim() : '';

        const isDefective = document.getElementById('isDefective').value;

        const correctLabelsEl = document.getElementById('correctLabels');
        const incorrectLabelsEl = document.getElementById('incorrectLabels');
        const missingLabelsEl = document.getElementById('missingLabels');

        const selectedLabels = correctLabelsEl ? Array.from(correctLabelsEl.selectedOptions).map(option => option.value) : [];
        const selectedLabels2 = incorrectLabelsEl ? Array.from(incorrectLabelsEl.selectedOptions).map(option => option.value) : [];
        const selectedLabels3 = missingLabelsEl ? Array.from(missingLabelsEl.selectedOptions).map(option => option.value) : [];

        const errorTypeEl = document.getElementById('errorType');
        const rootCauseEl = document.getElementById('rootCause');
        const errorType = errorTypeEl ? errorTypeEl.value : 'Select Error Classification';
        const rootCause = rootCauseEl ? rootCauseEl.value : 'Select Root Cause';
        const captureButton = document.getElementById('captureErrorBtn');

        if (correctLabelsEl) {
            console.log('Correct labels state:', Array.from(correctLabelsEl.selectedOptions).map(opt => opt.value));
        }
        if (incorrectLabelsEl) {
            console.log('Incorrect labels state:', Array.from(incorrectLabelsEl.selectedOptions).map(opt => opt.value));
        }
        if (missingLabelsEl) {
            console.log('Missing labels state:', Array.from(missingLabelsEl.selectedOptions).map(opt => opt.value));
        }

        console.log('Checking fields:', {
            imageId,
            batchName,
            workWeek,
            isRework,
            reworkRound,
            reworkStatus,
            associateLogin,
            totalLabels,
            auditorLogin: auditorLoginValue,
            isDefective,
            selectedLabels,
            selectedLabels2,
            selectedLabels3,
            errorType,
            rootCause
        });

        let shouldEnable = false;
        let defectiveEnable = false;
        let reworkEnable = false;

        // Mejora 4: Total Labels not required for OV Segmentation (required for Dense ID / OV Bbox)
        const totalLabelsRequired = usesTotalLabels();
        const totalLabelsOk = totalLabelsRequired ? (totalLabels && totalLabels.length > 0) : true;
        // PCS / XDOF: Total Concepts es OBLIGATORIO (no dejar pasar un job con ese dato pendiente).
        const totalConceptsEl = document.getElementById('totalConcepts');
        const totalConceptsOk = !usesMultiIssues() || (!!totalConceptsEl && totalConceptsEl.value.trim().length > 0);

        // Check if basic fields are filled (Mejora 3: auditorLogin required, Mejora 4: totalLabels conditional)
        const basicFieldsFilled = imageId &&
                                batchName.length > 0 &&
                                workWeek.length > 0  &&
                                workWeek >= 1 &&
                                workWeek <= 53 &&
                                isRework !== 'Select..' &&
                                totalLabelsOk &&
                                totalConceptsOk &&
                                associateLogin.length > 0 &&
                                auditorLoginValue.length > 0 &&
                                isDefective !== 'Select..';


        if (isRework === 'No') {
            reworkEnable = basicFieldsFilled;
        } else if (isRework === 'Yes') {
            console.log('-------------------\n');

            console.log(basicFieldsFilled);
            console.log(reworkStatus !== 'Select..');

            console.log('-------------------\n');

            reworkEnable = basicFieldsFilled &&
                        reworkStatus !== 'Select..';

        }

        if (isDefective === 'No') {
            defectiveEnable = basicFieldsFilled;
        } else if (isDefective === 'Yes') {
            if (usesMultiIssues()) {
                const pcsSel = document.getElementById('pcsIssues');
                defectiveEnable = basicFieldsFilled && !!pcsSel && pcsSel.selectedOptions.length > 0;
            } else {
                defectiveEnable = basicFieldsFilled &&
                            errorType !== 'Select Error Classification' &&
                            rootCause !== 'Select Root Cause';
            }
        } else if (isDefective === 'Skipped') {
            defectiveEnable = basicFieldsFilled;
        }

        shouldEnable = defectiveEnable && reworkEnable;

        console.log('Button state:', {
            basicFieldsFilled,
            isRework,
            isDefective,
            defectiveEnable,
            reworkEnable,
            shouldEnable
        });

        if (captureButton) {
            captureButton.disabled = !shouldEnable;
            captureButton.style.opacity = shouldEnable ? '1' : '0.5';
            captureButton.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
        }
    }

    //async function that captures the error, this is trigerred by the save assessment btn
    async function captureError() {
        const imageId = document.getElementById('imageId').value;

        const batchName = document.getElementById('batchName').value.trim();
        const workWeek = document.getElementById('workWeek').value;
        let isRework = document.getElementById('isRework').value;
        const reworkRound = document.getElementById('reworkRound').value;
        let reworkStatus = document.getElementById('reworkStatus').value;

        const associateLogin = formatText(document.getElementById('associateLogin').value);
        let totalLabels = document.getElementById('labelCount').value;
        // PCS / XDOF: numero de conceptos del job (campo manual nuevo).
        const totalConceptsEl = document.getElementById('totalConcepts');
        const totalConcepts = (usesMultiIssues() && totalConceptsEl) ? totalConceptsEl.value.trim() : '';

        // Mejora 3: Read auditor login from form field
        const auditorLoginValue = document.getElementById('auditorLogin') ? document.getElementById('auditorLogin').value.trim() : '';

        const isDefective = document.getElementById('isDefective').value;

        // PCS / XDOF (Harmony): SPL (AA del timeline, QA del cronometro) +
        // Rework Status desde el radio de decision del review.
        let pcsAaSeconds = null, pcsQaSeconds = null;
        if (usesMultiIssues()) {
            pcsAaSeconds = (harmonyAaSeconds != null && !isNaN(harmonyAaSeconds)) ? harmonyAaSeconds : null;
            pcsQaSeconds = (harmonyQaStartMs != null) ? Math.max(0, Math.round((Date.now() - harmonyQaStartMs) / 1000)) : null;
            if (isRework === 'Yes') {
                const decided = hReworkStatusFromAction(harmonyDecisionValue());
                if (decided && window.__mroToggleSetters) {
                    window.__mroToggleSetters.setReworkStatusToggle(decided, true);
                    reworkStatus = decided;
                }
            }
        }

        // Force values when isDefective is "Skipped"
        if (isDefective === 'Skipped') {
            totalLabels = '0';
            isRework = 'No';
        }

        // Mejora 4: Force Total Labels = 0 for OV Segmentation (no field) and for OV Bbox (default 0)
        if (USE_CASE.current !== 'denseID' && (!totalLabels || totalLabels === '')) {
            totalLabels = '0';
        }
        const selectedLabels = document.getElementById('correctLabels') ? Array.from(document.getElementById('correctLabels').selectedOptions)
                            .map(option => option.value.trim())
                            .filter(value => value !== '')
                            .join(', ') : '';
        const selectedLabels2 = document.getElementById('incorrectLabels') ? Array.from(document.getElementById('incorrectLabels').selectedOptions)
                            .map(option => option.value.trim())
                            .filter(value => value !== '')
                            .join(', ') : '';
        const selectedLabels3 = document.getElementById('missingLabels') ? Array.from(document.getElementById('missingLabels').selectedOptions)
                            .map(option => option.value.trim())
                            .filter(value => value !== '')
                            .join(', ') : '';
        let errorType = document.getElementById('errorType') ? document.getElementById('errorType').value : 'Select Error Classification';
        let rootCause = document.getElementById('rootCause') ? document.getElementById('rootCause').value : 'Select Root Cause';

        // PCS / XDOF: del multi-select -> Error Classification = categorias (unidas), Root Cause = issues (unidos).
        if (usesMultiIssues()) {
            const picked = readPcsIssues();
            errorType = picked.categories.join(', ');
            rootCause = picked.rootCauses.join(', ');
        }

        //lets validate and see if the options are being selected
        const selectElement = document.getElementById('correctLabels');
        const selectedOptions = selectElement ? Array.from(selectElement.selectedOptions) : [];
        console.log('Selected options correct:', selectedOptions.map(opt => opt.value));
        console.log('Selected labels string correct:', selectedLabels);
        //validate and see if the options are being selected
        const selectElement2 = document.getElementById('incorrectLabels');
        const selectedOptions2 = selectElement2 ? Array.from(selectElement2.selectedOptions) : [];
        console.log('Selected options incorrect:', selectedOptions2.map(opt => opt.value));
        console.log('Selected labels string incorrect:', selectedLabels2);
        //validate and see if the options are being selected
        const selectElement3 = document.getElementById('missingLabels');
        const selectedOptions3 = selectElement3 ? Array.from(selectElement3.selectedOptions) : [];
        console.log('Selected options incorrect:', selectedOptions3.map(opt => opt.value));
        console.log('Selected labels string incorrect:', selectedLabels3);


        // Basic validation
        if (!imageId || isRework === 'Select..' || !batchName || !workWeek || !associateLogin || isDefective === 'Select..' || !auditorLoginValue) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Please fill in all required fields (Image ID, Batch Name, Work Week, Is Rework, Associate Login, Auditor Login, and Is Defective)",
                });
            return;
        }
        // PCS / XDOF: Total Concepts obligatorio.
        if (usesMultiIssues() && !totalConcepts) {
            Swal.fire({ icon: "error", title: "Oops...", text: "Please fill in Total Concepts before saving." });
            return;
        }

        // Mejora 4: For Dense ID, Total Labels is required
        if (USE_CASE.current === 'denseID' && (!totalLabels || totalLabels === '')) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Please fill in Total Labels (required for Dense ID)",
            });
            return;
        }

        // Look up manager based on associate login
        const manager = getManagerFromLogin(associateLogin);

        // Store the assessment data
        currentAuditData = {
            imageId: imageId,
            batchName: batchName,
            workWeek: workWeek,
            isRework: isRework,
            reworkRound: isRework === 'Yes' ? reworkRound : 0,
            reworkStatus: isRework === 'Yes' ? reworkStatus : 'N/A',
            associateLogin: associateLogin,
            manager: manager,
            labelCount: totalLabels,
            isDefective: isDefective,
            selectedLabels: (isDefective === 'Yes' || isDefective === 'No') ? (selectedLabels === '' ? 'N/A' : selectedLabels) : 'N/A',
            selectedLabels2: (isDefective === 'Yes' || isDefective === 'No') ? (selectedLabels2 === '' ? 'N/A' : selectedLabels2) : 'N/A',
            selectedLabels3: (isDefective === 'Yes' || isDefective === 'No') ? (selectedLabels3 === '' ? 'N/A' : selectedLabels3) : 'N/A',
            errorClassification: isDefective === 'Yes' ? errorType : 'N/A',
            rootCause: isDefective === 'Yes' ? rootCause : 'N/A',
            usecase: currentAuditData.usecase,
            auditor: auditorLoginValue, // Mejora 3: dynamic from form field
            jobURL: window.location.href,
            aaSeconds: pcsAaSeconds,   // PCS: SPL AA (segundos) o null
            qaSeconds: pcsQaSeconds,   // PCS: SPL QA (segundos) o null
            totalConcepts: totalConcepts, // PCS: # de conceptos del job
            timestamp: new Date().toISOString()
        };

        // Save and update
        await saveCurrentAudit();

        console.log('Saved audit data:', currentAuditData);
    }

    //function to minimize the popup
    function minimizePopup() {
        document.querySelector('.audit-popup').style.display = 'none';
        document.querySelector('.popup-icon').style.display = 'flex';
    }

    //function to maximize the popup
    function maximizePopup() {
        document.querySelector('.audit-popup').style.display = 'block';
        document.querySelector('.popup-icon').style.display = 'none';
    }

    //function to clear the stored data in memory
    // ==== Job Counter (visible count only, no time tracking) ====
    function updateJobCounterDisplay() {
        const el = document.getElementById('jobCounterDisplay');
        if (el) el.textContent = jobCounter;
    }

    // Only counts each imageId once
    function incrementJobCounter(imageId) {
        const counted = GM_getValue('countedJobs', []);
        if (counted.includes(imageId)) return;
        counted.push(imageId);
        GM_setValue('countedJobs', counted);
        jobCounter++;
        GM_setValue('jobCounter', jobCounter);
        updateJobCounterDisplay();
    }

    function resetJobCounter() {
        GM_setValue('jobCounter', 0);
        GM_setValue('countedJobs', []);
        jobCounter = 0;
        updateJobCounterDisplay();
    }

    function clearMemory() {
        Swal.fire({
            title: "Are you sure you want to clear all saved audit data?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#2876D3",
            cancelButtonColor: "#0D1216",
            confirmButtonText: "Yes, delete it!"
          }).then((result) => {
            if (result.isConfirmed) {
                //erase all audit data saved in memory
                GM_setValue('audits', []);
                resetJobCounter();

              Swal.fire({
                title: "Deleted!",
                text: "Memory cleared successfully!",
                icon: "success"
              });
            }
        });

    }

    function formatText(text){
        try {
            let formatted = text.toLowerCase();
            formatted = formatted.trim();
            return formatted;

        } catch (error) {
            console.log("Error: ", error);
        }
    }

    // Smart Total Labels: allows inline sum expressions (e.g., "18+9+1+1")
    // When user presses Enter or field loses focus, calculates and replaces with the sum
    function applySmartTotalLabels() {
        const labelCountInput = document.getElementById('labelCount');
        if (!labelCountInput) {
            return;
        }

        let previousValue = '';

        // Store previous value when field gains focus
        labelCountInput.addEventListener('focus', function() {
            previousValue = this.value || '';
        });

        // Function to validate and calculate sum
        function processExpression() {
            const currentValue = labelCountInput.value.trim();

            // Empty string: allow it, do NOT restore previous value
            // The validation system will handle empty field validation separately
            // (OV Bbox falls back to its default of 0 instead of staying empty)
            if (currentValue === '') {
                // Clear the field and trigger events for validation
                labelCountInput.value = getDefaultTotalLabels();
                labelCountInput.dispatchEvent(new Event('input', { bubbles: true }));
                labelCountInput.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            // Validate expression: only digits and '+' signs, with optional spaces
            // Pattern: one or more digits, optionally followed by (space + space + digits) repeated
            const validPattern = /^\s*\d+(\s*\+\s*\d+)*\s*$/;

            if (!validPattern.test(currentValue)) {
                // Invalid expression: revert to previous value (only if there was text entered)
                labelCountInput.value = previousValue;

                // Optional: subtle red border animation (300ms)
                labelCountInput.style.borderColor = '#ff4444';
                labelCountInput.style.transition = 'border-color 0.3s';
                setTimeout(() => {
                    labelCountInput.style.borderColor = '';
                    labelCountInput.style.transition = '';
                }, 300);
                return;
            }

            // Valid expression: calculate sum
            const numbers = currentValue.split(/\s*\+\s*/).map(str => parseInt(str.trim(), 10));
            const sum = numbers.reduce((a, b) => a + b, 0);

            // Replace field value with the sum
            labelCountInput.value = sum.toString();

            // Update previous value for next operation
            previousValue = sum.toString();

            // Trigger existing input/change events to maintain validation logic
            labelCountInput.dispatchEvent(new Event('input', { bubbles: true }));
            labelCountInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Listen for Enter key
        labelCountInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                processExpression();
            }
        });

        // Listen for blur (field loses focus)
        labelCountInput.addEventListener('blur', function() {
            processExpression();
        });
    }

    //general function to hide the selection of correct, incorrect, missing, error class, and root cause
    function hideSubMenu(){
        const errorClassificationGroup = document.querySelector('.error-classification-group');
            if (errorClassificationGroup) {
                console.log('Hiding error classification group');
                errorClassificationGroup.style.display = 'none';
                errorClassificationGroup.classList.add('hideIt');
            }

        const reworkGroup = document.querySelector('.rework-group');
            if (reworkGroup) {
                console.log('Hiding rework group');
                reworkGroup.style.display = 'none';
                reworkGroup.classList.add('hideIt');
            }

    }

    //general function to disable the save button
    function disableSaveBtn(){
        const captureButton = document.getElementById('captureErrorBtn');
            if (captureButton) {
                captureButton.disabled = true;
                captureButton.style.opacity = '0.5';
                captureButton.style.cursor = 'not-allowed';
            }
    }

    //general function to clear all entries

    function clearBatch(){
        document.getElementById('batchName').value = '';
        document.getElementById('date').value = '';
        document.getElementById('workWeek').value = '';
        const batchHint = document.getElementById('batchHint');
        if (batchHint) batchHint.textContent = '';
    }

    function clearQuick(){
        document.getElementById('isRework').value = 'Select..';
        document.getElementById('reworkRound').value = 1;
        document.getElementById('reworkStatus').value = 'Select..';

        // Reset toggle-button visuals to match the cleared selects
        if (window.__mroToggleSetters) {
            setToggleActive(null, ['reworkYesBtn', 'reworkNoBtn']);
            setToggleActive(null, ['rsApprovedBtn', 'rsRejectedBtn']);
            updateReworkRoundDisplay(1);
        }

        document.getElementById('associateLogin').value = '';
        // Mejora 6: Reset user-modified flag for associate login
        const assocEl = document.getElementById('associateLogin');
        if (assocEl) assocEl.removeAttribute('data-user-modified');

        document.getElementById('labelCount').value = getDefaultTotalLabels();
        document.getElementById('isDefective').value = 'Select..';
        if (window.__mroToggleSetters) {
            setToggleActive(null, ['defYesBtn', 'defNoBtn', 'defSkipBtn']);
        }
        // NOTE: Auditor Login (#auditorLogin) is NOT cleared here Ã¢â‚¬" persists via sessionStorage (Mejora 3)

        // reset defective YES UI values if currently mounted
        const identifiableObjectsInput = document.getElementById('identifiableObjects');
        if (identifiableObjectsInput) {
            identifiableObjectsInput.value = '';
        }

        const correctLabelsEl = document.getElementById('correctLabels');
        const incorrectLabelsEl = document.getElementById('incorrectLabels');
        const missingLabelsEl = document.getElementById('missingLabels');

        if (USE_CASE.current === 'denseID') {
            // Dense ID: clear options (they are repopulated by identifiableObjects)
            if (correctLabelsEl) correctLabelsEl.innerHTML = '';
            if (incorrectLabelsEl) incorrectLabelsEl.innerHTML = '';
            if (missingLabelsEl) missingLabelsEl.selectedIndex = -1;
            const cl = document.getElementById('correctLabelsLabel');
            const il = document.getElementById('incorrectLabelsLabel');
            if (cl) cl.textContent = 'Correct Objects';
            if (il) il.textContent = 'Incorrect Objects';
        } else {
            // Open Vocabulary: keep original behavior
            if (correctLabelsEl) correctLabelsEl.selectedIndex = -1;
            if (incorrectLabelsEl) incorrectLabelsEl.selectedIndex = -1;
            if (missingLabelsEl) missingLabelsEl.selectedIndex = -1;
        }

        const errorTypeEl = document.getElementById('errorType');
        const rootCauseEl = document.getElementById('rootCause');
        if (errorTypeEl) errorTypeEl.value = 'Select Error Classification';
        // v3.3.2: OV Seg and Dense ID have a dependent Root Cause list â€” reset it back to
        // just the placeholder; other use cases only need the value reset.
        if (getRootCauseMapForUseCase()) {
            populateDependentRootCauses('Select Error Classification');
        } else if (rootCauseEl) {
            rootCauseEl.value = 'Select Root Cause';
        }
        updateDefectiveNote();

        // Reset previousIsDefectiveValue to prevent side effects from previous jobs
        if (window.previousIsDefectiveValue !== undefined) {
            window.previousIsDefectiveValue = 'Select..';
        }

        // Reset copy filename state for next job/context
        resetMroCopyStateForContext(getCurrentMroContextKey());
        clearCopyFilenameError();
    }

    //function that validates if the person really wants to clear the current job data
    function clearJob() {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#2876D3",
            cancelButtonColor: "#0D1216",
            confirmButtonText: "Yes, delete it!"
          }).then((result) => {
            if (result.isConfirmed) {
                //erase the information present in the inputs
                clearBatch();
                clearQuick();

                Swal.fire({
                    title: "Deleted!",
                    text: "Your audit data has been deleted.",
                    icon: "success"
                });

                //here hide again the error class and all the sub menu
                hideSubMenu();

            }
        });
    }

    //function to set visual elements to the update element state, where they are enabled or disabled, here disabled
    function setAllRead(){
        updateElementState('date', true);
        updateElementState('workWeek', true);
        updateElementState('isRework', true);
        updateElementState('associateLogin', true);//set associateLogin to read
        updateElementState('labelCount', true);//set Labelcount to read
        updateElementState('isDefective', true);//set isDefective to read
        updateElementState('useCaseSelector', true);//set use case to read

        // Also disable the toggle buttons that replace these selects
        ['reworkYesBtn','reworkNoBtn','defYesBtn','defNoBtn','defSkipBtn','ucOvBtn','ucBboxBtn','ucDenseBtn'].forEach(id => updateElementState(id, true));

        updateElementState('clearJobBtn', true);//set clear to read

        updateElementState('batchName', false);
        updateElementState('auditorLogin', false); // Mejora 3: always editable
    }

        //function to set visual elements to the update element state, where they are enabled or disabled, here enabled
    function setAllInteract(){
        updateElementState('batchName', false);
        updateElementState('auditorLogin', false); // Mejora 3: always editable
        updateElementState('date', false);
        updateElementState('workWeek', false);
        updateElementState('isRework', false);
        updateElementState('associateLogin', false);//set associateLogin to interact
        updateElementState('labelCount', false);//set Labelcount to interact
        updateElementState('isDefective', false);//set isDefective to interact
        updateElementState('useCaseSelector', false);//set use case to interact

        // Also re-enable the toggle buttons that replace these selects
        ['reworkYesBtn','reworkNoBtn','defYesBtn','defNoBtn','defSkipBtn','ucOvBtn','ucBboxBtn','ucDenseBtn'].forEach(id => updateElementState(id, false));

        updateElementState('clearJobBtn', false);//set clear to interact
    }

    //logic to load image ID automatically
    // =========================================================================
    // PCS Concept BBox (Harmony) — auto-fill desde el DOM del job de review.
    // Funciones puras espejo de tests/mro_helpers.mjs (mantener identicas).
    // =========================================================================
    function mroIsHarmony() {
        return location.hostname.includes('harmony.a2z.com');
    }
    function mroIsHarmonyReviewTask() {
        return mroIsHarmony() && /\/review\/task\//.test(location.pathname);
    }
    // Jobtype (cola de Harmony) -> Use Case + prefijo de batch. El jobtype sale del link
    // /review/jobtype/<ID>. PCS conocido; XDOF pendiente de su ID (ver harmonyDetect()).
    const HARMONY_JOBTYPE_MAP = {
        '01M00PFQBJR4PVHBDMNWJ1KAGB': { useCase: 'pcsConceptBbox', batchPrefix: 'p-pcs-bbox' }, // PCS Concept BBox — review
        '01M0B60442P8CN967GN3RHFRRY': { useCase: 'ovBbox',         batchPrefix: 'p-xdof-bbox' }, // XDoF Bbox — review
    };
    function harmonyJobtypeId() {
        const a = document.querySelector('a[href*="/review/jobtype/"]');
        if (a) { const m = /\/review\/jobtype\/([0-9A-Z]+)/i.exec(a.getAttribute('href') || ''); if (m) return m[1]; }
        const m2 = /\/review\/jobtype\/([0-9A-Z]+)/i.exec(location.href); // por si estamos en el overview
        return m2 ? m2[1] : null;
    }
    // {useCase, batchPrefix} del jobtype actual, o null si el jobtype no esta mapeado
    // (NO forzamos un default: mejor dejar que el QA elija que arriesgar a mal-etiquetar).
    function harmonyDetect() {
        const jt = harmonyJobtypeId();
        return (jt && HARMONY_JOBTYPE_MAP[jt]) || null;
    }
    // Prefijo de batch DERIVADO del Use Case activo (la decision sigue al Use Case, no al reves).
    function batchPrefixForUseCase(uc) {
        if (uc === 'ovBbox') return 'p-xdof-bbox';
        return 'p-pcs-bbox'; // pcsConceptBbox (y fallback)
    }
    function hPcsBatchName(ulid, prefix) {
        if (!ulid) return null;
        const s = String(ulid).trim();
        return s ? (prefix || 'p-pcs-bbox') + '-' + s.slice(-4) : null;
    }
    function hPcsBatchFromTimeline(events, prefix) {
        for (const e of (events || [])) {
            const m = /ingested from batch\s+([0-9A-Z]{20,})/i.exec((e && e.detail) || '');
            if (m) return hPcsBatchName(m[1], prefix);
        }
        return null;
    }
    function hReworkFromTimeline(events) {
        const reworkRound = (events || []).filter(e => /sent back for rework/i.test((e && e.action) || '')).length;
        return { reworkRound, isRework: reworkRound > 0 ? 'Yes' : 'No' };
    }
    function hAnnotatorFromTimeline(events) {
        let login = null;
        for (const e of (events || [])) {
            if (/^submitted$/i.test(((e && e.action) || '').trim()) && e.actor && e.actor !== 'system') login = e.actor;
        }
        return login;
    }
    function hAaTimingFromTimeline(events) {
        const arr = events || [];
        let subIdx = -1;
        for (let i = 0; i < arr.length; i++) {
            const a = ((arr[i] && arr[i].action) || '').trim();
            if (/^submitted$/i.test(a) && arr[i].actor && arr[i].actor !== 'system') subIdx = i;
        }
        if (subIdx < 0) return null;
        const submitTs = arr[subIdx].ts;
        let claimTs = null;
        for (let i = subIdx - 1; i >= 0; i--) {
            if (/claimed/i.test((arr[i].action) || '')) { claimTs = arr[i].ts; break; }
        }
        let seconds = null;
        if (claimTs && submitTs) {
            const d = (Date.parse(submitTs) - Date.parse(claimTs)) / 1000;
            if (!isNaN(d) && d >= 0) seconds = Math.round(d);
        }
        return { seconds };
    }
    function hReworkStatusFromAction(v) {
        const s = String(v || '').trim().toLowerCase();
        if (s === 'send-back') return 'Rejected';
        if (s === 'accept' || s === 'accept-with-edit') return 'Approved';
        return null;
    }
    // Lee el timeline del job (frame padre, no el iframe del anotador).
    function readHarmonyTimeline() {
        const events = [];
        document.querySelectorAll('li.task-timeline__item').forEach(li => {
            const roundEl = li.querySelector('.task-timeline__round');
            if (!roundEl) return;
            const rm = /round\s+(\d+)/i.exec(roundEl.textContent || '');
            const tsEl = li.querySelector('.task-timeline__ts');
            const strongEl = li.querySelector('.task-timeline__line strong');
            const mutedEl = li.querySelector('.task-timeline__line .muted');
            const detailEl = li.querySelector('.task-timeline__detail');
            let actor = null;
            if (mutedEl) { const am = /by\s+([^\s<]+)/i.exec(mutedEl.textContent || ''); actor = am ? am[1] : null; }
            events.push({
                round: rm ? Number(rm[1]) : null,
                ts: tsEl ? tsEl.getAttribute('datetime') : null,
                action: strongEl ? (strongEl.textContent || '').trim() : '',
                actor,
                detail: detailEl ? (detailEl.textContent || '').trim() : ''
            });
        });
        return events;
    }
    // Decision radio del review (accept / accept-with-edit / send-back).
    function harmonyDecisionValue() {
        const el = document.querySelector('input[name="review-action"]:checked');
        return el ? el.value : null;
    }
    function hSetInputIfFree(id, value) {
        const el = document.getElementById(id);
        if (!el || !value) return;
        if (el.getAttribute('data-user-modified') === 'true') return;
        if (el.value === value) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Orquesta el auto-fill de PCS. Devuelve true cuando el job cargo completo.
    function autofillHarmonyPcs() {
        const assetEl = document.querySelector('.asset-id-badge__id');
        const assetId = assetEl ? (assetEl.getAttribute('title') || assetEl.textContent || '').trim() : '';
        if (!assetId) return false; // el job aun no renderiza -> reintentar

        // Job nuevo -> arranca el cronometro de QA y resetea el estado del job.
        if (harmonyCurrentAsset !== assetId) {
            harmonyCurrentAsset = assetId;
            harmonyQaStartMs = Date.now();
            harmonyAaSeconds = null;
            assessmentSavedForCurrentJob = false;
            // Job nuevo: reiniciar los campos manuales por-job (varian por job -> mejor
            // vacio que arrastrar un dato incorrecto del job anterior).
            const tcEl = document.getElementById('totalConcepts'); if (tcEl) tcEl.value = '';
            const tlEl = document.getElementById('labelCount'); if (tlEl) tlEl.value = '';
            // Auto-detectar el Use Case por el jobtype UNA sola vez al abrir el job (si es
            // conocido). Despues NO lo re-forzamos: el QA puede cambiarlo a mano y se respeta.
            const det = harmonyDetect();
            if (det && USE_CASE.current !== det.useCase && window.__mroToggleSetters) {
                window.__mroToggleSetters.setUseCaseToggle(det.useCase, true);
            }
        }

        // Image ID = asset id
        const imgEl = document.getElementById('imageId');
        if (imgEl && imgEl.value !== assetId) imgEl.value = assetId;

        // Timeline -> Batch / Rework / Associate / AA SPL.
        // El prefijo del batch SIGUE al Use Case activo (auto-detectado o el que puso el QA).
        const events = readHarmonyTimeline();
        if (events.length) {
            hSetInputIfFree('batchName', hPcsBatchFromTimeline(events, batchPrefixForUseCase(USE_CASE.current)));
            const rw = hReworkFromTimeline(events);
            const rwEl = document.getElementById('isRework');
            if (rwEl && rwEl.getAttribute('data-user-modified') !== 'true' && window.__mroToggleSetters) {
                window.__mroToggleSetters.setReworkToggle(rw.isRework, true);
                if (rw.isRework === 'Yes') window.__mroToggleSetters.updateReworkRoundDisplay(rw.reworkRound);
            }
            hSetInputIfFree('associateLogin', hAnnotatorFromTimeline(events));
            const t = hAaTimingFromTimeline(events);
            harmonyAaSeconds = t ? t.seconds : null;
        }
        checkCaptureButtonState();
        return events.length > 0;
    }
    function startHarmonyPcsPoll() {
        if (harmonyPollTimer) { clearInterval(harmonyPollTimer); harmonyPollTimer = null; }
        let tries = 0;
        const tick = () => {
            tries++;
            const done = autofillHarmonyPcs();
            if (done || tries >= 20) { clearInterval(harmonyPollTimer); harmonyPollTimer = null; }
        };
        harmonyPollTimer = setInterval(tick, 1000);
        tick();
    }

    // =========================================================================
    // R2PS (Tron HMI) — auto-fill desde el DOM del job de verificacion.
    // Espejo del bloque de Harmony. Reglas del programa (WW35):
    //   - NO hay batch: se filtra por Use Case + Week -> batchName queda vacio.
    //   - NO hay rework/disputa: el QA corrige, el AA no disputa -> no tocamos
    //     Is Rework / Rework Round / Rework Status (quedan manuales/vacios).
    //   - associateLogin: pendiente de confirmar si esta en el DOM (probe). Por
    //     ahora se deja manual; el resto se auto-completa.
    // =========================================================================
    function mroIsTron() {
        return location.hostname.includes('hmi.tron.robotics.amazon.dev');
    }
    // Un job abierto vive bajo #/jobs (la lista de streams vive en #/job).
    function mroIsTronJob() {
        return mroIsTron() && /#\/jobs\b/.test(location.hash || location.href);
    }
    // Job Stream (cola de R2PS) -> Use Case. El stream sale del job-info panel.
    // Los streams "_verification" son las colas de QA; mapean al mismo Use Case
    // que su cola base. Extender aca a medida que Multiview/InTote aterricen.
    const TRON_JOBSTREAM_MAP = {
        'Dense_ID':              { useCase: 'denseID' },
        'Dense_ID_verification': { useCase: 'denseID' },
    };
    // {useCase} del stream actual, o null si el stream no esta mapeado (no forzamos
    // default: mejor que el QA elija a arriesgar un Use Case mal etiquetado).
    function tronDetect(streamName) {
        return (streamName && TRON_JOBSTREAM_MAP[streamName]) || null;
    }
    // Lee los valores identificadores del job. Parseo por PATRON sobre el body:
    // el probe (WW35) confirmo que el stream/jobId/usuario NO viven en el
    // job-info-wrapper-container sino sueltos en el header del job, y que el orden
    // de esas cajas no es estable -> parseo por patron, no por posicion.
    function readTronJobInfo() {
        // Job ID (UUID). Fuente PRIMARIA: testid del tab de respuesta "<uuid>-vote-N"
        // (inequivoco). Fallback: primer UUID que aparezca en el texto del body.
        let jobId = null;
        const voteTab = document.querySelector('[data-testid$="-vote-1"],[data-testid*="-vote-"]');
        const vm = voteTab && /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-vote-/i.exec(voteTab.getAttribute('data-testid') || '');
        if (vm) jobId = vm[1];
        const bodyTxt = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
        if (!jobId) jobId = (bodyTxt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0] || null;
        // Stream: contra el mapa conocido, mas especifico primero ("Dense_ID_verification"
        // gana a "Dense_ID"). Solo un stream mapeado dispara el Use Case, asi que no hace
        // falta un fallback por token (un stream desconocido no se auto-detecta igual).
        const stream = Object.keys(TRON_JOBSTREAM_MAP)
            .sort((a, b) => b.length - a.length)
            .find(s => bodyTxt.includes(s)) || null;
        return { jobId, stream };
    }
    // "Segments Created: N" -> total de labels del job.
    function readTronSegmentCount() {
        const m = (document.body.textContent || '').match(/Segments Created:\s*(\d+)/i);
        return m ? m[1] : null;
    }
    // Takt del AA: tab "Response N" muestra "Takt time: 1381.52s". Devuelve segundos.
    function readTronAaSeconds() {
        const m = (document.body.textContent || '').match(/Takt time:\s*([\d.]+)\s*s/i);
        if (!m) return null;
        const v = parseFloat(m[1]);
        return isNaN(v) ? null : Math.round(v);
    }
    // Orquesta el auto-fill de R2PS. Devuelve true cuando el job cargo (hay jobId).
    function autofillTron() {
        const info = readTronJobInfo();
        if (!info.jobId) return false; // el job aun no renderiza -> reintentar

        // Job nuevo -> arranca el cronometro de QA y resetea el estado por-job.
        if (tronCurrentJob !== info.jobId) {
            tronCurrentJob = info.jobId;
            tronQaStartMs = Date.now();
            tronAaSeconds = null;
            assessmentSavedForCurrentJob = false;
            const tlEl = document.getElementById('labelCount'); if (tlEl) tlEl.value = '';
            // Auto-detectar el Use Case por el stream UNA sola vez al abrir el job (si es
            // conocido). Despues NO lo re-forzamos: el QA puede cambiarlo a mano.
            const det = tronDetect(info.stream);
            if (det && USE_CASE.current !== det.useCase && window.__mroToggleSetters) {
                window.__mroToggleSetters.setUseCaseToggle(det.useCase, true);
            }
        }

        // Image ID = job id (UUID). Clave de union con el registro del AA (plan futuro).
        const imgEl = document.getElementById('imageId');
        if (imgEl && imgEl.value !== info.jobId) imgEl.value = info.jobId;

        // Total Labels = segmentos creados (si el QA no lo modifico a mano).
        const segCount = readTronSegmentCount();
        if (segCount != null) {
            const lc = document.getElementById('labelCount');
            if (lc && lc.getAttribute('data-user-modified') !== 'true') lc.value = segCount;
        }

        // Takt del AA (para el reporte de tiempos; espejo de harmonyAaSeconds).
        tronAaSeconds = readTronAaSeconds();

        checkCaptureButtonState();
        return true;
    }
    // Poll PERSISTENTE (a diferencia del de Harmony): en R2PS la URL puede quedar fija
    // en #/jobs al pasar al siguiente job, con el job id solo en el DOM. Seguimos
    // sondeando para que autofillTron() detecte el cambio de job (tronCurrentJob).
    // Se auto-detiene al salir de la vista de job para no dejar el timer colgado.
    function startTronPoll() {
        if (tronPollTimer) { clearInterval(tronPollTimer); tronPollTimer = null; }
        const tick = () => {
            if (!mroIsTronJob()) { clearInterval(tronPollTimer); tronPollTimer = null; return; }
            autofillTron();
        };
        tronPollTimer = setInterval(tick, 1500);
        tick();
    }

    function loadJob() {
        const currentUrl = window.location.href;
        let imgId = '';

        // Harmony (PCS Concept BBox): estructura distinta -> auto-fill propio por poll.
        if (mroIsHarmonyReviewTask()) {
            setAllInteract();
            startHarmonyPcsPoll();
            return;
        }

        // R2PS (Tron HMI): SPA con estructura propia -> auto-fill por poll.
        if (mroIsTronJob()) {
            setAllInteract();
            startTronPoll();
            return;
        }

        if (currentUrl.indexOf('/data-rows/') !== -1) {
            const dataRowsIndex = currentUrl.indexOf('/data-rows/');
            if (dataRowsIndex !== -1) {  // Changed from !==1 to !==-1
                const afterDataRows = currentUrl.slice(dataRowsIndex + '/data-rows/'.length);

                // Split by both '/' and '?'
                imgId = afterDataRows.split(/[/?]/)[0];

                // Remove any trailing slashes
                imgId = imgId.replace(/\/$/, '');
                setAllInteract();

            } else {
                console.log("Image ID could not load");
                return;
            }
        } else if(currentUrl.indexOf('/review-rework/') !== -1){
            const dataRowsIndex = currentUrl.indexOf('/review-rework/');
            if (dataRowsIndex !== -1) {  // Changed from !==1 to !==-1
                const afterDataRows = currentUrl.slice(dataRowsIndex + '/review-rework/'.length);

                // Split by both '/' and '?'
                imgId = afterDataRows.split(/[/?]/)[0];

                // Remove any trailing slashes
                imgId = imgId.replace(/\/$/, '');
                setAllInteract();

            } else {
                console.log("Image ID could not load");
                return;
            }
        }else{
            imgId = 'Not found.';
            // En Labelbox: readonly cuando no hay job. En Harmony/Tron (otra estructura): editable (modo manual).
            if (/app\.labelbox\.com$/.test(location.hostname)) setAllRead();
            else setAllInteract();
        }

        const imageIdEl = document.getElementById('imageId');
        const previousImageId = imageIdEl ? imageIdEl.value : '';
        if (imageIdEl) {
            imageIdEl.value = imgId;
        }

        // Reset copy filename counter/state when Image ID changes
        if (previousImageId !== imgId) {
            const currentContextKey = getCurrentMroContextKey();
            resetMroCopyStateForContext(currentContextKey);
            clearCopyFilenameError();

            // Mejora 7: Reset A/D shortcut lock for new job
            assessmentSavedForCurrentJob = false;

            // Mejora 6: Trigger auto-fill for new job (only if valid image ID)
            if (imgId && imgId !== 'Not found.') {
                triggerAutoFill();
            }
        }

        // Reset previousIsDefectiveValue when loading a new job to prevent side effects
        if (window.previousIsDefectiveValue !== undefined) {
            const isDefectiveSelect = document.getElementById('isDefective');
            if (isDefectiveSelect) {
                window.previousIsDefectiveValue = isDefectiveSelect.value;
            }
        }

        // Log the extracted Image ID for debugging
        console.log("Extracted Image ID:", imgId);
    }


    //has to be async given the async nature of the alerts
    async function saveCurrentAudit() {
        const auditData = {
            ...currentAuditData,
            timestamp: new Date().toISOString()
        };

        let savedAudits = GM_getValue('audits', []);

        const existingAuditIndex = savedAudits.findIndex(audit =>
            audit.imageId === auditData.imageId
        );

        if (existingAuditIndex >= 0) {
            const result = await Swal.fire({
                title: "Duplicate Image ID Detected",
                text: "This Image ID already exists in the current audit session. How would you like to proceed?",
                icon: "warning",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonColor: "#2876D3",
                denyButtonColor: "#333C42",
                cancelButtonColor: "#0D1216",
                confirmButtonText: "Overwrite Previous Entry",
                denyButtonText: "Save as New Entry",
                cancelButtonText: "Cancel"
            });

            if (result.isConfirmed) {
                savedAudits[existingAuditIndex] = auditData;
                GM_setValue('audits', savedAudits);
                assessmentSavedForCurrentJob = true; // Mejora 7: unlock A/D
                incrementJobCounter(auditData.imageId);
                await Swal.fire({
                    title: "Entry Updated",
                    text: "The previous audit entry has been replaced with the new data.",
                    icon: "success",
                    confirmButtonColor: "#2876D3"
                });
                clearQuick();
                disableSaveBtn();
                hideSubMenu();
            } else if (result.isDenied) {
                savedAudits.push(auditData);
                GM_setValue('audits', savedAudits);
                assessmentSavedForCurrentJob = true; // Mejora 7: unlock A/D
                incrementJobCounter(auditData.imageId);
                await Swal.fire({
                    title: "Entry Saved",
                    text: "The audit has been added as a new entry (duplicate Image ID allowed).",
                    icon: "success",
                    confirmButtonColor: "#2876D3"
                });
                clearQuick();
                disableSaveBtn();
                hideSubMenu();
            }
        } else {
            savedAudits.push(auditData);
            GM_setValue('audits', savedAudits);
            assessmentSavedForCurrentJob = true; // Mejora 7: unlock A/D
            incrementJobCounter(auditData.imageId);
            await Swal.fire({
                title: "Assessment captured successfully!",
                icon: "success",
                confirmButtonColor: "#2876D3"
            });
            clearQuick();
            disableSaveBtn();
            hideSubMenu();
        }
        console.log('Saved audits:', savedAudits);
    }

    // Fase 2: fija Rework Status (Approved/Rejected) segun la tecla A/D.
    // Solo aplica si Is Rework = Yes (en review inicial round 0 no hay Rework Status).
    // Hace click en el toggle para reusar toda su logica (sync select + estado visual).
    function setReworkStatusFromKey(status) { // status: 'Approved' | 'Rejected'
        const rw = document.getElementById('isRework');
        if (!rw || rw.value !== 'Yes') return;
        const btn = document.getElementById(status === 'Approved' ? 'rsApprovedBtn' : 'rsRejectedBtn');
        if (btn) btn.click();
    }

    // Fase 2 / Tarea 3 (revisado): asimetrico a proposito.
    //   A (aprobar): 1a A captura Rework Status = Approved + guarda; 2a A aprueba en Labelbox.
    //     Aprobar no requiere issues, por eso auto-guardar es seguro.
    //   D (rechazar): comportamiento ORIGINAL -> bloquea hasta que el QA guarde MANUALMENTE.
    //     Un defecto exige issues + comentarios, asi que NO auto-marcamos ni auto-guardamos con D;
    //     el QA documenta el defecto, hace click en Save Assessment, y ahi la D queda libre para rechazar.
    function setupApproveRejectShortcutBlocker() {
        if (!window.location.hostname.includes('labelbox.com')) return;
        if (window.__inToteShortcutBlockerAttached) return;
        window.__inToteShortcutBlockerAttached = true;

        const focusInEditable = () => {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            const tag = activeEl.tagName?.toUpperCase();
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
            const isSelect = tag === 'SELECT';
            const isContentEditable = activeEl.isContentEditable === true;
            const isLabelboxComment = activeEl.closest?.('[data-testid*="comment"]') !== null;
            return isInput || isSelect || isContentEditable || isLabelboxComment;
        };

        const handleKeyDown = (e) => {
            const key = e.key?.toLowerCase();
            if (key !== 'a' && key !== 'd') return;
            if (focusInEditable()) return; // no interferir al escribir

            const swalVisible = typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible();

            if (key === 'a') {
                if (assessmentSavedForCurrentJob) return;   // 2a A -> pasa a Labelbox (aprueba)
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                if (swalVisible) return;
                setReworkStatusFromKey('Approved');         // solo si Is Rework = Yes
                captureError();                             // Save Assessment; setea el flag al lograrlo
                return;
            }

            // key === 'd' -> comportamiento original: bloquear hasta guardar manualmente.
            // (No auto-marca Is Defective ni Rework Status, no auto-guarda: los defectos
            //  necesitan issues + comentarios documentados por el QA.)
            if (assessmentSavedForCurrentJob) return;       // ya guardado -> pasa a Labelbox (rechaza)
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            if (swalVisible) return;
            Swal.fire({
                icon: "warning",
                title: "Reject Blocked",
                text: "Please save your assessment before rejecting this job. The D shortcut will unlock after clicking Save Assessment.",
                confirmButtonText: "Got it",
                confirmButtonColor: "#2876D3"
            });
        };
        window.addEventListener('keydown', handleKeyDown, true);
    }

    // =========================================================================
    // Mejora 4: Toggle Total Labels visibility based on use case
    // =========================================================================
    function updateTotalLabelsVisibility() {
        // Total Concepts: solo PCS Concept BBox (# de conceptos del job). Via CSSOM (CSP-safe).
        const totalConceptsGroup = document.getElementById('totalConceptsGroup');
        if (totalConceptsGroup) totalConceptsGroup.style.display = usesMultiIssues() ? 'block' : 'none';

        const totalLabelsGroup = document.getElementById('totalLabelsGroup');
        if (!totalLabelsGroup) return;

        if (usesTotalLabels()) {
            totalLabelsGroup.style.display = 'block';
            // OV Bbox: the field defaults to 0 so the QA only has to adjust it
            applyDefaultTotalLabels();
        } else {
            totalLabelsGroup.style.display = 'none';
        }
    }

    // =========================================================================
    // Mejora 6: Auto-fill functions (absorbed from Labelbox Autocompleter)
    // =========================================================================
    function tryFillAssociateLogin() {
        const associateInput = document.querySelector('#associateLogin');
        if (!associateInput) return;

        // Don't overwrite if user has manually modified
        if (associateInput.getAttribute('data-user-modified') === 'true') return;

        // Search DOM for email pattern
        const elements = document.querySelectorAll('body *');
        for (const el of elements) {
            const text = el.textContent;
            if (!text) continue;
            const match = text.match(/\b([a-z]+)@amazon\.com\b/);
            if (match && match[1]) {
                const login = match[1];
                if (associateInput.value !== login) {
                    associateInput.value = login;
                    associateInput.dispatchEvent(new Event('input', { bubbles: true }));
                    associateInput.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('Associate Login autofilled:', login);
                }
                return;
            }
        }
    }

    // Fase 1: auto-llenar Batch Name desde el Project ID de la URL (mapa del batch tracker).
    // El batch autoritativo lo pone KNIME; acá es pre-llenado. Desconocido -> deja editable + hint.
    function autofillBatchFromUrl() {
        const input = document.getElementById('batchName');
        if (!input) return;
        if (input.getAttribute('data-user-modified') === 'true') return; // no pisar edicion manual
        const pid = extractProjectId(window.location.href);
        const batch = batchForProjectId(pid, PROJECT_ID_TO_BATCH);
        const hint = document.getElementById('batchHint');
        if (batch) {
            if (input.value !== batch) {
                input.value = batch;
                input.dispatchEvent(new Event('input', { bubbles: true }));  // dispara deteccion de use case
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (hint) hint.textContent = 'Batch auto (' + pid + ')';
        } else {
            // Batch NO registrado: borrar el campo para que nadie audite con un batch viejo pegado.
            if (input.value !== '') {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (hint) hint.textContent = pid ? ('Project ID no registrado (' + pid + ') — batch en blanco, verificá') : '';
        }
    }

    // Fase 1: QA Login se define UNA sola vez y se guarda en el almacenamiento del script
    // (GM_setValue: NO lo bloquea el Tracking Prevention de Labelbox, a diferencia de localStorage).
    // Disponible desde que abris Labelbox, sin depender del job ni de scraping. No editable en el
    // dia a dia; se cambia con un clic deliberado en la barra QA.
    function getQaLogin() {
        return String(GM_getValue('mroQaLogin', '') || '').trim().toLowerCase();
    }
    function setQaLogin(v) {
        const login = String(v || '').trim().toLowerCase();
        if (!/^[a-z]+$/.test(login)) return false;   // logins Amazon = solo letras
        GM_setValue('mroQaLogin', login);
        applyQaLogin();
        return true;
    }
    function applyQaLogin() {
        const login = getQaLogin();
        const input = document.getElementById('auditorLogin');
        if (input && input.value !== login) {
            input.value = login;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const disp = document.getElementById('auditorLoginDisplay');
        if (disp) disp.textContent = login || 'clic para definir';
    }
    async function promptQaLogin() {
        const res = await Swal.fire({
            title: 'Your QA Login',
            html: 'Type your login in <b>lowercase</b>, with <b>no spaces</b>, and <b>double-check the spelling</b>.',
            input: 'text',
            inputValue: getQaLogin(),
            inputPlaceholder: 'e.g. kvnmora',
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#FF8C00',
            inputValidator: (v) => {
                const s = String(v || '').trim();
                if (!/^[a-z]+$/.test(s)) return 'Lowercase letters only — no spaces, numbers or symbols.';
            }
        });
        if (res.isConfirmed && res.value) setQaLogin(res.value);
    }

    // Fase 1: bloquear Date y Work Week (auto-generados) para que el QA no los manipule.
    function lockDateWeekFields() {
        ['date', 'workWeek'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.readOnly) {
                el.readOnly = true;
                el.style.cursor = 'not-allowed';
                el.title = 'Auto-generado — no editable';
            }
        });
    }

    // ===== Fase 2: Rework Round / Is Rework desde el historial (auto-abriendo el panel) =====
    const MRO_HISTORY_ACTIONS = new Set(['Reworked', 'Rejected', 'Approved', 'Moved', 'Labeled']);
    function readHistoryChips() {
        return [...document.querySelectorAll('.MuiChip-label')]
            .map(e => (e.textContent || '').trim())
            .filter(t => MRO_HISTORY_ACTIONS.has(t));
    }
    function computeReworkFromChips(labels) {
        const arr = Array.isArray(labels) ? labels : [];
        const reworkRound = arr.filter(t => t === 'Reworked').length;
        let latestStatus = null;
        for (const t of arr) { if (t === 'Approved' || t === 'Rejected') { latestStatus = t; break; } }
        return { reworkRound, isRework: reworkRound > 0 ? 'Yes' : 'No', latestStatus };
    }
    // El panel "Task browser" no se muestra por defecto -> abrirlo si esta cerrado.
    let mroHistoryOpenTried = 0;
    function ensureHistoryOpen() {
        if (readHistoryChips().length > 0) return; // ya abierto con chips
        const btns = [...document.querySelectorAll('button[aria-label]')];
        const btn = btns.find(b => /task history/i.test(b.getAttribute('aria-label') || ''));
        if (btn) {
            const label = btn.getAttribute('aria-label') || '';
            if (/show/i.test(label)) {
                if (mroHistoryOpenTried < 3) { btn.click(); mroHistoryOpenTried++; console.log('[MRO rework] abriendo historial ("' + label + '")'); }
            }
            // si dice "Hide task history" ya esta abierto (los chips estan cargando)
        } else {
            console.log('[MRO rework] no encontre el boton de "task history" — labels:',
                btns.map(b => b.getAttribute('aria-label')).filter(Boolean).slice(0, 12));
        }
    }
    function autofillReworkFromHistory() {
        const rw = document.getElementById('isRework');
        if (!rw || rw.getAttribute('data-user-modified') === 'true') return; // respeta edicion manual
        ensureHistoryOpen();
        const chips = readHistoryChips();
        if (chips.length === 0) return; // aun no cargo / no abrio -> el poll reintenta
        const { reworkRound, isRework } = computeReworkFromChips(chips);
        console.log('[MRO rework] chips=' + chips.length + ' -> Rework Round=' + reworkRound + ' | Is Rework=' + isRework);
        const setters = window.__mroToggleSetters;
        if (setters && setters.setReworkToggle) setters.setReworkToggle(isRework, true);
        if (isRework === 'Yes' && setters && setters.updateReworkRoundDisplay) setters.updateReworkRoundDisplay(reworkRound);
    }

    function autoSetDefaultFields() {
        // Is Defective -> No (only if still at default)
        const defectiveSelect = document.querySelector('#isDefective');
        if (defectiveSelect && defectiveSelect.value === 'Select..') {
            if (defectiveSelect.getAttribute('data-user-modified') !== 'true') {
                defectiveSelect.value = 'No';
                defectiveSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Is Defective auto-set to No');
            }
        }

        // Is Rework -> No (only if still at default)
        const reworkSelect = document.querySelector('#isRework');
        if (reworkSelect && reworkSelect.value === 'Select..') {
            if (reworkSelect.getAttribute('data-user-modified') !== 'true') {
                reworkSelect.value = 'No';
                reworkSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Is Rework auto-set to No');
            }
        }
    }

    function triggerAutoFill() {
        // Reset user-modified flags for auto-fillable fields
        const assocEl = document.getElementById('associateLogin');
        if (assocEl) assocEl.removeAttribute('data-user-modified');

        const defEl = document.getElementById('isDefective');
        if (defEl) defEl.removeAttribute('data-user-modified');

        const rewEl = document.getElementById('isRework');
        if (rewEl) rewEl.removeAttribute('data-user-modified');

        // Fase 1: Batch desde la URL + QA Login (logueado) + bloquear Date/Week
        autofillBatchFromUrl();
        applyQaLogin();
        lockDateWeekFields();

        // Auto-set defaults immediately
        setTimeout(() => {
            autoSetDefaultFields();
        }, 300);

        // Retry Associate Login fill (DOM may not have email element yet)
        let attempts = 0;
        const maxAttempts = 8;
        const retryInterval = setInterval(() => {
            attempts++;
            const assocInput = document.getElementById('associateLogin');
            if (assocInput && assocInput.getAttribute('data-user-modified') === 'true') {
                clearInterval(retryInterval);
                return;
            }
            if (assocInput && assocInput.value && assocInput.value.trim() !== '') {
                clearInterval(retryInterval);
                return;
            }
            tryFillAssociateLogin();
            if (attempts >= maxAttempts) {
                clearInterval(retryInterval);
            }
        }, 1500);

        // Fase 2: abrir el historial y sincronizar Rework Round / Is Rework (self-corrige el stale del SPA)
        mroHistoryOpenTried = 0;
        if (window.__mroReworkPoll) clearInterval(window.__mroReworkPoll);
        let hAttempts = 0;
        window.__mroReworkPoll = setInterval(() => {
            hAttempts++;
            const rw = document.getElementById('isRework');
            if (rw && rw.getAttribute('data-user-modified') === 'true') { clearInterval(window.__mroReworkPoll); return; }
            autofillReworkFromHistory();
            if (hAttempts >= 20) clearInterval(window.__mroReworkPoll);
        }, 1000);
        autofillReworkFromHistory();
    }

    function setupAutoFillUserModifiedTracking() {
        // Track manual changes to auto-filled fields
        const trackFields = ['associateLogin', 'isDefective', 'isRework'];
        trackFields.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            // For inputs: listen to 'input' (keyboard typing)
            if (el.tagName === 'INPUT') {
                el.addEventListener('input', function(e) {
                    // Only mark as user-modified if this was a real user interaction
                    if (e.isTrusted) {
                        this.setAttribute('data-user-modified', 'true');
                    }
                });
            }
            // For selects: listen to 'change'
            if (el.tagName === 'SELECT') {
                el.addEventListener('change', function(e) {
                    if (e.isTrusted) {
                        this.setAttribute('data-user-modified', 'true');
                    }
                });
            }
        });
    }

    // =========================================================================
    // IndexedDB helpers for persisting directory handle (from V3.0.0)
    // =========================================================================
    function openMROToolDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MROToolSPUploadDB', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('directoryHandles')) {
                    db.createObjectStore('directoryHandles');
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async function storeDirectoryHandle(handle) {
        const db = await openMROToolDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('directoryHandles', 'readwrite');
            const store = tx.objectStore('directoryHandles');
            store.put(handle, 'spFolderHandle');
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    async function getStoredDirectoryHandle() {
        try {
            const db = await openMROToolDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('directoryHandles', 'readonly');
                const store = tx.objectStore('directoryHandles');
                const request = store.get('spFolderHandle');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        } catch (e) {
            console.warn('Error accessing IndexedDB for directory handle:', e);
            return null;
        }
    }

    async function clearStoredDirectoryHandle() {
        try {
            const db = await openMROToolDB();
            const tx = db.transaction('directoryHandles', 'readwrite');
            tx.objectStore('directoryHandles').delete('spFolderHandle');
        } catch (e) {
            console.warn('Error clearing stored directory handle:', e);
        }
    }

    async function verifyDirectoryPermission(dirHandle) {
        try {
            const opts = { mode: 'readwrite' };
            if ((await dirHandle.queryPermission(opts)) === 'granted') {
                return true;
            }
            if ((await dirHandle.requestPermission(opts)) === 'granted') {
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Permission verification failed:', e);
            return false;
        }
    }

    // =========================================================================
    // Upload to SharePoint (with Mejora 1: auto-clear + Mejora 2: auditor subfolder)
    // =========================================================================
    async function changeSpFolder() {
        const result = await Swal.fire({
            title: "Change SP Destination Folder",
            html: "Select a new <b>root</b> folder for your CSV uploads.<br><br>" +
                  "The script will create a subfolder with your Auditor Login inside the folder you choose.<br><br>" +
                  "<small>Example: if you select <code>Data Excel File</code>, files will be saved to <code>Data Excel File/your-login/</code></small>",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Select New Folder",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#FF8C00",
            cancelButtonColor: "#333C42"
        });

        if (!result.isConfirmed) return;

        try {
            const newHandle = await window.showDirectoryPicker({
                id: 'mro-sp-upload-folder',
                mode: 'readwrite',
                startIn: 'documents'
            });

            await storeDirectoryHandle(newHandle);

            Swal.fire({
                icon: "success",
                title: "Folder Updated!",
                html: `<b>Selected:</b> ${newHandle.name}<br><br>` +
                      `<small>Future uploads will use this folder.</small>`,
                timer: 2500,
                showConfirmButton: false
            });
        } catch (pickerError) {
            if (pickerError.name !== 'AbortError') {
                console.error('Error selecting folder:', pickerError);
                Swal.fire({ icon: "error", title: "Error", text: "Could not select folder. Try again." });
            }
        }
    }

    // =========================================================================
    // Daily upload sequence: every click on "Upload to SP" produces its own file
    // (1, 2, 3...). The counter resets automatically each day.
    // =========================================================================
    const SP_UPLOAD_DAILY_KEY = 'mroSpUploadDaily';

    function getTodayKey() {
        const now = new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    }

    // Returns the sequence number this upload should use (1 on the first upload of the day)
    function getNextUploadSequence() {
        const today = getTodayKey();
        try {
            const raw = localStorage.getItem(SP_UPLOAD_DAILY_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.date === today) {
                    const count = Number(parsed.count);
                    if (Number.isFinite(count) && count > 0) {
                        return count + 1;
                    }
                }
            }
        } catch (e) {
            console.warn('Could not read daily upload counter:', e);
        }
        return 1;
    }

    function persistUploadSequence(sequence) {
        try {
            localStorage.setItem(SP_UPLOAD_DAILY_KEY, JSON.stringify({
                date: getTodayKey(),
                count: sequence
            }));
        } catch (e) {
            console.warn('Could not persist daily upload counter:', e);
        }
    }

    async function fileExistsInDirectory(dirHandle, filename) {
        try {
            await dirHandle.getFileHandle(filename, { create: false });
            return true;
        } catch (e) {
            // NotFoundError (and anything else we cannot verify) is treated as "free"
            return false;
        }
    }

    function buildAuditFilename(timestamp, sequence) {
        return `labelbox_MRO_audit_report_${timestamp}_${sequence}.csv`;
    }

    // Highest sequence already present in the auditor folder for today's date.
    // The folder is the source of truth, so two browsers (or two profiles) writing to
    // the same folder keep a single consistent numbering instead of both starting at 1.
    // OneDrive conflict copies (e.g. "..._1-DESKTOP.csv") don't match and are ignored.
    async function getHighestSequenceInFolder(dirHandle, today) {
        let maxSequence = 0;
        try {
            if (!dirHandle || typeof dirHandle.values !== 'function') return 0;
            const pattern = /^labelbox_MRO_audit_report_(\d{4}-\d{2}-\d{2})_\d{2}-\d{2}_(\d+)\.csv$/;
            for await (const entry of dirHandle.values()) {
                if (entry.kind !== 'file') continue;
                const match = entry.name.match(pattern);
                if (!match || match[1] !== today) continue;
                const found = parseInt(match[2], 10);
                if (Number.isFinite(found) && found > maxSequence) {
                    maxSequence = found;
                }
            }
        } catch (e) {
            console.warn('Could not scan auditor folder for existing uploads:', e);
            return 0;
        }
        return maxSequence;
    }

    // v3.3.2: shared CSV builder (used by Upload to SP and Export to CSV) so both
    // produce a byte-identical file matching the Dashboard master format.
    // SPL en los 3 formatos EXACTOS del export de Labelbox (verificado vs p-ov-2026-06-19.csv):
    //   'SPL for AAs' = segundos int ; 'SPL AAs' = MM:SS ; 'AAs SPL' = fraccion de dia (seg/86400).
    function splMmss(sec) {
        if (sec === null || sec === undefined || sec === '' || isNaN(sec)) return '';
        const s = Math.max(0, Math.round(Number(sec)));
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }
    function splFractionOfDay(sec) {
        if (sec === null || sec === undefined || sec === '' || isNaN(sec)) return '';
        return String(Number(sec) / 86400);
    }

    function buildMroCsv(audits) {
        // Las 7 columnas SPL SOLO se agregan si el archivo tiene data de PCS. Asi los
        // archivos de OV/Bbox/Dense mantienen las 21 columnas de siempre (no rompen el
        // validador ni el schema del pipeline actual); solo los de PCS traen 28.
        // Columnas extra (Total Concepts + SPL) solo para los Use Cases de Harmony: PCS y XDOF.
        // Basado en Use Case (NO en aaSeconds, que ahora se setea null para todos).
        const hasPcs = audits.some(a =>
            a && (a.usecase === 'PCS Concept BBox' || a.usecase === 'XDOF BBOX')
        );
        let csv = 'Timestamp,Image ID,Total Labels,Total Tiles,Is Defective,' +
                  'Correct Labels,Incorrect Labels,Missing Labels,' +
                  'Error Classification,Root Cause,Use Case,URL,' +
                  'Created By,Associate Login,Manager,Batch,Work Week,' +
                  'Is Rework,Rework Round,Rework Status,Auditor Login' +
                  (hasPcs ? ',Total Concepts,SPL for AAs,SPL AAs,Validation AAs,AAs SPL,SPL for QAs,SPL QAs,QAs SPL' : '') + '\n';
        const q = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
        audits.forEach(audit => {
            csv += `${q(formatDateTime(audit.timestamp))},`;
            csv += `${q(audit.imageId)},`;
            csv += `${audit.labelCount},`;
            csv += `,`;
            csv += `${q(audit.isDefective)},`;
            csv += `${q(audit.selectedLabels)},`;
            csv += `${q(audit.selectedLabels2)},`;
            csv += `${q(audit.selectedLabels3)},`;
            csv += `${q(audit.errorClassification)},`;
            csv += `${q(audit.rootCause)},`;
            csv += `${q(audit.usecase)},`;
            csv += `${q(audit.jobURL)},`;
            csv += `"",`;
            csv += `${q(audit.associateLogin)},`;
            csv += `${q(audit.manager || '')},`;
            csv += `${q(audit.batchName)},`;
            csv += `${audit.workWeek},`;
            csv += `${q(audit.isRework)},`;
            csv += `${audit.reworkRound},`;
            csv += `${q(audit.reworkStatus)},`;
            csv += `${q(audit.auditor || '')}`;
            if (hasPcs) {
                csv += `,${q(audit.totalConcepts || '')}`; // Total Concepts (# conceptos del job, solo PCS)
                // SPL: solo se llena en las filas de PCS (aaSeconds/qaSeconds definidos); resto vacio.
                const aa = audit.aaSeconds, qa = audit.qaSeconds;
                const rowHasSpl = aa !== undefined || qa !== undefined;
                const okAA = aa !== null && aa !== undefined && aa !== '' && !isNaN(aa);
                const okQA = qa !== null && qa !== undefined && qa !== '' && !isNaN(qa);
                csv += `,${okAA ? String(Math.round(Number(aa))) : ''}`;   // SPL for AAs
                csv += `,${q(splMmss(aa))}`;                               // SPL AAs (MM:SS)
                csv += `,${rowHasSpl ? (okAA ? 'True' : 'False') : ''}`;   // Validation AAs
                csv += `,${splFractionOfDay(aa)}`;                         // AAs SPL (fraccion de dia)
                csv += `,${okQA ? String(Math.round(Number(qa))) : ''}`;   // SPL for QAs
                csv += `,${q(splMmss(qa))}`;                               // SPL QAs (MM:SS)
                csv += `,${splFractionOfDay(qa)}`;                         // QAs SPL (fraccion de dia)
            }
            csv += `\n`;
        });
        return csv;
    }

    // v3.3.2: Export to CSV (direct browser download). Recovered as a fallback for when
    // Upload to SP is unavailable (e.g. unsupported browser). Does NOT clear memory.
    function exportToCsv() {
        const audits = GM_getValue('audits', []);
        if (audits.length === 0) {
            Swal.fire({ icon: "error", title: "Oops...", text: "No new audits performed. Nothing to export." });
            return;
        }
        const auditorLogin = document.getElementById('auditorLogin') ? document.getElementById('auditorLogin').value.trim() : '';
        const now = new Date();
        const timestamp = now.getFullYear().toString() + '-' +
            (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
            now.getDate().toString().padStart(2, '0') + '_' +
            now.getHours().toString().padStart(2, '0') + '-' +
            now.getMinutes().toString().padStart(2, '0');
        const filename = `labelbox_MRO_audit_report_${timestamp}${auditorLogin ? '_' + auditorLogin : ''}.csv`;
        const csv = buildMroCsv(audits);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Swal.fire({
            icon: "success",
            title: "CSV Exported",
            html: `<b>File:</b> ${filename}<br><small>Downloaded to your browser's Downloads folder. Memory was NOT cleared.</small>`,
            confirmButtonColor: "#008296"
        });
    }

    // Fase 1: scheduler de auto-subida (>=3 franjas/dia), silencioso y best-effort.
    // Solo sube si hay data + login + carpeta configurada + permiso YA vigente (query, sin prompt).
    // Horas de subida en HORA DE COSTA RICA (fijas, sin importar la zona del navegador), para que
    // SJO e IND suban en los mismos momentos reales. Costa Rica no usa horario de verano (UTC-6).
    const AUTO_UPLOAD_SLOTS = [
        { h: 1,  m: 30 },
        { h: 4,  m: 0  },
        { h: 7,  m: 5  },
        { h: 9,  m: 0  },
        { h: 13, m: 29 },
        { h: 15, m: 59 },
    ];
    function crParts() {
        const p = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(new Date());
        const g = t => (p.find(x => x.type === t) || {}).value;
        let h = parseInt(g('hour'), 10); if (h === 24) h = 0;
        return { date: g('year') + '-' + g('month') + '-' + g('day'), mins: h * 60 + parseInt(g('minute'), 10) };
    }
    function currentUploadSlot() {
        const mins = crParts().mins;
        let latest = null;
        for (const s of AUTO_UPLOAD_SLOTS) if (mins >= s.h * 60 + s.m) latest = s;
        return latest ? (String(latest.h).padStart(2, '0') + String(latest.m).padStart(2, '0')) : null;
    }
    async function autoUploadTick() {
        try {
            const slot = currentUploadSlot();
            if (slot === null) return;
            const key = 'mroAutoUpload_' + crParts().date + '_' + slot; // dedup por dia de Costa Rica
            if (GM_getValue(key, false)) return;                 // ya subido en esta franja hoy
            const audits = GM_getValue('audits', []);
            if (!audits || audits.length === 0) return;          // nada nuevo
            const al = document.getElementById('auditorLogin');
            if (!al || !al.value.trim()) return;                 // sin login
            if (!('showDirectoryPicker' in window)) return;
            const dirHandle = await getStoredDirectoryHandle();
            if (!dirHandle) return;                              // sin carpeta -> el QA sube manual
            const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') return;                      // permiso no vigente -> no molestar
            await uploadToSharePoint({ silent: true });
            GM_setValue(key, true);
        } catch (e) { console.warn('[MRO] auto-upload tick fallo:', e); }
    }
    function startAutoUploadScheduler() {
        setInterval(autoUploadTick, 5 * 60 * 1000); // chequea cada 5 min (respeta los minutos)
        setTimeout(autoUploadTick, 8000);           // y una vez al cargar (pone al dia si reabrio)
    }

    async function uploadToSharePoint(opts = {}) {
        try {
            const audits = GM_getValue('audits', []);
            console.log('Retrieving audits for SP upload:', audits);

            if (audits.length === 0) {
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "No new audits performed. Nothing to upload.",
                });
                return;
            }

            // Mejora 2: Validate Auditor Login before proceeding
            const auditorLogin = document.getElementById('auditorLogin') ? document.getElementById('auditorLogin').value.trim() : '';
            if (!auditorLogin) {
                Swal.fire({
                    icon: "error",
                    title: "Auditor Login Required",
                    text: "Please fill in your Auditor Login before uploading.",
                });
                return;
            }

            // Check browser support for File System Access API
            if (!('showDirectoryPicker' in window)) {
                Swal.fire({
                    icon: "error",
                    title: "Browser Not Supported",
                    html: "Your browser does not support the File System Access API.<br><br>" +
                          "Please use <b>Google Chrome</b> or <b>Microsoft Edge</b> (latest version).",
                });
                return;
            }

            // Try to get stored directory handle
            let dirHandle = await getStoredDirectoryHandle();
            let needsNewSelection = false;

            if (dirHandle) {
                const hasPermission = await verifyDirectoryPermission(dirHandle);
                if (!hasPermission) {
                    needsNewSelection = true;
                }
            } else {
                needsNewSelection = true;
            }

            if (needsNewSelection) {
                if (opts.silent) return; // auto-subida: nunca prompteamos por carpeta/permiso
                const firstTimeMessage = dirHandle
                    ? "Permission to the previously selected folder was lost. Please re-select your SharePoint <b>root</b> folder."
                    : "First time setup: Select the <b>root</b> folder where auditor subfolders will be created.<br><br>" +
                      "<b>Navigate to:</b><br>" +
                      "<code>MRO Manipulation Pillar - Documents -> MRO Experiments Documentation -> Data Excel File</code><br><br>" +
                      "<small>The script will automatically create a subfolder with your Auditor Login (e.g. <code>Data Excel File/kvnmora/</code>).</small>";

                const setupResult = await Swal.fire({
                    icon: "info",
                    title: "Select SharePoint Folder",
                    html: firstTimeMessage,
                    showCancelButton: true,
                    confirmButtonText: "Select Folder",
                    cancelButtonText: "Cancel",
                    confirmButtonColor: "#FF8C00",
                    cancelButtonColor: "#333C42"
                });

                if (!setupResult.isConfirmed) {
                    return;
                }

                try {
                    dirHandle = await window.showDirectoryPicker({
                        id: 'mro-sp-upload-folder',
                        mode: 'readwrite',
                        startIn: 'documents'
                    });
                } catch (pickerError) {
                    if (pickerError.name === 'AbortError') {
                        return;
                    }
                    throw pickerError;
                }

                await storeDirectoryHandle(dirHandle);

                Swal.fire({
                    icon: "success",
                    title: "Folder Saved!",
                    text: "Your SharePoint folder has been saved. Future uploads will go directly there.",
                    timer: 2500,
                    showConfirmButton: false
                });

                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Mejora 2: Create/open auditor subfolder inside the root folder
            const auditorFolder = await dirHandle.getDirectoryHandle(auditorLogin, { create: true });
            console.log(`Auditor subfolder ready: ${dirHandle.name}/${auditorLogin}/`);

            // Generate CSV
            const now = new Date();
            const timestamp = now.getFullYear().toString() + '-' +
                (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
                now.getDate().toString().padStart(2, '0') + '_' +
                now.getHours().toString().padStart(2, '0') + '-' +
                now.getMinutes().toString().padStart(2, '0');
            // Neutral name: a single CSV can hold rows from all use cases (the Use Case column
            // is what identifies each row), so the filename no longer names one of them.
            // The trailing number is the upload count for the day (1, 2, 3...), so uploading
            // several times - even within the same minute - never overwrites a previous file.
            // The folder wins over the local counter: if another browser/profile already
            // wrote uploads today, we continue that numbering instead of restarting at 1.
            const today = getTodayKey();
            const folderSequence = await getHighestSequenceInFolder(auditorFolder, today) + 1;
            let sequence = Math.max(getNextUploadSequence(), folderSequence);
            let filename = buildAuditFilename(timestamp, sequence);

            // Safety net: if that name is already taken (counter cleared, another profile,
            // manual copy), keep bumping until we find a free one.
            let guard = 0;
            while (await fileExistsInDirectory(auditorFolder, filename)) {
                sequence++;
                filename = buildAuditFilename(timestamp, sequence);
                if (++guard > 500) break;
            }

            // Candado anti-duplicado: evita dos subidas casi simultaneas (doble clic, o
            // varias pestañas con el auto-upload corriendo). GM se comparte entre pestañas.
            // Si otra subida arranco hace <20s, abortamos esta para no duplicar el archivo.
            const __uploadNow = Date.now();
            const __uploadLock = GM_getValue('mroUploadLock', 0);
            if (__uploadNow - __uploadLock < 20000) {
                console.warn('[MRO] subida abortada: otra subida muy reciente (anti-duplicado).');
                if (!opts.silent) {
                    Swal.fire({ icon: 'info', title: 'Subida en curso',
                        text: 'Ya se subió/está subiendo hace unos segundos. Esperá un momento y, si hace falta, volvé a intentar.' });
                }
                return;
            }
            GM_setValue('mroUploadLock', __uploadNow);

            const csv = buildMroCsv(audits);

            // Write file to auditor subfolder (Mejora 2)
            const fileHandle = await auditorFolder.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(csv);
            await writable.close();

            // Only advance the daily counter once the file is actually written
            persistUploadSequence(sequence);

            // Mejora 1: Auto-clear memory after successful upload
            GM_setValue('audits', []);

            if (opts.silent) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success',
                    title: `Auto-subido: ${filename}`, showConfirmButton: false, timer: 3000 });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Uploaded to SharePoint!",
                    html: `<b>File:</b> ${filename}<br>` +
                          `<b>Folder:</b> .../${auditorLogin}/<br>` +
                          `<b>Upload #${sequence}</b> of today<br><br>` +
                          `<small>Memory cleared automatically. The file will sync via OneDrive.</small>`,
                    confirmButtonText: "OK",
                    confirmButtonColor: "#FF8C00"
                });
            }

            console.log(`SP Upload successful: ${auditorLogin}/${filename} (upload #${sequence} today) - memory cleared`);

        } catch (error) {
            console.error('Upload to SP error:', error);
            GM_setValue('mroUploadLock', 0); // liberar el candado para permitir reintento

            if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
                await clearStoredDirectoryHandle();
                Swal.fire({
                    icon: "error",
                    title: "Permission Error",
                    html: "Could not write to the selected folder.<br>" +
                          "The saved folder has been cleared. Please try again and re-select your folder.",
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Upload Failed",
                    text: "Error uploading to SharePoint. Check console for details.",
                });
            }
        }
    }

    async function checkNewDayAndPromptClearMemory() {
        const now = new Date();
        const currentDate = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
        const lastUsedDate = localStorage.getItem('lastUsedDate');

        if (!lastUsedDate) {
            localStorage.setItem('lastUsedDate', currentDate);
            return;
        }

        if (lastUsedDate !== currentDate) {
            // Job counter always resets on a new day, regardless of what the user chooses below
            resetJobCounter();

            const result = await Swal.fire({
                title: "New Day Detected",
                text: "It looks like you're starting a new audit day.\nWe recommend clearing previous data to avoid duplicate entries in your CSV.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Clear Memory Now",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#2876D3",
                cancelButtonColor: "#0D1216"
            });

            if (result.isConfirmed) {
                clearMemory();
            }
            localStorage.setItem('lastUsedDate', currentDate);
        }
    }

    // v3.3.2: One-time browser recommendation (per session) for non-Chromium browsers.
    // The tool works best in Chrome/Edge (Upload to SP needs the File System Access API).
    function maybeWarnBrowser() {
        try {
            if (sessionStorage.getItem('mroBrowserWarned') === '1') return;
            const supportsFsa = 'showDirectoryPicker' in window;
            const ua = navigator.userAgent;
            const isChromium = /Chrome|Chromium|Edg\//.test(ua);
            if (supportsFsa && isChromium) return;
            sessionStorage.setItem('mroBrowserWarned', '1');
            Swal.fire({
                icon: "warning",
                title: "Browser Not Recommended",
                html: "Not all features will be available in this browser (for example, <b>Upload to SP</b> needs the File System Access API).<br><br>" +
                      "For standardization, please use <b>Google Chrome</b> or <b>Microsoft Edge</b>.<br><br>" +
                      "<small>You can still use <b>Export to CSV</b> to download your data manually.</small>",
                confirmButtonText: "Got it",
                confirmButtonColor: "#2876D3"
            });
        } catch (e) {}
    }

    //general functions to start all the code
    function init() {
        setTimeout(() => {
            try {
                setupApproveRejectShortcutBlocker();
                installSwalCspFix(); // Harmony/CSP: estilar los popups de SweetAlert
                createPopup();
                createDataPreviewPopup();
                maybeWarnBrowser();

                // Mejora 4: Set initial Total Labels visibility
                updateTotalLabelsVisibility();

                // Mejora 6: Setup user-modified tracking for auto-fill fields
                setupAutoFillUserModifiedTracking();

                // Show current job counter
                updateJobCounterDisplay();

                // Fase 1: QA Login — mostrar el guardado; barra clickeable para definir/cambiar.
                applyQaLogin();
                const qaBar = document.getElementById('qaLoginBar');
                if (qaBar) qaBar.addEventListener('click', promptQaLogin);
                if (!getQaLogin()) setTimeout(promptQaLogin, 1200); // primera vez: pedirlo una sola vez

                console.log('Tool initialized');
                checkNewDayAndPromptClearMemory();
                //logic to load image ID automatically
                loadJob();
                //logic to update image ID automatically if the URL changes
                let lastUrl = location.href;
                new MutationObserver(() => {
                    const url = location.href;
                    if (url !== lastUrl) {
                        lastUrl = url;
                        console.log('URL changed, updating...');
                        loadJob();
                    }
                }).observe(document, {subtree: true, childList: true});

                // Fase 1: auto-subida del CSV >=3 veces al dia (silenciosa, best-effort)
                startAutoUploadScheduler();

            } catch (error) {
                console.error('Error initializing tool:', error);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();