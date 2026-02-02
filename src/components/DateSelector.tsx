import React from 'react';
import { formatDateISO, addDays } from '../utils/date';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onChange }) => {
  const handlePrevDay = () => {
    onChange(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    onChange(addDays(selectedDate, 1));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(new Date(e.target.value));
  };

  return (
    <div className="flex items-center gap-2 justify-center mb-4">
      <button
        onClick={handlePrevDay}
        className="btn-secondary px-6"
        type="button"
      >
        {'<<'}
      </button>
      <input
        type="date"
        value={formatDateISO(selectedDate)}
        onChange={handleDateChange}
        className="input-field text-center"
      />
      <button
        onClick={handleNextDay}
        className="btn-secondary px-6"
        type="button"
      >
        {'>>'}
      </button>
    </div>
  );
};

export default DateSelector;
