import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import AccountInfo from './components/AccountInfo';
import WalletForm from './components/WalletForm';
import WalletList from './components/WalletList';
import WalletsOverview from './components/WalletsOverview';
import ApiService from './services/ApiService';
import TransactionsChart from './components/TransactionsChart';

const App = () => {
  const savedWallets = JSON.parse(localStorage.getItem('wallets')) || [];
  const [wallets, setWallets] = useState([]);
  const [newWallet, setNewWallet] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState({});
  const [overview, setOverview] = useState({});

  useEffect(() => {
    setWallets(savedWallets);
    ApiService.fetchAllBalances(savedWallets, setIsLoading, setAccountInfo, setOverview);
  }, []);

  const addWallet = async () => {
    setIsLoading(true);
    try {
      if (wallets.includes(newWallet)) return console.log('Carteira já adicionada');

      const balance = await ApiService.fetchBalance(newWallet);

      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));

      setAccountInfo((prevAccountInfo) => ({ ...prevAccountInfo, [newWallet]: balance }));
    } catch (error) {
      console.error('Erro ao adicionar carteira:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeWallet = (walletToRemove) => {
    const updatedWallets = wallets.filter((wallet) => wallet !== walletToRemove);
    setWallets(updatedWallets);
    localStorage.setItem('wallets', JSON.stringify(updatedWallets));
    const updatedAccountInfo = { ...accountInfo };
    delete updatedAccountInfo[walletToRemove];
    setAccountInfo(updatedAccountInfo);
  };

  const handleInputChange = (event) => {
    setNewWallet(event.target.value);
  };

  return (
    <div className="container">
      <h2>Hedera Wallet Watch</h2>
      <p>View the balance of your Hedera accounts and tokens</p>

      {savedWallets.length === 0 &&
        <WalletForm newWallet={newWallet} isLoading={isLoading} handleInputChange={handleInputChange} addWallet={addWallet} />
      }

      {savedWallets.length !== 0 &&
        <WalletsOverview overview={overview} isLoading={isLoading} />
      }

      {/* {savedWallets.length !== 0 &&
        <TransactionsChart data={overview.allTransactions} isLoading={isLoading} />
      } */}

      {savedWallets.length !== 0 &&
        <AccountInfo accountInfo={accountInfo} />
      }

      {savedWallets.length !== 0 &&
        <WalletList wallets={wallets} removeWallet={removeWallet} newWallet={newWallet} addWallet={addWallet} isLoading={isLoading} handleInputChange={handleInputChange}/>
      }

    </div>
  );
};

export default App;
