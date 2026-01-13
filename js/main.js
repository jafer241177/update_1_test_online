// js/main.js

// إعداد رقم هوية المعلم (تستطيع تغييره كما تريد)
const TEACHER_ID = "9999999999";

let students = [];

// تحميل بيانات الطلاب
fetch("data/students.json")
  .then(res => res.json())
  .then(json => students = json)
  .catch(err => console.error("خطأ في تحميل students.json", err));


// -----------------------------
// 🔥 إضافة Firebase هنا
// -----------------------------
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
// -----------------------------


document.getElementById("startBtn").addEventListener("click", () => {
    const studentId = document.getElementById("studentId").value.trim();
    const material = document.getElementById("materialSelect").value;
    sessionStorage.removeItem("sectionDone");

    if (!studentId) {
        alert("أدخل رقم الهوية");
        return;
    }

    // -----------------------------
    // 🔥 المعلم
    // -----------------------------
   if (studentId === TEACHER_ID) {

    // ⭐ إذا اختار مادة → لا يدخل
    if (material && material !== "") {
        alert("لا يجب اختيار مادة عند دخول المعلم");
        return;
    }

    // ⭐ إذا لم يختر مادة → يدخل عادي
    const sessionData = {
        id: TEACHER_ID,
        name: "المعلم المسؤول",
        material: "all" // قيمة افتراضية للمعلم
    };

    sessionStorage.setItem("currentSession", JSON.stringify(sessionData));

    window.location.href = "report.html";
    return;
}


    // -----------------------------
    // 🔥 طالب عادي
    // -----------------------------
    if (!material) {
        alert("اختر المادة");
        return;
    }

    const student = students.find(s => s.id === studentId);

    if (!student) {
        alert("رقم الهوية غير موجود في النظام");
        return;
    }

    // -----------------------------
    // 🔥 منع الطالب من البداية (قبل الدخول)
    // -----------------------------
    const today = new Date().toISOString().split("T")[0];
    const uniqueKey = `${studentId}_${material}_${today}`;

    db.ref("results/" + uniqueKey).once("value", snapshot => {

        if (snapshot.exists()) {
            alert("لقد قمت بحل اختبار هذه المادة اليوم. لا يمكنك الدخول مرة أخرى.");
            return;
        }

        // -----------------------------
        // 🔥 إذا لم يحل → نسمح له بالدخول
        // -----------------------------
        const sessionData = {
            id: student.id,
            name: student.name,
            material: material
        };

        sessionStorage.setItem("currentSession", JSON.stringify(sessionData));

        // الانتقال لصفحة الاختبار
        window.location.href = "student.html";
    });


});
