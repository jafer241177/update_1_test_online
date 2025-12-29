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
// 2) إعداد رابط Google Sheet
// ===============================

const SHEET_ID = "1OxjO_Kl8djn5UdOeDI3EWfFWcvrAWoJri56Fkz0sYck";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let allResults = [];
let allMaterials = new Set();
let allStudents = new Set();
let allAttempts = new Set();
let allSkills = new Set();


// ===============================
// 3) تحميل النتائج من Google Sheets
// ===============================

async function loadResultsFromSheet() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();

        const json = JSON.parse(text.substring(47, text.length - 2));
        const rows = json.table.rows;

        const results = rows.map(row => ({
            id: row.c[0]?.v || "",
            name: row.c[1]?.v || "",
            material: row.c[2]?.v || "",
            attempt: row.c[3]?.v || "",
            score: row.c[4]?.v || 0,
            total: row.c[5]?.v || 0,
            percent: row.c[6]?.v || 0,
            date: row.c[7]?.v || "",
            skills: JSON.parse(row.c[8]?.v || "{}")
        }));

        return results;

    } catch (error) {
        console.error("خطأ أثناء تحميل البيانات:", error);
        return [];
    }
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
            <td>${new Date(r.date).toLocaleString("ar-SA")}</td>
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
    allResults = await loadResultsFromSheet();

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
