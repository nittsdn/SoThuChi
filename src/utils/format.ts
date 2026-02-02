export const formatNumber = (num: number): string => {
  return num.toLocaleString('vi-VN');
};

export const parseVietnameseCurrency = (value: string): number => {
  // Remove dots and replace comma with dot for parsing
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const formatCurrency = (value: string): string => {
  // Allow digits and comma only
  const cleaned = value.replace(/[^\d,]/g, '');
  const parts = cleaned.split(',');
  
  // Format integer part with dots
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  
  return parts.join(',');
};

export const formatCurrencyInput = (num: number): string => {
  return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
