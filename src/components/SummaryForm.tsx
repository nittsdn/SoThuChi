import React, { useState, useEffect } from 'react';
import type { NguonTien, TKInput } from '../types';
import { loadNguonTien, loadChiTieu, submitData } from '../services/api';
import { formatNumber, formatCurrency, parseVietnameseCurrency } from '../utils/format';
import { formatDateISO } from '../utils/date';

interface SummaryFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  onNotify: (message: string) => void;
}

const SummaryForm: React.FC<SummaryFormProps> = ({ onSuccess, onError, onNotify }) => {
  const [nguonTienList, setNguonTienList] = useState<NguonTien[]>([]);
  const [tkInputs, setTKInputs] = useState<TKInput[]>([]);
  const [soDuLT, setSoDuLT] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [tkResult, setTKResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNguonTien().then((list) => {
      setNguonTienList(list);
      setTKInputs(list.map((nt) => ({ nguonTien: nt.ten_nguon_tien, soDuTT: '' })));
    });

    // Load số dư lý thuyết from last record
    loadChiTieu().then((data) => {
      if (data.length > 0) {
        setSoDuLT(data[data.length - 1].so_du_lt);
      }
    });
  }, []);

  const handleInputChange = (index: number, value: string) => {
    const formatted = formatCurrency(value);
    setTKInputs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, soDuTT: formatted } : item))
    );
  };

  const canCheck = tkInputs.every((input) => input.soDuTT);

  const handleCheck = () => {
    if (!canCheck) return;

    setIsChecking(true);

    try {
      // Calculate total actual balance
      const soDuTT = tkInputs.reduce((sum, input) => {
        return sum + parseVietnameseCurrency(input.soDuTT);
      }, 0);

      const chenhLech = soDuLT - soDuTT;

      setTKResult({
        soDuLT,
        soDuTT,
        chenhLech,
        details: tkInputs.map((input) => ({
          nguonTien: input.nguonTien,
          soDu: parseVietnameseCurrency(input.soDuTT),
        })),
      });
    } catch (error) {
      console.error('Error checking summary:', error);
      onError('Lỗi khi kiểm tra tổng kết');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!tkResult || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Get last session ID and increment
      const sessionId = 's' + (Date.now() % 1000);

      const payload = {
        type: 'tk' as const,
        payload: {
          session_id: sessionId,
          ngay_tk: formatDateISO(new Date()),
          so_du_lt: soDuLT,
          chi_tiet: tkInputs.map((input) => ({
            nguon_tien: input.nguonTien,
            so_du_tt: parseVietnameseCurrency(input.soDuTT),
          })),
          note: '',
        },
      };

      await submitData(payload);

      onNotify(
        `Đã tổng kết thành công.\n` +
          `Số dư lý thuyết: ${formatNumber(soDuLT)} vnđ\n` +
          `Số dư thực tế: ${formatNumber(tkResult.soDuTT)} vnđ\n` +
          `Chênh lệch: ${formatNumber(Math.abs(tkResult.chenhLech))} vnđ ${
            tkResult.chenhLech < 0 ? '(Thiếu)' : '(Thừa)'
          }`
      );

      onSuccess();
      
      // Reset form
      setTKInputs(nguonTienList.map((nt) => ({ nguonTien: nt.ten_nguon_tien, soDuTT: '' })));
      setTKResult(null);
    } catch (error) {
      console.error('Error confirming summary:', error);
      onError('Lỗi khi xác nhận tổng kết');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tổng kết</h2>

      <div className="card mb-4">
        <h3 className="text-lg font-semibold mb-3">Số dư lý thuyết</h3>
        <p className="text-2xl font-bold text-primary">{formatNumber(soDuLT)} vnđ</p>
      </div>

      <div className="card mb-4">
        <h3 className="text-lg font-semibold mb-3">Nhập số dư thực tế</h3>
        
        <div className="space-y-3">
          {tkInputs.map((input, idx) => (
            <div key={input.nguonTien}>
              <label className="block text-sm font-medium mb-2">{input.nguonTien}</label>
              <input
                type="text"
                value={input.soDuTT}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                placeholder="0"
                className="input-field w-full"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleCheck}
          disabled={!canCheck || isChecking}
          className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra'}
        </button>
      </div>

      {tkResult && (
        <div className="card mb-4">
          <h3 className="text-lg font-semibold mb-3">Kết quả</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Số dư lý thuyết:</span>
              <span className="font-semibold">{formatNumber(tkResult.soDuLT)} vnđ</span>
            </div>
            <div className="flex justify-between">
              <span>Số dư thực tế:</span>
              <span className="font-semibold">{formatNumber(tkResult.soDuTT)} vnđ</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span>Chênh lệch:</span>
              <span
                className={`font-bold ${
                  tkResult.chenhLech < 0 ? 'text-destructive' : 'text-success'
                }`}
              >
                {tkResult.chenhLech < 0 ? 'Thiếu' : 'Thừa'}{' '}
                {formatNumber(Math.abs(tkResult.chenhLech))} vnđ
              </span>
            </div>
          </div>

          <h4 className="font-semibold mb-2">Chi tiết theo nguồn:</h4>
          <div className="space-y-1 mb-4">
            {tkResult.details.map((detail: any) => (
              <div key={detail.nguonTien} className="flex justify-between text-sm">
                <span>{detail.nguonTien}:</span>
                <span>{formatNumber(detail.soDu)} vnđ</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận tổng kết'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SummaryForm;
