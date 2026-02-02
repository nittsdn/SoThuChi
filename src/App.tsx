import { useState, useEffect } from 'react';
import Header from './components/Header';
import ExpenseForm from './components/ExpenseForm';
import IncomeForm from './components/IncomeForm';
import SummaryForm from './components/SummaryForm';
import Settings from './components/Settings';
import ToastContainer, { useToast } from './components/Toast';
import { loadLastExpense } from './services/api';
import { getDayOfWeek, formatDate } from './utils/date';
import { formatNumber } from './utils/format';
import packageJson from '../package.json';
import './index.css';

type TabType = 'expense' | 'income' | 'summary' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('expense');
  const [lastExpenseMessage, setLastExpenseMessage] = useState<string>('');
  const { toasts, removeToast, success, error } = useToast();

  const loadLastExpenseData = async () => {
    try {
      const data = await loadLastExpense();
      if (data) {
        const ngayDate = new Date(data.ngay);
        const thu = getDayOfWeek(ngayDate);
        const ngayFormatted = formatDate(ngayDate);
        
        const message = `Chi cuối ${data.chi_tieu} ${thu} ngày ${ngayFormatted} tổng ${data.so_tien_nghin} = ${formatNumber(data.so_tien_vnd)} vnđ, số dư ${formatNumber(data.so_du_lt)}`;
        setLastExpenseMessage(message);
      }
    } catch (err) {
      console.error('Error loading last expense:', err);
    }
  };

  useEffect(() => {
    loadLastExpenseData();
  }, []);

  const handleSuccess = () => {
    loadLastExpenseData();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-4xl mx-auto p-4">
        <Header version={packageJson.version} lastExpenseMessage={lastExpenseMessage} />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2 rounded-button whitespace-nowrap transition-all ${
              activeTab === 'expense'
                ? 'bg-primary text-white'
                : 'bg-cardBg text-gray-700 hover:bg-gray-100'
            }`}
          >
            Chi tiêu
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 rounded-button whitespace-nowrap transition-all ${
              activeTab === 'income'
                ? 'bg-primary text-white'
                : 'bg-cardBg text-gray-700 hover:bg-gray-100'
            }`}
          >
            Thu nhập
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-button whitespace-nowrap transition-all ${
              activeTab === 'summary'
                ? 'bg-primary text-white'
                : 'bg-cardBg text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tổng kết
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-button whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-white'
                : 'bg-cardBg text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cài đặt
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'expense' && (
            <ExpenseForm
              onSuccess={handleSuccess}
              onError={error}
              onNotify={success}
            />
          )}
          {activeTab === 'income' && (
            <IncomeForm
              onSuccess={handleSuccess}
              onError={error}
              onNotify={success}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryForm
              onSuccess={handleSuccess}
              onError={error}
              onNotify={success}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              version={packageJson.version}
              onNotify={success}
              onError={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
