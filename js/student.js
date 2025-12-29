// js/student.js
// إعداد Firebase
// إعداد Firebase
var firebaseConfig = {
  apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxx",
  authDomain: "quiz-262a8.firebaseapp.com",
  databaseURL: "https://quiz-262a8-default-rtdb.firebaseio.com",
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

let studentId = "";
let studentName = "";
let selectedMaterial = "";

// مؤقت القسم (25 دقيقة)
let sectionTime = 25 * 60;
let sectionTimer = null;

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

// 2) تحميل الأسئلة
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

      startSectionTimer();
      loadQuestion();
  })
  .catch(err => {
      console.error("خطأ في تحميل questions.json", err);
      alert("خطأ في تحميل الأسئلة");
  });

// 3) مؤقت القسم
function startSectionTimer() {
    const totalTime = sectionTime;

    sectionTimer = setInterval(() => {
        sectionTime--;

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

    if (!q) {
        saveResult();
        showFinalResult();
        return;
    }

    document.getElementById("quizArea").innerHTML = `
        <h3>${q.q}</h3>

        <div class="option" onclick="checkAnswer(0)">${q.a}</div>
        <div class="option" onclick="checkAnswer(1)">${q.b}</div>
        <div class="option" onclick="checkAnswer(2)">${q.c}</div>
        <div class="option" onclick="checkAnswer(3)">${q.d}</div>
    `;
}

// 5) التحقق من الإجابة
window.checkAnswer = function(choice) {
    const q = currentQuestions[currentIndex];
    const correct = q.correct;

    if (choice === correct) {
        score++;
        if (skillStats[q.skill]) {
            skillStats[q.skill].correct++;
        }
    }

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

    retryBtn.style.display = "inline-block";
    retryBtn.onclick = () => forceExit();

    const sectionDone = sessionStorage.getItem("sectionDone");

    if (!sectionDone) {
        nextBtn.style.display = "inline-block";
    } else {
        nextBtn.style.display = "none";
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

    sessionStorage.setItem("currentSession", JSON.stringify(sessionData));
    window.location.href = "student.html";
}



