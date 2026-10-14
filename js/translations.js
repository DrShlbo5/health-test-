const CODE_T = {
  ar: { lbl: "رمز الاختبار (من المدير)", err: "رمز الاختبار غير صحيح" },
  en: { lbl: "Test code (from the manager)", err: "Incorrect test code" },
  hi: { lbl: "परीक्षा कोड (प्रबंधक से)", err: "परीक्षा कोड गलत है" },
  bn: { lbl: "পরীক্ষার কোড (ম্যানেজারের কাছ থেকে)", err: "পরীক্ষার কোড ভুল" },
  id: { lbl: "Kode tes (dari manajer)", err: "Kode tes salah" }
};

// Each question: q = question text, o = options (same order in all languages), c = index of correct option.
// Options are shuffled per employee, so the position of the answer is never fixed.

// ───── UI TEXT ─────
const T = {
  ar: { lbl:"اللغة:", hdrTitle:"اختبار الوعي الصحي للموظفين", hdrSub:"٥٠ سؤال من بنك أسئلة متنوع",
    startTitle:"أدخل اسم الموظف للبدء", startSub:"تُحفظ النتيجة تلقائياً بعد الانتهاء", lblName:"اسم الموظف",
    btnStart:"ابدأ الاختبار ◄", navRec:"📋 سجل النتائج", empOf:"الموظف:", next:"التالي ◄", finish:"إنهاء ✓",
    pass:"ناجح ✅", fail:"راسب ❌", passMsg:"وصل للحد المطلوب (65 نقطة) ويمكن إرساله لاختبار الشهادة الصحية.",
    failMsg:"ما وصل للحد المطلوب (65 نقطة). ينصح بالتدريب قبل الاختبار الرسمي.",
    btnNew:"موظف جديد ◄", btnHome:"الرئيسية", recTitle:"📋 سجل النتائج", prev:"► السابق", btnImport:"⬇ استيراد من الشيت", btnUpload:"⬆ رفع السجلات للشيت", btnUploadDone:"تم إرسال الكل ✓", btnClear:"حذف الكل 🗑", confirmClear:"اضغط مرة ثانية للتأكيد",
    btnRecBack:"رجوع", thName:"الاسم", thScore:"النتيجة", thPct:"النسبة", thVerdict:"الحكم", thDate:"التاريخ",
    pwTitle:"سجل النتائج — مدير فقط", pwSub:"أدخل كلمة السر للمشاهدة", btnUnlock:"دخول 🔓", btnPwBack:"رجوع",
    pwWrong:"كلمة السر غلط ❌", noRecords:"لا توجد نتائج محفوظة بعد", enterName:"الرجاء إدخال اسم الموظف" },
  en: { lbl:"Language:", hdrTitle:"Employee Health Awareness Test", hdrSub:"50 mixed questions",
    startTitle:"Enter the employee name to begin", startSub:"The result is saved automatically when finished", lblName:"Employee name",
    btnStart:"Start test ►", navRec:"📋 Results log", empOf:"Employee:", next:"Next ►", finish:"Finish ✓",
    pass:"PASS ✅", fail:"FAIL ❌", passMsg:"Reached the required 65 points and can proceed to the official health certificate exam.",
    failMsg:"Did not reach the required 65 points. Training is recommended before the official exam.",
    btnNew:"New employee ►", btnHome:"Home", recTitle:"📋 Results log", prev:"◄ Previous", btnImport:"⬇ Import from sheet", btnUpload:"⬆ Upload records to sheet", btnUploadDone:"All sent ✓", btnClear:"Clear all 🗑", confirmClear:"Press again to confirm",
    btnRecBack:"Back", thName:"Name", thScore:"Score", thPct:"Percent", thVerdict:"Result", thDate:"Date",
    pwTitle:"Results log — manager only", pwSub:"Enter the password to view", btnUnlock:"Unlock 🔓", btnPwBack:"Back",
    pwWrong:"Wrong password ❌", noRecords:"No saved results yet", enterName:"Please enter the employee name" },
  hi: { lbl:"भाषा:", hdrTitle:"कर्मचारी स्वास्थ्य जागरूकता परीक्षा", hdrSub:"50 मिश्रित प्रश्न",
    startTitle:"शुरू करने के लिए कर्मचारी का नाम लिखें", startSub:"पूरा होने पर परिणाम अपने आप सहेजा जाएगा", lblName:"कर्मचारी का नाम",
    btnStart:"परीक्षा शुरू करें ►", navRec:"📋 परिणाम सूची", empOf:"कर्मचारी:", next:"अगला ►", finish:"समाप्त ✓",
    pass:"पास ✅", fail:"फेल ❌", passMsg:"65 अंक का आवश्यक स्तर पार किया। आधिकारिक प्रमाण परीक्षा दे सकते हैं।",
    failMsg:"65 अंक का आवश्यक स्तर नहीं पहुंचा। आधिकारिक परीक्षा से पहले प्रशिक्षण की सलाह है।",
    btnNew:"नया कर्मचारी ►", btnHome:"होम", recTitle:"📋 परिणाम सूची", prev:"◄ पिछला", btnImport:"⬇ शीट से आयात करें", btnUpload:"⬆ रिकॉर्ड शीट में भेजें", btnUploadDone:"सब भेज दिया गया ✓", btnClear:"सब हटाएं 🗑", confirmClear:"पुष्टि के लिए फिर दबाएं",
    btnRecBack:"वापस", thName:"नाम", thScore:"स्कोर", thPct:"प्रतिशत", thVerdict:"परिणाम", thDate:"तारीख",
    pwTitle:"परिणाम सूची — केवल प्रबंधक", pwSub:"देखने के लिए पासवर्ड लिखें", btnUnlock:"खोलें 🔓", btnPwBack:"वापस",
    pwWrong:"गलत पासवर्ड ❌", noRecords:"अभी तक कोई परिणाम सहेजा नहीं गया", enterName:"कृपया कर्मचारी का नाम लिखें" },
  bn: { lbl:"ভাষা:", hdrTitle:"কর্মচারী স্বাস্থ্য সচেতনতা পরীক্ষা", hdrSub:"৫০টি মিশ্র প্রশ্ন",
    startTitle:"শুরু করতে কর্মচারীর নাম দিন", startSub:"শেষ হলে ফলাফল স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে", lblName:"কর্মচারীর নাম",
    btnStart:"পরীক্ষা শুরু করুন ►", navRec:"📋 ফলাফল তালিকা", empOf:"কর্মচারী:", next:"পরবর্তী ►", finish:"শেষ ✓",
    pass:"পাস ✅", fail:"ফেল ❌", passMsg:"৬৫ নম্বর এর প্রয়োজনীয় মান পেয়েছেন। সরকারি স্বাস্থ্য সনদ পরীক্ষায় বসতে পারেন।",
    failMsg:"৬৫ নম্বর এর প্রয়োজনীয় মান পৌঁছায়নি। সরকারি পরীক্ষার আগে প্রশিক্ষণ নেওয়ার পরামর্শ।",
    btnNew:"নতুন কর্মচারী ►", btnHome:"হোম", recTitle:"📋 ফলাফল তালিকা", prev:"◄ আগের", btnImport:"⬇ শিট থেকে আনুন", btnUpload:"⬆ রেকর্ড শিটে পাঠান", btnUploadDone:"সব পাঠানো হয়েছে ✓", btnClear:"সব মুছুন 🗑", confirmClear:"নিশ্চিত করতে আবার চাপুন",
    btnRecBack:"ফিরে যান", thName:"নাম", thScore:"স্কোর", thPct:"শতাংশ", thVerdict:"ফলাফল", thDate:"তারিখ",
    pwTitle:"ফলাফল তালিকা — শুধু ম্যানেজার", pwSub:"দেখতে পাসওয়ার্ড দিন", btnUnlock:"খুলুন 🔓", btnPwBack:"ফিরে যান",
    pwWrong:"ভুল পাসওয়ার্ড ❌", noRecords:"এখনো কোনো ফলাফল সংরক্ষিত নেই", enterName:"অনুগ্রহ করে কর্মচারীর নাম দিন" },
  id: { lbl:"Bahasa:", hdrTitle:"Tes Kesadaran Kesehatan Karyawan", hdrSub:"50 pertanyaan dari bank soal beragam",
    startTitle:"Masukkan nama karyawan untuk mulai", startSub:"Hasil disimpan otomatis setelah selesai", lblName:"Nama karyawan",
    btnStart:"Mulai tes ►", navRec:"📋 Daftar hasil", empOf:"Karyawan:", next:"Berikutnya ►", finish:"Selesai ✓",
    pass:"LULUS ✅", fail:"GAGAL ❌", passMsg:"Mencapai batas 65 poin dan dapat lanjut ke ujian sertifikat kesehatan resmi.",
    failMsg:"Belum mencapai batas 65 poin. Disarankan pelatihan sebelum ujian resmi.",
    btnNew:"Karyawan baru ►", btnHome:"Beranda", recTitle:"📋 Daftar hasil", prev:"◄ Sebelumnya", btnImport:"⬇ Impor dari sheet", btnUpload:"⬆ Unggah ke spreadsheet", btnUploadDone:"Semua terkirim ✓", btnClear:"Hapus semua 🗑", confirmClear:"Tekan lagi untuk konfirmasi",
    btnRecBack:"Kembali", thName:"Nama", thScore:"Skor", thPct:"Persen", thVerdict:"Hasil", thDate:"Tanggal",
    pwTitle:"Daftar hasil — khusus manajer", pwSub:"Masukkan kata sandi untuk melihat", btnUnlock:"Buka 🔓", btnPwBack:"Kembali",
    pwWrong:"Kata sandi salah ❌", noRecords:"Belum ada hasil tersimpan", enterName:"Silakan masukkan nama karyawan" }
};

