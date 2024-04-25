// import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ListGroup, Button, Form, Card } from 'react-bootstrap';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const moment = require('moment');

const HSUITE_API_URL = 'https://testnet-sn1.hbarsuite.network';
const HEDERA_API_URL = 'https://testnet.mirrornode.hedera.com/api/v1';

const App = () => {
  const [wallets, setWallets] = useState([]);
  const [newWallet, setNewWallet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState({});

  let walletsOverview = [];
  const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').unix();
  let savedWallets = [];

  useEffect(() => {
    savedWallets = JSON.parse(localStorage.getItem('wallets')) || [];
    setWallets(savedWallets);
    fetchAllBalances(savedWallets);
  }, []);

  const fetchBalance = async (wallet) => {
    try {
      const balanceResponse = await axios.get(`${HSUITE_API_URL}/wallets/balance?accountId=${wallet}`);
      const accountData = balanceResponse.data;

      if (accountData.tokens.length > 0) {
        for (const token of accountData.tokens) {
          const tokenResponse = await axios.get(`${HSUITE_API_URL}/tokens/chain-info?tokenId=${token.tokenId}`);
          token.details = tokenResponse.data;
        }
      }

      let hasMoreTransactions = true;
      let transactions = [];

      while (hasMoreTransactions) {
        // Busca as transações até a data limite
        const nextTransactionsResponse = await axios.get(`${HEDERA_API_URL}/transactions?account.id=${wallet}&limit=100&order=asc&timestamp=gt%3A${thirtyDaysAgo}&transactiontype=cryptotransfer`);
        const nextTransactions = nextTransactionsResponse.data.transactions;

        // Adiciona as transações ao array
        transactions.push(...nextTransactions);

        // Verifica se há mais transações
        if (nextTransactions.length < 100) {
          hasMoreTransactions = false;
        } else {
          // Atualiza a data limite para a data da transação mais antiga encontrada
          thirtyDaysAgo = moment(nextTransactions[nextTransactions.length - 1].consensus_timestamp).toISOString();
        }
      }

      const filteredTransactions = transactions.map(transaction => ({
        transaction_id: transaction.transaction_id,
        result: transaction.result,
        consensus_timestamp: transaction.consensus_timestamp,
        transfers: transaction.transfers,
        token_transfers: transaction.token_transfers,
        nft_transfers: transaction.nft_transfers,
        staking_reward_transfers: transaction.staking_reward_transfers,
      }));

      accountData.transactions = filteredTransactions;

      return accountData;
    } catch (error) {
      console.error('Erro ao buscar saldo da carteira:', error);
      throw error;
    }
  };

  const fetchAllBalances = async (walletsToFetch) => {
    setIsLoading(true);
    let updatedAccountInfo = {};

    try {
      for (const wallet of walletsToFetch) {
        const balance = await fetchBalance(wallet);
        updatedAccountInfo[wallet] = balance;
      }

      walletsOverview = await combineAccountInfo(Object.values(updatedAccountInfo));
      setAccountInfo(updatedAccountInfo);

      console.log ('Wallets Overview:', walletsOverview, updatedAccountInfo);

    } catch (error) {
      console.error('Erro ao buscar saldo das carteiras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const combineAccountInfo = async (accountInfos) => {
    let combinedInfo = {
      totalHBars: 0,
      hbarsInUsd: 0,
      totalTokens: {},
      allTransactions: {}
    };
  
    // Iterate through each account info
    for (const accountInfo of accountInfos) {
      // Add HBars balance
      combinedInfo.totalHBars += parseFloat(accountInfo.hbars._valueInTinybar);
  
      // Hbar in USD
      const hbarPriceResponse = await axios.get(`${HSUITE_API_URL}/markets/price?tokenId=hbar`);
      const hbarPrice = hbarPriceResponse.data;
  
      if (isNaN(hbarPrice)) {
        console.error('Invalid hbar price:', hbarPrice);
        // Handle the error or return from the function
        return;
      }
  
      combinedInfo.hbarsInUsd = combinedInfo.totalHBars * hbarPrice;
  
      // Add token balances
      accountInfo.tokens.forEach(token => {
        const tokenId = token.tokenId;
        const balance = parseFloat(token.balance);
  
        if (combinedInfo.totalTokens[tokenId]) {
          combinedInfo.totalTokens[tokenId].balance += balance;
        } else {
          combinedInfo.totalTokens[tokenId] = {
            name: token.details.name,
            balance: balance
          };
        }
      });
  
      // Add transactions
      const transactions = accountInfo.transactions;
  
      // Iterate through each transaction
      transactions.forEach(transaction => {
        let tokenTransfers = [];
  
        // Check if the transaction has token transfers
        if (transaction.token_transfers && transaction.token_transfers.length > 0) {
          tokenTransfers = transaction.token_transfers;
        } else {
          // If no token transfers, assume HBAR transfer and use transfers array
          tokenTransfers = transaction.transfers.map(transfer => ({
            token_id: "HBAR", // Assume HBAR transfers
            account: transfer.account,
            amount: transfer.amount,
            is_approval: false // Assume HBAR transfers are not approvals
          }));
        }
  
        // Find the amount sent or received by your wallet
        let amount = 0;
        tokenTransfers.forEach(transfer => {
          if (transfer.account === accountInfo.wallet) {
            amount = transfer.amount;
          }
        });
  
        // If amount not found, check transfers array
        if (amount === 0) {
          transaction.transfers.forEach(transfer => {
            if (transfer.account === accountInfo.wallet) {
              amount = transfer.amount;
            }
          });
        }
  
        // Add the amount to the transaction object
        transaction.amount = amount;

        // Iterate through each token transfer in the transaction
        tokenTransfers.forEach(transfer => {
          const tokenId = transfer.token_id;
  
          // Check if the token id already exists in combinedInfo
          if (!combinedInfo.allTransactions[tokenId]) {
            // If it doesn't exist, initialize an empty array for it
            combinedInfo.allTransactions[tokenId] = [];
          }
  
          // Push the transaction into the array corresponding to the token id
          combinedInfo.allTransactions[tokenId].push(transaction);
        });
      });
    }
  
    // Return the combinedInfo object
    return combinedInfo;
  };
  

  const addWallet = async () => {
    setIsLoading(true);
    try {
      if (wallets.includes(newWallet)) return console.log('Carteira já adicionada');

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
    const updatedAccountInfo = { ...accountInfo };
    delete updatedAccountInfo[walletToRemove];
    setAccountInfo(updatedAccountInfo);
  };

  const handleInputChange = (event) => {
    setNewWallet(event.target.value);
  };

  const renderAccountInfo = () => {
    // Verifica se accountInfo está definido e não é vazio
    if (!accountInfo || Object.keys(accountInfo).length === 0) return null;

    // Array para armazenar os elementos JSX
    const accountElements = [];

    // Itera sobre as chaves do objeto accountInfo
    for (const accountId in accountInfo) {
      if (Object.prototype.hasOwnProperty.call(accountInfo, accountId)) {
        const accountData = accountInfo[accountId];

        // Constrói elementos JSX para cada conta usando componentes Bootstrap
        const accountInfoElement = (
          <div key={accountData.wallet} className="card mb-3">
            <div className="card-header">
              <h3>Account ID: {accountData.wallet}</h3>
            </div>
            <div className="card-body">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>HBARs</td>
                    <td>{accountData.hbars._valueInTinybar / 100000000}</td>
                  </tr>
                  {accountData.tokens.map((token, i) => (
                    <tr key={i}>
                      <td>{token.details.name}</td>
                      <td>{token.balance / (10 ** token.details.decimals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

        // Adiciona o elemento JSX da conta ao array
        accountElements.push(accountInfoElement);
      }
    }

    // Retorna a lista de elementos de conta dentro de um div
    return (
      <div>
        {/* <h2>Account Information</h2> */}
        {accountElements}
      </div>
    );
  };

  return (
    <div className="container">

      <h2>Hedera Wallet Watch</h2>
      <p> View the balance of your Hedera accounts and tokens</p>

      <div>
        {savedWallets.length === 0 && (
          <>
            <Card>
              <Card.Body>
                <Card.Title>Watch a Wallet</Card.Title>
                <Card.Subtitle>Looks like you don't have any wallets saved yet</Card.Subtitle>
                <Card.Text>
                  <input type="text" placeholder='Enter Hedera Wallet' value={newWallet} onChange={handleInputChange} className="form-control mb-3" />
                </Card.Text>
                <Button variant="primary" onClick={addWallet} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Add Wallet'}
                </Button>
              </Card.Body>
            </Card>
          </>
        )}
      </div>

      <div> {renderAccountInfo()} </div>

      <div>
        <h2>Saved Wallets</h2>
        <ListGroup>
          {wallets.map((wallet, index) => (
            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
              {wallet}
              <Button variant="outline-danger" onClick={() => removeWallet(wallet)}>
                Remove
              </Button>
            </ListGroup.Item>
          ))}
          <ListGroup.Item className="d-flex justify-content-between align-items-center">
            <Form.Control type="text" placeholder='Enter Hedera Wallet' value={newWallet} onChange={handleInputChange} className="flex-grow-1" />
            <Button onClick={addWallet} disabled={isLoading} variant="primary">
              {isLoading ? '...' : '+'}
            </Button>
          </ListGroup.Item>
        </ListGroup>
      </div>

    </div>
  );
};

export default App;
