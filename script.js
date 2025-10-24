// ضع مفاتيح EmailJS هنا
const EMAILJS_SERVICE_ID = 'service_48n1h2l';
const EMAILJS_TEMPLATE_ID = 'template_vijcgm2';
const EMAILJS_USER_ID = 'aLcwgRiZpco_X6_49';
const TEACHER_EMAIL = 'hziad5940@gmail.com'; // غيّره لاحقًا

// تهيئة EmailJS إذا موجود
if (window.emailjs) {
  emailjs.init(EMAILJS_USER_ID);
}

// إعدادات
const QUESTIONS_PER_FILE = 10; // 10 من كل ملف
const EXAM_DURATION_SECONDS = 30 * 60; // 30 دقيقة

function getStudentInfo() {
  return {
    name: sessionStorage.getItem('student_name') || 'طالب مجهول',
    phone: sessionStorage.getItem('student_phone') || ''
  };
}

/* --- دالة اختيار عشوائي بدون تكرار --- */
function pickRandom(arr, n) {
  const copy = arr.slice();
  const out = [];
  if (n > copy.length) n = copy.length;
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/* --- منطق صفحة الامتحان --- */
if (location.pathname.endsWith('exam.html')) {
  const studentInfo = getStudentInfo();
  const studentInfoEl = document.getElementById('studentInfo');
  if (studentInfoEl) studentInfoEl.textContent = `${studentInfo.name} — ${studentInfo.phone}`;

  let examQuestions = [];
  let timerInterval = null;
  let remaining = EXAM_DURATION_SECONDS;

  // تحميل الثلاث ملفات مع بعض
  Promise.all([
    fetch('grammar.json').then(r => r.json()),
    fetch('vocabulary.json').then(r => r.json()),
    fetch('reading.json').then(r => r.json())
  ])
    .then(([grammarData, vocabData, readingData]) => {
      const grammarQs = Array.isArray(grammarData.questions) ? grammarData.questions : [];
      const vocabQs = Array.isArray(vocabData.questions) ? vocabData.questions : [];
      const readingQs = Array.isArray(readingData.questions) ? readingData.questions : [];

      if (grammarQs.length < 10 || vocabQs.length < 10 || readingQs.length < 10) {
        alert('كل ملف يجب أن يحتوي على 10 أسئلة على الأقل.');
        return;
      }

      // اختيار عشوائي من كل ملف
      const selectedGrammar = pickRandom(grammarQs, QUESTIONS_PER_FILE);
      const selectedVocab = pickRandom(vocabQs, QUESTIONS_PER_FILE);
      const selectedReading = pickRandom(readingQs, QUESTIONS_PER_FILE);

      // دمج الكل
      examQuestions = [...selectedGrammar, ...selectedVocab, ...selectedReading];

      // shuffle خلط الأسئلة بعد الدمج
      examQuestions.sort(() => Math.random() - 0.5);

      renderExam(examQuestions);
      startTimer();
    })
    .catch(err => {
      console.error(err);
      alert('فشل تحميل ملفات الأسئلة. تأكد من وجود grammar.json و vocabulary.json و reading.json.');
    });

  // زرار التسليم
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirm('هل أنت متأكد من تسليم الاختبار؟')) return;
      gradeAndSubmit();
    });
  }

  // عرض الأسئلة
  function renderExam(questions) {
    const form = document.getElementById('examForm');
    if (!form) return;
    form.innerHTML = '';
    questions.forEach((q, qi) => {
      const qbox = document.createElement('div');
      qbox.className = 'question';
      const optsHtml = q.options.map((opt, oi) => {
        return `<label><input type="radio" name="q${qi}" value="${oi}"> ${opt}</label>`;
      }).join('');
      qbox.innerHTML = `<div class="q-head"><strong>السؤال ${qi + 1}:</strong> ${q.question}</div>
                        <div class="options">${optsHtml}</div>`;
      form.appendChild(qbox);
    });
  }

  // المؤقت
  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timerInterval);
        alert('انتهى الوقت. سيتم تسليم الاختبار تلقائياً.');
        gradeAndSubmit();
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (!el) return;
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    el.textContent = `${mm}:${ss}`;
  }

  // التصحيح والإرسال
  function gradeAndSubmit() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const answers = [];
    for (let i = 0; i < examQuestions.length; i++) {
      const sel = document.querySelector(`input[name=q${i}]:checked`);
      answers.push(sel ? Number(sel.value) : null);
    }

    let correct = 0;
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i];
      // دعم الحالتين: correctIndex أو answer نصي
      if (q.correctIndex !== undefined && answers[i] === q.correctIndex) correct++;
      else if (q.answer && q.options[answers[i]] === q.answer) correct++;
    }
const score = correct; // 0..30

let level = '';
if (score <= 5) level = 'Beginner 1';
else if (score <= 10) level = 'A1';
else if (score <= 15) level = 'A2';
else if (score <= 20) level = 'B1';
else if (score <= 25) level = 'B1+';
else level = 'B2';


    sessionStorage.setItem('last_score', score);
    sessionStorage.setItem('last_level', level);
    sessionStorage.setItem('last_correct', correct);

    sendResultEmail(getStudentInfo().name, getStudentInfo().phone, score, level)
      .then(() => window.location.href = 'result.html')
      .catch(() => window.location.href = 'result.html');
  }

  function sendResultEmail(name, phone, score, level) {
    return new Promise((resolve, reject) => {
      if (!window.emailjs) return reject('EmailJS not loaded');
      const templateParams = {
        teacher_email: TEACHER_EMAIL,
        student_name: name,
        student_phone: phone,
        score: score,
        level: level
      };
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(resolve)
        .catch(reject);
    });
  }
}

/* --- صفحة النتيجة --- */
if (location.pathname.endsWith('result.html')) {
  const box = document.getElementById('resultBox');
  if (!box) console.warn('resultBox element not found');
  const name = sessionStorage.getItem('student_name') || 'طالب';
  const phone = sessionStorage.getItem('student_phone') || '';
  const score = sessionStorage.getItem('last_score');
  const level = sessionStorage.getItem('last_level');
  const correct = sessionStorage.getItem('last_correct');

  if (score == null) {
    box.innerHTML = `<p>لم يتم العثور على نتيجة. تأكد من إكمال الاختبار.</p>`;
  } else {
    box.innerHTML = `
      <p><strong>الاسم:</strong> ${name}</p>
      <p><strong>رقم الهاتف:</strong> ${phone}</p>
      <p><strong>الدرجة:</strong> ${score} / 30</p>
      <p><strong>المستوى:</strong> ${level}</p>
      <p>عدد الإجابات الصحيحة: ${correct}</p>
    `;
  }
}
