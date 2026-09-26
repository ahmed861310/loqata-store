# Loqata Android v0.3 Performance

هذه أول نواة Android مستقلة لتطبيق لقطة، مرتبطة بنفس Backend الحالي.

## الموجود في النسخة
- Android native (Java/XML)، وليست WebView.
- `compileSdk = 36` و `targetSdk = 36`.
- جلب المنتجات مباشرة من `/api/products`.
- بحث المنتجات.
- سلة محفوظة محليًا.
- حفظ الاسم والهاتف والعنوان محليًا.
- جلب مناطق التوصيل من `/api/shipping-settings`.
- مسار COD كامل مبدئيًا:
  1) Request OTP
  2) Verify OTP
  3) Create Order
  4) فتح واتساب بعد نجاح الطلب
- لا توجد أي مفاتيح Paymob أو SMS داخل التطبيق.

## بيانات الاتصال
`app/build.gradle.kts`
- `API_BASE_URL`
- `WHATSAPP_NUMBER`

## قبل البناء
1. افتح المشروع في Android Studio حديث.
2. تأكد من تثبيت Android SDK 36 وJDK 17.
3. Sync Gradle.
4. اختبر Debug على جهاز حقيقي.
5. لا تنتقل إلى Release/AAB قبل نجاح OTP على Backend.

## المرحلة التالية
- تسجيل/دخول العميل Native مع CookieJar آمن.
- الدفع الإلكتروني Native/Hosted Checkout بطريقة متوافقة مع Paymob.
- سجل الطلبات والإشعارات.
- سياسة الخصوصية + حذف الحساب.
- أيقونة وهوية بصرية نهائية.
- Signing config ثم AAB للنشر.


## ما الجديد في v0.2
- واجهة أهدأ وأقل ازدحامًا.
- ألوان محايدة مريحة للعين.
- بطاقات منتجات أبسط.
- شريط سلة ثابت وواضح.
- الاحتفاظ بحفظ بيانات العميل والتعبئة التلقائية.
- لا تغيير في نسخة الويب الأصلية.


راجع `PERFORMANCE_READINESS.md` لمعرفة تحسينات الأداء واختبار النسخة.
