export const friends = {
  page: {
    title: "الأصدقاء",
    description: "أضف أصدقاء لتسهيل دعوتهم إلى البطولات.",
  },
  find: {
    title: "ابحث عن أصدقاء",
    placeholder: "البحث حسب اسم المستخدم",
    search: "بحث",
    searching: "البحث…",
    noResults: (query: string) => `لا توجد نتائج لـ "${query}".`,
  },
  status: {
    friends: "أنتم أصدقاء",
    requestSent: "تم إرسال الطلب",
    sentYouRequest: "أرسلت لك طلبا",
  },
  add: "إضافة صديق",
  sending: "جارٍ الإرسال...",
  accept: "قبول",
  accepting: "قبول…",
  decline: "رفض",
  cancel: "إلغاء",
  remove: "إزالة صديق",
  incomingTitle: "طلبات الصداقة",
  outgoingTitle: "في انتظار الرد",
  listTitle: "الأصدقاء",
  empty: "ليس لديك أي أصدقاء حتى الآن. ابحث عن اسم مستخدم أعلاه لإضافة شخص ما.",
  errors: {
    missingRecipient: "المستلم مفقود",
    cannotAddSelf: "لا يمكنك إضافة نفسك",
    userNotFound: "تعذر العثور على هذا المستخدم",
    alreadyFriends: "أنتم بالفعل أصدقاء",
    requestExists: "هناك بالفعل طلب صداقة بينكما",
    requestNotFound: "تعذر العثور على الطلب",
    ownerOnly: "يمكن للمنظم فقط إضافة المشاركين",
    registrationClosed: "التسجيلات مغلقة",
    notFriends: "أنتم لستم أصدقاء",
  },
};

export type FriendsDict = typeof friends;
