import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Download, FileText, X } from "lucide-react";
import { fetchBerkasBlobApi } from "../api/applicants";
import { getErrorMessage } from "../utils/error";
import LoadingSpinner from "./LoadingSpinner";

export default function BerkasPreviewModal({ isOpen, onClose, applicant }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [mimeType, setMimeType] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function loadFile() {
      if (!isOpen || !applicant?.id || !applicant?.has_berkas) return;
      setLoading(true);
      setErrorMsg("");
      try {
        const { blob, contentType } = await fetchBerkasBlobApi(applicant.id);
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
        setMimeType(contentType || blob.type || "");
      } catch (err) {
        if (active) {
          setErrorMsg(getErrorMessage(err, "Gagal memuat berkas persyaratan."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFile();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setObjectUrl(null);
      setMimeType("");
    };
  }, [isOpen, applicant]);

  const isPdf = mimeType.includes("pdf");
  const isImage = mimeType.startsWith("image/");

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Preview Berkas — {applicant?.nama_lengkap}
                </DialogTitle>
                <p className="text-xs text-slate-500">NIM: {applicant?.nim}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {objectUrl && (
                <a
                  href={objectUrl}
                  download={applicant?.berkas_path || "berkas"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-100 p-4">
            {loading ? (
              <LoadingSpinner label="Mengambil berkas..." />
            ) : errorMsg ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
                {errorMsg}
              </div>
            ) : !objectUrl ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Berkas belum tersedia.
              </div>
            ) : isPdf ? (
              <iframe
                src={objectUrl}
                title="Preview Berkas PDF"
                className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white"
              />
            ) : isImage ? (
              <div className="flex justify-center">
                <img
                  src={objectUrl}
                  alt={`Berkas ${applicant?.nama_lengkap}`}
                  className="max-h-[65vh] rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
                />
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-slate-600">
                Preview langsung tidak didukung untuk tipe file ini. Silakan klik tombol Unduh di
                atas.
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

