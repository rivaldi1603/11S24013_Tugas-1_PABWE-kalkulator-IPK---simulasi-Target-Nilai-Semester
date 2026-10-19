const STORAGE_KEY = 'pabwe_gpa_courses_v2';
let courses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const gradeLabels = {
    "4.0": "A", "3.5": "AB", "3.0": "B",
    "2.5": "BC", "2.0": "C", "1.0": "D", "0.0": "E"
};

// Fungsi Sanitasi untuk mencegah celah keamanan DOM-based XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

// Menampilkan pesan peringatan validasi
function showAlert(message) {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 4000);
}

// Menyimpan ke localStorage dan merender ulang tabel DOM
function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    const tbody = document.getElementById('course-tbody');
    tbody.innerHTML = '';

    let totalSks = 0;
    let totalPoints = 0;

    if (courses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">Belum ada mata kuliah yang ditambahkan.</td></tr>`;
    } else {
        courses.forEach((course, index) => {
            const weight = course.sks * course.grade;
            totalSks += course.sks;
            totalPoints += weight;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-2.5 px-3 font-medium">${course.name}</td>
                <td class="py-2.5 px-3 text-center">${course.sks}</td>
                <td class="py-2.5 px-3 text-center">
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                        ${gradeLabels[course.grade.toFixed(1)]} (${course.grade.toFixed(1)})
                    </span>
                </td>
                <td class="py-2.5 px-3 text-center">${weight.toFixed(1)}</td>
                <td class="py-2.5 px-3 text-right">
                    <button onclick="removeCourse(${index})" class="text-red-500 hover:text-red-700 font-medium text-xs">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const semesterGpa = totalSks > 0 ? (totalPoints / totalSks) : 0;
    document.getElementById('total-sks').textContent = `${totalSks} SKS`;
    document.getElementById('semester-gpa').textContent = semesterGpa.toFixed(2);
}

// Validasi Input Sisi Klien sebelum menyimpan data ke localStorage
function addCourse() {
    const nameInput = document.getElementById('input-name');
    const sksInput = document.getElementById('input-sks');
    const gradeInput = document.getElementById('input-grade');

    const name = nameInput.value.trim();
    const sks = parseInt(sksInput.value, 10);
    const grade = parseFloat(gradeInput.value);

    if (!name) {
        showAlert("Validasi Gagal: Nama mata kuliah tidak boleh kosong!");
        return;
    }
    if (isNaN(sks) || sks < 1 || sks > 6) {
        showAlert("Validasi Gagal: Jumlah SKS harus berupa angka bulat antara 1 hingga 6!");
        return;
    }

    courses.push({ name: escapeHTML(name), sks, grade });
    nameInput.value = '';
    sksInput.value = '';
    saveAndRender();
}

function removeCourse(index) {
    courses.splice(index, 1);
    saveAndRender();
}

function resetCourses() {
    courses = [];
    saveAndRender();
}

// Fungsi Ekspor Data Mata Kuliah ke File CSV menggunakan Blob API
function exportToCSV() {
    if (courses.length === 0) {
        showAlert("Gagal Ekspor: Belum ada data mata kuliah untuk diunduh!");
        return;
    }
    let csvContent = "No,Mata Kuliah,SKS,Indeks Nilai,Bobot\n";
    courses.forEach((c, idx) => {
        const gradeLetter = gradeLabels[c.grade.toFixed(1)];
        const weight = (c.sks * c.grade).toFixed(1);
        csvContent += `${idx + 1},"${c.name}",${c.sks},${gradeLetter} (${c.grade.toFixed(1)}),${weight}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Transkrip_Simulasi_IP_Semester.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Perbaikan Logika Simulasi Target IPK (Mendeteksi jika butuh IP > 4.00)
function simulateTarget() {
    const currentGpa = parseFloat(document.getElementById('current-gpa').value);
    const completedSks = parseInt(document.getElementById('completed-sks').value, 10);
    const targetGpa = parseFloat(document.getElementById('target-gpa').value);
    const nextSks = parseInt(document.getElementById('next-sks').value, 10);
    const resultBox = document.getElementById('simulation-result');

    if (isNaN(currentGpa) || isNaN(completedSks) || isNaN(targetGpa) || isNaN(nextSks)) {
        showAlert("Validasi Simulasi: Harap isi seluruh kolom pada form Simulasi Target IPK!");
        return;
    }
    if (currentGpa < 0 || currentGpa > 4 || targetGpa < 0 || targetGpa > 4) {
        showAlert("Validasi Simulasi: Nilai IPK saat ini dan Target IPK harus berada di rentang 0.00 - 4.00!");
        return;
    }
    if (completedSks <= 0 || nextSks <= 0 || nextSks > 24) {
        showAlert("Validasi Simulasi: SKS lulus harus > 0 dan SKS semester ini maksimal 24 SKS!");
        return;
    }

    const totalTargetPoints = targetGpa * (completedSks + nextSks);
    const currentPoints = currentGpa * completedSks;
    const requiredGpa = (totalTargetPoints - currentPoints) / nextSks;

    resultBox.classList.remove(
        'hidden', 'bg-red-50', 'text-red-800', 'border-red-300',
        'bg-emerald-50', 'text-emerald-800', 'border-emerald-300',
        'bg-amber-50', 'text-amber-800', 'border-amber-300'
    );
    resultBox.classList.add('border');

    if (requiredGpa > 4.00) {
        const maxPossibleGpa = (currentPoints + (4.00 * nextSks)) / (completedSks + nextSks);
        resultBox.classList.add('bg-red-50', 'text-red-800', 'border-red-300');
        resultBox.innerHTML = `
            <strong>Target Tidak Realistis untuk 1 Semester!</strong><br>
            Anda membutuhkan IP Semester <b>${requiredGpa.toFixed(2)}</b> (melampaui batas 4.00).<br>
            Jika meraih nilai A pada seluruh ${nextSks} SKS semester ini, IPK maksimal Anda adalah <b>${maxPossibleGpa.toFixed(2)}</b>.
        `;
    } else if (requiredGpa <= 0) {
        resultBox.classList.add('bg-amber-50', 'text-amber-800', 'border-amber-300');
        resultBox.innerHTML = `Target IPK Anda (${targetGpa.toFixed(2)}) sudah tercapai atau berada di bawah perolehan poin Anda saat ini.`;
    } else {
        resultBox.classList.add('bg-emerald-50', 'text-emerald-800', 'border-emerald-300');
        resultBox.innerHTML = `
            <strong>Target Dapat Dicapai!</strong><br>
            Anda wajib meraih IP Semester minimal <b>${requiredGpa.toFixed(2)}</b> pada ${nextSks} SKS semester ini untuk mencapai IPK <b>${targetGpa.toFixed(2)}</b>.
        `;
    }
}

document.addEventListener('DOMContentLoaded', saveAndRender);