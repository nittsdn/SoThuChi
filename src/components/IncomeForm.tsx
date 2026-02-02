import React, { useState, useEffect } from 'react';
import type { TempItem, NguonTien } from '../types';
import DateSelector from './DateSelector';
import Calculator from './Calculator';
import MoneySourceSelector from './MoneySourceSelector';
import { formatDateISO, getDayOfWeekLong, formatDate } from '../utils/date';
import { formatNumber } from '../utils/format';
import { submitData, loadNguonTien } from '../services/api';

interface IncomeFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  onNotify: (message: string) => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ onSuccess, onError, onNotify }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempList, setTempList] = useState<TempItem[]>([]);
  const [moTa, setMoTa] = useState('');
  const [loaiThu, setLoaiThu] = useState('');
  const [selectedNguonTien, setSelectedNguonTien] = useState('');
  const [nguonTienList, setNguonTienList] = useState<NguonTien[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNguonTien().then(setNguonTienList);
  }, []);

  const handleAdd = (value: number) => {
    setTempList((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        value,
      },
    ]);
  };

  const handleEdit = (id: string, value: number) => {
    setTempList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item))
    );
  };

  const handleDelete = (id: string) => {
    setTempList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setTempList([]);
    setMoTa('');
    setLoaiThu('');
    setSelectedNguonTien('');
  };

  const total = tempList.reduce((sum, item) => sum + item.value, 0);
  const canSubmit = tempList.length > 0 && moTa && selectedNguonTien && loaiThu;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        type: 'thu' as const,
        payload: {
          ngay: formatDateISO(selectedDate),
          so_tien: total * 1000, // Convert to VND
          mo_ta: moTa,
          loai_thu: loaiThu,
          nguon_tien: selectedNguonTien,
        },
      };

      await submitData(payload);

      const thu = getDayOfWeekLong(selectedDate);
      const ngay = formatDate(selectedDate);
      const amounts = tempList.map((item) => formatNumber(item.value * 1000)).join(' + ');

      onNotify(
        `Đã thêm vào thu nhập ${moTa} ${amounts} = ${formatNumber(
          total * 1000
        )} vnđ nguồn ${selectedNguonTien} ${thu} ngày ${ngay} thành công.`
      );

      onSuccess();
      handleReset();
    } catch (error) {
      console.error('Error submitting income:', error);
      onError('Lỗi khi thêm thu nhập');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Thu nhập</h2>

      <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

      <Calculator
        tempList={tempList}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReset={handleReset}
      />

      <div className="card mb-4">
        <h3 className="text-lg font-semibold mb-3">Thông tin thu nhập</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Mô tả</label>
            <input
              type="text"
              placeholder="Nhập mô tả"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Loại thu</label>
            <input
              type="text"
              placeholder="Nhập loại thu"
              value={loaiThu}
              onChange={(e) => setLoaiThu(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>
      </div>

      <MoneySourceSelector
        selectedNguonTien={selectedNguonTien}
        onChange={setSelectedNguonTien}
        nguonTienList={nguonTienList}
      />

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Đang thêm...' : 'Thêm thu nhập'}
      </button>
    </div>
  );
};

export default IncomeForm;
