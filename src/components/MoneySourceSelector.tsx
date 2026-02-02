import React from 'react';
import type { NguonTien } from '../types';

interface MoneySourceSelectorProps {
  selectedNguonTien: string;
  onChange: (nguonTien: string) => void;
  nguonTienList: NguonTien[];
}

const MoneySourceSelector: React.FC<MoneySourceSelectorProps> = ({
  selectedNguonTien,
  onChange,
  nguonTienList,
}) => {
  return (
    <div className="card mb-4">
      <h3 className="text-lg font-semibold mb-3">Nguồn tiền</h3>
      
      <select
        value={selectedNguonTien}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full"
      >
        <option value="">Chọn nguồn tiền</option>
        {nguonTienList.map((item) => (
          <option key={item.ten_nguon_tien} value={item.ten_nguon_tien}>
            {item.icon && `${item.icon} `}
            {item.ten_nguon_tien}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MoneySourceSelector;
