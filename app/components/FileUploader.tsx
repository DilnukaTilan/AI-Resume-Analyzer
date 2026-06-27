import { useCallback, useId, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { formatSize } from "../lib/utils";

interface FileUploaderProps {
  id?: string;
  error?: string;
  disabled?: boolean;
  onFileSelect?: (file: File | null) => void;
}

const maxFileSize = 20 * 1024 * 1024;

const getFileRejectionMessage = (fileRejection: FileRejection) => {
  if (fileRejection.errors.some((error) => error.code === "file-too-large")) {
    return `Please upload a PDF smaller than ${formatSize(maxFileSize)}.`;
  }

  if (
    fileRejection.errors.some((error) => error.code === "file-invalid-type")
  ) {
    return "Please upload a PDF file.";
  }

  return "That file could not be uploaded. Please try another PDF.";
};

const FileUploader = ({
  id,
  error,
  disabled = false,
  onFileSelect,
}: FileUploaderProps) => {
  const generatedId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState("");

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setDropError(getFileRejectionMessage(fileRejections[0]));
        return;
      }

      const droppedFile = acceptedFiles[0];
      if (!droppedFile) return;

      setFile(droppedFile);
      setDropError("");
      onFileSelect?.(droppedFile);
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: maxFileSize,
    disabled,
  });

  const inputId = id || generatedId;
  const errorMessage = dropError || error;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full gradient-border">
      <div
        {...getRootProps({
          "aria-describedby": errorMessage ? errorId : undefined,
          "aria-invalid": Boolean(errorMessage),
        })}
      >
        <input {...getInputProps({ id: inputId })} />

        <div className="space-y-4 cursor-pointer">
          {file ? (
            <div
              className="uploader-selected-file"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/images/pdf.png"
                alt="pdf"
                className="size-8 sm:size-10 shrink-0"
              />
              <div className="flex items-center min-w-0 flex-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-full">
                    {file.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove selected resume"
                disabled={disabled}
                className="p-1.5 sm:p-2 cursor-pointer shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFile(null);
                  setDropError("");
                  onFileSelect?.(null);
                }}
              >
                <img
                  src="/icons/cross.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2">
                <img
                  src="/icons/info.svg"
                  alt="upload"
                  className="size-14 sm:size-20"
                />
              </div>
              <p className="text-sm sm:text-base text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                PDF (max {formatSize(maxFileSize)})
              </p>
            </div>
          )}

          {errorMessage && (
            <p
              id={errorId}
              className="text-sm font-semibold text-red-700 text-center"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
