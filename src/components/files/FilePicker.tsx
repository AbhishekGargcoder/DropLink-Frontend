import { useState } from "react";
import { FileUp } from "lucide-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
];

interface FilePickerProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function FilePicker({
  onFilesSelected,
  disabled = false,
}: FilePickerProps) {
  const [error, setError] = useState<string | null>(null);

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const hasAllowedType =
        ACCEPTED_TYPES.includes(file.type) ||
        ACCEPTED_EXTENSIONS.includes(extension);

      if (!hasAllowedType) {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds the 50 MB limit.`);
        continue;
      }

      validFiles.push(file);
    }

    setError(errors.length > 0 ? errors.join(" ") : null);

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Lets the user select the same file again after removing it.
    event.currentTarget.value = "";
  };

   return (
    <div className="space-y-2">
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-700 bg-[#0B0D12] px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <FileUp size={17} />
        Choose files
        <input
          type="file"
          multiple 
          accept={ACCEPTED_EXTENSIONS.join(",")}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
      </label>

      <p className="text-xs text-gray-500">
        Photos, PDFs, Word documents · up to 50 MB per file
      </p>

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}