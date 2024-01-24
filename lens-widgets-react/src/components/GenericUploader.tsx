import { FC, ReactNode, SetStateAction, useRef } from "react";
import { MediaIcon } from "./../icons";
import { ThemeColor } from "../types";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  children?: ReactNode;
  toast?: { error: (s: string) => void};
  isDarkTheme: boolean;
}

export const GenericUploader: FC<ImageUploaderProps> = ({ files, setFiles, toast, isDarkTheme, ...rest }) => {
  const fileInputRef = useRef();
  const maxFiles = 3;
  const acceptFileTypes = [".png", ".gif", ".jpeg", ".jpg", ".mov", ".mp4"];
  const maxSize = 8000000;

  const handleFileChange = (event) => {
    try {
      if (event.target.files.length > maxFiles) {
        toast?.error(`You can only upload up to ${maxFiles} files`);
        return;
      }

      for (let i = 0; i < event.target.files.length; i++) {
        if (event.target.files[i].size > maxSize) {
          toast?.error(`File ${event.target.files[i].name} is too large. Maximum file size is ${maxSize / 1000000}MB.`);
          return;
        }

        const fileExtension = '.' + event.target.files[i].name.split('.').pop().toLowerCase();
        if (!acceptFileTypes.includes(fileExtension)) {
          toast?.error(`File ${event.target.files[i].name} is not a supported format. Accepted formats are ${acceptFileTypes.join(', ')}`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (function (file) {
          return function (e) {
            setFiles(prevFiles => [...prevFiles, { name: file.name, data: e.target?.result, file }]);
          };
        })(event.target.files[i]);
        reader.readAsDataURL(event.target.files[i]);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleFileRemove = (event, fileName) => {
    event.preventDefault()
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const handleIconClick = () => {
    // @ts-expect-error: never..?
    if (fileInputRef?.current) fileInputRef!.current!.click();
  };

  return (
    <div className="flex flex-col">
      {files.length < maxFiles && (
        <div className="col-span-3 flex flex-col items-center justify-center border-2 rounded-md border-spacing-5 rounded-xs border-dark-grey shadow-sm focus:border-dark-grey focus:ring-dark-grey transition-all h-12 cursor-pointer mb-2" onClick={handleIconClick}>
          <input type="file"
            id="fileInput"
            multiple
            className="hidden"
          // @ts-expect-error: MutableRefObject?
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={acceptFileTypes.join(",")}
          />
          <div className="text-secondary flex items-center flex-col">
            <MediaIcon color={isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4">
        {files.map((file, i) => (
          <div className="reveal-on-hover relative mb-2 w-1/3" key={i}>
            <img className="object-cover object-position-center rounded-md w-full h-24" src={file.data} alt={file.name} />
            <button className="-mt-8 bg-black/75 absolute h-8 show-on-hover w-full" onClick={(e) => handleFileRemove(e, file.name)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
