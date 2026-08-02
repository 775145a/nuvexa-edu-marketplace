export interface LegalSection {
  heading: string;
  content: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const TERMS_AR: string[] = [
  'باستخدام منصة Nuvexa فإنك توافق على جميع هذه الشروط والأحكام.',
  'يجب أن تكون جميع المعلومات المقدمة أثناء إنشاء الحساب صحيحة وحديثة، ويتحمل المستخدم مسؤولية أي معلومات غير صحيحة.',
  'يلتزم المستخدم بالحفاظ على سرية بيانات تسجيل الدخول، ويتحمل مسؤولية جميع الأنشطة التي تتم من خلال حسابه.',
  'يمنع إنشاء أكثر من حساب بغرض التحايل أو إساءة استخدام المنصة.',
  'يتحمل المدرب المسؤولية الكاملة عن جميع الكورسات والملفات والفيديوهات والصور التي يقوم برفعها.',
  'يمنع نشر أي محتوى منسوخ أو مسروق أو ينتهك حقوق الملكية الفكرية أو حقوق النشر.',
  'يمنع نشر أي محتوى يحتوي على إساءة أو تمييز أو تحريض أو مواد مخالفة للقوانين أو الآداب العامة.',
  'جميع الكورسات تخضع للمراجعة قبل النشر، ويحق لإدارة Nuvexa قبول أو رفض أي كورس أو طلب تعديله دون إبداء الأسباب.',
  'يحق للإدارة حذف أو إيقاف أي محتوى أو حساب يخالف هذه الشروط في أي وقت.',
  'بعد شراء الكورس يمنح الطالب حق الوصول إليه وفق سياسة المنصة، ولا يجوز مشاركة الحساب أو إعادة بيع المحتوى أو توزيعه بأي وسيلة.',
  'يمنع تصوير أو نسخ أو إعادة نشر أو بيع أو مشاركة أي جزء من محتوى الكورسات دون موافقة كتابية من صاحب الحقوق.',
  'يلتزم المدرب بتقديم محتوى تعليمي واضح وذي جودة مناسبة، ويحق للإدارة تعليق أو حذف الكورسات التي لا تستوفي معايير الجودة.',
  'جميع المدفوعات تتم عبر وسائل الدفع المعتمدة داخل المنصة.',
  'تخضع عمليات الاسترداد أو الإلغاء لسياسة الاسترداد المعتمدة في المنصة.',
  'تحتفظ Nuvexa بحق تعديل الرسوم أو العمولات أو الخدمات أو المزايا مع إشعار المستخدمين عند الحاجة.',
  'يحق للإدارة تعليق أو إغلاق أي حساب يشتبه في وجود نشاط احتيالي أو استخدام غير مشروع.',
  'يوافق المستخدم على عدم محاولة اختراق المنصة أو تعطيلها أو الوصول غير المصرح به إلى أي بيانات أو حسابات.',
  'تلتزم Nuvexa بحماية بيانات المستخدمين وفق سياسة الخصوصية، ولن يتم استخدام البيانات إلا للأغراض المتعلقة بتقديم خدمات المنصة أو وفقًا لما يقتضيه القانون.',
  'يحق لإدارة Nuvexa تعديل هذه الشروط في أي وقت، ويعد استمرار استخدام المنصة موافقة على آخر إصدار منها.',
  'في حال مخالفة أي بند من هذه الشروط، يحق لإدارة Nuvexa اتخاذ الإجراءات المناسبة، بما في ذلك تعليق أو حذف الحساب، وإزالة المحتوى المخالف، واتخاذ الإجراءات القانونية عند الضرورة.',
];

const TERMS_EN: string[] = [
  'By using the Nuvexa platform, you agree to all of these terms and conditions.',
  'All information provided during account creation must be accurate and up to date. The user is responsible for any incorrect information.',
  'The user must keep login credentials confidential and is responsible for all activities performed through their account.',
  'Creating more than one account for the purpose of circumvention or misuse of the platform is prohibited.',
  'The instructor bears full responsibility for all courses, files, videos, and images they upload.',
  'Publishing any copied, stolen, or pirated content, or content that violates intellectual property or copyright, is prohibited.',
  'Publishing any content that contains abuse, discrimination, incitement, or material that violates laws or public morals is prohibited.',
  'All courses are subject to review before publishing. Nuvexa management may accept or reject any course or request changes without stating reasons.',
  'Management may delete or suspend any content or account that violates these terms at any time.',
  'After purchasing a course, the student is granted access in accordance with the platform policy. Sharing accounts or reselling or distributing content by any means is not permitted.',
  'Recording, copying, republishing, selling, or sharing any part of the course content is prohibited without written consent from the rights holder.',
  'The instructor must provide clear, quality educational content. Management may suspend or remove courses that do not meet quality standards.',
  'All payments are made through the payment methods approved within the platform.',
  'Refunds and cancellations are subject to the refund policy approved on the platform.',
  'Nuvexa reserves the right to modify fees, commissions, services, or benefits with notice to users when necessary.',
  'Management may suspend or close any account suspected of fraudulent activity or unlawful use.',
  'The user agrees not to attempt to hack, disrupt, or gain unauthorized access to the platform, or to any data or accounts.',
  'Nuvexa is committed to protecting user data in accordance with the privacy policy. Data will only be used for purposes related to providing platform services or as required by law.',
  'Nuvexa management may modify these terms at any time. Continued use of the platform constitutes acceptance of the latest version.',
  'In the event of a violation of any of these terms, Nuvexa management may take appropriate action, including suspending or deleting the account, removing violating content, and taking legal action when necessary.',
];

export const legal: Record<'ar' | 'en', { terms: LegalDoc; privacy: LegalDoc }> = {
  ar: {
    terms: {
      title: 'شروط استخدام منصة Nuvexa',
      updated: 'آخر تحديث: ٢ أغسطس ٢٠٢٦',
      intro: 'مرحبًا بك في منصة Nuvexa للتعليم عبر الإنترنت. هذه الشروط والأحكام تحكم استخدامك للمنصة، وباستخدامك لها فإنك تقر بقراءتك وفهمك وموافقتك على جميع البنود التالية.',
      sections: TERMS_AR.map((text, i) => ({ heading: String(i + 1), content: [text] })),
    },
    privacy: {
      title: 'سياسة الخصوصية لمنصة Nuvexa',
      updated: 'آخر تحديث: ٢ أغسطس ٢٠٢٦',
      intro: 'نلتزم في منصة Nuvexa بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة أنواع البيانات التي نجمعها، وكيفية استخدامها وحمايتها، وحقوقك فيما يتعلق بها.',
      sections: [
        {
          heading: '١. البيانات التي نجمعها',
          content: [
            'بيانات الحساب: الاسم الكامل، البريد الإلكتروني، رقم الهاتف، كلمة المرور (مشفرة)، ودور المستخدم (طالب أو مدرب).',
            'بيانات الاستخدام: الكورسات التي تسجل بها، تقدمك في التعلم، نتائج الاختبارات، التقييمات، والطلبات.',
            'بيانات الدفع: تتم معالجة المدفوعات عبر مزودي الدفع المعتمدين، ولا نقوم بتخزين بيانات بطاقات الدفع الكاملة.',
            'البيانات الفنية: عنوان IP، نوع المتصفح، نظام التشغيل، وملفات تعريف الارتباط (Cookies).',
          ],
        },
        {
          heading: '٢. كيف نستخدم بياناتك',
          content: [
            'لتقديم وتحسين خدمات المنصة، وتخصيص تجربتك التعليمية.',
            'لمعالجة عمليات الشراء وإصدار الشهادات وتوثيق الإنجازات.',
            'لإرسال إشعارات مهمة متعلقة بحسابك أو الكورسات التي تشترك فيها.',
            'للتواصل معك بشأن الدعم الفني والرد على استفساراتك.',
            'لتحسين الأمان ومنع الاحتيال وسوء الاستخدام.',
          ],
        },
        {
          heading: '٣. مشاركة البيانات',
          content: [
            'لا نبيع بياناتك الشخصية أو نشاركها مع أطراف ثالثة لأغراض تسويقية.',
            'قد يتم مشاركة الحد الأدنى الضروري من البيانات مع مزودي الدفع وخدمات الاستضافة والبريد الإلكتروني لتشغيل المنصة.',
            'قد نكشف عن البيانات عند اقتضاء القانون أو لحماية حقوق المنصة ومستخدميها.',
            'يرى المدربون اسمك فقط داخل الكورسات التي تسجل بها لأغراض المتابعة والتقييم.',
          ],
        },
        {
          heading: '٤. حماية البيانات',
          content: [
            'نستخدم تشفير البيانات أثناء النقل (TLS) وتشفير كلمات المرور (bcrypt).',
            'نطبق إجراءات أمنية لحماية البيانات من الوصول غير المصرح به أو التعديل أو الكشف.',
            'لا توجد طريقة نقل أو تخزين آمنة بنسبة 100%، ولا يمكننا ضمان الأمان المطلق.',
          ],
        },
        {
          heading: '٥. ملفات تعريف الارتباط والتقنيات',
          content: [
            'نستخدم ملفات تعريف الارتباط لتخزين جلسة تسجيل الدخول وتفضيلات اللغة وتحسين الأداء.',
            'يمكنك تعطيل ملفات تعريف الارتباط من إعدادات المتصفح، وقد يؤثر ذلك على بعض وظائف المنصة.',
          ],
        },
        {
          heading: '٦. حقوقك',
          content: [
            'يمكنك تحديث بيانات حسابك أو طلب حذفه في أي وقت.',
            'لك الحق في طلب نسخة من بياناتك الشخصية المحفوظة لدينا.',
            'يمكنك إلغاء الاشتراك من أي رسائل غير ضرورية.',
            'تواصل معنا لأي طلب متعلق ببياناتك عبر وسائل التواصل المذكورة في نهاية هذه السياسة.',
          ],
        },
        {
          heading: '٧. خصوصية الأطفال',
          content: [
            'المنصة موجهة لمن هم في سن ١٣ عامًا أو أكبر، ولا نجمع عمدًا بيانات من الأطفال دون سن ١٣ عامًا.',
            'إذا اكتشفنا جمع بيانات من طفل دون السن القانونية، سنقوم بحذفها فورًا.',
          ],
        },
        {
          heading: '٨. التعديلات على هذه السياسة',
          content: [
            'قد نحدّث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تعديلات في هذه الصفحة.',
            'استمرار استخدامك للمنصة بعد نشر التعديلات يعتبر موافقة على السياسة المحدثة.',
          ],
        },
        {
          heading: '٩. التواصل معنا',
          content: [
            'لأي استفسار بخصوص هذه السياسة أو بياناتك، يمكنك التواصل معنا عبر البريد الإلكتروني: almisriualqaysar@gmail.com أو عبر واتساب: 01003677165.',
          ],
        },
      ],
    },
  },
  en: {
    terms: {
      title: 'Nuvexa Terms of Use',
      updated: 'Last updated: August 2, 2026',
      intro: 'Welcome to the Nuvexa online learning platform. These terms and conditions govern your use of the platform. By using it, you acknowledge that you have read, understood, and agreed to all of the following clauses.',
      sections: TERMS_EN.map((text, i) => ({ heading: String(i + 1), content: [text] })),
    },
    privacy: {
      title: 'Nuvexa Privacy Policy',
      updated: 'Last updated: August 2, 2026',
      intro: 'Nuvexa is committed to protecting your privacy and personal data. This policy explains the types of data we collect, how we use and protect it, and your rights regarding it.',
      sections: [
        {
          heading: '1. Information We Collect',
          content: [
            'Account data: full name, email address, phone number, encrypted password, and user role (student or instructor).',
            'Usage data: courses you enroll in, learning progress, exam results, reviews, and orders.',
            'Payment data: payments are processed through approved payment providers. We do not store full card details.',
            'Technical data: IP address, browser type, operating system, and cookies.',
          ],
        },
        {
          heading: '2. How We Use Your Data',
          content: [
            'To provide and improve the platform services and personalize your learning experience.',
            'To process purchases, issue certificates, and verify achievements.',
            'To send important notifications related to your account or enrolled courses.',
            'To contact you regarding technical support and respond to your inquiries.',
            'To enhance security and prevent fraud and misuse.',
          ],
        },
        {
          heading: '3. Data Sharing',
          content: [
            'We do not sell your personal data or share it with third parties for marketing purposes.',
            'The minimum necessary data may be shared with payment providers, hosting, and email services to operate the platform.',
            'We may disclose data when required by law or to protect the rights of the platform and its users.',
            'Instructors only see your name within the courses you enroll in for tracking and assessment purposes.',
          ],
        },
        {
          heading: '4. Data Security',
          content: [
            'We use transport encryption (TLS) and password hashing (bcrypt).',
            'We apply security measures to protect data from unauthorized access, modification, or disclosure.',
            'No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.',
          ],
        },
        {
          heading: '5. Cookies & Technologies',
          content: [
            'We use cookies to store your login session, language preference, and improve performance.',
            'You may disable cookies in your browser settings, which may affect some platform features.',
          ],
        },
        {
          heading: '6. Your Rights',
          content: [
            'You can update your account data or request its deletion at any time.',
            'You have the right to request a copy of your personal data stored with us.',
            'You can unsubscribe from any non-essential communications.',
            'Contact us for any request related to your data via the channels listed at the end of this policy.',
          ],
        },
        {
          heading: '7. Children\'s Privacy',
          content: [
            'The platform is intended for users aged 13 or older, and we do not knowingly collect data from children under 13.',
            'If we discover that we have collected data from a child below the legal age, we will delete it immediately.',
          ],
        },
        {
          heading: '8. Changes to This Policy',
          content: [
            'We may update the privacy policy from time to time. Any changes will be posted on this page.',
            'Continued use of the platform after changes are posted constitutes acceptance of the updated policy.',
          ],
        },
        {
          heading: '9. Contact Us',
          content: [
            'For any questions regarding this policy or your data, contact us at almisriualqaysar@gmail.com or via WhatsApp at 01003677165.',
          ],
        },
      ],
    },
  },
};
