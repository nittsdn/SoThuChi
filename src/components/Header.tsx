import React from 'react';
import { formatDate } from '../utils/date';

interface HeaderProps {
  version: string;
  lastExpenseMessage?: string;
}

const Header: React.FC<HeaderProps> = ({ version, lastExpenseMessage }) => {
  return (
    <header className="bg-cardBg shadow-ios p-6 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Sổ Thu Chi</h1>
        <span className="text-sm text-secondary">v{version}</span>
      </div>
      <p className="text-secondary mb-3">{formatDate(new Date())}</p>
      {lastExpenseMessage && (
        <div className="bg-background p-3 rounded-button">
          <p className="text-sm text-gray-700">{lastExpenseMessage}</p>
        </div>
      )}
    </header>
  );
};

export default Header;
