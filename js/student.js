// js/student.js
// إعداد Firebase
var firebaseConfig = {
  apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxx",
  authDomain: "quiz-262a8.firebaseapp.com",
  databaseURL: "https://quiz26-caf2f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "quiz-262a8",
  storageBucket: "quiz-262a8.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

console.log("المادة المخزنة:", sessionStorage.getItem("material"));
const sessionDataFromStorage = JSON.parse(sessionStorage.getItem("currentSession"));
const material = sessionDataFromStorage ? sessionDataFromStorage.material : null;
console.log("المادة المخزنة:", material);

let data = [];
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let total = 0;
let studentAnswers = {};
let studentId = "";
let studentName = "";
let selectedMaterial = "";
let sectionTime = 25 * 60; // 25 دقيقة كبداية

// ⭐ استرجاع التقدم إذا كان موجودًا
currentIndex = Number(sessionStorage.getItem("currentIndex") || 0);
studentAnswers = JSON.parse(sessionStorage.getItem("studentAnswers") || "{}");
sectionTime = Number(sessionStorage.getItem("sectionTime") || sectionTime);

// لتجميع درجات المهارات
let skillStats = {};

// 1) استرجاع بيانات الجلسة
const sessionDataRaw = sessionStorage.getItem("currentSession");
if (!sessionDataRaw) {
    alert("لا توجد جلسة نشطة، الرجاء الدخول من الصفحة الرئيسية.");
    window.location.href = "index.html";
} else {
    const sessionData = JSON.parse(sessionDataRaw);
    studentId = sessionData.id;
    studentName = sessionData.name;
    selectedMaterial = sessionData.material;

    document.getElementById("studentInfo").innerHTML = `
        <p><b>الطالب:</b> ${studentName} (${studentId})</p>
        <p><b>المادة:</b> ${selectedMaterial}</p>
    `;
}

// ⭐ فحص هل الطالب حل هذا الاختبار اليوم أم لا
function checkAlreadySubmitted() {
    const today = new Date().toISOString().split("T")[0];
    const uniqueKey = `${studentId}_${selectedMaterial}_${today}`;

    db.ref("results/" + uniqueKey).once("value")
      .then(snapshot => {
          if (snapshot.exists()) {
              // الطالب حل هذا القسم اليوم مسبقًا
              document.body.innerHTML = `
                  <div style="text-align:center; margin-top:80px; font-size:24px;">
                      <b>لقد قمت بحل اختبار هذه المادة اليوم</b><br><br>
                      لا يمكنك إعادة المحاولة إلا غدًا.<br><br>
                      إذا كنت تحتاج لمحاولة إضافية، تواصل مع المعلم.
                  </div>
              `;
              return;
          }

          // لا توجد نتيجة اليوم → نبدأ تحميل الأسئلة
          loadQuestionsAndStart();
      })
      .catch(err => {
          console.error("خطأ في فحص نتيجة الطالب:", err);
          alert("حدث خطأ في الاتصال بقاعدة البيانات، الرجاء المحاولة لاحقًا.");
          window.location.href = "index.html";
      });
}

// 2) تحميل الأسئلة وبدء الاختبار
function loadQuestionsAndStart() {
    fetch("data/questions.json")
      .then(res => res.json())
      .then(json => {
          data = json;
          const selected = data.find(m => m.name === selectedMaterial);

          if (!selected) {
              alert("لم يتم العثور على أسئلة لهذه المادة");
              window.location.href = "index.html";
              return;
          }

          currentQuestions = selected.questions;
          total = currentQuestions.length;

          currentQuestions.forEach(q => {
              if (!skillStats[q.skill]) {
                  skillStats[q.skill] = { correct: 0, total: 0 };
              }
              skillStats[q.skill].total++;
          });

          createQuestionBoxes();
          startSectionTimer();
          loadQuestion();

      })
      .catch(err => {
          console.error("خطأ في تحميل questions.json", err);
          alert("خطأ في تحميل الأسئلة");
      });
}

// استدعاء البداية بعد التأكد من الجلسة
checkAlreadySubmitted();

function createQuestionBoxes() {
    let container = document.getElementById("questionBoxes");
    container.innerHTML = "";

    for (let i = 0; i < currentQuestions.length; i++) {
        container.innerHTML += `
            <div class="question-box-item" id="qb-${i}">
                ${i + 1}
            </div>
        `;
    }
}

function renderContent(value) {
    // لو القيمة فاضية أو undefined أو null
    if (value === null || value === undefined) return "";

    // حوّل القيمة إلى نص دائمًا
    let v = String(value).trim();
    if (v === "") return "";

    // إذا كانت القيمة رابط صورة
    if (
        v.endsWith(".png") ||
        v.endsWith(".jpg") ||
        v.endsWith(".jpeg") ||
        v.endsWith(".gif")
    ) {
        return `<img src="${v}" class="choice-image">`;
    }

    // إذا كانت نص + صورة (مفصولة بـ | )
    if (v.includes("|")) {
        let parts = v.split("|").map(p => p.trim());
        let html = "";
        parts.forEach(p => {
            if (
                p.endsWith(".png") ||
                p.endsWith(".jpg") ||
                p.endsWith(".jpeg") ||
                p.endsWith(".gif")
            ) {
                html += `<img src="${p}" class="choice-image">`;
            } else {
                html += `<p>${p}</p>`;
            }
        });
        return html;
    }

    // نص أو رقم فقط
    return `<p>${v}</p>`;
}

// مؤقت القسم
let sectionTimer = null;

// 3) مؤقت القسم
function startSectionTimer() {
    const totalTime = sectionTime;

    sectionTimer = setInterval(() => {
        sectionTime--;
        sessionStorage.setItem("sectionTime", sectionTime);

        const minutes = Math.floor(sectionTime / 60);
        const seconds = sectionTime % 60;

        const timeDisplay = document.getElementById("timeLeftDisplay");
        if (timeDisplay) {
            timeDisplay.textContent =
                `الوقت المتبقي: ${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
        }

        const bar = document.getElementById("timeBar");
        if (bar) {
            const percent = (sectionTime / totalTime) * 100;
            bar.style.width = percent + "%";
        }

        if (sectionTime <= 0) {
            clearInterval(sectionTimer);

            if (!sessionStorage.getItem("sectionDone")) {
                sessionStorage.setItem("sectionDone", "yes");
                goToNextSection();
            } else {
                saveResult();
                showFinalResult();
            }
        }

    }, 1000);
}

// 4) تحميل سؤال
function loadQuestion() {
    const q = currentQuestions[currentIndex];

    // ⭐ تمييز السؤال النشط
    document.querySelectorAll(".question-box-item").forEach((box, index) => {
        box.classList.toggle("active", index === currentIndex);
    });

    if (!q) {
        saveResult();
        showFinalResult();
        return;
    }

    document.getElementById("quizArea").style.display = "block";

    document.getElementById("quizArea").innerHTML = `
        <div class="question-box">
            ${renderContent(q.q)}
        </div>

        <form id="optionsForm">

            <label class="option">
                <input type="radio" name="answer" value="0">
                ${renderContent(q.a)}
            </label>

            <label class="option">
                <input type="radio" name="answer" value="1">
                ${renderContent(q.b)}
            </label>

            <label class="option">
                <input type="radio" name="answer" value="2">
                ${renderContent(q.c)}
            </label>

            <label class="option">
                <input type="radio" name="answer" value="3">
                ${renderContent(q.d)}
            </label>

        </form>

        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="next-btn" style="flex:1;" onclick="previousQuestion()">السابق</button>
            <button class="next-btn" style="flex:1;" onclick="submitAnswer()">التالي</button>
        </div>
    `;

    // إعادة اختيار الإجابة السابقة إن وجدت
    if (studentAnswers[currentIndex] !== undefined) {
        const prev = studentAnswers[currentIndex];
        const radio = document.querySelector(`input[name="answer"][value="${prev}"]`);
        if (radio) radio.checked = true;
    }
}

// زر السابق
window.previousQuestion = function () {
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    }
};

// 5) التحقق من الإجابة
window.submitAnswer = function () {
    const selected = document.querySelector('input[name="answer"]:checked');
    console.log("إجابات الطالب حتى الآن:", studentAnswers);

    if (!selected) {
        alert("الرجاء اختيار إجابة");
        return;
    }

    const choice = Number(selected.value);
    const q = currentQuestions[currentIndex];

    // حفظ الإجابة في الذاكرة
    studentAnswers[currentIndex] = choice;

    // تحديث الدرجات
    if (choice === q.correct) {
        score++;
        if (skillStats[q.skill]) {
            skillStats[q.skill].correct++;
        }
    }

    // ⭐ حفظ التقدم
    sessionStorage.setItem("currentIndex", currentIndex);
    sessionStorage.setItem("studentAnswers", JSON.stringify(studentAnswers));
    sessionStorage.setItem("sectionTime", sectionTime);

    currentIndex++;
    loadQuestion();
};

// 6) حفظ النتيجة (Firebase)
function saveResult() {

    const attemptsKey = `${studentId}_${selectedMaterial}_attempts`;
    let attemptsCount = Number(localStorage.getItem(attemptsKey) || "0");
    attemptsCount++;
    localStorage.setItem(attemptsKey, attemptsCount.toString());

    let skillsResult = {};
    const skillNames = Object.keys(skillStats);
    skillNames.forEach(skillName => {
        const st = skillStats[skillName];
        const percent = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
        skillsResult[skillName] = {
            correct: st.correct,
            total: st.total,
            percent: percent
        };
    });

    const result = {
        id: studentId,
        name: studentName,
        material: selectedMaterial,
        score: score,
        total: total,
        percent: total > 0 ? Math.round((score / total) * 100) : 0,
        attempt: attemptsCount,
        skills: skillsResult,
        date: new Date().toISOString().split("T")[0]
    };

    const today = result.date;
    const uniqueKey = `${studentId}_${selectedMaterial}_${today}`;

    // التحقق من محاولة اليوم
    db.ref("results/" + uniqueKey).once("value", snapshot => {

        if (snapshot.exists()) {
            document.body.innerHTML = `
                <div style="text-align:center; margin-top:80px; font-size:24px;">
                    <b>لقد قمت بحل اختبار هذه المادة اليوم</b><br><br>
                    لا يمكنك إعادة المحاولة إلا غدًا.<br><br>
                    إذا كنت تحتاج لمحاولة إضافية، تواصل مع المعلم.
                </div>
            `;
            return;
        }

        // حفظ النتيجة
        db.ref("results/" + uniqueKey).set(result)
            .then(() => console.log("تم حفظ النتيجة في Firebase"))
            .catch(err => console.error("خطأ:", err));
    });
}

// 7) عرض النتيجة النهائية
function showFinalResult() {
    if (sectionTimer) {
        clearInterval(sectionTimer);
    }

    let skillHtml = "";
    const skillNames = Object.keys(skillStats);

    skillNames.forEach(skillName => {
        const st = skillStats[skillName];
        const percent = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
        skillHtml += `
            <p><b>${skillName}:</b> ${st.correct} من ${st.total} (${percent}%)</p>
        `;
    });

    // ⭐ مسح تقدم الطالب بعد إنهاء الاختبار
    sessionStorage.removeItem("currentIndex");
    sessionStorage.removeItem("studentAnswers");
    sessionStorage.removeItem("sectionTime");

    document.getElementById("quizArea").innerHTML = `
        <h3>انتهى الاختبار</h3>
        <p>الطالب: <b>${studentName}</b></p>
        <p>درجتك: ${score} من ${total}</p>
        <p>النسبة العامة: ${total > 0 ? Math.round((score / total) * 100) : 0}%</p>
        <hr />
        <h4>درجات المهارات:</h4>
        ${skillHtml}
    `;

    const retryBtn = document.getElementById("retryBtn");
    const nextBtn = document.getElementById("nextSectionBtn");

    if (retryBtn) {
        retryBtn.style.display = "inline-block";
        retryBtn.onclick = () => forceExit();
    }

    const sectionDone = sessionStorage.getItem("sectionDone");

    if (nextBtn) {
        if (!sectionDone) {
            nextBtn.style.display = "inline-block";
        } else {
            nextBtn.style.display = "none";
        }
    }

    if (!sectionDone) {
        sessionStorage.setItem("sectionDone", "yes");
    }
}

// 8) زر إنهاء
function forceExit() {
    if (sectionTimer) {
        clearInterval(sectionTimer);
    }
    window.location.href = "index.html";
}

// 9) زر القسم التالي
function goToNextSection() {
    const sessionData = JSON.parse(sessionStorage.getItem("currentSession"));
    const currentMaterial = sessionData.material;

    if (currentMaterial === "كمي") {
        sessionData.material = "لفظي";
    } 
    else if (currentMaterial === "لفظي") {
        sessionData.material = "كمي";
    }

    sessionStorage.setItem("material", sessionData.material);
    sessionStorage.setItem("currentSession", JSON.stringify(sessionData));
    window.location.href = "student.html";
}
