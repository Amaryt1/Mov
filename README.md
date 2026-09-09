# ULLVO+ Web

واجهة Web مستقلة مستوحاة من تجربة منصات المشاهدة، مع كتالوج كبير قابل للتحديث تلقائياً.

## المزايا

- GitHub Pages بدون استضافة تقليدية.
- أفلام ومسلسلات.
- بحث محلي سريع.
- صفحات تفاصيل.
- صور وbackdrops.
- تحديث يومي بواسطة GitHub Actions.
- لا توجد مفاتيح API داخل JavaScript الخاص بالموقع.

## التشغيل على GitHub Pages

1. أضف `TMDB_API_KEY` من `Settings > Secrets and variables > Actions`.
2. من `Settings > Pages` اختر `GitHub Actions`.
3. شغّل workflow باسم `Sync catalog` يدوياً أول مرة.
4. Workflow `Deploy to GitHub Pages` ينشر الموقع تلقائياً.

## ملاحظة المحتوى

المشروع يستخدم بيانات metadata للكتالوج. المشاهدة الفعلية يجب ربطها بمصادر فيديو تملك حق استخدامها. لا يحتوي المشروع على روابط بث غير مصرّح بها.

## التقنية

HTML/CSS/JavaScript خفيف + GitHub Pages + GitHub Actions + TMDB metadata API.
