import React, { useState, useRef } from 'react';
import type { TempItem } from '../types';
import { formatNumber } from '../utils/format';

interface CalculatorProps {
  tempList: TempItem[];
  onAdd: (value: number) => void;
  onEdit: (id: string, value: number) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({
  tempList,
  onAdd,
  onEdit,
  onDelete,
  onReset,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = tempList.reduce((sum, item) => sum + item.value, 0);

  const handleAdd = () => {
    if (!inputValue || parseFloat(inputValue) <= 0) return;

    if (editingId) {
      onEdit(editingId, parseFloat(inputValue));
      setEditingId(null);
    } else {
      onAdd(parseFloat(inputValue));
    }

    setInputValue('');
    inputRef.current?.focus();
  };

  const handleEditClick = (id: string, value: number) => {
    setEditingId(id);
    setInputValue(value.toString());
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="card mb-4">
      <h3 className="text-lg font-semibold mb-3">Nhập số tiền</h3>
      
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập số tiền (x1000)"
          className="input-field flex-1"
          min="0"
          step="0.01"
        />
        <button
          onClick={handleAdd}
          className={editingId ? 'btn-primary px-8' : 'btn-primary px-8'}
          type="button"
        >
          {editingId ? '✓' : '+'}
        </button>
      </div>

      {inputValue && parseFloat(inputValue) > 0 && (
        <div className="mb-3 p-2 bg-background rounded-button">
          <p className="text-center text-gray-700">
            {formatNumber(parseFloat(inputValue) * 1000)} vnđ
          </p>
        </div>
      )}

      {tempList.length > 0 && (
        <div className="mb-3 p-3 bg-background rounded-button">
          <div className="flex flex-wrap items-center gap-2">
            {tempList.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <span className="text-secondary">+</span>}
                <span
                  onClick={() => handleEditClick(item.id, item.value)}
                  className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                    editingId === item.id
                      ? 'bg-primary text-white'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {formatNumber(item.value * 1000)}
                </span>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-destructive text-sm hover:opacity-70"
                  type="button"
                >
                  ✕
                </button>
              </React.Fragment>
            ))}
          </div>
          
          {tempList.length > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <p className="text-center font-semibold">
                = {formatNumber(total * 1000)} vnđ
              </p>
            </div>
          )}
        </div>
      )}

      {tempList.length > 0 && (
        <button
          onClick={onReset}
          className="btn-destructive w-full"
          type="button"
        >
          Xóa hết
        </button>
      )}
    </div>
  );
};

export default Calculator;
