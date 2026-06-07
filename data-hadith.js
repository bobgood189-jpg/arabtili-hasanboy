/* ============================================================
   data-hadith.js — хадисы Пророка Мухаммада ﷺ
   Текст (араб.) + перевод на русский и узбекский + источник.
   Узбекский — латиница с буквами oʻ/gʻ/ʼ (без ASCII-апострофов).
   ============================================================ */
(function () {
  if (typeof DB === 'undefined') return;

  DB.hadith = [
    {
      a: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
      t: 'innamā l-aʿmālu bin-niyyāt, wa innamā li-kulli mriʾin mā nawā',
      r: '«Поистине, дела (оцениваются) только по намерениям, и, поистине, каждому человеку (достанется) лишь то, что он намеревался обрести».',
      u: '«Albatta, amallar niyatlarga bogʻliqdir va har bir kishiga faqat niyat qilgani (nasib) boʻladi».',
      en: '“Verily, deeds (are judged) only by intentions, and, verily, each person (will receive) only what he intended to obtain.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'مَنْ كَانَ يُؤْمِنُ بِاللّٰهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
      t: 'man kāna yuʾminu billāhi wal-yawmi l-ākhiri falyaqul khayran aw liyaṣmut',
      r: '«Кто верует в Аллаха и в Последний день, пусть говорит благое или молчит».',
      u: '«Kim Allohga va oxirat kuniga imon keltirsa, yaxshi gapirsin yoki jim tursin».',
      en: '“Whoever believes in Allah and the Last Day, let him speak good or remain silent.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      t: 'lā yuʾminu aḥadukum ḥattā yuḥibba li-akhīhi mā yuḥibbu li-nafsih',
      r: '«Не уверует никто из вас (по-настоящему), пока не станет желать своему брату того же, чего желает самому себе».',
      u: '«Sizdan biringiz oʻzi uchun ravo koʻrgan narsani birodari uchun ham ravo koʻrmaguncha (komil) moʻmin boʻlmaydi».',
      en: '“None of you will believe (truly) until he wishes for his brother what he wishes for himself.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
      t: 'al-muslimu man salima l-muslimūna min lisānihi wa yadih',
      r: '«Мусульманин — это тот, кто не причиняет вреда другим мусульманам своим языком и своей рукой».',
      u: '«Musulmon — tili va qoʻlidan boshqa musulmonlar salomat boʻlgan kishidir».',
      en: '“A Muslim is one who does not harm other Muslims with his tongue or his hand.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ',
      t: 'laysa sh-shadīdu biṣ-ṣuraʿati, innamā sh-shadīdu lladhī yamliku nafsahu ʿinda l-ghaḍab',
      r: '«Силён не тот, кто (всех) побеждает в борьбе, а тот, кто владеет собой во время гнева».',
      u: '«Kuchli kishi (kurashda) yiqitadigan emas, balki gʻazab paytida oʻzini tuta oladigan kishidir».',
      en: '“Strong is not the one who defeats (everyone) in a fight, but the one who controls himself during anger.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
      t: 'tabassumuka fī wajhi akhīka ṣadaqa',
      r: '«Твоя улыбка в лицо твоему брату — это милостыня».',
      u: '«Birodaringga ochiq yuz bilan tabassum qilishing — bu sadaqadir».',
      en: '“Your smile in your brother’s face is alms.”',
      src: 'ат-Тирмизи',
    },
    {
      a: 'إِنَّ اللّٰهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ',
      t: 'inna llāha lā yanẓuru ilā ṣuwarikum wa amwālikum, wa lākin yanẓuru ilā qulūbikum wa aʿmālikum',
      r: '«Поистине, Аллах не смотрит на ваш облик и ваше имущество, но смотрит на ваши сердца и ваши дела».',
      u: '«Albatta, Alloh sizning suratlaringiz va mol-mulkingizga emas, balki qalblaringiz va amallaringizga nazar soladi».',
      en: '“Verily, Allah does not look at your appearance and your wealth, but looks at your hearts and your deeds.”',
      src: 'Муслим',
    },
    {
      a: 'الطُّهُورُ شَطْرُ الإِيمَانِ',
      t: 'aṭ-ṭuhūru shaṭru l-īmān',
      r: '«Чистота — половина веры».',
      u: '«Poklik — imonning yarmidir».',
      en: '“Cleanliness is half of faith.”',
      src: 'Муслим',
    },
    {
      a: 'الدِّينُ النَّصِيحَةُ',
      t: 'ad-dīnu n-naṣīḥa',
      r: '«Религия — это искреннее доброжелательство (наставление)».',
      u: '«Din — nasihatdir (samimiy xayrixohlik)».',
      en: '“Religion is sincere goodwill (instruction).”',
      src: 'Муслим',
    },
    {
      a: 'مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ',
      t: 'man dalla ʿalā khayrin fa-lahu mithlu ajri fāʿilih',
      r: '«Указавшему на благое (полагается) такая же награда, как и тому, кто его совершил».',
      u: '«Kim yaxshilikka yoʻl koʻrsatsa, unga uni qilgan kishining ajriday ajr bordir».',
      en: '“The one who points out what is good (is entitled) to the same reward as the one who did it.”',
      src: 'Муслим',
    },
    {
      a: 'إِنَّ مِنْ خِيَارِكُمْ أَحْسَنَكُمْ أَخْلَاقًا',
      t: 'inna min khiyārikum aḥsanakum akhlāqan',
      r: '«Поистине, лучшие из вас — это обладающие наилучшим нравом».',
      u: '«Albatta, sizning eng yaxshilaringiz axloqi eng goʻzal boʻlganlaringizdir».',
      en: '“Verily, the best of you are those of the best character.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'مَنْ لَا يَشْكُرُ النَّاسَ لَا يَشْكُرُ اللّٰهَ',
      t: 'man lā yashkuru n-nāsa lā yashkuru llāh',
      r: '«Кто не благодарит людей, тот не благодарит Аллаха».',
      u: '«Odamlarga shukr qilmagan kishi Allohga ham shukr qilmaydi».',
      en: '“Whoever does not thank people does not thank Allah.”',
      src: 'Абу Дауд, ат-Тирмизи',
    },
    {
      a: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
      t: 'khayrukum man taʿallama l-qurʾāna wa ʿallamah',
      r: '«Лучший из вас — тот, кто изучил Коран и обучил ему других».',
      u: '«Sizning eng yaxshingiz — Qurʼonni oʻrganib, uni boshqalarga oʻrgatgan kishidir».',
      en: '“The best of you is the one who studied the Quran and taught it to others.”',
      src: 'аль-Бухари',
    },
    {
      a: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ',
      t: 'al-kalimatu ṭ-ṭayyibatu ṣadaqa',
      r: '«Доброе слово — это милостыня».',
      u: '«Yaxshi soʻz — bu sadaqadir».',
      en: '“A kind word is charity.”',
      src: 'аль-Бухари, Муслим',
    },
    {
      a: 'الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ، ارْحَمُوا مَنْ فِي الأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ',
      t: 'ar-rāḥimūna yarḥamuhumu r-raḥmān, irḥamū man fī l-arḍi yarḥamkum man fī s-samāʾ',
      r: '«Милостивых помилует Милостивый. Будьте милостивы к тем, кто на земле, — и помилует вас Тот, Кто на небе».',
      u: '«Rahmlilarga Rahmon (Alloh) rahm qiladi. Yerdagilarga rahm qiling — osmondagi Zot sizga rahm qiladi».',
      en: '“The Merciful will have mercy on the merciful. Be merciful to those on earth, and He who is in heaven will have mercy on you.”',
      src: 'Абу Дауд, ат-Тирмизи',
    },
    {
      a: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
      t: 'ṭalabu l-ʿilmi farīḍatun ʿalā kulli muslim',
      r: '«Поиск знания — обязанность каждого мусульманина».',
      u: '«Ilm olish har bir musulmonga farzdir».',
      en: '“The search for knowledge is the duty of every Muslim.”',
      src: 'Ибн Маджа',
    },
  ];
})();
