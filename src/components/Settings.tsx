import React, { useState, useEffect } from 'react';
import type { LoaiChi } from '../types';
import { loadLoaiChi } from '../services/api';

const STORAGE_KEY = 'quickDescriptions';

interface SettingsProps {
  version: string;
  onNotify: (message: string) => void;
  onError: (message: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ version, onNotify, onError }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [allDescs, setAllDescs] = useState<LoaiChi[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelected(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    loadLoaiChi().then(setAllDescs);
  }, []);

  const handleToggle = (desc: string) => {
    if (selected.includes(desc)) {
      setSelected(selected.filter((d) => d !== desc));
    } else if (selected.length < 8) {
      setSelected([...selected, desc]);
    }
  };

  const handleSave = () => {
    if (selected.length !== 8) {
      onError('Vui lòng chọn đúng 8 mô tả');
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    onNotify('Đã lưu cài đặt thành công');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Cài đặt</h2>

      <div className="card mb-4">
        <h3 className="text-lg font-semibold mb-3">
          Chọn 8 mô tả chi thường dùng ({selected.length}/8)
        </h3>

        <div className="space-y-2 mb-4">
          {allDescs.map((item) => (
            <label
              key={item.ten_loai_chi}
              className="flex items-center gap-3 p-3 border rounded-button hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.ten_loai_chi)}
                onChange={() => handleToggle(item.ten_loai_chi)}
                disabled={!selected.includes(item.ten_loai_chi) && selected.length >= 8}
                className="w-5 h-5"
              />
              <span className="flex-1">{item.ten_loai_chi}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="btn-primary w-full"
          disabled={selected.length !== 8}
        >
          Lưu cài đặt
        </button>
      </div>

      <div className="card text-center">
        <p className="text-secondary">Version: v{version}</p>
      </div>
    </div>
  );
};

export default Settings;
