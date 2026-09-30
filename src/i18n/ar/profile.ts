export const profile = {
  page: {
    title: "الملف الشخصي",
    description: "راجع سجلك وحافظ على تحديث حسابك.",
    accountAndSecurity: "الحساب والأمن",
  },
  avatar: {
    title: "صورة الملف الشخصي",
    newAlt: "صورة شخصية جديدة",
    alt: "صورة الملف الشخصي",
    resizeHint: (size: number) => `يتم تصغير الصورة إلى ${size} بكسل في متصفحك قبل تحميلها، وبالتالي فإن الصور التي يتم التقاطها مباشرة من كاميرا هاتفك تعمل بشكل جيد.`,
    readFailed: "لم أستطع قراءة الصورة. جرب واحدة مختلفة.",
    noCanvas: "لا يوجد سطح رسم متاح",
    compressFailed: "لا يمكن ضغط الصورة",
    processing: "جارٍ معالجة الصورة…",
    uploading: "جارٍ التحميل…",
    upload: "تحميل",
  },
  username: {
    title: "اسم المستخدم",
    newUsername: "اسم مستخدم جديد",
    code: "رمز مكون من ستة أرقام",
    save: "احفظ اسم المستخدم",
    saving: "جارٍ الحفظ…",
  },
  passkey: {
    title: "معرف الوجه / مفتاح المرور",
    description: "قم بإعداد Face ID على جهاز iPhone الخاص بك أو مفتاح مرور على هذا الجهاز لتسجيل الدخول بشكل أسرع.",
  },
  deleteAccount: {
    title: "حذف الحساب",
    description: "يتم الاحتفاظ بالبطولات النهائية بشكل مجهول. يجب إغلاق البطولات النشطة أو حذفها أو تسليمها أولاً.",
    codePlaceholder: "رمز مكون من ستة أرقام",
    submit: "حذف الحساب",
    deleting: "جارٍ الحذف...",
  },
  errors: {
    invalidUsername: "اسم المستخدم غير صالح",
    wrongCodeForUsername: "أدخل الرمز الصحيح المكون من ستة أرقام لتغيير اسم المستخدم الخاص بك",
    usernameTaken: "اسم المستخدم هذا مأخوذ بالفعل",
    chooseImage: "اختر صورة أولاً",
    imageFormat: "يجب أن تكون الصورة بصيغة JPG أو PNG أو WebP ولا يزيد حجمها عن 2 ميجابايت",
    wrongCodeForDelete: "أدخل الرمز الصحيح المكون من ستة أرقام لحذف حسابك",
    activeTournaments: "قم بإغلاق أو حذف أو تسليم دوراتك النشطة قبل حذف حسابك",
  },
  messages: {
    usernameUpdated: "تم تحديث اسم المستخدم",
    avatarUpdated: "تم تحديث صورة الملف الشخصي",
  },
  menu: {
    greeting: (username: string) => `مرحبًا، ${username}`,
    choose: "اختر ما تريد أن تلعبه.",
    profile: "الملف الشخصي",
    friends: "الأصدقاء",
    career: {
      kicker: "فريقك",
      title: "مهنة المدير",
      description: "اختر أحد عشر لاعبًا أساسيًا، واشترِ البطاقات واربح المباريات التكتيكية ضد أصدقائك.",
      action: "فتح مهنة المدير",
    },
    tournaments: {
      kicker: "مع الأصدقاء",
      title: "البطولات",
      description: "قم بإنشاء بطولات FIFA وNHL الخاصة بك والانضمام إليها ومتابعتها.",
      action: "شاهد البطولات",
    },
    historyTitle: "وضعين، قصة واحدة",
    historyText: "يتم حفظ النتائج والمكافآت في ملفك الشخصي.",
    historyLink: "انظر الإحصائيات والمكافآت",
  },
  modeMenu: {
    back: "← القائمة",
  },
  confirmDialog: {
    title: "هل أنت متأكد؟",
    no: "لا",
    yes: "نعم",
  },
  audio: {
    turnOff: "أطفئ الموسيقى",
    play: "تشغيل موسيقى البطولة",
    label: "موسيقى البطولة",
  },
};

export type ProfileDict = typeof profile;
