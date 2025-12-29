<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

// ===============================
// 1) التحقق من هوية المعلم
// ===============================

const TEACHER_ID = "9999999999";

const sessionDataRaw = sessionStorage.getItem("currentSession");

if (!sessionDataRaw) {
    alert("غير مصرح لك بالدخول");
    window.location.href = "index.html";
}

const sessionData = JSON.parse(sessionDataRaw);

if (sessionData.id !== TEACHER_ID) {
    alert("هذه الصفحة خاصة بالمعلم فقط");
    window.location.href = "index.html";
}

// عرض اسم المعلم
document.getElementById("teacherInfo").innerHTML =
    `<p><b>المعلم:</b> ${sessionData.name}</p>`;


// ===============================
// 2) إعداد Firebase
// ===============================

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


// ===============================
// 3) تحميل النتائج من Firebase
// ===============================

let allResults = [];
let allMaterials = new Set();
let allStudents = new Set();
let allAttempts = new Set();
let allSkills = new Set();

async function loadResultsFromFirebase() {
    return new Promise(resolve => {
        db.ref("results").once("value", snapshot => {
            let results = [];

            snapshot.forEach(child => {
                const data = child.val();
                results.push({
                    id: data.id,
                    name: data.name,
                    material: data.material,
                    attempt: data.attempt,
                    score: data.score,
                    total: data.total,
                    percent: data.percent,
                    date: data.date,
                    skills: data.skills || {}
                });
            });

            resolve(results);
        });
    });
}


// ===============================
// 4) تعبئة الفلاتر
// ===============================

function fillFilters() {
    const matSelect = document.getElementById("filterMaterial");
    const stuSelect = document.getElementById("filterStudent");
    const attSelect = document.getElementById("filterAttempt");

    // المواد
    Array.from(allMaterials).forEach(m => {
        matSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });

    // الطلاب
    Array.from(allStudents).forEach(s => {
        stuSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });

    // المحاولات
    Array.from(allAttempts).forEach(a => {
        attSelect.innerHTML += `<option value="${a}">المحاولة ${a}</option>`;
    });
}


// ===============================
// 5) تطبيق الفلاتر
// ===============================

function applyFilters() {
    const mat = document.getElementById("filterMaterial").value;
    const stu = document.getElementById("filterStudent").value;
    const att = document.getElementById("filterAttempt").value;

    let filtered = allResults;

    if (mat) filtered = filtered.filter(r => r.material === mat);
    if (stu) filtered = filtered.filter(r => r.name === stu);
    if (att) filtered = filtered.filter(r => r.attempt == att);

    renderTable(filtered);
}


// ===============================
// 6) بناء جدول التقرير
// ===============================

function renderTable(results) {

    if (results.length === 0) {
        document.getElementById("reportArea").innerHTML =
            "<p>لا توجد نتائج مطابقة للبحث</p>";
        document.getElementById("printBtn").style.display = "none";
        return;
    }

    document.getElementById("printBtn").style.display = "block";

    let html = `
    <div class="table-container">
    <table class="report-table">
    <tr>
        <th>رقم الهوية</th>
        <th>الاسم</th>
        <th>المادة</th>
        <th>المحاولة</th>
        <th>الدرجة</th>
        <th>النسبة</th>
        <th>التاريخ</th>
    `;

    // أعمدة المهارات
    Array.from(allSkills).forEach(skill => {
        html += `<th>${skill}</th>`;
    });

    html += `</tr>`;

    results.forEach(r => {
        html += `
        <tr>
            <td>${r.id}</td>
            <td>${r.name}</td>
            <td>${r.material}</td>
            <td>${r.attempt}</td>
            <td>${r.score} / ${r.total}</td>
            <td>${r.percent}%</td>
            <td>${r.date}</td>
        `;

        Array.from(allSkills).forEach(skill => {
            html += `<td>${r.skills[skill]?.percent ?? "-"}%</td>`;
        });

        html += `</tr>`;
    });

    html += `
    </table>
    </div>
    `;

    document.getElementById("reportArea").innerHTML = html;
}


// ===============================
// 7) دوال لوحة التحكم
// ===============================

function goToReports() {
    window.location.href = "report.html";
}

function goToJson() {
    window.location.href = "json.html";
}

function goHome() {
    window.location.href = "index.html";
}


// ===============================
// 8) تشغيل التقرير
// ===============================

async function initReport() {
    allResults = await loadResultsFromFirebase();

    // تجميع القيم للفلاتر
    allResults.forEach(r => {
        allMaterials.add(r.material);
        allStudents.add(r.name);
        allAttempts.add(r.attempt);
        Object.keys(r.skills).forEach(skill => allSkills.add(skill));
    });

    fillFilters();
    renderTable(allResults);
}

initReport();
function exportToExcel() {
    const table = document.querySelector(".report-table");

    if (!table) {
        alert("لا يوجد تقرير لتصديره");
        return;
    }

    // تحويل الجدول إلى Sheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.table_to_sheet(table);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // حفظ الملف
    XLSX.writeFile(workbook, "تقرير_الطلاب.xlsx");
}


