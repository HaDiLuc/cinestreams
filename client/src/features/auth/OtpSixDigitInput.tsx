import React, { useState, useRef, useEffect } from 'react';

interface OtpSixDigitInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  isError?: boolean;
  disabled?: boolean;
}

export const OtpSixDigitInput: React.FC<OtpSixDigitInputProps> = ({
  value,
  onChange,
  onComplete,
  isError = false,
  disabled = false,
}) => {
  const digits = Array(6).fill('').map((_, i) => value[i] || '');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1); // get last character typed
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('');
    onChange(combined);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === 6 && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const sixDigits = pastedData.slice(0, 6);
    onChange(sixDigits);

    // Focus on next available box or blur if completed
    const targetIndex = Math.min(sixDigits.length, 5);
    inputRefs.current[targetIndex]?.focus();

    if (sixDigits.length === 6 && onComplete) {
      onComplete(sixDigits);
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 transition-transform duration-300 ${
        isError ? 'animate-shake' : ''
      }`}
    >
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digits[i]}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl outline-none transition-all duration-200 select-all ${
              isError
                ? 'bg-error/10 border-2 border-error text-error shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : digits[i]
                ? 'bg-surface-container-high border-2 border-primary text-on-surface shadow-[0_0_12px_rgba(229,9,20,0.35)]'
                : 'bg-surface-container border border-surface-variant/40 text-on-surface focus:border-primary focus:bg-surface-container-high'
            }`}
          />
        ))}
    </div>
  );
};

