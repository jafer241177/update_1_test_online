// js/main.js

// إعداد رقم هوية المعلم (تستطيع تغييره كما تريد)
const TEACHER_ID = "9999999999";

let students = [];

// تحميل بيانات الطلاب
fetch("data/students.json")
  .then(res => res.json())
  .then(json => students = json)
  .catch(err => console.error("خطأ في تحميل students.json", err));

document.getElementById("startBtn").addEventListener("click", () => {
    const studentId = document.getElementById("studentId").value.trim();
    const material = document.getElementById("materialSelect").value;
    sessionStorage.removeItem("sectionDone");

    if (!studentId) {
        alert("أدخل رقم الهوية");
        return;
    }

    // المعلم
  if (studentId === TEACHER_ID) {

    const sessionData = {
        id: TEACHER_ID,
        name: "المعلم المسؤول"
    };

    sessionStorage.setItem("currentSession", JSON.stringify(sessionData));

    window.location.href = "report.html";
    return;
}


    // طالب عادي
    if (!material) {
        alert("اختر المادة");
        return;
    }

    const student = students.find(s => s.id === studentId);

    if (!student) {
        alert("رقم الهوية غير موجود في النظام");
        return;
    }

    // حفظ بيانات الدخول في sessionStorage ليستخدمها student.html
    const sessionData = {
        id: student.id,
        name: student.name,
        material: material
    };

    sessionStorage.setItem("currentSession", JSON.stringify(sessionData));

    // الانتقال لصفحة الاختبار
    window.location.href = "student.html";
});
