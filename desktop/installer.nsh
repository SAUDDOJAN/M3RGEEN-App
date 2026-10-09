!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "مرحباً بك في برنامج المعرقين"
  !define MUI_WELCOMEPAGE_TEXT "أهلاً بك في رفيقك التكتيكي لمجتمع Aion 2!$\r$\n$\r$\nجهز عتادك، وتابع مؤقتات الفعاليات والرادار المباشر، وتواصل مع فرق الجيلد لاكتساح الأنشطة والصعود إلى القمة نحو النصر!$\r$\n$\r$\nانقر فوق (التالي) للمتابعة وتثبيت البرنامج على جهازك."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "إلغاء تثبيت برنامج المعرقين"
  !define MUI_WELCOMEPAGE_TEXT "نأسف لرحيلك...$\r$\n$\r$\nنعتذر لك بشدة إذا واجهت أي تقصير أو لم ينل البرنامج إعجابك الكامل. نتمنى لك كل التوفيق في مغامراتك القادمة، وأبواب مجتمع المعرقين ستبقى دائماً مفتوحة لعودتك في أي وقت!$\r$\n$\r$\nانقر فوق (إلغاء التثبيت) لبدء إزالة البرنامج من جهازك."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
