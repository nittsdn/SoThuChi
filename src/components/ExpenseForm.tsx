import React, { useState, useEffect } from 'react';
import type { TempItem, LoaiChi, NguonTien } from '../types';
import DateSelector from './DateSelector';
import Calculator from './Calculator';
import DescriptionSelector from './DescriptionSelector';
import MoneySourceSelector from './MoneySourceSelector';
import { formatDateISO, getDayOfWeekLong, formatDate } from '../utils/date';
import { formatNumber } from '../utils/format';
import { submitData, loadLoaiChi, loadNguonTien } from '../services/api';

interface ExpenseFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  onNotify: (message: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSuccess, onError, onNotify }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempList, setTempList] = useState<TempItem[]>([]);
  const [selectedDesc, setSelectedDesc] = useState('');
  const [selectedNguonTien, setSelectedNguonTien] = useState('');
  const [allDescs, setAllDescs] = useState<LoaiChi[]>([]);
  const [nguonTienList, setNguonTienList] = useState<NguonTien[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLoaiChi().then(setAllDescs);
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
    setSelectedDesc('');
    setSelectedNguonTien('');
  };

  const total = tempList.reduce((sum, item) => sum + item.value, 0);
  const canSubmit = tempList.length > 0 && selectedDesc && selectedNguonTien;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        type: 'chi' as const,
        payload: {
          ngay: formatDateISO(selectedDate),
          so_tien: total,
          mo_ta: selectedDesc,
          loai_chi: selectedDesc, // Use description as category for now
          nguon_tien: selectedNguonTien,
        },
      };

      await submitData(payload);

      const thu = getDayOfWeekLong(selectedDate);
      const ngay = formatDate(selectedDate);
      const amounts = tempList.map((item) => formatNumber(item.value * 1000)).join(' + ');

      onNotify(
        `Đã thêm vào chi tiêu ${selectedDesc} ${amounts} = ${formatNumber(
          total * 1000
        )} vnđ nguồn ${selectedNguonTien} ${thu} ngày ${ngay} thành công.`
      );

      onSuccess();
      handleReset();
    } catch (error) {
      console.error('Error submitting expense:', error);
      onError('Lỗi khi thêm chi tiêu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Chi tiêu</h2>

      <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

      <Calculator
        tempList={tempList}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReset={handleReset}
      />

      <DescriptionSelector
        selectedDesc={selectedDesc}
        onChange={setSelectedDesc}
        allDescs={allDescs}
      />

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
        {isSubmitting ? 'Đang thêm...' : 'Thêm chi tiêu'}
      </button>
    </div>
  );
};

export default ExpenseForm;
