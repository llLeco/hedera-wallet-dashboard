import './App.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [wallets, setWallets] = useState([]);
  const [newWallet, setNewWallet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [AccountInfo, setAccountInfo] = useState({});

  useEffect(() => {
    const savedWallets = JSON.parse(localStorage.getItem('wallets')) || [];
    setWallets(savedWallets);
    fetchAllBalances(savedWallets);
  }, []);

  const fetchBalance = async (wallet) => {
    try {
      const response = await axios.get(`https://testnet.mirrornode.hedera.com/api/v1/accounts?account.id=${wallet}&balance=true&order=desc`);
      const accountData = response.data;

      // Fetch token details
      for (const account of accountData.accounts) {
        if (account.balance.tokens.length > 0) {
          for (const token of account.balance.tokens) {
            const tokenResponse = await axios.get(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${token.token_id}`);
            token.details = tokenResponse.data;
          }
        }
      }

      return accountData;
    } catch (error) {
      console.error('Erro ao buscar saldo da carteira:', error);
      throw error;
    }
  };

  const fetchAllBalances = async (walletsToFetch) => {
    setIsLoading(true);
    const updatedAccountInfo = {};

    try {
      for (const wallet of walletsToFetch) {
        const balance = await fetchBalance(wallet);
        updatedAccountInfo[wallet] = balance;
      }
      setAccountInfo(updatedAccountInfo);
    } catch (error) {
      console.error('Erro ao buscar saldo das carteiras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWallet = async () => {
    setIsLoading(true);
    try {
      if (wallets.includes(newWallet)) {
        console.log('Carteira já adicionada');
        return;
      }

      const balance = await fetchBalance(newWallet);

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
    const updatedAccountInfo = { ...AccountInfo };
    delete updatedAccountInfo[walletToRemove];
    setAccountInfo(updatedAccountInfo);
  };

  const handleInputChange = (event) => {
    setNewWallet(event.target.value);
  };

  const renderAccountInfo = () => {
    // Verifica se AccountInfo está definido e não é vazio
    if (!AccountInfo || Object.keys(AccountInfo).length === 0) return null;
  
    // Array para armazenar os elementos JSX
    const accountElements = [];
  
    // Itera sobre as chaves do objeto AccountInfo
    for (const accountId in AccountInfo) {
      if (Object.prototype.hasOwnProperty.call(AccountInfo, accountId)) {
        const accountData = AccountInfo[accountId];
        // Constrói elementos JSX para cada conta
        const accountInfoElement = (
          <li key={accountId}>
            <h3>Account ID: {accountId}</h3>
            <p>Alias: {accountData.accounts[0].alias}</p>
            <h4>Balance:</h4>
            <p>HBARs: {accountData.accounts[0].balance.balance}</p>
            <h4>Tokens:</h4>
            <ul>
              {accountData.accounts[0].balance.tokens.map((token, i) => (
                <li key={i}>
                  <p>Token ID: {token.token_id}</p>
                  <p>Balance: {token.balance}</p>
                  <p>Name: {token.details.name}</p>
                  <p>Symbol: {token.details.symbol}</p>
                  <p>Decimals: {token.details.decimals}</p>
                  <p>Total Supply: {token.details.total_supply}</p>
                  <p>Treasury Account ID: {token.details.treasury_account_id}</p>
                </li>
              ))}
            </ul>
          </li>
        );
        // Adiciona o elemento da conta ao array de elementos
        accountElements.push(accountInfoElement);
      }
    }
  
    // Retorna a lista de elementos de conta dentro de um div
    return (
      <div>
        <h2>Account Information</h2>
        <ul>{accountElements}</ul>
      </div>
    );
  };

  return (
    <div>
      <h1>Meu Dashboard de Carteiras</h1>
      <div>
        <input type="text" value={newWallet} onChange={handleInputChange} />
        <button onClick={addWallet} disabled={isLoading}>
          {isLoading ? 'Aguarde...' : 'Adicionar Carteira'}
        </button>
      </div>
      {renderAccountInfo()}
      <div>
        <h2>Carteiras Salvas</h2>
        <ul>
          {wallets.map((wallet, index) => (
            <li key={index}>
              {wallet}
              <button onClick={() => removeWallet(wallet)}>Remover</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
