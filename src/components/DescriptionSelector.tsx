import React, { useState, useEffect } from 'react';
import type { LoaiChi } from '../types';
import Modal from './Modal';

const STORAGE_KEY = 'quickDescriptions';

interface DescriptionSelectorProps {
  selectedDesc: string;
  onChange: (desc: string) => void;
  allDescs: LoaiChi[];
  onAddNew?: (desc: string, loaiChi: string) => void;
}

const DescriptionSelector: React.FC<DescriptionSelectorProps> = ({
  selectedDesc,
  onChange,
  allDescs,
  onAddNew,
}) => {
  const [quickDescs, setQuickDescs] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newLoaiChi, setNewLoaiChi] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setQuickDescs(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading quick descriptions:', e);
      }
    }
  }, []);

  const handleAddDesc = () => {
    if (!newDesc || !newLoaiChi) return;
    
    if (onAddNew) {
      onAddNew(newDesc, newLoaiChi);
    }
    
    setShowAddModal(false);
    setNewDesc('');
    setNewLoaiChi('');
    onChange(newDesc);
  };

  return (
    <div className="card mb-4">
      <h3 className="text-lg font-semibold mb-3">Chọn mô tả chi</h3>

      {/* 8 quick buttons */}
      {quickDescs.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickDescs.map((desc) => (
            <button
              key={desc}
              onClick={() => onChange(desc)}
              className={`py-2 px-3 rounded-button text-sm transition-all min-h-[44px] ${
                selectedDesc === desc
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              type="button"
            >
              {desc}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <select
        value={selectedDesc}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full mb-3"
      >
        <option value="">Chọn mô tả</option>
        {allDescs.map((item) => (
          <option key={item.ten_loai_chi} value={item.ten_loai_chi}>
            {item.ten_loai_chi}
          </option>
        ))}
      </select>

      {/* Add new button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="btn-secondary w-full"
        type="button"
      >
        Thêm mô tả mới
      </button>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm mô tả mới"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mô tả</label>
            <input
              type="text"
              placeholder="Nhập mô tả"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="input-field w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Loại chi</label>
            <select
              value={newLoaiChi}
              onChange={(e) => setNewLoaiChi(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Chọn loại chi</option>
              {allDescs.map((item) => (
                <option key={item.ten_loai_chi} value={item.ten_loai_chi}>
                  {item.ten_loai_chi}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="btn-secondary flex-1"
              type="button"
            >
              Hủy
            </button>
            <button
              onClick={handleAddDesc}
              disabled={!newDesc || !newLoaiChi}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Thêm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DescriptionSelector;
