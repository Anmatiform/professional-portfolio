# ملف الأعمال

موقع ثابت جاهز لـ GitHub Pages، يجمع ثلاث صفحات بواجهة رئيسية عربية. نُسخت صفحات المشاريع وملفاتها التابعة كما هي دون تعديل.

## المحتويات

- `index.html`: الصفحة الرئيسية الجديدة.
- `assets/portfolio.css`: تنسيق الرئيسية فقط.
- `projects/mep-tracker/`: نظام متابعة أعمال MEP، مع ملفات CSS وJavaScript الأصلية.
- `projects/employee-extractor/index.html`: أداة استخراج الموظفين.
- `projects/greywater/greywater-code.html`: صفحة مشروع المياه المحددة.
- `.nojekyll`: ملف فارغ لتقديم الموقع مباشرة دون معالجة Jekyll.

## الرفع إلى GitHub Pages

1. أنشئ مستودعًا في حسابك على GitHub.
2. ارفع **محتويات هذا المجلد** إلى جذر المستودع؛ يجب أن يكون `index.html` في الجذر، مع مجلدي `assets` و`projects`. عند استخدام Git محليًا تأكد من تضمين `.nojekyll` أيضًا.
3. افتح `Settings → Pages` في المستودع.
4. في `Build and deployment` اختر `Deploy from a branch`.
5. اختر الفرع الذي رفعت إليه الملفات (غالبًا `main`) والمجلد `/(root)`، ثم `Save`.
6. بعد اكتمال النشر، خذ رابط الموقع من صفحة الإعدادات نفسها وأرسله للشركات.

الرابط المعتاد: `https://USERNAME.github.io/REPOSITORY/`، مع استبدال القيم باسم حسابك ومستودعك.

[تعليمات GitHub الرسمية](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## المعاينة

افتح `index.html` في المتصفح مباشرة. لا يحتاج الموقع إلى تثبيت حزم أو خطوة بناء.

## ملاحظات العرض

- نظام MEP نسخة عرض ببيانات تجريبية في ذاكرة المتصفح؛ تحديث الصفحة يعيد الحالة الابتدائية.
- صفحة المياه هي `greywater-code.html` فقط. الصفحتان الأخريان للمياه غير مضمّنتين.
- صفحات المشاريع تحتفظ بتصميمها وأبعادها الأصلية كما طلبت؛ الرئيسية الجديدة تتكيف مع الجوال.
- روابط المشاريع نسبية لتعمل داخل مسار مستودع GitHub Pages.
- المستودع: https://github.com/Anmatiform/professional-portfolio
- رابط الموقع: https://anmatiform.github.io/professional-portfolio/
