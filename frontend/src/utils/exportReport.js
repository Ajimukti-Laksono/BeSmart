import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function sanitizeFilename(name) {
  return (name || "BeSmart").replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return String(isoString);
  }
}

/**
 * Mengekspor laporan rekap hasil seleksi penerima beasiswa ARAS ke format PDF (SK).
 */
export function exportResultsToPdf(payload) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("BEASISWASMART (BeSmart)", pageWidth / 2, 16, { align: "center" });

  doc.setFontSize(12);
  doc.text(
    "LAPORAN REKAPITULASI HASIL SELEKSI PENERIMA BEASISWA",
    pageWidth / 2,
    23,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    "Metode: ARAS (Additive Ratio Assessment)",
    pageWidth / 2,
    29,
    { align: "center" }
  );

  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.6);
  doc.line(14, 33, pageWidth - 14, 33);

  doc.setFontSize(10);
  doc.text(`Periode Beasiswa   : ${payload.nama_periode}`, 14, 41);
  doc.text(`Kuota Penerima     : ${payload.kuota_penerima} orang`, 14, 47);
  doc.text(
    `Total Dinilai      : ${payload.total_candidates} pendaftar (Lolos: ${payload.total_lolos})`,
    14,
    53
  );
  doc.text(`Waktu Kalkulasi    : ${formatDateTime(payload.calculated_at)}`, 14, 59);

  const tableRows = (payload.results || []).map((item) => [
    String(item.ranking),
    item.nim,
    item.nama_lengkap,
    item.program_studi,
    Number(item.nilai_si).toFixed(6),
    Number(item.nilai_ki).toFixed(6),
    item.status_lolos === "lolos" ? "LOLOS" : "TIDAK LOLOS",
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["Rank", "NIM", "Nama Lengkap", "Program Studi", "Nilai Si", "Nilai Ki", "Status"]],
    body: tableRows,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 13 },
      1: { cellWidth: 24 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "center", cellWidth: 24 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        const val = data.cell.raw;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = val === "LOLOS" ? [5, 150, 105] : [100, 116, 139];
      }
    },
  });

  const finalY = (doc.lastAutoTable?.finalY || 120) + 14;
  if (finalY + 25 < doc.internal.pageSize.getHeight()) {
    doc.setFontSize(9.5);
    doc.text("Ditetapkan oleh Pimpinan / Admin BeSmart,", pageWidth - 14, finalY, {
      align: "right",
    });
    doc.text("( ........................................ )", pageWidth - 14, finalY + 18, {
      align: "right",
    });
  }

  doc.save(`SK_Penerima_Beasiswa_${sanitizeFilename(payload.nama_periode)}.pdf`);
}

/**
 * Mengekspor hasil ranking dan rincian kalkulasi ARAS ke format Excel (.xlsx).
 */
export function exportResultsToExcel(payload) {
  const wb = XLSX.utils.book_new();

  const rankingRows = (payload.results || []).map((item) => ({
    Ranking: item.ranking,
    NIM: item.nim,
    "Nama Lengkap": item.nama_lengkap,
    "Program Studi": item.program_studi,
    "Nilai Si": Number(Number(item.nilai_si).toFixed(8)),
    "Nilai Ki": Number(Number(item.nilai_ki).toFixed(8)),
    "Status Kelulusan": item.status_lolos === "lolos" ? "Lolos" : "Tidak Lolos",
  }));
  const wsRanking = XLSX.utils.json_to_sheet(rankingRows);
  XLSX.utils.book_append_sheet(wb, wsRanking, "Hasil Ranking");

  const summaryRows = [
    { Keterangan: "Periode Beasiswa", Nilai: payload.nama_periode },
    { Keterangan: "Kuota Penerima", Nilai: payload.kuota_penerima },
    { Keterangan: "Status Periode", Nilai: payload.period_status },
    { Keterangan: "Total Dinilai (Verified)", Nilai: payload.total_candidates },
    { Keterangan: "Total Lolos", Nilai: payload.total_lolos },
    { Keterangan: "Waktu Kalkulasi", Nilai: formatDateTime(payload.calculated_at) },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  if (payload.breakdown) {
    const { criteria, applicants, extended_matrix, normalized_matrix_r, weighted_matrix_d, si_with_a0, ki_with_a0 } =
      payload.breakdown;
    const rowLabels = [
      { nim: "A0", nama: "Solusi Optimal (A0)" },
      ...applicants.map((a, i) => ({ nim: a.nim, nama: `A${i + 1} - ${a.nama_lengkap}` })),
    ];

    const breakdownRows = rowLabels.map((meta, rowIdx) => {
      const row = {
        Kode: meta.nim,
        Alternatif: meta.nama,
      };
      criteria.forEach((c, colIdx) => {
        row[`X_${c.kode_kriteria}`] = extended_matrix[rowIdx]?.[colIdx];
      });
      criteria.forEach((c, colIdx) => {
        row[`R_${c.kode_kriteria}`] = Number(
          (normalized_matrix_r[rowIdx]?.[colIdx] || 0).toFixed(8)
        );
      });
      criteria.forEach((c, colIdx) => {
        row[`D_${c.kode_kriteria}`] = Number(
          (weighted_matrix_d[rowIdx]?.[colIdx] || 0).toFixed(8)
        );
      });
      row["Si"] = Number((si_with_a0[rowIdx] || 0).toFixed(8));
      row["Ki"] = Number((ki_with_a0[rowIdx] || 0).toFixed(8));
      return row;
    });

    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownRows);
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Breakdown ARAS");
  }

  XLSX.writeFile(wb, `Rekap_ARAS_${sanitizeFilename(payload.nama_periode)}.xlsx`);
}