const RT = {
  ar: { btnReview:"📚 مراجعة كل الأسئلة", revTitle:"مراجعة الأسئلة — كل اللغات", btnRevBack:"رجوع للسجل" },
  en: { btnReview:"📚 Review all questions", revTitle:"Question review — all languages", btnRevBack:"Back to log" },
  hi: { btnReview:"📚 सभी प्रश्न देखें", revTitle:"प्रश्न समीक्षा — सभी भाषाएँ", btnRevBack:"सूची पर वापस" },
  bn: { btnReview:"📚 সব প্রশ্ন দেখুন", revTitle:"প্রশ্ন পর্যালোচনা — সব ভাষা", btnRevBack:"তালিকায় ফিরে যান" },
  id: { btnReview:"📚 Tinjau semua soal", revTitle:"Tinjauan soal — semua bahasa", btnRevBack:"Kembali ke daftar" }
};
const STUDY_T = {
  ar: { btn:"📖 المذكرة", title:"📖 المذكرة — مراجعة قبل الاختبار", back:"رجوع", all:"الكل", prev:"السابق", next:"التالي" },
  en: { btn:"📖 Study notes", title:"📖 Study notes — review before the test", back:"Back", all:"All", prev:"Previous", next:"Next" },
  hi: { btn:"📖 अध्ययन सामग्री", title:"📖 अध्ययन सामग्री — परीक्षा से पहले समीक्षा", back:"वापस", all:"सभी", prev:"पिछला", next:"अगला" },
  bn: { btn:"📖 পড়ার নোট", title:"📖 পড়ার নোট — পরীক্ষার আগে পর্যালোচনা", back:"ফিরে যান", all:"সব", prev:"আগের", next:"পরের" },
  id: { btn:"📖 Catatan belajar", title:"📖 Catatan belajar — tinjau sebelum tes", back:"Kembali", all:"Semua", prev:"Sebelumnya", next:"Berikutnya" }
};

// Nepali: question text is translated; interface labels fall back to English for now.
[typeof CODE_T!=='undefined'&&CODE_T,typeof T!=='undefined'&&T,typeof RT!=='undefined'&&RT,typeof STUDY_T!=='undefined'&&STUDY_T].forEach(D=>{ if (D && !D.ne) D.ne = D.en; if (D && !D.te) D.te = D.en; });
