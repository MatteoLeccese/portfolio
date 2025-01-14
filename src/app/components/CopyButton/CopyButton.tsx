"use client";
import { FC, useCallback, useState } from "react";
import { ICopyButtonProps } from "./CopyButton.interfaces";

export const CopyButton: FC<ICopyButtonProps> = ({ textToCopy }) => {
  const [ isCopied, setIsCopied ] = useState<boolean>(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      // Error writing to the clipboard
      setIsCopied(false);
    }
  }, [ textToCopy ]);

  return (
    <button onClick={() => handleCopy()}>
      {isCopied ? "✅" : "📋"}
    </button>
  );
};
