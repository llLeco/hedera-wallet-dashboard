import axios from 'axios';
import moment from 'moment';

const HSUITE_API_URL = 'https://mainnet-sn1.hbarsuite.network';
const HEDERA_API_URL = 'https://mainnet.mirrornode.hedera.com/api/v1';
const SAUCER_SWAP_API_URL = 'https://api.saucerswap.finance';

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

    let thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').unix();
    let hasMoreTransactions = true;
    let transactions = [];

    while (hasMoreTransactions) {
      const nextTransactionsResponse = await axios.get(`${HEDERA_API_URL}/transactions?account.id=${wallet}&limit=100&order=asc&timestamp=gt%3A${thirtyDaysAgo}&transactiontype=cryptotransfer`);
      const nextTransactions = nextTransactionsResponse.data.transactions;

      transactions.push(...nextTransactions);

      if (nextTransactions.length < 100) {
        hasMoreTransactions = false;
      } else {
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

const fetchAllBalances = async (walletsToFetch, setIsLoading, setInfo, setOverview) => {
  setIsLoading(true);
  let updatedAccountInfo = {};

  try {
    for (const wallet of walletsToFetch) {
      console.log(`Buscando saldo da carteira ${wallet}`);
      const balance = await fetchBalance(wallet);
      updatedAccountInfo[wallet] = balance;
      console.log(`Saldo da carteira ${wallet} obtido:`, balance);
    }

    console.log('Todos os saldos das carteiras foram obtidos. Combinando informações...');
    const walletsOverview = await combineAccountInfo(Object.values(updatedAccountInfo));
    console.log('Informações combinadas:', walletsOverview);

    setInfo(updatedAccountInfo);
    setOverview(walletsOverview); // Defina o estado walletsOverview

    console.log('Wallets Overview:', walletsOverview, updatedAccountInfo);
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

  // Iterar através de cada info de conta
  for (const accountInfo of accountInfos) {
    // Adicionar saldo HBars
    combinedInfo.totalHBars += parseFloat(accountInfo.hbars._valueInTinybar);

    // HBars em USD
    const hbarPriceResponse = await axios.get(`${HSUITE_API_URL}/markets/price?tokenId=hbar`);
    const hbarPrice = hbarPriceResponse.data;

    if (isNaN(hbarPrice)) {
      console.error('Preço HBars inválido:', hbarPrice);
      // Trate o erro ou retorne da função
      return;
    }

    combinedInfo.hbarsInUsd = combinedInfo.totalHBars * (hbarPrice / 100000000);

    // try {
    //   // Array para armazenar todas as solicitações de token
    //   const tokenRequests = accountInfo.tokens.map(async (token) => {
    //     const tokenId = token.tokenId;
    //     const balance = parseFloat(token.balance);
    
    //     try {
    //       const tokenResponse = await axios.get(`${SAUCER_SWAP_API_URL}/tokens/${tokenId}`);
    
    //       // Verifica se a resposta é bem-sucedida (status diferente de 404)
    //       if (tokenResponse.status !== 404) {
    //         const tokenPrice = tokenResponse.data;
    
    //         // Atualiza o objeto combinedInfo com o preço do token
    //         combinedInfo.totalTokens[tokenId] = {
    //           name: token.details.name,
    //           image: tokenResponse.data.icon,
    //           balance: balance / (10 ** +tokenResponse.data.decimals),
    //           price: tokenPrice.priceUsd // Supondo que tokenPrice contenha a informação de preço
    //         };
    //       }
    //     } catch (error) {
    //       // Ignora o erro silenciosamente se o código de status for 404
    //       if (error.response && error.response.status === 404) {
    //         return;
    //       }
    
    //       // Trata qualquer outro erro
    //       console.error(`Erro ao buscar preço do token ${tokenId}:`, error);
    //     }
    //   });
    
    //   // Espera todas as solicitações de token terminarem antes de prosseguir
    //   await Promise.all(tokenRequests);
    // } catch (error) {
    //   // Trata quaisquer erros globais
    //   console.error('Erro ao processar solicitações de token:', error);
    // }

    try {
      // Fazendo uma única requisição para todos os tokens
      const tokenResponse = await axios.get(`${SAUCER_SWAP_API_URL}/tokens`);
      const allTokens = tokenResponse.data;
    
      // Criar um mapa de tokens indexado por ID para facilitar a filtragem
      const tokensMap = {};
      allTokens.forEach(token => {
        tokensMap[token.id] = token;
      });
    
      // Filtrar os tokens que você possui
      accountInfo.tokens.forEach(token => {
        const tokenId = token.tokenId;
        const balance = parseFloat(token.balance);
    
        // Verificar se o token está presente na resposta da API
        if (tokensMap[tokenId]) {
          const tokenDetails = tokensMap[tokenId];
          const tokenPrice = tokenDetails.priceUsd; // Supondo que tokenDetails contenha a informação de preço
    
          // Atualizar o objeto combinedInfo com os detalhes do token
          combinedInfo.totalTokens[tokenId] = {
            name: tokenDetails.name,
            image: tokenDetails.icon,
            balance: balance / (10 ** +tokenDetails.decimals),
            price: tokenPrice
          };
        }
      });
    } catch (error) {
      // Trata quaisquer erros globais
      console.error('Erro ao buscar tokens:', error);
    }
    
    

    // Adicionar transações
    const transactions = accountInfo.transactions;

    // Iterar através de cada transação
    transactions.forEach(transaction => {
      let tokenTransfers = [];

      // Verificar se a transação possui transferências de token
      if (transaction.token_transfers && transaction.token_transfers.length > 0) {
        tokenTransfers = transaction.token_transfers;
      } else {
        // Se não houver transferências de token, suponha uma transferência de HBAR e use o array de transfers
        tokenTransfers = transaction.transfers.map(transfer => ({
          token_id: "HBAR", // Suponha transferências de HBAR
          account: transfer.account,
          amount: transfer.amount,
          is_approval: false // Suponha que as transferências de HBAR não são aprovações
        }));
      }

      // Encontrar a quantidade enviada ou recebida pela sua carteira
      let amount = 0;
      tokenTransfers.forEach(transfer => {
        if (transfer.account === accountInfo.wallet) {
          amount = transfer.amount;
        }
      });

      // Se a quantidade não for encontrada, verifique o array de transfers
      if (amount === 0) {
        transaction.transfers.forEach(transfer => {
          if (transfer.account === accountInfo.wallet) {
            amount = transfer.amount;
          }
        });
      }

      // Adicionar a quantidade ao objeto de transação
      transaction.amount = amount;

      // Iterar através de cada transferência de token na transação
      tokenTransfers.forEach(transfer => {
        const tokenId = transfer.token_id;

        // Verificar se o ID do token já existe em combinedInfo
        if (!combinedInfo.allTransactions[tokenId]) {
          // Se não existir, inicialize um array vazio para ele
          combinedInfo.allTransactions[tokenId] = [];
        }

        // Verificar se a transação já foi adicionada para esta conta
        const transactionExists = combinedInfo.allTransactions[tokenId].some(existingTransaction => existingTransaction.id === transaction.id);
        if (!transactionExists) {
          // Adicionar a transação ao array correspondente ao ID do token
          combinedInfo.allTransactions[tokenId].push(transaction);
        }
      });
    });
  }

  // Retornar o objeto combinedInfo
  return combinedInfo;
};


const ApiService = {
  fetchBalance,
  fetchAllBalances,
};

export default ApiService;
