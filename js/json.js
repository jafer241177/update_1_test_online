function readExcel(file, type) {
    console.log("بدأ قراءة الملف:", type);

    const reader = new FileReader();

    reader.onload = function (e) {
        console.log("تم تحميل الملف:", type);

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (type === "students") {

            const unique = [];
            const seen = new Set();

            json.forEach(row => {
                const id = row["id"];
                if (id && !seen.has(id)) {
                    seen.add(id);
                    unique.push(row);
                }
            });

            showStudentsJSON(unique);
            alert("تم تحويل ملف الطلاب بنجاح");
        }

        else if (type === "questions") {
            showQuestionsJSON(json);
            alert("تم تحويل ملف الأسئلة بنجاح");
        }
    };

    reader.readAsArrayBuffer(file);
}

function convertFiles() {
    const studentFile = document.getElementById("studentsFile").files[0];
    const questionFile = document.getElementById("questionsFile").files[0];

    if (!studentFile && !questionFile) {
        alert("الرجاء رفع ملف الطلاب أو ملف الأسئلة");
        return;
    }

    if (studentFile) readExcel(studentFile, "students");
    if (questionFile) readExcel(questionFile, "questions");
}

function showStudentsJSON(data) {
    document.getElementById("studentsJSON").value =
        JSON.stringify(data, null, 4);
}

function showQuestionsJSON(data) {
    document.getElementById("questionsJSON").value =
        JSON.stringify(data, null, 4);
}
