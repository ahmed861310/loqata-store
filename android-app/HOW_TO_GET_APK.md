# استخراج APK بدون Android Studio

هذه النسخة مجهزة ليبني GitHub Actions ملف APK تجريبي تلقائيًا.

## المطلوب
1. أنشئ Repository جديدًا على GitHub.
2. ارفع **محتويات** هذا المشروع إلى جذر الـRepository، وليس ملف ZIP نفسه.
3. افتح تبويب **Actions**.
4. اختر **Build Loqata APK**.
5. اضغط **Run workflow**.
6. بعد نجاح البناء افتح نفس Run.
7. في قسم **Artifacts** نزّل:
   `Loqata-Android-v0.3.1-debug`
8. فك الملف، وستجد:
   `app-debug.apk`
9. ثبّت APK على موبايل Android للتجربة.

## مهم
- هذا APK تجريبي Debug وليس نسخة Google Play النهائية.
- OTP الحقيقي لن ينجح قبل اكتمال إعداد SMS Misr/Sender ID على الـBackend.
- لا توجد مفاتيح SMS أو Paymob داخل التطبيق.
- نسخة الويب الأصلية لم تتغير.
