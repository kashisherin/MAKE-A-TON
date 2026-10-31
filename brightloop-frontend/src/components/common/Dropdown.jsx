import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Dropdown({
  trigger,
  items = [],
  align = 'right',
  width = 'w-48',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute z-30 mt-1 ${width} rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <hr key={idx} className="my-1 border-slate-200" />;
            }

            return (
              <button
                key={idx}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50'
                } ${item.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
